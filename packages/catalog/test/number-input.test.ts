import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as ui from '../src/templates/number-input.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Number Input', () => {
  it('provides NumberInput, one template for both editions', () => {
    expectComponentContract('number-input', { client: true, parts: ['NumberInput'],
      slots: ['number-input', 'number-input-input', 'number-input-decrement', 'number-input-increment', 'number-input-unit'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='number-input']", "[data-slot='number-input-input']", "[data-slot='number-input-unit']"], glass: 'experimental' })
    const catalog = getCatalog('0.1.0')
    expect(getTemplate(catalog, 'number-input', 'base').content).toBe(getTemplate(catalog, 'number-input').content)
  })

  it('parses only complete numbers', () => {
    expect(ui.parseNumberText('12')).toBe(12)
    expect(ui.parseNumberText(' -1.5 ')).toBe(-1.5)
    expect(ui.parseNumberText('.5')).toBe(0.5)
    for (const text of ['', '-', '1.', '12a', '1e3', '1,5']) expect(ui.parseNumberText(text), text).toBeNull()
  })

  it('steps from the value, or from the minimum when empty, and clamps', () => {
    expect(ui.stepValue(31, 10, 0, 32)).toBe(32)
    expect(ui.stepValue(null, 1, 4)).toBe(5)
    expect(ui.stepValue(null, -1)).toBe(-1)
    expect(ui.stepValue(0.1, 0.2)).toBe(0.3)
    expect(ui.stepValue(2, -10, 0)).toBe(0)
  })

  it('names the spoken units', () => {
    expect(ui.spokenUnit('px')).toBe('pixels')
    expect(ui.spokenUnit('ms')).toBe('milliseconds')
    expect(ui.spokenUnit('%')).toBe('percent')
    expect(ui.spokenUnit('deg')).toBe('degrees')
    expect(ui.spokenUnit('min')).toBe('min')
  })

  it('renders a spinbutton with its range, value text and named steppers', () => {
    const html = renderToStaticMarkup(h(ui.NumberInput, { 'aria-label': 'Radius', defaultValue: 8, min: 0, max: 32, unit: 'px' }))
    expect(html).toContain('role="spinbutton"')
    expect(html).toContain('inputMode="decimal"')
    expect(html).toContain('aria-valuenow="8"')
    expect(html).toContain('aria-valuemin="0"')
    expect(html).toContain('aria-valuemax="32"')
    expect(html).toContain('aria-valuetext="8 pixels"')
    expect(html).toContain('type="text"')
    expect(html.match(/tabindex="-1"/gi)).toHaveLength(2)
    expect(html).toContain('aria-label="Decrease Radius"')
    expect(html).toContain('aria-label="Increase Radius"')
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(2)
    expect(html).toMatch(/data-slot="number-input-unit" aria-hidden="true">px</)
  })

  it('disables the stepper at its bound and puts the id on the input', () => {
    const html = renderToStaticMarkup(h(ui.NumberInput, { id: 'radius', 'aria-label': 'Radius', defaultValue: 32, min: 0, max: 32 }))
    expect(html).toMatch(/aria-label="Increase Radius" disabled=""/)
    expect(html).not.toMatch(/aria-label="Decrease Radius" disabled=""/)
    expect(html).toMatch(/<input[^>]*id="radius"/)
  })

  it('takes custom stepper names and leaves an empty value without valuenow', () => {
    const html = renderToStaticMarkup(h(ui.NumberInput, { 'aria-label': 'Delay', value: null, decrementLabel: 'Less', incrementLabel: 'More' }))
    expect(html).toContain('aria-label="Less"')
    expect(html).toContain('aria-label="More"')
    expect(html).not.toContain('aria-valuenow')
  })
})
