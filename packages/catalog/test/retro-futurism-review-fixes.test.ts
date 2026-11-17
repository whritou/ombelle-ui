import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

// Findings from the Retro futurism specimen audit and branch review, each reproduced here before its fix.
const styles = 'packages/catalog/src/styles/'
const read = (file: string) => fs.readFileSync(styles + file, 'utf8').replace(/\r\n?/g, '\n')
const layer = (id: string) => read(id + '/retro-futurism.css').split('/* retro-futurism layer */')[1] ?? ''
const retroComponentIds = fs
  .readdirSync(styles, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(styles + entry.name + '/retro-futurism.css'))
  .map((entry) => entry.name)
// Every rule with exactly this selector, outside forced-colors blocks, joined in cascade order.
const withoutForcedColors = (css: string) => {
  for (let at = css.search(/@media\s*\(forced-colors:\s*active\)/); at >= 0; at = css.search(/@media\s*\(forced-colors:\s*active\)/)) {
    let depth = 0
    let end = css.indexOf('{', at)
    do {
      if (css[end] === '{') depth++
      else if (css[end] === '}') depth--
      end++
    } while (depth > 0 && end < css.length)
    css = css.slice(0, at) + css.slice(end)
  }
  return css
}
const block = (css: string, selector: string) =>
  [...withoutForcedColors(css).matchAll(/(^|[}\n])([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[2]!.trim() === selector)
    .map(match => selector + '{' + match[3])
    .join('\n')

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

describe('retro-futurism deferred review minors', () => {
  // Fields keep their 14px corners on focus, like the base Input; only the ring changes.
  it.each([
    ['textarea', "[data-slot='textarea']:focus-visible"],
    ['select', "[data-slot='select-trigger']:focus-visible,[data-slot='select-trigger'][aria-expanded='true']"],
    ['native-select', "[data-slot='native-select']:focus-visible"],
    ['combobox', "[data-slot='combobox-field']:focus-within"],
    ['input-group', "[data-slot='input-group']:focus-within"],
    ['password-field', "[data-slot='password-field-control']:focus-within"],
    ['input-otp', "[data-slot='input-otp-slot'][data-active],[data-slot='input-otp-slot']:focus"],
  ])('%s keeps its corners when focused', (id, selector) => {
    const focus = block(layer(id), selector)
    expect(focus).toContain('outline:3px solid var(--ring)')
    expect(focus).not.toContain('--rf-r3')
    expect(read(id + '/retro-futurism.css')).not.toMatch(/border-radius 0\.4s/)
  })

  // --rf-e2 reaches 8px below its box (6px offset plus 2px spread); siblings must not cover it.
  it.each([
    ['toolbar', "[data-slot='toolbar']"],
    ['table', "[data-slot='table-container']"],
    ['accordion', "[data-slot='accordion'][data-appearance='bordered']"],
    ['scroll-area', "[data-slot='scroll-area']"],
    ['code-block', "[data-slot='code-block']"],
    ['aspect-ratio', "[data-slot='aspect-ratio']"],
  ])('%s leaves room for its 8px key shadow', (id, selector) => {
    expect(block(layer(id), selector)).toContain('margin-block-end:8px')
  })

  it('keeps a card description muted outside a banded header', () => {
    const css = layer('card')
    expect(block(css, "[data-slot='card-description']")).toContain('color:var(--rf-desc,var(--muted-foreground))')
    // In a banded header the description takes the header text colour (primary-foreground on the band).
    // `inherit` in a custom property copies the parent's unset --rf-desc, which fell back to the muted
    // colour and left the description at 1.1:1 on the band; currentColor resolves to the header colour.
    expect(block(css, "[data-slot='card-header']")).toContain('--rf-desc:var(--rf-head-desc,currentColor)')
  })

  it('never sets a retro-futurism custom property to inherit', () => {
    for (const id of retroComponentIds) expect(layer(id), id).not.toMatch(/--[\w-]+:[^;{}]*\binherit\b/)
  })

  it('draws a link underline in the card header in the header text colour', () => {
    expect(block(layer('card'), "[data-slot='card-header'] :is(button,a):is([data-variant='ghost'],[data-variant='link'])")).toContain('text-decoration-color:currentColor')
  })

  it('draws one outline on item media and keeps item boundaries in forced colours', () => {
    const css = layer('item')
    expect(block(css, "[data-slot='item-media'][data-variant='icon'],[data-slot='item-media'][data-variant='image']")).toContain('border:0')
    expect(css.match(/\[data-slot='item'\]:hover\{/g)).toHaveLength(1)
    const forced = css.split('@media (forced-colors: active)').slice(1).join('')
    expect(forced).toMatch(/\[data-slot='item-media'\]\[data-variant='image'\][^{]*\{[^}]*border:2px solid CanvasText/)
    expect(forced).toMatch(/\[data-item-action\][^{]*\{[^}]*border:2px solid (CanvasText|ButtonText)/)
  })

  it('rounds compact alerts with a fixed radius so wrapped text stays inside', () => {
    expect(block(layer('alert'), "[data-slot='alert'][data-layout='compact']")).toContain('border-radius:1.375rem')
  })
})

