import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import {
  FoundationError,
  recipeColorModes,
  recipeColorRoles,
  recipeColorStates,
  recipeColorTokens,
  recipeStateColorKey,
  type Recipe,
  type RecipeIcon,
  type RecipeButtonVariant,
  type RecipeColorRole,
  type ResolvedPreset,
} from '@ombelle/contracts'
import { assertGlassContrast, glassTokens } from './glass.js'
import { normalizeColor } from './resolve.js'

export function validateRecipeDarkSelector(value: string): string {
  if (!/^\.[A-Za-z_][A-Za-z0-9_-]*$/.test(value))
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Recipe dark mode requires a single ASCII class selector',
      value,
      'Configure a class such as .dark or .theme-dark.',
    )
  return value
}
export function validateComponentPresetDarkSelector(value: string): string {
  if (!/^\.[A-Za-z_][A-Za-z0-9_-]*$/.test(value))
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Component preset dark mode requires a single ASCII class selector',
      value,
      'Configure a class such as .dark or .theme-dark.',
    )
  return value
}
const variable = (key: string) =>
  '--' + key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
const block = (selector: string, values: Record<string, string>) =>
  selector +
  '{' +
  Object.keys(values)
    .sort()
    .map((k) => k + ':' + values[k] + ';')
    .join('') +
  '}'

const allowedMediaConditions = [
  '(prefers-reduced-motion:reduce)',
  '(prefers-reduced-motion: reduce)',
  '(forced-colors: active)',
  '(prefers-reduced-transparency: reduce)',
]
// The single reviewed liquid-glass feature query; compared whitespace-normalized.
const glassSupportsCondition =
  '((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))'
const normalizeConditionParams = (params: string) =>
  params
    .replace(/\s+/g, ' ')
    .replace(/\(\s/g, '(')
    .replace(/\s\)/g, ')')
    .trim()
// Post-order, so a feature query whose nested media blocks all empty out is removed too.
function pruneEmptyAtRules(container: postcss.Container) {
  for (const node of [...(container.nodes ?? [])]) {
    if (node.type !== 'atrule') continue
    if (node.nodes) pruneEmptyAtRules(node)
    if (!node.nodes?.length) node.remove()
  }
}

export function compileScopedButtonStyles(input: {
  familyCss: string
  preset: ResolvedPreset
  overrides: Recipe['overrides']
  scope: string
  darkSelector: string
  slot: string
  scopeAttribute: string
  scopeLabel?: 'recipe' | 'component-preset'
  /** Variant whose tokens `overrides.colors` replaces; defaults to 'default'. */
  variant?: RecipeButtonVariant
  /** The recipe's normalized icon, which adds icon sizing and the icon-only shape. */
  icon?: Required<RecipeIcon>
}): string {
  const dark =
    input.scopeLabel === 'recipe'
      ? validateRecipeDarkSelector(input.darkSelector)
      : validateComponentPresetDarkSelector(input.darkSelector)
  if (!/^[a-f0-9]{64}$/.test(input.scope))
    throw new FoundationError(
      'INVALID_DATA',
      input.scopeLabel === 'recipe'
        ? 'Invalid recipe scope'
        : 'Invalid component preset scope',
    )
  if (
    !/^[a-z][a-z0-9-]*$/.test(input.slot) ||
    !/^data-[a-z][a-z0-9-]*$/.test(input.scopeAttribute)
  )
    throw new FoundationError('INVALID_DATA', 'Invalid scoped Button selector')
  const scope =
    '[data-slot="' +
    input.slot +
    '"][' +
    input.scopeAttribute +
    '="' +
    input.scope +
    '"]'
  if (input.preset.data.styleFamily === 'liquid-glass')
    assertGlassContrast(input.preset.data)
  const root = postcss.parse(input.familyCss)
  root.walkAtRules((rule) => {
    const params = normalizeConditionParams(rule.params)
    if (
      !(rule.name === 'media' && allowedMediaConditions.includes(params)) &&
      !(rule.name === 'supports' && params === glassSupportsCondition)
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Unsupported recipe style condition',
        rule.name,
      )
  })
  root.walkRules((rule) => {
    const output: string[] = []
    selectorParser((selectors) => {
      for (const selector of selectors.nodes) {
        const attrs: selectorParser.Attribute[] = []
        selector.walkAttributes((a) => {
          if (a.attribute === 'data-slot') attrs.push(a)
        })
        if (attrs.length !== 1)
          throw new FoundationError(
            'INVALID_DATA',
            'Recipe styles require one explicit slot selector',
            rule.selector,
          )
        const slot = attrs[0]
        if (slot.value && slot.value !== 'button') continue
        if (
          slot.parent !== selector ||
          selector.first !== slot ||
          (slot.operator && slot.operator !== '=')
        )
          throw new FoundationError(
            'INVALID_DATA',
            'Recipe slot must start the element compound selector',
            rule.selector,
          )
        // Authored styles consist of one compound selector, with reviewed state/variant suffixes.
        selector.walk((node) => {
          if (!['selector', 'attribute', 'pseudo'].includes(node.type))
            throw new FoundationError(
              'INVALID_DATA',
              'Unsupported recipe selector structure',
              rule.selector,
            )
          if (
            node.type === 'attribute' &&
            !['data-slot', 'data-size', 'data-variant'].includes(node.attribute)
          )
            throw new FoundationError(
              'INVALID_DATA',
              'Unsupported recipe selector attribute',
              rule.selector,
            )
          if (
            node.type === 'pseudo' &&
            ![
              ':disabled',
              ':not',
              ':hover',
              ':active',
              ':focus-visible',
            ].includes(node.value)
          )
            throw new FoundationError(
              'INVALID_DATA',
              'Unsupported recipe pseudo-class',
              rule.selector,
            )
        })
        slot.replaceWith(
          ...selectorParser()
            .astSync(scope)
            .nodes[0].nodes.map((n) => n.clone()),
        )
        output.push(selector.toString())
      }
    }).processSync(rule.selector)
    if (output.length) rule.selector = output.join(',')
    else rule.remove()
  })
  pruneEmptyAtRules(root)
  root.walkComments((comment) => {
    comment.remove()
  })
  const data = input.preset.data,
    d = data.design
  const light: Record<string, string> = {},
    darkTokens: Record<string, string> = {}
  for (const [k, v] of Object.entries(data.modes.light)) light[variable(k)] = v
  for (const [k, v] of Object.entries(data.modes.dark))
    darkTokens[variable(k)] = v
  Object.assign(light, {
    '--radius': d.radiusRem + 'rem',
    '--border-width': d.borderWidthPx + 'px',
    '--shadow-x': d.shadowOffsetXPx + 'px',
    '--shadow-y': d.shadowOffsetYPx + 'px',
    '--control-height': d.density === 'compact' ? '2.25rem' : '2.5rem',
    '--font-family':
      d.fontFamilyId === 'system-serif'
        ? 'Georgia, serif'
        : d.fontFamilyId === 'system-mono'
          ? 'monospace'
          : "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    '--motion-duration': d.motion === 'reduced' ? '0ms' : '150ms',
  })
  if (data.styleFamily === 'liquid-glass') {
    const glass = glassTokens(data)
    Object.assign(light, glass.light)
    Object.assign(darkTokens, glass.dark)
  }
  const overrides: Record<string, string> = {}
  for (const [key, value] of Object.entries(input.overrides)) {
    const mapping: Record<string, [string, string]> = {
      radiusRem: ['--radius', 'rem'],
      borderWidthPx: ['--border-width', 'px'],
      shadowOffsetXPx: ['--shadow-x', 'px'],
      shadowOffsetYPx: ['--shadow-y', 'px'],
    }
    const mapped = mapping[key]
    if (mapped) overrides[mapped[0]] = value + mapped[1]
  }
  const o = input.overrides
  if (o.gapPx !== undefined) overrides.gap = o.gapPx + 'px'
  if (o.fontWeight !== undefined) overrides['font-weight'] = String(o.fontWeight)
  if (o.fontSizePx !== undefined) overrides['font-size'] = o.fontSizePx + 'px'
  if (o.letterSpacingEm !== undefined)
    overrides['letter-spacing'] = o.letterSpacingEm + 'em'
  if (o.uppercase !== undefined)
    overrides['text-transform'] = o.uppercase ? 'uppercase' : 'none'
  // Color overrides replace the tokens the selected variant reads, per mode.
  const variant = input.variant ?? 'default'
  const colorTokens = recipeColorTokens[variant]
  const paint: Record<string, string> = {}
  const colors = input.overrides.colors
  if (colors) {
    for (const mode of recipeColorModes) {
      const target = mode === 'light' ? light : darkTokens
      for (const role of recipeColorRoles) {
        const value = colors[mode]?.[role]
        if (value !== undefined)
          target[variable(colorTokens[role])] = normalizeColor(value)
      }
    }
    const set = (role: RecipeColorRole) =>
      colors.light?.[role] !== undefined || colors.dark?.[role] !== undefined
    // Families paint ghost/link transparent and outline from --card, --background or
    // nothing at all, link text from --primary in some families,
    // and borders from different tokens; paint the overridden roles from the mapped token.
    if (set('background') && (variant === 'outline' || variant === 'ghost' || variant === 'link'))
      paint.background = 'var(' + variable(colorTokens.background) + ')'
    // Glass Buttons are one ink: every label reads --foreground, so a foreground override is
    // painted for every variant, and secondary card glass reads the overridden token as its card.
    const glass = data.styleFamily === 'liquid-glass'
    if (set('foreground') && (variant === 'outline' || variant === 'link' || glass))
      paint.color = 'var(' + variable(colorTokens.foreground) + ')'
    if (glass && set('background') && variant === 'secondary')
      paint['--card'] = 'var(' + variable(colorTokens.background) + ')'
    if (set('border'))
      paint['border-color'] = 'var(' + variable(colorTokens.border) + ')'
  }
  // Hover and pressed overrides are painted per mode, after the family's own state rules
  // and with higher specificity. A light value is limited to elements outside the dark
  // class, so a mode without its own value keeps the family's state colors.
  const states: string[] = []
  if (colors)
    for (const state of recipeColorStates) {
      const pseudo = state === 'hover' ? ':hover' : ':active'
      const target = scope + '[data-variant="' + variant + '"]:not(:disabled)' + pseudo
      for (const mode of recipeColorModes) {
        const values: Record<string, string> = {}
        for (const role of recipeColorRoles) {
          const value = colors[mode]?.[recipeStateColorKey(state, role)]
          if (value === undefined) continue
          const property =
            role === 'background' ? 'background' : role === 'foreground' ? 'color' : 'border-color'
          values[property] = normalizeColor(value)
        }
        if (!Object.keys(values).length) continue
        states.push(
          block(
            mode === 'light'
              ? target + ':not(' + dark + ',' + dark + ' *)'
              : dark + ' ' + target + ',' + dark + target,
            values,
          ),
        )
      }
    }
  // Complete local tokens stop the host preset from affecting this element in either mode.
  const tokens =
    block(scope, light) +
    block(dark + ' ' + scope + ',' + dark + scope, darkTokens)
  const height =
    input.overrides.minHeightPx === undefined
      ? ''
      : block(scope + '[data-size]', {
          'min-height': input.overrides.minHeightPx + 'px',
        })
  // Text sizes keep their own padding unless overridden; the icon size stays square.
  const paddingValues: Record<string, string> = {}
  if (o.paddingXPx !== undefined) paddingValues['padding-inline'] = o.paddingXPx + 'px'
  if (o.paddingYPx !== undefined) paddingValues['padding-block'] = o.paddingYPx + 'px'
  const padding = Object.keys(paddingValues).length
    ? block(scope + '[data-size]:not([data-size="icon"])', paddingValues)
    : ''
  const icon = input.icon
    ? block(scope + '>svg', {
        width: '1.25em',
        height: '1.25em',
        'flex-shrink': '0',
      }) +
      (input.icon.iconOnly
        ? block(scope + '[data-icon-only][data-size]', {
            'aspect-ratio': '1 / 1',
            'padding-inline': '0',
            'justify-content': 'center',
          })
        : '')
    : ''
  // Same specificity as the family's variant rules and emitted after them, so it wins
  // there while the family's :hover/:active rules (higher specificity) still apply.
  const painted = Object.keys(paint).length
    ? block(scope + '[data-variant="' + variant + '"]', paint)
    : ''
  return (
    tokens +
    root.toString() +
    painted +
    block(scope, {
      ...overrides,
      'white-space': 'normal',
      'overflow-wrap': 'anywhere',
      'max-width': '100%',
      'box-sizing': 'border-box',
    }) +
    block(scope + '[data-size="icon"]', {
      width: 'auto',
      'min-width': 'var(--control-height)',
      'aspect-ratio': 'auto',
      padding: '0.5rem',
    }) +
    height +
    padding +
    states.join('') +
    icon
  )
}

export function compileRecipeStyles(input: {
  familyCss: string
  preset: ResolvedPreset
  overrides: Recipe['overrides']
  scope: string
  darkSelector: string
  variant?: RecipeButtonVariant
  icon?: Required<RecipeIcon>
}): string {
  return compileScopedButtonStyles({
    ...input,
    slot: 'recipe-button',
    scopeAttribute: 'data-ombelle-recipe',
    scopeLabel: 'recipe',
  })
}
