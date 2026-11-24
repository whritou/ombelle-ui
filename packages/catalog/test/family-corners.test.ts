import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// DES-14: papier is a 2px-corner family and neo-brutalism a square one; these parts had literal
// corners (12px, 0.25rem, 3px, 6px) that broke the family and ignored --radius.
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const firstRule = (css: string, selector: string) => new RegExp(escape(selector) + String.raw`\s*\{([^}]*)\}`).exec(css)?.[1] ?? ''
describe('family corners follow --radius', () => {
  it.each([
    ['toggle/papier.css', "[data-slot='toggle']"],
    ['hover-card/neo-brutalism.css', "[data-slot='hover-card-trigger']"],
    ['meter/neo-brutalism.css', "[data-slot='meter-legend-item'] > i"],
    ['alert-dialog/neo-brutalism.css', "[data-slot='alert-dialog-confirm-label'] code"],
  ])('%s %s', (file, selector) => {
    const css = readFileSync(new URL(`../src/styles/${file}`, import.meta.url), 'utf8')
    const body = firstRule(css, selector)
    expect(body).toContain('border-radius')
    expect(body).toMatch(/border-radius:\s*var\(--radius\)/)
  })
})
