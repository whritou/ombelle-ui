import { describe, expect, it } from 'vitest'
import { format } from 'prettier/standalone'
import postcss from 'prettier/plugins/postcss'
import {
  componentsWithStyleSupport,
  presetSchemaVersion,
  supportedStyleFamilies,
  type ComponentId,
  type Edition,
  type Preset,
  type StyleFamily,
} from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import {
  canonicalize,
  compile,
  presetPreviewSheets,
  presetTheme,
  sha256,
  stripFontImports,
} from '../src/index.js'
import { glassMaterialActive } from '../src/glass-contrast.js'

const catalog = getCatalog('0.1.0')
const previewIds = (family: StyleFamily): ComponentId[] =>
  componentsWithStyleSupport(family, ['stable', 'experimental'])
const families: StyleFamily[] = [...supportedStyleFamilies, 'liquid-glass']

// The three editor edits Task 1 measured, applied to the raw (unresolved) Flat preset
// with the fonts the editor gives Flat (so font imports are present), and the dark
// primary written in uppercase hex as a user would type it.
function edited(edit: (preset: Preset) => void): Preset {
  const preset = structuredClone(catalog.presets.flat)
  Object.assign(preset.design, { fontFamilyId: 'dm-sans', monoFontFamilyId: 'geist-mono' })
  edit(preset)
  preset.schemaVersion = presetSchemaVersion(preset.design)
  return preset
}
const editedPresets: Record<string, Preset> = {
  'flat radius 0': edited((p) => {
    p.design.radiusRem = 0
  }),
  'flat dark primary': edited((p) => {
    p.modes.dark.primary = '#2563EB'
  }),
  'flat display font, no mono': edited((p) => {
    Object.assign(p.design, { headingFontFamilyId: 'fraunces' })
    delete (p.design as Record<string, unknown>).monoFontFamilyId
  }),
}
// A Liquid Glass preset with the material on, so the lab style reaches ui-style.css.
const glassLab = Object.values(catalog.startingPresets).find((p) =>
  glassMaterialActive(p.design),
)

type Case = {
  preset: Preset
  componentIds: readonly ComponentId[]
  edition?: Edition
  prefixedComponents?: readonly ComponentId[]
}
const cases: Record<string, Case> = {
  ...Object.fromEntries(
    families.map((family) => [
      family,
      { preset: catalog.presets[family], componentIds: previewIds(family) },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(editedPresets).map(([name, preset]) => [
      name,
      { preset, componentIds: previewIds('flat') },
    ]),
  ),
  'flat prefixed button and card': {
    preset: catalog.presets.flat,
    componentIds: previewIds('flat'),
    prefixedComponents: ['button', 'card'],
  },
  'organic base edition': {
    preset: catalog.presets.organic,
    componentIds: previewIds('organic'),
    edition: 'base',
  },
  'liquid-glass prefixed dialog': {
    preset: catalog.presets['liquid-glass'],
    componentIds: previewIds('liquid-glass'),
    prefixedComponents: ['dialog'],
  },
  ...(glassLab && {
    'liquid-glass material on': {
      preset: glassLab,
      componentIds: previewIds('liquid-glass'),
    },
  }),
}
const run = (c: Case) =>
  compile({
    preset: c.preset,
    componentIds: c.componentIds,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    glassContrast: 'report',
    ...(c.edition && { edition: c.edition }),
    ...(c.prefixedComponents && { prefixedComponents: c.prefixedComponents }),
  })
// The compiler's own Prettier options for CSS artifacts.
const formatCss = (css: string) =>
  format(css, {
    parser: 'css',
    plugins: [postcss],
    endOfLine: 'lf',
    singleQuote: true,
    semi: false,
  })
// presetRuntimeStyles (apps/www preview-protocol.ts) applies this per style artifact.
const runtimePiece = (css: string) =>
  stripFontImports(css.replace(/@theme inline\s*\{[^}]*\}/g, ''))

describe('compile output is unchanged', () => {
  it('covers a glass preset with the material on', () => {
    expect(glassLab).toBeDefined()
  })
  it.each(Object.keys(cases))('%s', async (name) => {
    const result = await run(cases[name]!)
    expect(await sha256(canonicalize(result))).toMatchSnapshot()
  })
})

describe('presetTheme', () => {
  it.each(Object.keys(cases))('equals compile().theme for %s', async (name) => {
    const c = cases[name]!
    expect(presetTheme(c.preset)).toEqual((await run(c)).theme)
  })
})

describe('presetPreviewSheets', () => {
  const previewCases = Object.entries({
    ...Object.fromEntries(
      supportedStyleFamilies.map((family) => [family, catalog.presets[family]]),
    ),
    ...editedPresets,
  })
  it.each(previewCases)(
    'matches the compiled style artifacts for %s',
    async (_, preset) => {
      const result = await run({
        preset,
        componentIds: previewIds(preset.styleFamily),
      })
      const expected = result.artifacts
        .filter((a) => a.kind === 'style')
        .map((a) => runtimePiece(a.content))
      const sheets = presetPreviewSheets(preset)
      expect(sheets).toHaveLength(expected.length)
      // Stripping leaves blank lines in the formatted artifact; format both sides to compare exactly.
      expect(await Promise.all(sheets.map(formatCss))).toEqual(
        await Promise.all(expected.map(formatCss)),
      )
      expect(sheets.join('\n')).not.toMatch(/@theme|@fontsource/)
    },
  )
  it('rejects liquid-glass', () => {
    expect(() => presetPreviewSheets(catalog.presets['liquid-glass'])).toThrow(
      expect.objectContaining({ code: 'INVALID_DATA', path: '/styleFamily' }),
    )
  })
})
