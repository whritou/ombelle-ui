import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import {
  FoundationError,
  type Recipe,
  type ResolvedPreset,
} from '@ombelle/contracts'

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

export function compileScopedButtonStyles(input: {
  familyCss: string
  preset: ResolvedPreset
  overrides: Recipe['overrides']
  scope: string
  darkSelector: string
  slot: string
  scopeAttribute: string
  scopeLabel?: 'recipe' | 'component-preset'
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
  const root = postcss.parse(input.familyCss)
  root.walkAtRules((rule) => {
    if (
      rule.name !== 'media' ||
      ![
        '(prefers-reduced-motion:reduce)',
        '(prefers-reduced-motion: reduce)',
        '(forced-colors: active)',
      ].includes(rule.params)
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
  root.walkAtRules((rule) => {
    if (!rule.nodes?.length) rule.remove()
  })
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
          : 'Arial, sans-serif',
    '--motion-duration': d.motion === 'reduced' ? '0ms' : '150ms',
  })
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
  return (
    tokens +
    root.toString() +
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
    height
  )
}

export function compileRecipeStyles(input: {
  familyCss: string
  preset: ResolvedPreset
  overrides: Recipe['overrides']
  scope: string
  darkSelector: string
}): string {
  return compileScopedButtonStyles({
    ...input,
    slot: 'recipe-button',
    scopeAttribute: 'data-ombelle-recipe',
    scopeLabel: 'recipe',
  })
}
