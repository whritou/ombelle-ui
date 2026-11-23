import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import postcss, { type Declaration, type Rule } from 'postcss'

// DES-01, A11Y-05: a text field must draw a boundary, and its invalid rule must change
// something that is drawn. In flat, Combobox and Tag Input had `border: 0` and an invalid rule
// that only recoloured that missing border; Number Input had a 1px hairline at about 1.1:1.
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism']
const fields = [
  ['combobox', 'combobox-field', ":has([aria-invalid='true'])"],
  ['tag-input', 'tag-input', ":has([aria-invalid='true'])"],
  ['number-input', 'number-input', '[data-invalid]'],
] as const

/** The declarations of rules whose selector is exactly `selector`, outside at-rules, in source order. */
function declarations(css: string, selector: string): Map<string, string> {
  const out = new Map<string, string>()
  postcss.parse(css).walkRules((rule: Rule) => {
    if (rule.parent?.type !== 'root') return
    if (!rule.selectors.some(item => item.replace(/"/g, "'") === selector)) return
    rule.walkDecls((decl: Declaration) => {
      // Shorthands reset their longhands.
      for (const key of [...out.keys()]) if (key.startsWith(decl.prop + '-')) out.delete(key)
      out.set(decl.prop, decl.value)
    })
  })
  return out
}
const widthOf = (value: string | undefined) => value === undefined ? undefined : /(^|\s)(0|none)(\s|$)/.test(value) ? 0 : Number.parseFloat(/[\d.]+px/.exec(value)?.[0] ?? '1')

describe.each(families)('%s text fields', (family) => {
  it.each(fields)('%s draws a boundary and an invalid state', (component, slot, invalid) => {
    const css = readFileSync(new URL(`../src/styles/${component}/${family}.css`, import.meta.url), 'utf8')
    const base = declarations(css, `[data-slot='${slot}']`)
    const endWidth = widthOf(base.get('border-block-end') ?? base.get('border-bottom')) ?? widthOf(base.get('border-width')) ?? widthOf(base.get('border')) ?? 0
    const hasShadowEdge = /inset|0 0 0 [1-9]/.test(base.get('box-shadow') ?? '')
    expect(endWidth > 0 || hasShadowEdge, 'field boundary').toBe(true)
    if (family === 'flat') expect(endWidth, 'flat field rule').toBeGreaterThanOrEqual(2)

    const changed = declarations(css, `[data-slot='${slot}']${invalid}`)
    const drawn = [...changed.keys()].some(prop => !prop.startsWith('border') || !prop.endsWith('color') || endWidth > 0)
    expect(drawn || changed.has('box-shadow') || changed.has('outline'), 'invalid state is drawn').toBe(true)
  })
})
