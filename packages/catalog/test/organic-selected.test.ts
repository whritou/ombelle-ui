import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// A11Y-12: in organic the selected Toggle Group segment and default Tab differed from the others
// by a fill at about 1.2:1 only. They now carry a ring in the foreground colour.
const last = (css: string, selector: string) => {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(match => match[1]!.trim().split(/\s*,\s*/).includes(selector))
  // Forced-colours rules (Highlight) are not the normal look.
  return rules.filter(match => !match[2]!.includes('Highlight')).at(-1)?.[2] ?? ''
}
describe('organic selected segments', () => {
  it.each([
    ['tabs', "[data-slot='tabs-trigger'][data-state='active']"],
    ['toggle-group', "[data-slot='toggle-group-item'][data-variant='segmented'][data-state='on']"],
  ])('%s draws a foreground ring on the selected item', (component, selector) => {
    const css = readFileSync(new URL(`../src/styles/${component}/organic.css`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(last(css, selector)).toMatch(/box-shadow:\s*inset 0 0 0 2px var\(--foreground\)/)
  })
})
