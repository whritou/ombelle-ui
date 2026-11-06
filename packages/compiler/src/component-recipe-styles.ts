import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import { componentRecipeParts, FoundationError, type ComponentRecipe, type ComponentRecipePart, type ThemeData } from '@ombelle/contracts'
import { normalizeColor } from './resolve.js'

const dimensions = {
  radiusRem: ['border-radius', 'rem'],
  borderWidthPx: ['border-width', 'px'],
  minHeightPx: ['min-height', 'px'],
  paddingXPx: ['padding-inline', 'px'],
  paddingYPx: ['padding-block', 'px'],
  gapPx: ['gap', 'px'],
  fontWeight: ['font-weight', ''],
  fontSizePx: ['font-size', 'px'],
  letterSpacingEm: ['letter-spacing', 'em'],
  shadowOffsetXPx: ['--shadow-x', 'px'],
  shadowOffsetYPx: ['--shadow-y', 'px'],
} as const satisfies Record<Exclude<keyof ComponentRecipePart, 'colors'>, readonly [string, string]>

const themeBlock = (selector: string, values: Record<string, string>) =>
  `${selector}{${Object.entries(values).sort(([a], [b]) => a < b ? -1 : 1)
    .map(([key, value]) => `${key}:${value};`).join('')}}`

function appearanceCss(recipe: ComponentRecipe, scope: string, darkSelector: string, glass: boolean): string {
  const rules: string[] = []
  for (const part of componentRecipeParts[recipe.component]) {
    const values = recipe.appearance?.parts?.[part.slot]
    if (!values) continue
    const selector = `[data-slot="recipe-${part.slot}"]${scope}[data-slot]`
    const layout: Record<string, string> = {}
    for (const key of Object.keys(dimensions) as (keyof typeof dimensions)[]) {
      const value = values[key]
      const [property, unit] = dimensions[key]
      if (value !== undefined) layout[property] = value + unit
    }
    if (values.borderWidthPx !== undefined) layout['border-style'] = 'solid'
    if (!glass && (values.shadowOffsetXPx !== undefined || values.shadowOffsetYPx !== undefined))
      layout['box-shadow'] = `${values.shadowOffsetXPx ?? 0}px ${values.shadowOffsetYPx ?? 0}px 0 var(--shadow-color, var(--border))`
    if (Object.keys(layout).length) rules.push(themeBlock(selector, layout))
    for (const mode of ['light', 'dark'] as const) {
      const colors = values.colors?.[mode]
      if (!colors) continue
      const paint: Record<string, string> = {}
      if (colors.background) {
        const property = glass && part.glassTint ? '--' + part.glassTint : 'background'
        paint[property] = normalizeColor(colors.background)
      }
      if (colors.foreground) paint.color = normalizeColor(colors.foreground)
      if (colors.border) {
        paint['border-color'] = paint['--border'] = normalizeColor(colors.border)
        if (glass) paint['--glass-lab-custom-edge'] = paint['--border']
      }
      if (Object.keys(paint).length) {
        const dark = `:where(${darkSelector}, ${darkSelector} *)`
        const target = mode === 'light' ? `${selector}:not(${dark})` : `${selector}${dark}`
        rules.push(`@media (not (forced-colors: active)) {${themeBlock(target, paint)}}`)
      }
    }
  }
  return rules.join('')
}

export function compileComponentRecipeStyles(input: {
  styles: readonly string[]
  slots: readonly string[]
  scope: string
  theme: ThemeData
  darkSelector: string
  glass: boolean
  recipe: ComponentRecipe
}): string {
  const root = postcss.parse(input.styles.join('\n'))
  const slots = new Set(input.slots)
  const scope = `[data-ombelle-recipe="${input.scope}"]`
  const animations = new Map<string, string>()
  root.walkAtRules(rule => {
    if (rule.name === 'keyframes') {
      if (!/^[a-z][a-z0-9-]*$/.test(rule.params))
        throw new FoundationError('INVALID_DATA', 'Invalid component recipe animation name')
      const scoped = `${rule.params}-${input.scope}`
      animations.set(rule.params, scoped)
      rule.params = scoped
    } else if (!rule.nodes || !['media', 'supports', 'layer'].includes(rule.name)) {
      throw new FoundationError('INVALID_DATA', 'Unsupported component recipe style at-rule')
    }
  })
  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && rule.parent.name.endsWith('keyframes')) return
    const selectors: string[] = []
    selectorParser(list => {
      list.each(selector => {
        let found = false
        let supported = true
        selector.walkAttributes(attribute => {
          if (attribute.attribute !== 'data-slot') return
          if (attribute.operator && (attribute.operator !== '=' || !attribute.value || !slots.has(attribute.value))) {
            supported = false
            return
          }
          found = true
          if (attribute.value) attribute.setValue(`recipe-${attribute.value}`, { quoteMark: '"' })
          attribute.parent!.insertAfter(attribute, selectorParser.attribute({
            attribute: 'data-ombelle-recipe',
            operator: '=',
            value: input.scope,
            quoteMark: '"',
            raws: { value: `"${input.scope}"` },
          }))
        })
        if (found && supported) selectors.push(selector.toString().trim())
      })
    }).processSync(rule.selector)
    if (selectors.length) rule.selector = selectors.join(', ')
    else rule.remove()
  })
  root.walkDecls(/^animation(?:-name)?$/, declaration => {
    declaration.value = declaration.value.replace(/[a-z][a-z0-9-]*/g, word => animations.get(word) ?? word)
  })
  const light = input.glass
    ? { ...input.theme.light, '--glass-refraction': 'initial', '--glass-inner-filter': input.theme.light['--glass-inner-filter'] ?? 'initial' }
    : input.theme.light
  return themeBlock(scope, light) +
    themeBlock(`${input.darkSelector} ${scope}, ${input.darkSelector}${scope}`, input.theme.dark) +
    root.toString() + appearanceCss(input.recipe, scope, input.darkSelector, input.glass)
}
