import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { validatePreset } from '@ombelle/contracts'
import postcss, { type Rule } from 'postcss'

// DES-06: presets without status tokens left every status surface on a light pastel fallback
// in dark mode, and the Password Field strength bar filled with the soft surface token.
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism']
const statuses = ['success', 'warning', 'info'] as const
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

describe.each(families)('%s status colours', (family) => {
  const preset = JSON.parse(readFileSync(new URL(`../src/presets/${family}.json`, import.meta.url), 'utf8'))
  it('defines soft surfaces and inks in both modes, dark surfaces in dark mode', () => {
    validatePreset(preset)
    for (const status of statuses) {
      for (const mode of ['light', 'dark']) {
        expect(preset.modes[mode][status], `${mode} ${status}`).toBeTypeOf('string')
        expect(preset.modes[mode][status + 'Foreground'], `${mode} ${status}Foreground`).toBeTypeOf('string')
      }
      const dark = preset.modes.dark[status]
      if (/^#[0-9a-f]{6}$/i.test(dark)) expect(luminance(dark), `dark ${status}`).toBeLessThan(0.1)
    }
  })
  it('fills the strength bar with the status ink, not the soft surface', () => {
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
