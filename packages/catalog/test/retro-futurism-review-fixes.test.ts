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
    expect(block(css, "[data-slot='button-group'][data-orientation='horizontal'] > :first-child")).toContain('border-start-start-radius:var(--rf-pill)')
    expect(block(css, "[data-slot='button-group'][data-orientation='horizontal'] > :last-child")).toContain('border-end-end-radius:var(--rf-pill)')
  })

  // On the sunset band the indigo ring measured under 3:1; the header's own text colour reads on both band ends.
  it('rings focused controls in the card header in the header text colour', () => {
    expect(block(layer('card'), "[data-slot='card-header'] :is(button,a):focus-visible")).toContain('outline-color:var(--rf-head-fg,var(--primary-foreground))')
  })

  it('rings the focused sort button on the table header band in the band text colour', () => {
    expect(block(layer('table'), "[data-slot='table-head'] :is(button,a):focus-visible")).toContain('outline-color:var(--primary-foreground)')
  })
})
