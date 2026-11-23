import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import postcss, { type Rule } from 'postcss'

// DES-06: the flat, minimalist, neo-brutalism and ombelle presets define no status tokens, and
// their status surfaces fall back to literal light pastels in both modes. The tokens cannot be
// added to those presets as they are: resolvePreset merges a built-in preset into every
// published preset, so it would change the hash of published preset codes (deferred). The
// strength bar, which filled with the soft surface token, now reads the status inks.
const older = ['flat', 'minimalist', 'neo-brutalism', 'ombelle']
const families = [...older, 'papier', 'organic', 'retro-futurism']

describe.each(older)('%s presets', (family) => {
  it('stay free of status tokens, so published preset hashes hold', () => {
    const preset = JSON.parse(readFileSync(new URL(`../src/presets/${family}.json`, import.meta.url), 'utf8'))
    for (const mode of ['light', 'dark']) expect(preset.modes[mode].success, mode).toBeUndefined()
  })
})

describe.each(families)('%s strength bar', (family) => {
  it('fills with the status ink, not the soft surface', () => {
    const css = readFileSync(new URL(`../src/styles/password-field/${family}.css`, import.meta.url), 'utf8')
    // The last top-level background of each fill wins.
    const last = new Map<string, string>()
    postcss.parse(css).walkRules((rule: Rule) => {
      if (rule.parent?.type !== 'root') return
      for (const selector of rule.selectors) if (selector.replace(/"/g, "'").startsWith("[data-slot='password-field-strength-bar']"))
        rule.walkDecls('background', decl => { last.set(selector, decl.value) })
    })
    expect(last.size).toBeGreaterThan(0)
    for (const [selector, value] of last) expect(value, selector).not.toMatch(/var\(--(success|warning),/)
  })
})
