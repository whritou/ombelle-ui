import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import postcss, { type Rule } from 'postcss'

// DES-05: a scrim mixed from the foreground is near white in dark mode, so opening an Alert
// Dialog or Sheet lightened the page. Every stable family's modal scrims must dim in both modes.
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism']
const scrims = [['', 'dialog-overlay'], ['alert-dialog/', 'alert-dialog-overlay'], ['sheet/', 'sheet-overlay'], ['sidebar/', 'sidebar-sheet-overlay']] as const

/** The last background declared at the top level for exactly this slot. */
function background(css: string, slot: string): string | undefined {
  let last: string | undefined
  postcss.parse(css).walkRules((rule: Rule) => {
    if (rule.parent?.type !== 'root' || !rule.selectors.some(selector => selector.replace(/"/g, "'") === `[data-slot='${slot}']`)) return
    rule.walkDecls(/^background(-color)?$/, decl => { last = decl.value })
  })
  return last
}

describe.each(families)('%s scrims', (family) => {
  it.each(scrims)('%s%s dims the page in dark mode', (dir, slot) => {
    const value = background(readFileSync(new URL(`../src/styles/${dir}${family}.css`, import.meta.url), 'utf8'), slot)
    expect(value, slot).toBeDefined()
    expect(value).not.toMatch(/var\(--foreground\)\s*[3-9]\d%\s*,\s*transparent/)
  })
})
