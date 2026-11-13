import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as React from 'react'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/slider.js'
import * as base from '../src/templates/base/slider.js'
import { getCatalog, getTemplate } from '../src/index.js'

type Edition = {
  Slider: React.FC<Record<string, unknown>>
  SliderValue: React.FC<Record<string, unknown>>
  stepValue(value: number, min: number, max: number, step: number): number
}
const editions = [['radix', radix], ['base', base]] as unknown as readonly (readonly ['radix' | 'base', Edition])[]
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']

// Radix thumbs are span role="slider"; Base UI thumbs are native range inputs.
const thumbs = (html: string) => [...html.matchAll(/<span[^>]*role="slider"[^>]*>|<input[^>]*type="range"[^>]*>/g)].map(match => match[0])
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
const output = (html: string) => /<output[^>]*>[^<]*<\/output>/.exec(html)?.[0]
const textInput = (html: string) => /<input[^>]*data-slot="slider-value-input"[^>]*>/.exec(html)?.[0]
const label = () => h('label', { id: 'radius-label', key: 'label' }, 'Radius')
// The field's element and slot structure: each tag inside the field that carries one of its slots or
// sits in the header, in document order.
const skeleton = (html: string) => {
  const slots = new Set(['slider-field', 'slider-header', 'slider-value', 'slider-value-input', 'slider'])
  return [...html.matchAll(/<(\w+)([^>]*)>/g)]
    .map(([, tag, attrs]) => ({ tag, slot: /data-slot="([^"]+)"/.exec(attrs!)?.[1], id: /\sid="radius-label"/.test(attrs!) }))
    .filter(entry => entry.id || (entry.slot && slots.has(entry.slot)))
    .map(entry => `${entry.slot === 'slider' ? 'root' : entry.tag}${entry.slot ? `[${entry.slot}]` : ''}`)
}

describe('stepValue', () => {
  it.each(editions)('%s clamps to the range and rounds to the step', (_, ui) => {
    expect(ui.stepValue(200, 0, 100, 1)).toBe(100)
    expect(ui.stepValue(0.33, 0, 1, 0.05)).toBe(0.35)
    expect(ui.stepValue(-3, 0, 100, 1)).toBe(0)
    expect(ui.stepValue(0.1 + 0.2, 0, 1, 0.1)).toBe(0.3)
    expect(ui.stepValue(7, 2, 20, 5)).toBe(7)
    expect(ui.stepValue(8, 2, 20, 5)).toBe(7)
  })
})

describe('SliderValue', () => {
  it.each(editions)('%s reads the value through getValueText, beside the label, for the thumb', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Slider, { defaultValue: [12], max: 48, 'aria-labelledby': 'radius-label', getValueText: (value: number) => `${value} px` },
      label(), h(ui.SliderValue, { key: 'value' })))
    const readout = output(html)!
    expect(readout).toMatch(/>12 px<\/output>$/)
    expect(attr(readout, 'aria-live')).toBe('off')
    expect(attr(readout, 'data-slot')).toBe('slider-value')
    const [thumb] = thumbs(html)
    expect(attr(thumb!, 'id')).toBeTruthy()
    expect(attr(readout, 'for')).toBe(attr(thumb!, 'id'))
    expect(attr(thumb!, 'aria-valuetext')).toBe('12 px')
    expect(attr(thumb!, 'aria-labelledby')).toBe('radius-label')
    // The label, then the readout, in the header; the slider root after the header.
    expect(html).toMatch(/^<div data-slot="slider-field"><div data-slot="slider-header"><label id="radius-label">Radius<\/label><output/)
    expect(html.indexOf('data-slot="slider"')).toBeGreaterThan(html.indexOf('</output>'))
  })

  it.each(editions)('%s gives the thumb the format when there is no getValueText', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Slider, { defaultValue: [40], 'aria-label': 'Opacity' },
      h(ui.SliderValue, { format: (value: number) => `${value}%` })))
    expect(output(html)).toMatch(/>40%<\/output>$/)
    expect(attr(thumbs(html)[0]!, 'aria-valuetext')).toBe('40%')
  })

  it.each(editions)('%s reads a range as two formatted values, each by its index', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Slider, { defaultValue: [20, 80], thumbLabels: ['Minimum', 'Maximum'] }, h(ui.SliderValue)))
    const readout = output(html)!
    expect(readout).toMatch(/>20 – 80<\/output>$/)
    const ids = thumbs(html).map(thumb => attr(thumb, 'id'))
    expect(ids.every(Boolean)).toBe(true)
    expect(attr(readout, 'for')).toBe(ids.join(' '))
    const indexed = renderToStaticMarkup(h(ui.Slider, { defaultValue: [20, 80], thumbLabels: ['Minimum', 'Maximum'] },
      h(ui.SliderValue, { format: (value: number, index: number) => `${index ? 'max' : 'min'} ${value}` })))
    expect(output(indexed)).toMatch(/>min 20 – max 80<\/output>$/)
  })

  it.each(editions)('%s renders an editable value as a text input named by the label, after the root', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Slider, { defaultValue: [0.75], min: 0, max: 1, step: 0.05, 'aria-labelledby': 'radius-label' },
      label(), h(ui.SliderValue, { editable: true, key: 'value' })))
    expect(output(html)).toBeUndefined()
    const input = textInput(html)!
    expect(attr(input, 'type')).toBe('text')
    expect(attr(input, 'inputMode') ?? attr(input, 'inputmode')).toBe('decimal')
    expect(attr(input, 'autoComplete') ?? attr(input, 'autocomplete')).toBe('off')
    expect(attr(input, 'aria-labelledby')).toBe('radius-label')
    expect(attr(input, 'value')).toBe('0.75')
    expect(html).toMatch(/^<div data-slot="slider-field" data-slider-editable=""><div data-slot="slider-header"><label id="radius-label">Radius<\/label><\/div>/)
    expect(html.indexOf('data-slot="slider-value-input"')).toBeGreaterThan(html.indexOf('data-slot="slider"'))
    const named = renderToStaticMarkup(h(ui.Slider, { defaultValue: [3], 'aria-label': 'Gap' }, h(ui.SliderValue, { editable: true })))
    expect(attr(textInput(named)!, 'aria-label')).toBe('Gap')
  })

  it.each(editions)('%s renders the readout for an editable value on a range', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Slider, { defaultValue: [20, 80], thumbLabels: ['Minimum', 'Maximum'] }, h(ui.SliderValue, { editable: true })))
    expect(output(html)).toMatch(/>20 – 80<\/output>$/)
    expect(textInput(html)).toBeUndefined()
    expect(html).not.toContain('data-slider-editable')
  })

  it.each(editions)('%s renders nothing for SliderValue outside a Slider', (_, ui) => {
    expect(renderToStaticMarkup(h(ui.SliderValue))).toBe('')
  })

  it.each(editions)('%s renders a Slider without SliderValue as at the Task 1 commit', (edition, ui) => {
    expect(renderToStaticMarkup(h(ui.Slider, { defaultValue: [12], max: 48, 'aria-labelledby': 'radius-label', getValueText: (value: number) => `${value} px` }, label())))
      .toBe(unchanged[edition][0])
    expect(renderToStaticMarkup(h(ui.Slider, { defaultValue: [20, 80], thumbLabels: ['Minimum', 'Maximum'] }))).toBe(unchanged[edition][1])
  })

  it('gives both editions the same field structure', () => {
    for (const editable of [false, true]) {
      const render = (ui: Edition) => renderToStaticMarkup(h(ui.Slider, { defaultValue: [12], max: 48, 'aria-labelledby': 'radius-label' },
        label(), h(ui.SliderValue, { editable, key: 'value' })))
      const shape = skeleton(render(radix as unknown as Edition))
      expect(shape).toEqual(editable
        ? ['div[slider-field]', 'div[slider-header]', 'label', 'root[slider]', 'input[slider-value-input]']
        : ['div[slider-field]', 'div[slider-header]', 'label', 'output[slider-value]', 'root[slider]'])
      expect(skeleton(render(base as unknown as Edition))).toEqual(shape)
    }
  })

  it('shares the SliderValue code between the editions, as identical text', () => {
    const source = (file: string) => readFileSync(new URL(`../src/templates/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    const shared = (text: string) => text.slice(text.indexOf('// slider value'), text.indexOf('// end slider value'))
    const text = shared(source('slider.tsx'))
    expect(text).toContain('export function stepValue')
    expect(shared(source('base/slider.tsx'))).toBe(text)
  })

  it('adds the field slots to both editions', () => {
    const catalog = getCatalog('0.1.0')
    for (const edition of ['radix', 'base'] as const) {
      const template = getTemplate(catalog, 'slider', edition)
      expect(template.slots).toEqual(['slider', 'slider-track', 'slider-range', 'slider-thumb', 'slider-ticks', 'slider-tick',
        'slider-field', 'slider-header', 'slider-value', 'slider-value-input'])
      for (const slot of ['slider-field', 'slider-header', 'slider-value', 'slider-value-input'])
        expect(template.content).toContain(`data-slot="${slot}"`)
    }
  })
})

describe('Slider 0.7.6 CSS', () => {
  const marker = (family: string) => {
    const css = readFileSync(new URL(`../src/styles/slider/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    return css.match(/\/\* 0\.7\.6 variants \*\/([^]*?)\/\* end 0\.7\.6 variants \*\//)?.[1] ?? ''
  }

  it.each(families)('%s draws the header row, the readout, the editable grid and the input', family => {
    const rules = marker(family)
    expect(rules).toMatch(/\[data-slot='slider-header'\]\s*\{[^}]*display: flex;[^}]*align-items: baseline;[^}]*justify-content: space-between/)
    expect(rules).toMatch(/\[data-slot='slider-value'\]\s*\{[^}]*font-family: var\(--font-mono[^}]*font-variant-numeric: tabular-nums/)
    expect(rules).toMatch(/\[data-slot='slider-field'\]\[data-slider-editable\]\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/)
    expect(rules).toMatch(/\[data-slot='slider-value-input'\]\s*\{[^}]*inline-size: 76px;[^}]*block-size: 34px;[^}]*text-align: center;[^}]*font-family: var\(--font-mono/)
    expect(rules).toMatch(/\[data-slot='slider-value-input'\]:focus-visible\s*\{[^}]*outline:/)
    expect(rules).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*\[data-slot='slider-value-input'\][^}]*CanvasText/)
    for (const match of rules.matchAll(/^([^{}@\n][^{}]*)\{/gm))
      for (const selector of match[1]!.split(','))
        expect((selector.match(/data-slot=/g) ?? []).length, selector).toBeLessThanOrEqual(1)
  })
})

// A Slider without SliderValue, as the Task 1 commit (db22321b) renders it.
const unchanged: Record<'radix' | 'base', [string, string]> = {
  radix: [
    '<span dir="ltr" data-orientation="horizontal" aria-disabled="false" data-slot="slider" class="" style="--radix-slider-thumb-transform:translateX(-50%)"><span data-orientation="horizontal" data-slot="slider-track"><span data-orientation="horizontal" data-slot="slider-range" style="left:0%;right:75%"></span></span><span style="transform:var(--radix-slider-thumb-transform);position:absolute;left:calc(0% + 0px)"><span role="slider" aria-valuemin="0" aria-valuemax="48" aria-orientation="horizontal" data-orientation="horizontal" tabindex="0" data-slot="slider-thumb" aria-labelledby="radius-label" aria-valuetext="12 px" style="display:none" data-radix-collection-item=""></span></span><input style="display:none"/></span>',
    '<span dir="ltr" data-orientation="horizontal" aria-disabled="false" data-slot="slider" class="" style="--radix-slider-thumb-transform:translateX(-50%)"><span data-orientation="horizontal" data-slot="slider-track"><span data-orientation="horizontal" data-slot="slider-range" style="left:20%;right:20%"></span></span><span style="transform:var(--radix-slider-thumb-transform);position:absolute;left:calc(0% + 0px)"><span role="slider" aria-label="Minimum" aria-valuemin="0" aria-valuemax="100" aria-orientation="horizontal" data-orientation="horizontal" tabindex="0" data-slot="slider-thumb" style="display:none" data-radix-collection-item=""></span></span><input style="display:none"/><span style="transform:var(--radix-slider-thumb-transform);position:absolute;left:calc(0% + 0px)"><span role="slider" aria-label="Maximum" aria-valuemin="0" aria-valuemax="100" aria-orientation="horizontal" data-orientation="horizontal" tabindex="0" data-slot="slider-thumb" style="display:none" data-radix-collection-item=""></span></span><input style="display:none"/></span>',
  ],
  base: [
    '<div data-orientation="horizontal" id="base-ui-_R_0_" role="group" data-slot="slider"><div data-orientation="horizontal"><div data-orientation="horizontal" style="position:relative" data-slot="slider-track"><div data-orientation="horizontal" style="position:relative;height:inherit;inset-inline-start:0;width:25%" data-slot="slider-range"></div><div data-orientation="horizontal" data-index="0" id="base-ui-_R_d_" style="position:absolute;inset-inline-start:25%;top:50%;translate:-50% -50%" data-slot="slider-thumb"><input aria-labelledby="radius-label" aria-orientation="horizontal" aria-valuenow="12" aria-valuetext="12 px" id="base-ui-_R_dH2_" max="48" min="0" step="1" style="clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:100%;height:100%;margin:0;position:fixed;top:0;left:0" type="range" value="12"/></div></div></div></div>',
    '<div data-orientation="horizontal" id="base-ui-_R_0_" role="group" data-slot="slider"><div data-orientation="horizontal"><div data-orientation="horizontal" style="position:relative" data-slot="slider-track"><div data-orientation="horizontal" style="position:relative;height:inherit;inset-inline-start:20%;width:60%" data-slot="slider-range"></div><div data-orientation="horizontal" data-index="0" id="base-ui-_R_d_" style="position:absolute;inset-inline-start:20%;top:50%;translate:-50% -50%" data-slot="slider-thumb"><input aria-label="Minimum" aria-orientation="horizontal" aria-valuenow="20" aria-valuetext="20 start range" id="base-ui-_R_dH1_" max="100" min="0" step="1" style="clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:100%;height:100%;margin:0;position:fixed;top:0;left:0" type="range" value="20"/></div><div data-orientation="horizontal" data-index="1" id="base-ui-_R_l_" style="position:absolute;inset-inline-start:80%;top:50%;translate:-50% -50%" data-slot="slider-thumb"><input aria-label="Maximum" aria-orientation="horizontal" aria-valuenow="80" aria-valuetext="80 end range" id="base-ui-_R_lH1_" max="100" min="0" step="1" style="clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:100%;height:100%;margin:0;position:fixed;top:0;left:0" type="range" value="80"/></div></div></div></div>',
  ],
}
