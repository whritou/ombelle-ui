import {
  FoundationError,
  componentsWithStyleSupport,
  isStyleFamily,
  type ComponentId,
  type Edition,
  type Preset,
  type ThemeData,
} from '@ombelle/contracts'
import { getCatalog, getTemplate, type Catalog } from '@ombelle/catalog'
import { prefixSharedRules, prefixSlots, templateSlots } from './prefix-slots.js'
import { presetWithDefaults } from './resolve.js'
import { glassTokens } from './glass.js'
import { glassMaterialActive } from './glass-contrast.js'
import { fontRuleBlock, resolveTypography, stripFontImports } from './typography.js'

const variable = (key: string) =>
  '--' + key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())

/** Slots each prefixed component's template declares, keyed by component. */
export function prefixedSlotMap(
  catalog: Catalog,
  prefixedComponents: readonly ComponentId[] | undefined,
  edition: Edition | undefined,
): Map<ComponentId, string[]> {
  return new Map(
    [...new Set(prefixedComponents ?? [])].map((id) => [
      id,
      templateSlots(getTemplate(catalog, id, edition ?? 'radix').content),
    ]),
  )
}

/**
 * The design tokens `compile()` returns as `theme`, Liquid Glass included.
 * Synchronous: catalog defaults are merged and colors normalized as `resolvePreset` does.
 */
export function presetTheme(input: Preset): ThemeData {
  const data = presetWithDefaults(input, getCatalog(input.catalogRelease))
  const theme: ThemeData = { light: {}, dark: {}, theme: {} }
  for (const mode of ['light', 'dark'] as const)
    for (const [key, value] of Object.entries(data.modes[mode]))
      theme[mode][variable(key)] = value
  const d = data.design
  const typography = resolveTypography(d)
  Object.assign(theme.light, {
    '--radius': d.radiusRem + 'rem',
    '--border-width': d.borderWidthPx + 'px',
    '--shadow-x': d.shadowOffsetXPx + 'px',
    '--shadow-y': d.shadowOffsetYPx + 'px',
    '--control-height': d.density === 'compact' ? '2.25rem' : '2.5rem',
    '--font-family': typography.family,
    '--motion-duration': d.motion === 'reduced' ? '0ms' : '150ms',
  })
  if (typography.heading) theme.light['--font-heading'] = typography.heading
  if (typography.mono) theme.light['--font-mono'] = typography.mono
  if (data.styleFamily === 'liquid-glass') {
    const glass = glassTokens(data)
    Object.assign(theme.light, glass.light)
    Object.assign(theme.dark, glass.dark)
  }
  for (const key of Object.keys(data.modes.light))
    theme.theme['--color-' + variable(key).slice(2)] =
      'var(' + variable(key) + ')'
  return theme
}

const block = (selector: string, values: Record<string, string>) =>
  selector +
  '{' +
  Object.keys(values)
    .sort()
    .map((k) => k + ':' + values[k] + ';')
    .join('') +
  '}'

/**
 * The unformatted style drafts `compile()` formats into its style artifacts:
 * `styles/ui-tokens.css`, `styles/ui-style.css`, then each listed component's
 * stylesheet in the given order. `prefixedComponents` and `edition` mean what
 * they mean for `compile()`.
 */
export function presetStyleSheets(
  input: Preset,
  catalog: Catalog,
  options: {
    componentIds: readonly ComponentId[]
    prefixedComponents?: readonly ComponentId[]
    edition?: Edition
  },
): { logicalPath: string; content: string }[] {
  const data = presetWithDefaults(input, catalog)
  const family = data.styleFamily
  const d = data.design
  const typography = resolveTypography(d)
  const theme = presetTheme(data)
  const prefixedSlots = prefixedSlotMap(
    catalog,
    options.prefixedComponents,
    options.edition,
  )
  const sheets = [
    {
      logicalPath: 'styles/ui-tokens.css',
      content:
        typography.imports.join('') +
        block(':root', theme.light) +
        block('.dark', theme.dark) +
        block('@theme inline', theme.theme),
    },
    {
      logicalPath: 'styles/ui-style.css',
      // The CLI installs this file and not ui-tokens.css, so the font imports lead it too.
      content:
        typography.imports.join('') +
        prefixSharedRules(
          catalog.styles[family] +
            (family === 'liquid-glass' && glassMaterialActive(d)
              ? catalog.glassLabStyle
              : '') +
            fontRuleBlock(typography),
          [...prefixedSlots.values()].flat(),
        ),
    },
  ]
  for (const id of options.componentIds) {
    const template = getTemplate(catalog, id, options.edition ?? 'radix')
    if (!template.styles) continue
    const slots = prefixedSlots.get(id)
    sheets.push({
      logicalPath: template.logicalPath.replace(/\.tsx$/, '.css'),
      content: slots
        ? prefixSlots(template.styles[family]!, 'css', slots)
        : template.styles[family]!,
    })
  }
  return sheets
}

/**
 * The editor preview's style sheets for a built-in, non-glass family: the
 * style drafts for every component the editor previews, without font imports
 * or the `@theme inline` block, in `compile()`'s artifact order. Unformatted;
 * join them with '\n'. Liquid Glass keeps the compiled preview path.
 */
export function presetPreviewSheets(data: Preset): string[] {
  const family = data.styleFamily
  if (!isStyleFamily(family) || family === 'liquid-glass')
    throw new FoundationError(
      'INVALID_DATA',
      'Only a built-in style family other than Liquid Glass has a preview sheet',
      '/styleFamily',
    )
  return presetStyleSheets(data, getCatalog(data.catalogRelease), {
    componentIds: componentsWithStyleSupport(family, ['stable', 'experimental']),
  })
    .sort((a, b) => (a.logicalPath < b.logicalPath ? -1 : 1))
    .map((sheet) =>
      stripFontImports(sheet.content.replace(/@theme inline\s*\{[^}]*\}/g, '')),
    )
}
