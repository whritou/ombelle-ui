import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

// DES-12 and DES-03: one size scale. Every sized control keeps its default height (the
// density's --control-height plus the control's own fixed edge) and sits one 0.5rem step
// lower at sm and higher at lg, so sm, default and lg mean the same thing everywhere.
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism', 'liquid-glass'] as const
const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '')

type Rule = { selector: string; body: string }
function rules(css: string): Rule[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ selector: m[1]!.trim().replaceAll('"', "'").replace(/\s+/g, ' '), body: m[2]! }))
}

/** The px value of a height declaration at a control height and a component size step, or NaN for a literal. */
function px(value: string, controlHeight: number, step = 0): number {
  if (!value.includes('--control-height')) return Number.NaN
  const expression = value
    .replace(/var\(--control-height(?:,\s*[^)]*)?\)/g, String(controlHeight))
    .replace(/var\(--[a-z-]+-size-step,\s*0rem\)/g, String(step))
    .replace(/(\d*\.?\d+)rem/g, (_, n: string) => String(Number(n) * 16))
    .replace(/(\d*\.?\d+)px/g, '$1')
    .replace(/calc\(/g, '(')
    .replace(/max\(/g, 'Math.max(')
  if (!/^[\d\s.+\-*/(),Mathmax]+$/.test(expression)) throw new Error(`cannot evaluate ${value}`)
  return Function(`return ${expression}`)() as number
}

/** The last value a selector declares for a property (later rules win at equal specificity). */
function declared(css: string, selector: string, property: RegExp): string {
  const want = selector.replaceAll('"', "'")
  let value: string | undefined
  for (const rule of rules(css))
    if (rule.selector === want || rule.selector.split(',').map(part => part.trim()).includes(want)) {
      const match = rule.body.match(new RegExp(`(?:^|[;\\s])(?:${property.source})\\s*:\\s*([^;]+)`))
      if (match) value = match[1]!.trim()
    }
  if (value === undefined) throw new Error(`${selector} declares no ${property.source}`)
  return value
}
const height = (css: string, selector: string, property: RegExp, controlHeight = 40, step = 0) => px(declared(css, selector, property), controlHeight, step)

const minHeight = /min-height|min-block-size/

/**
 * Each control. A control styled by its own data-size lists its default, sm and lg selectors.
 * A compound control (glass styles name one slot per selector) sets --<id>-size-step on its
 * root, which the sized part reads.
 */
type Control = { name: string; sheet: (family: string) => string; property?: RegExp } & (
  | { sizes: [string, string, string] }
  | { part: string; root: string; step: string }
)
const controls: Control[] = [
  { name: 'Button', sheet: f => `styles/${f}.css`, sizes: ["[data-slot='button']", "[data-slot='button'][data-size='sm']", "[data-slot='button'][data-size='lg']"] },
  { name: 'Input', sheet: f => `styles/${f}.css`, sizes: ["[data-slot='input']", "[data-slot='input'][data-size='sm']", "[data-slot='input'][data-size='lg']"] },
  { name: 'Toggle', sheet: f => `styles/toggle/${f}.css`, sizes: ["[data-slot='toggle'][data-size='default']", "[data-slot='toggle'][data-size='sm']", "[data-slot='toggle'][data-size='lg']"] },
  { name: 'Select', sheet: f => `styles/select/${f}.css`, sizes: ["[data-slot='select-trigger']", "[data-slot='select-trigger'][data-size='sm']", "[data-slot='select-trigger'][data-size='lg']"] },
  { name: 'Native Select', sheet: f => `styles/native-select/${f}.css`, sizes: ["[data-slot='native-select']", "[data-slot='native-select'][data-size='sm']", "[data-slot='native-select'][data-size='lg']"] },
  { name: 'Number Input', sheet: f => `styles/number-input/${f}.css`, sizes: ["[data-slot='number-input']", "[data-slot='number-input'][data-size='sm']", "[data-slot='number-input'][data-size='lg']"] },
  { name: 'Combobox field', sheet: f => `styles/combobox/${f}.css`, part: "[data-slot='combobox-field']", root: "[data-slot='combobox']", step: '--combobox-size-step' },
  { name: 'Combobox input', sheet: f => `styles/combobox/${f}.css`, part: "[data-slot='combobox-input']", root: "[data-slot='combobox']", step: '--combobox-size-step', property: /block-size/ },
  { name: 'Tag Input', sheet: f => `styles/tag-input/${f}.css`, part: "[data-slot='tag-input']", root: "[data-slot='tag-input']", step: '--tag-input-size-step' },
  { name: 'Tag Input input', sheet: f => `styles/tag-input/${f}.css`, part: "[data-slot='tag-input-input']", root: "[data-slot='tag-input']", step: '--tag-input-size-step', property: /block-size/ },
  { name: 'Password Field control', sheet: f => `styles/password-field/${f}.css`, part: "[data-slot='password-field-control']", root: "[data-slot='password-field']", step: '--password-field-size-step' },
  { name: 'Password Field input', sheet: f => `styles/password-field/${f}.css`, part: "[data-slot='password-field-input']", root: "[data-slot='password-field']", step: '--password-field-size-step' },
  { name: 'Input Group', sheet: f => `styles/input-group/${f}.css`, part: "[data-slot='input-group']", root: "[data-slot='input-group']", step: '--input-group-size-step' },
  { name: 'Input Group input', sheet: f => `styles/input-group/${f}.css`, part: "[data-slot='input-group-input']", root: "[data-slot='input-group']", step: '--input-group-size-step' },
  { name: 'Color Picker', sheet: f => `styles/color-picker/${f}.css`, part: "[data-slot='color-picker-trigger']", root: "[data-slot='color-picker']", step: '--color-picker-size-step' },
  { name: 'Tabs', sheet: f => `styles/tabs/${f}.css`, part: "[data-slot='tabs-trigger']", root: "[data-slot='tabs-list']", step: '--tabs-size-step' },
  { name: 'Toggle Group toolbar', sheet: f => `styles/toggle-group/${f}.css`, part: "[data-slot='toggle-group-item'][data-variant='toolbar']", root: "[data-slot='toggle-group']", step: '--toggle-group-size-step' },
  { name: 'Toggle Group segmented', sheet: f => `styles/toggle-group/${f}.css`, part: "[data-slot='toggle-group-item'][data-variant='segmented']", root: "[data-slot='toggle-group']", step: '--toggle-group-size-step' },
]

/** The three heights of a control at a control height. */
function scale(css: string, control: Control, controlHeight: number): [number, number, number] {
  const property = control.property ?? minHeight
  if ('sizes' in control) return control.sizes.map(selector => height(css, selector, property, controlHeight)) as [number, number, number]
  // Floors (max(1.5rem, ...)) are checked on their own below.
  const raw = declared(css, control.part, property).replace(/^max\(1\.5rem,\s*(.*)\)$/, '$1')
  return [px(raw, controlHeight, 0), px(raw, controlHeight, -8), px(raw, controlHeight, 8)]
}

describe('shared size scale (DES-12, DES-03)', () => {
  for (const control of controls)
    it.each(families)(`${control.name} in %s: sm and lg sit one 0.5rem step from a default that follows density`, family => {
      const css = read(control.sheet(family))
      const [base, sm, lg] = scale(css, control, 40)
      expect(Number.isNaN(base), `${control.name} default is a literal`).toBe(false)
      expect(base - sm, `${control.name} sm step`).toBe(8)
      expect(lg - base, `${control.name} lg step`).toBe(8)
      // Compact density moves every size with it.
      const compact = scale(css, control, 36)
      expect(compact[0]).toBe(base - 4)
      expect(compact[2] - compact[0]).toBe(8)
      if ('root' in control) {
        expect(declared(css, `${control.root}[data-size='sm']`, new RegExp(control.step))).toBe('-0.5rem')
        expect(declared(css, `${control.root}[data-size='lg']`, new RegExp(control.step))).toBe('0.5rem')
      }
    })

  it.each(families)('%s names one slot per selector in the sized parts, as glass requires', family => {
    for (const control of controls) {
      if (!('root' in control)) continue
      for (const rule of rules(read(control.sheet(family))))
        for (const selector of rule.selector.split(','))
          if (/data-size/.test(selector)) expect(selector.match(/\[data-slot=/g)?.length ?? 0, selector).toBeLessThanOrEqual(1)
    }
  })

  it.each(families)('%s keeps every sized pointer target at 24px or more under compact density', family => {
    for (const sheet of ['toggle', 'toggle-group', 'tabs'].map(c => `styles/${c}/${family}.css`))
      for (const rule of rules(read(sheet)))
        for (const [, value] of rule.body.matchAll(/min-(?:block|inline)-size\s*:\s*([^;]+)/g)) {
          const at = px(value!.trim(), 36, /data-size='lg'/.test(rule.selector) ? 0 : -8)
          if (!Number.isNaN(at)) expect(at, `${sheet} ${rule.selector}`).toBeGreaterThanOrEqual(24)
        }
  })

  it.each(families)('%s keeps the default heights it had before the scale at comfortable density', family => {
    const before: [string, string, number][] = [
      [`styles/toggle/${family}.css`, "[data-slot='toggle'][data-size='default']", family === 'organic' || family === 'retro-futurism' ? 42 : 40],
      [`styles/combobox/${family}.css`, "[data-slot='combobox-field']", 42],
      [`styles/tag-input/${family}.css`, "[data-slot='tag-input']", 42],
      [`styles/tabs/${family}.css`, "[data-slot='tabs-trigger']", 44],
      [`styles/chip/${family}.css`, "[data-slot='chip']", family === 'organic' || family === 'retro-futurism' ? 32 : 28],
    ]
    for (const [sheet, selector, value] of before) expect(height(read(sheet), selector, minHeight), selector).toBe(value)
  })
})

const sized = ['combobox', 'tag-input', 'number-input', 'password-field', 'input-group', 'color-picker', 'toggle-group', 'tabs']
describe('size props in both editions', () => {
  for (const id of sized)
    it(`${id} takes size sm, default or lg and marks only sm and lg`, () => {
      for (const path of [`templates/${id}.tsx`, `templates/base/${id}.tsx`]) {
        if (!existsSync(new URL(`../src/${path}`, import.meta.url))) continue
        const source = read(path)
        expect(source, path).toMatch(/size\?: 'sm' \| 'default' \| 'lg'/)
        expect(source, path).toContain("data-size={size !== 'default' ? size : undefined}")
      }
    })

  it.each(['select.tsx', 'base/select.tsx', 'native-select.tsx'])('%s offers lg', path => {
    expect(read(`templates/${path}`)).toMatch(/size\?: 'sm' \| 'default' \| 'lg'/)
  })
})
