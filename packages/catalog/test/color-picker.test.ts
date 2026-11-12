import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/color-picker.js'
import * as base from '../src/templates/base/color-picker.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

const editions = [['radix', radix], ['base', base]] as const
const slots = ['color-picker', 'color-picker-trigger', 'color-picker-preview', 'color-picker-input', 'color-picker-content', 'color-picker-area',
  'color-picker-area-thumb', 'color-picker-hue', 'color-picker-hue-thumb', 'color-picker-format', 'color-picker-format-select', 'color-picker-value',
  'color-picker-eyedropper', 'color-picker-swatches', 'color-picker-swatch', 'color-picker-contrast', 'color-picker-contrast-level', 'color-picker-pair']
const block = (file: string, name: string) => {
  const text = readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const start = text.indexOf(`// ${name}:start`), end = text.indexOf(`// ${name}:end`)
  expect(start, `${file} ${name}`).toBeGreaterThan(-1)
  return text.slice(start, end)
}

describe('Color Picker', () => {
  it('provides ColorPicker, ColorPickerSwatches and ColorPickerPair, on Radix Popover and Slider and on Base UI', () => {
    expectComponentContract('color-picker', { client: true, parts: ['ColorPicker', 'ColorPickerSwatches', 'ColorPickerPair'], slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-popover', version: '1.3.1' }, { name: '@radix-ui/react-slider', version: '1.6.1' },
        { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='color-picker-trigger']", "[data-slot='color-picker-content']", "[data-slot='color-picker-area-thumb']", "[data-slot='color-picker-hue-thumb']"],
      glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'color-picker', 'base').dependencies.map(d => d.name).sort())
      .toEqual(['@base-ui/react', 'clsx', 'lucide-react', 'react', 'tailwind-merge'])
  })

  it('keeps the colour maths and the picker UI identical in both editions', () => {
    for (const name of ['color-math', 'color-picker-ui'])
      expect(block('../src/templates/base/color-picker.tsx', name)).toBe(block('../src/templates/color-picker.tsx', name))
  })

  it.each(editions)('%s renders a named swatch trigger and text field, with no eyedropper on the server', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ColorPicker, { label: 'Primary', defaultValue: '#1d4ed8', id: 'primary', name: 'primary' }))
    expect(html).toMatch(/<button[^>]*aria-label="Open Primary color picker"/)
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*aria-label="Open Primary color picker"|aria-label="Open Primary color picker"[^>]*aria-expanded="false"/)
    expect(html).toMatch(/<input[^>]*aria-label="Primary"[^>]*value="#1d4ed8"|<input[^>]*value="#1d4ed8"[^>]*aria-label="Primary"/)
    expect(html).toMatch(/<input[^>]*id="primary"/)
    expect(html).toMatch(/<input[^>]*name="primary"/)
    expect(html).not.toContain('Pick a color from the screen')
    expect(html).toContain('background:#1d4ed8')
  })

  it.each(editions)('%s marks text that is not a colour', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ColorPicker, { label: 'Primary', value: 'oklch(0.55', onValueChange: () => {} }))
    expect(html).toContain('aria-invalid="true"')
    expect(html).toMatch(/data-slot="color-picker-trigger"[^>]*data-invalid=""/)
  })

  it.each(editions)('%s shows the placeholder colour for an empty value', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ColorPicker, { label: 'Border', defaultValue: '', placeholder: '#ff0000' }))
    expect(html).toContain('placeholder="#ff0000"')
    expect(html).toContain('background:#ff0000')
    expect(html).toContain('data-empty=""')
    expect(html).not.toContain('aria-invalid')
  })

  it.each(editions)('%s labels a pair and its light and dark pickers', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ColorPickerPair, { label: 'Primary' },
      h(ui.ColorPicker, { mode: 'light', defaultValue: 'oklch(0.55 0.22 6)' }),
      h(ui.ColorPicker, { mode: 'dark', defaultValue: 'oklch(0.7 0.18 6)' })))
    expect(html).toMatch(/^<div role="group" aria-label="Primary" data-slot="color-picker-pair"/)
    expect(html).toContain('aria-label="Open Primary · light color picker"')
    expect(html).toContain('aria-label="Open Primary · dark color picker"')
    expect(html).toMatch(/data-slot="color-picker-trigger" data-mode="dark"/)
  })
})
