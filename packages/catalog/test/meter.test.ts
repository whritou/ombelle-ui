import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/meter.js'
import * as base from '../src/templates/base/meter.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

const editions = [['radix', radix], ['base', base]] as const
const cells = (html: string) => (html.match(/data-slot="meter-cell"/g) ?? []).length
const filled = (html: string) => (html.match(/data-slot="meter-cell"[^>]*data-state="filled"|data-state="filled"[^>]*data-slot="meter-cell"/g) ?? []).length
const warnings = (html: string) => (html.match(/data-warning=""/g) ?? []).length
const attr = (html: string, name: string) => new RegExp(`role="meter"[^>]*${name}="([^"]*)"|${name}="([^"]*)"[^>]*role="meter"`).exec(html)?.slice(1).find(v => v !== undefined)

describe('Meter', () => {
  it('provides the Meter parts, and Base UI for the Base edition', () => {
    expectComponentContract('meter', { client: true, parts: ['Meter', 'MeterLabel', 'MeterSegment', 'MeterLegend', 'MeterLegendItem'],
      slots: ['meter', 'meter-label', 'meter-track', 'meter-cell', 'meter-segment', 'meter-legend', 'meter-legend-item'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='meter']", "[data-slot='meter-track']", "[data-slot='meter-cell']", "[data-slot='meter-segment']"], glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'meter', 'base').dependencies.map(d => d.name)).toContain('@base-ui/react')
  })

  it.each(editions)('%s exposes the value as a named meter', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Meter, { value: 128, max: 200, segments: 10 }, h(ui.MeterLabel, null, 'Deploys this month')))
    expect(html).toContain('role="meter"')
    expect(attr(html, 'aria-valuenow')).toBe('128')
    expect(attr(html, 'aria-valuemax')).toBe('200')
    expect(attr(html, 'aria-valuetext')).toBe('128 of 200')
    const labelId = /data-slot="meter-label"[^>]*id="([^"]+)"|id="([^"]+)"[^>]*data-slot="meter-label"/.exec(html)!.slice(1).find(Boolean)
    expect(attr(html, 'aria-labelledby')).toBe(labelId)
  })

  it.each(editions)('%s fills discrete cells and warns past the threshold', (_, ui) => {
    const at128 = renderToStaticMarkup(h(ui.Meter, { value: 128, max: 200, segments: 10, warningAt: 0.6 }))
    expect([cells(at128), filled(at128), warnings(at128)]).toEqual([10, 6, 0])
    const at150 = renderToStaticMarkup(h(ui.Meter, { value: 150, max: 200, segments: 10, warningAt: 0.6 }))
    expect([filled(at150), warnings(at150)]).toEqual([8, 2])
  })

  it.each(editions)('%s draws labelled parts and the remainder', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Meter, { max: 100 },
      h(ui.MeterSegment, { value: 42, tone: 'primary' }), h(ui.MeterSegment, { value: 22, tone: 'info' }), h(ui.MeterSegment, { value: 10, tone: 'success' })))
    const widths = [...html.matchAll(/<span[^>]*data-slot="meter-segment"[^>]*>/g)]
      .map(m => Number(/inline-size:([\d.]+)%/.exec(m[0])![1]))
    expect(widths).toEqual([42, 22, 10, 26])
    expect(attr(html, 'aria-valuenow')).toBe('74')
  })

  it.each(editions)('%s clamps values and segment counts', (_, ui) => {
    const over = renderToStaticMarkup(h(ui.Meter, { value: 260, max: 200, segments: 10 }))
    expect([attr(over, 'aria-valuenow'), filled(over)]).toEqual(['200', 10])
    expect(attr(renderToStaticMarkup(h(ui.Meter, { value: -5, max: 200 })), 'aria-valuenow')).toBe('0')
    expect(cells(renderToStaticMarkup(h(ui.Meter, { value: 1, max: 2, segments: 1 })))).toBe(2)
    expect(cells(renderToStaticMarkup(h(ui.Meter, { value: 1, max: 2, segments: 40 })))).toBe(20)
  })
})
