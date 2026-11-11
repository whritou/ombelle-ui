import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const source = (file: string) => readFileSync(new URL(`../src/templates/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const shared = (text: string) => text.slice(text.indexOf('// sheet size hook'), text.indexOf('// end sheet size hook'))
const block = (family: string) => {
  const css = readFileSync(new URL(`../src/styles/sheet/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  return css.slice(css.indexOf('/* 0.7.3 variants */'))
}

describe('Sheet 0.7.3 variants', () => {
  it('shares one size hook between the editions, as identical text', () => {
    const radix = shared(source('sheet.tsx')), base = shared(source('base/sheet.tsx'))
    expect(radix.length).toBeGreaterThan(200)
    expect(base).toBe(radix)
  })

  it.each(['sheet.tsx', 'base/sheet.tsx'])('%s names both handles and bounds their values', file => {
    const text = source(file)
    expect(text).toContain('aria-label={label}')
    expect(text).toMatch(/label = 'Resize sheet'/)
    expect(text).toMatch(/label = 'Resize panel'|'Resize panel'/)
    expect(text).toMatch(/aria-valuemin=\{25\}/)
    expect(text).toMatch(/aria-valuemax=\{95\}/)
    expect(text).toMatch(/defaultSize = 320/)
    expect(text).toMatch(/minSize = 240/)
    expect(text).toMatch(/maxSize = 640/)
    expect(text).toContain('data-slot="sheet-handle"')
    expect(text).toContain('data-slot="sheet-resize-handle"')
  })

  it.each(families)('%s draws the bottom handle as a pill in a 24px target, and the resize grip on hover and focus', family => {
    const css = block(family)
    expect(css).toMatch(/\[data-slot='sheet-handle'\]\s*\{[^}]*block-size: 1\.5rem/)
    expect(css).toMatch(/\[data-slot='sheet-handle'\]::before\s*\{[^}]*inline-size: 2\.5rem/)
    expect(css).toMatch(/\[data-slot='sheet-resize-handle'\]\s*\{[^}]*inline-size: 0\.5rem/)
    expect(css).toMatch(/\[data-slot='sheet-resize-handle'\]:is\(:hover, :focus-visible\)::before/)
    expect(css).toMatch(/\[data-slot='sheet-content'\]:has\(\[data-sheet-dragging\]\)\s*\{[^}]*transition: none/)
  })
})
