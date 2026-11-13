import { describe, expect, it } from 'vitest'
import * as React from 'react'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/slider.js'
import * as base from '../src/templates/base/slider.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

// The two editions' props differ in detail; each test passes props both accept.
const editions = [['radix', radix], ['base', base]] as unknown as readonly (readonly ['radix' | 'base', { Slider: React.FC<Record<string, unknown>>; SliderTicks: React.FC<Record<string, unknown>> }])[]
// Radix thumbs are span role="slider"; Base UI thumbs wrap a native range input.
const thumbs = (html: string) => [...html.matchAll(/<span[^>]*role="slider"[^>]*>|<input[^>]*type="range"[^>]*>/g)].map(match => match[0])
const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1]

describe('Slider', () => {
  it('provides Slider and SliderTicks, on Radix Slider and Base UI', () => {
    expectComponentContract('slider', { client: true, parts: ['Slider', 'SliderTicks', 'SliderValue'],
      slots: ['slider', 'slider-track', 'slider-range', 'slider-thumb', 'slider-ticks', 'slider-tick', 'slider-field', 'slider-header', 'slider-value', 'slider-value-input'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-slider', version: '1.6.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='slider']", "[data-slot='slider-track']", "[data-slot='slider-range']", "[data-slot='slider-thumb']"], glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'slider', 'base').dependencies.map(d => d.name)).toContain('@base-ui/react')
  })

  it.each(editions)('%s names a single thumb from the root and reads its value text', (edition, ui) => {
    const html = renderToStaticMarkup(h(ui.Slider, { defaultValue: [12], max: 24, 'aria-label': 'Border radius', getValueText: (value: number) => `${value} pixels` }))
    const [thumb, extra] = thumbs(html)
    expect(extra).toBeUndefined()
    expect(attr(thumb!, 'aria-label')).toBe('Border radius')
    expect(attr(thumb!, 'aria-valuemax') ?? attr(thumb!, 'max')).toBe('24')
    // Radix sets a thumb's value only once it has mounted; the browser test checks it there.
    if (edition === 'base') {
      expect(attr(thumb!, 'aria-valuetext')).toBe('12 pixels')
      expect(attr(thumb!, 'aria-valuenow') ?? attr(thumb!, 'value')).toBe('12')
    }
  })

  it.each(editions)('%s names each thumb of a range', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Slider, { defaultValue: [20, 80], thumbLabels: ['Minimum price', 'Maximum price'] }))
    expect(thumbs(html).map(thumb => attr(thumb, 'aria-label'))).toEqual(['Minimum price', 'Maximum price'])
  })

  it.each(editions)('%s passes its description, and in Radix its invalid state, to every thumb', (edition, ui) => {
    const html = renderToStaticMarkup(h(ui.Slider, { defaultValue: [20, 80], thumbLabels: ['Minimum', 'Maximum'], 'aria-describedby': 'hint', 'aria-invalid': true }))
    expect(thumbs(html).map(thumb => attr(thumb, 'aria-describedby'))).toEqual(['hint', 'hint'])
    // Base UI's thumb input takes no aria-invalid; inside a Base UI Field the field sets it.
    if (edition === 'radix') expect(thumbs(html).map(thumb => attr(thumb, 'aria-invalid'))).toEqual(['true', 'true'])
  })

  it.each(editions)('%s hides the tick labels from assistive technology', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.SliderTicks, { values: [0, 50, 100], min: 0, max: 100 }))
    expect(html).toMatch(/^<div[^>]*aria-hidden="true"/)
    expect((html.match(/data-slot="slider-tick"/g) ?? []).length).toBe(3)
  })
})
