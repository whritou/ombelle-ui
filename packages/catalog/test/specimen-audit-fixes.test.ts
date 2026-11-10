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

  it('neo-brutalism Dialog close draws its ring inside itself, in its own text colour', () => {
    // The surface behind the button varies (the yellow title bar or the dialog body), so the ring stays on the button.
    const rule = declarations(read('neo-brutalism.css'), "[data-slot='dialog-close']:focus-visible")
    expect(rule['outline-color']).toBe('currentColor')
    expect(rule['outline-offset']).toBe('-6px')
  })
})

describe('neo-brutalism Radio Group', () => {
  it('draws the item ring in the text colour of the option under it', () => {
    const css = read('radio-group/neo-brutalism.css')
    expect(declarations(css, "[data-slot='radio-group-item']:focus-visible").outline).toBe('3px dashed var(--foreground)')
    // Only a checked option is filled with --secondary, so only there does the ring take its foreground;
    // a bare checked item sits on the page and keeps the foreground ring.
    expect(declarations(css, "[data-slot='radio-group-item'][data-state='checked']:focus-visible")['outline-color']).toBeUndefined()
    expect(declarations(css, "[data-slot='radio-group-option']:has([data-slot='radio-group-item'][data-state='checked']) [data-slot='radio-group-item']:focus-visible")['outline-color'])
      .toBe('var(--secondary-foreground)')
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
  it.each(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'])('%s Select and Dropdown Menu items carry an inset ring', family => {
    for (const [file, selector] of [['select', "[data-slot='select-item'][data-highlighted]"], ['dropdown-menu', "[data-slot='dropdown-menu-item'][data-highlighted]"]]) {
      const rule = declarations(read(`${file}/${family}.css`), selector)
      // Liquid glass draws every focus indicator in ink rather than the blue ring.
      expect(rule.outline, `${file}/${family}`).toBe(family === 'liquid-glass' ? '2px solid var(--foreground)' : '2px solid var(--ring)')
      expect(rule['outline-offset'], `${file}/${family}`).toBe('-2px')
    }
  })
})

describe('liquid glass focus', () => {
  // A thin ink ring that hugs the control: no blue, no gap (user decision, 9 November 2026).
  const files = [...fs.readdirSync('packages/catalog/src/styles', { recursive: true }) as string[]]
    .map(file => file.replaceAll('\\', '/')).filter(file => /(^|\/)liquid-glass(-lab)?\.css$/.test(file))
  it.each(files)('%s draws focus as a 2px ink ring with no gap', file => {
    const css = read(file)
    expect(css).not.toContain('var(--ring)')
    postcss.parse(css).walkRules(rule => {
      if (!rule.selector.includes(':focus-visible') || rule.parent?.type === 'atrule' && (rule.parent as postcss.AtRule).params.includes('forced-colors')) return
      // `none` is allowed where a wrapper draws the ring through :focus-within (Input Group).
      rule.walkDecls('outline', decl => expect(['2px solid var(--foreground)', 'none'], `${file} ${rule.selector}`).toContain(decl.value))
      rule.walkDecls('outline-offset', decl => expect(Number.parseFloat(decl.value), `${file} ${rule.selector}`).toBeLessThanOrEqual(0))
    })
  })
})

describe('Field preview control in forced colors', () => {
  // A family whose focus style removes the outline must draw one back in forced colors, where borders lose their colour.
  it.each(['flat', 'liquid-glass', 'minimalist', 'neo-brutalism', 'ombelle'])('%s draws a visible focus outline', family => {
    let outline = ''
    postcss.parse(read(`field/${family}.css`)).walkAtRules('media', media => {
      if (!media.params.includes('forced-colors')) return
      media.walkRules(rule => {
        if (rule.selector.replaceAll('"', "'") === "[data-slot='field'] [data-field-input]:focus-visible")
          rule.walkDecls('outline', decl => { outline = decl.value })
      })
    })
    expect(outline).toMatch(/^[1-9]\d*px solid Highlight$/)
  })
})

describe('Field preview control matches the board', () => {
  it('flat draws the filled Input: muted fill, underline, square bottom corners', () => {
    const rule = declarations(read('field/flat.css'), "[data-slot='field'] [data-field-input]")
    expect([rule.background, rule.border, rule['border-bottom'], rule['border-radius']])
      .toEqual(['var(--muted)', '0', '2px solid var(--input)', 'var(--radius) var(--radius) 0 0'])
  })
})

describe('display components match the 0.7.3 boards', () => {
  const families = ['flat', 'liquid-glass', 'minimalist', 'neo-brutalism', 'ombelle']
  it.each(families)('%s Stepper titles are bold in every state', family => {
    expect(declarations(read(`stepper/${family}.css`), "[data-slot='stepper-title']")['font-weight']).toBe('700')
    expect(declarations(read(`stepper/${family}.css`), "[data-slot='stepper-title'][data-status='current']")['font-weight']).toBeUndefined()
  })
  it.each(families)('%s complete Stepper indicator keeps the line border', family => {
    expect(declarations(read(`stepper/${family}.css`), "[data-slot='stepper-indicator'][data-status='complete']")['border-color']).toBeUndefined()
  })
  it('neo-brutalism Empty title is black weight', () => {
    expect(declarations(read('empty/neo-brutalism.css'), "[data-slot='empty-title']")['font-weight']).toBe('900')
  })
  it('neo-brutalism Meter value is uppercase and tracked like its label', () => {
    const rule = declarations(read('meter/neo-brutalism.css'), "[data-slot='meter-value']")
    expect([rule['text-transform'], rule['letter-spacing']]).toEqual(['uppercase', '0.05em'])
  })
})
