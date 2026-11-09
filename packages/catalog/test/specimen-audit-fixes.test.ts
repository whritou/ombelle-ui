// Defects found by the specimen audit (docs/evidence/specimen-audit.md), pinned in the reviewed styles.
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import postcss from 'postcss'

const read = (file: string) => fs.readFileSync('packages/catalog/src/styles/' + file, 'utf8')

/** Declarations of the first top-level rule (outside @media) whose selector list contains `selector`. */
function declarations(css: string, selector: string): Record<string, string> {
  const out: Record<string, string> = {}
  postcss.parse(css).walkRules(rule => {
    if (rule.parent?.type === 'atrule') return
    if (!rule.selectors.map(item => item.replaceAll('"', "'")).includes(selector)) return
    rule.walkDecls(decl => { out[decl.prop] = decl.value })
  })
  return out
}
const px = (value: string) => {
  const rem = /^([\d.]+)rem$/.exec(value)
  return rem ? Number(rem[1]) * 16 : Number.parseFloat(value)
}

describe('focus rings contrast with the surface they are drawn on', () => {
  it('neo-brutalism Accordion draws its inset ring in the trigger text colour', () => {
    expect(declarations(read('accordion/neo-brutalism.css'), "[data-slot='accordion-trigger']:focus-visible").outline)
      .toBe('3px dashed currentColor')
  })

  it('neo-brutalism Dialog close draws its ring in the dialog text colour', () => {
    expect(declarations(read('neo-brutalism.css'), "[data-slot='dialog-close']:focus-visible")['outline-color'])
      .toBe('var(--popover-foreground)')
  })
})

describe('scrolling Toast viewports hold their toast shadow', () => {
  // Reach below the toast of `0 16px 36px -14px` is 16 + 36 - 14 = 38px; sideways 36 - 14 = 22px.
  it.each([['flat', 38, 22], ['minimalist', 34, 18]])('%s viewport padding covers the shadow reach', (family, below, side) => {
    const viewport = declarations(read(`toast/${family}.css`), "[data-slot='toast-viewport']")
    const [top, inline, bottom = top] = viewport.padding!.split(/\s+/).map(px)
    expect(bottom).toBeGreaterThanOrEqual(below)
    expect(inline).toBeGreaterThanOrEqual(side)
  })
})

describe('liquid glass Progress', () => {
  it('keeps the indicator glow inside the clipped track', () => {
    const css = read('progress/liquid-glass.css')
    for (const selector of ["[data-slot='progress-indicator']", "[data-slot='progress-indicator'][data-state='complete']"])
      expect(declarations(css, selector)['box-shadow']).toMatch(/^inset /)
  })
})

describe('highlighted list and menu items show a 3:1 indicator', () => {
  it.each(['flat', 'minimalist', 'ombelle', 'liquid-glass'])('%s Select and Dropdown Menu items carry an inset ring', family => {
    for (const [file, selector] of [['select', "[data-slot='select-item'][data-highlighted]"], ['dropdown-menu', "[data-slot='dropdown-menu-item'][data-highlighted]"]]) {
      const rule = declarations(read(`${file}/${family}.css`), selector)
      expect(rule.outline, `${file}/${family}`).toBe('2px solid var(--ring)')
      expect(rule['outline-offset'], `${file}/${family}`).toBe('-2px')
    }
  })
})
