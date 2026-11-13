import { readFileSync } from 'node:fs'
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
    expectComponentContract('meter', { client: true, parts: ['Meter', 'MeterLabel', 'MeterValue', 'MeterSegment', 'MeterLegend', 'MeterLegendItem'],
      slots: ['meter', 'meter-label', 'meter-value', 'meter-track', 'meter-cell', 'meter-segment', 'meter-legend', 'meter-legend-item', 'meter-ring', 'meter-ring-track', 'meter-ring-indicator', 'meter-ring-value'],
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
    // A cell lights once any part of it is reached, as on the boards: 128 of 200 lights 7, the 7th past 60%.
    const at128 = renderToStaticMarkup(h(ui.Meter, { value: 128, max: 200, segments: 10, warningAt: 0.6 }))
    expect([cells(at128), filled(at128), warnings(at128)]).toEqual([10, 7, 1])
    const at150 = renderToStaticMarkup(h(ui.Meter, { value: 150, max: 200, segments: 10, warningAt: 0.6 }))
    expect([filled(at150), warnings(at150)]).toEqual([8, 2])
  })

  it.each(editions)('%s shows the value beside the label', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Meter, { value: 128, max: 200, segments: 10 }, h(ui.MeterLabel, null, 'Deploys'), h(ui.MeterValue)))
    expect(html).toMatch(/data-slot="meter-value"[^>]*>128 \/ 200</)
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

// Output of the Task 1 commit (db22321b) for a plain Meter.
const task1Meter: Record<'radix' | 'base', string> = {
  radix: '<div data-slot="meter" data-mode="bar" class=""><div role="meter" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100" aria-valuetext="72 of 100" aria-label="Storage" data-slot="meter-track" data-mode="bar"><span data-slot="meter-cell" data-state="filled" style="inline-size:72%"></span></div></div>',
  base: '<div data-slot="meter" data-mode="bar" class=""><div aria-valuemax="100" aria-valuemin="0" aria-valuenow="72" aria-valuetext="72 of 100" role="meter" aria-label="Storage" data-slot="meter-track" data-mode="bar"><span data-slot="meter-cell" data-state="filled" style="inline-size:72%"></span><span role="presentation" style="clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:0;position:fixed;top:0;left:0">x</span></div></div>',
}
const ringCss = (family: string) => readFileSync(new URL(`../src/styles/meter/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  .match(/\/\* 0\.7\.6 variants \*\/([^]*?)\/\* end 0\.7\.6 variants \*\//)?.[1] ?? ''
const slotAttr = (html: string, slot: string, name: string) =>
  html.match(new RegExp(`<[^>]*data-slot="${slot}"[^>]*>`))?.[0].match(new RegExp(` ${name}="([^"]*)"`))?.[1]
const meterFamilies = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']

describe('Meter shape circle', () => {
  it.each(editions)('%s draws the total as a ring and leaves the meter reading alone', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Meter, { shape: 'circle', value: 72, max: 100, 'aria-label': 'Storage used' } as never))
    expect(slotAttr(html, 'meter', 'data-shape')).toBe('circle')
    expect(slotAttr(html, 'meter-track', 'data-shape')).toBe('circle')
    expect(html).toContain('role="meter"')
    expect(attr(html, 'aria-valuenow')).toBe('72')
    expect(attr(html, 'aria-valuetext')).toBe('72 of 100')
    expect(slotAttr(html, 'meter-ring', 'viewBox')).toBe('0 0 64 64')
    expect(slotAttr(html, 'meter-ring', 'aria-hidden')).toBe('true')
    expect(slotAttr(html, 'meter-ring-indicator', 'stroke-dasharray')).toBe('72 100')
    expect(slotAttr(html, 'meter-ring-indicator', 'pathLength')).toBe('100')
    expect(slotAttr(html, 'meter-ring-value', 'aria-hidden')).toBe('true')
    expect(html).toMatch(/data-slot="meter-ring-value"[^>]*>72%<\/span>/)
    expect(html).not.toContain('meter-cell')
  })

  it.each(editions)('%s draws the total of a segmented or labelled meter', (_, ui) => {
    const segmented = renderToStaticMarkup(h(ui.Meter, { shape: 'circle', value: 30, max: 100, segments: 10, 'aria-label': 'Quota' } as never))
    expect(slotAttr(segmented, 'meter-ring-indicator', 'stroke-dasharray')).toBe('30 100')
    expect(segmented).not.toContain('meter-cell')
    const labelled = renderToStaticMarkup(h(ui.Meter, { shape: 'circle', max: 100, 'aria-label': 'Disk' } as never,
      h(ui.MeterSegment, { value: 20 }), h(ui.MeterSegment, { value: 15, tone: 'info' }), h(ui.MeterLegend, null, h(ui.MeterLegendItem, null, 'Docs'))))
    expect(slotAttr(labelled, 'meter-ring-indicator', 'stroke-dasharray')).toBe('35 100')
    expect(labelled).toMatch(/data-slot="meter-ring-value"[^>]*>35%<\/span>/)
    expect(labelled).not.toContain('data-slot="meter-segment"')
    expect(labelled).toContain('data-slot="meter-legend"')
  })

  it.each(editions)('%s sets nothing for shape bar or no shape, and renders as the Task 1 commit did', (edition, ui) => {
    for (const extra of [{}, { shape: 'bar' }])
      expect(renderToStaticMarkup(h(ui.Meter, { value: 72, max: 100, 'aria-label': 'Storage', ...extra } as never))).toBe(task1Meter[edition])
    expect(task1Meter[edition]).not.toContain('data-shape')
  })

  it.each(meterFamilies)('%s draws the 72px ring and forced colours', family => {
    const rules = ringCss(family)
    expect(rules).toMatch(/\[data-slot='meter-track'\]\[data-shape='circle'\] \{[^}]*inline-size: 72px;[^}]*block-size: 72px/)
    expect(rules).toMatch(/meter-ring-value'\] \{[^}]*font-size: 14px/)
    const neo = family === 'neo-brutalism'
    expect(rules).toContain(`stroke-linecap: ${neo ? 'butt' : 'round'};`)
    expect(rules).toMatch(new RegExp(`meter-ring-indicator'\\] \\{[^}]*stroke: ${neo ? 'var\\(--foreground\\)' : 'var\\(--primary\\)'};`))
    const forced = rules.match(/@media \(forced-colors: active\) \{([^]*)\n\}\n?$/)?.[1] ?? ''
    expect(forced).toMatch(/meter-ring-indicator[^}]*stroke: Highlight/)
    expect(forced).toMatch(/meter-ring-track[^}]*stroke: GrayText/)
  })
})
