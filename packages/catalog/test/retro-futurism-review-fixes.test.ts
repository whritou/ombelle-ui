import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

// Findings from the Retro futurism specimen audit and branch review, each reproduced here before its fix.
const styles = 'packages/catalog/src/styles/'
const read = (file: string) => fs.readFileSync(styles + file, 'utf8').replace(/\r\n?/g, '\n')
const layer = (id: string) => read(id + '/retro-futurism.css').split('/* retro-futurism layer */')[1] ?? ''
const block = (css: string, selector: string) => {
  const at = css.lastIndexOf(selector + '{')
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('retro-futurism specimen audit fixes', () => {
  // The indigo ring drawn inside an orange button measured under 3:1, so the group no longer clips its children.
  it('lets a focused button-group child draw its ring outside the group', () => {
    const css = layer('button-group')
    expect(block(css, "[data-slot='button-group']")).not.toContain('overflow:hidden')
    expect(css).not.toMatch(/:focus-visible\{[^}]*outline-offset:-/)
    // Children keep their own pill ends; only the shared body's :not(:first-child)/:not(:last-child) rules square the joins.
    expect(block(css, "[data-slot='button-group'][data-orientation] > *")).not.toContain('radius')
  })

  // On the sunset band the indigo ring measured under 3:1; the header's own text colour reads on both band ends.
  it('rings focused controls in the card header in the header text colour', () => {
    expect(block(layer('card'), "[data-slot='card-header'] :is(button,a):focus-visible")).toContain('outline-color:var(--rf-head-fg,var(--primary-foreground))')
  })

  it('rings the focused sort button on the table header band in the band text colour', () => {
    expect(block(layer('table'), "[data-slot='table-head'] :is(button,a):focus-visible")).toContain('outline-color:var(--primary-foreground)')
  })
})

describe('retro-futurism final review fixes', () => {
  // The body's [aria-sort] rule (0,2,0) beat the band's inherit rule and drew the sorted header in indigo on the band.
  it('keeps the sorted column header in the band text colour', () => {
    expect(block(layer('table'), "[data-slot='table-sort']:is([aria-sort] > *)")).toContain('color:inherit')
  })

  // Only the header cells stick; the band on the row scrolled away and rows showed through.
  it('gives sticky header cells an opaque band', () => {
    expect(block(layer('table'), "[data-slot='table-head']:is([data-table-sticky] *)")).toMatch(/background:(var\(--rf-band\)|var\(--primary\))/)
  })

  // A 0,5,0 hover rule removed the pill ends and the seam of the hovered segment.
  it('lets hover and press on a group segment change only shadow, lift and filter', () => {
    const css = layer('button-group')
    const hover = block(css, "[data-slot='button-group'][data-orientation] > :is(button, a, [role='button']):not(:disabled):is(:hover, :active)")
    expect(hover).toContain('box-shadow:none')
    expect(hover).not.toMatch(/border|radius|margin/)
  })

  // The base hover, press and disabled rules (0,3,0) outranked the card-action reset.
  it('keeps card-action buttons flat when hovered, pressed or disabled', () => {
    const reset = block(layer('card'), "[data-slot='card-action'] [data-slot][data-variant]:is(:hover,:active,:disabled)")
    expect(reset).toContain('box-shadow:none')
    expect(reset).toContain('transform:none')
  })

  // A pill radius cut the corners of wrapped tooltip text, which is drawn in the page colour.
  it('rounds tooltips with a fixed radius so wrapped text stays inside', () => {
    expect(block(layer('tooltip'), "[data-slot='tooltip-content']")).toContain('border-radius:1rem')
  })
})
