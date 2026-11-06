import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import { FoundationError, type ThemeData } from '@ombelle/contracts'

export function compileComponentRecipeStyles(input: {
  styles: readonly string[]
  slots: readonly string[]
  scope: string
  theme: ThemeData
  darkSelector: string
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
  const block = (selector: string, values: ThemeData['light']) =>
    `${selector}{${Object.entries(values).sort(([a], [b]) => a < b ? -1 : 1)
      .map(([key, value]) => `${key}:${value};`).join('')}}`
  return block(scope, input.theme.light) +
    block(`${input.darkSelector} ${scope}, ${input.darkSelector}${scope}`, input.theme.dark) +
    root.toString()
}
