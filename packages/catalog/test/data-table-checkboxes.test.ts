import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import postcss, { type Rule } from 'postcss'

// DES-07: the row and select-all checkboxes must be drawn by the family, not left as the
// browser's control (a white square on a dark table, reading as checked).
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism']

describe.each(families)('%s Data Table checkboxes', (family) => {
  it('remove the native appearance and draw a checked state', () => {
    const declared = new Map<string, string>()
    const checked = new Map<string, string>()
    postcss.parse(readFileSync(new URL(`../src/styles/data-table/${family}.css`, import.meta.url), 'utf8')).walkRules((rule: Rule) => {
      if (rule.parent?.type !== 'root') return
      const target = rule.selectors.map(selector => selector.replace(/"/g, "'"))
      if (target.includes("[data-slot='data-table-cell'] > [data-data-table-select]")) rule.walkDecls(decl => { declared.set(decl.prop, decl.value) })
      if (target.some(selector => /^\[data-slot='data-table-cell'\] > \[data-data-table-select\](:checked|:is\(:checked)/.test(selector))) rule.walkDecls(decl => { checked.set(decl.prop, decl.value) })
    })
    expect(declared.get('appearance')).toBe('none')
    expect(checked.get('background') ?? checked.get('background-color')).toBeDefined()
  })
})
