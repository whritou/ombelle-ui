import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/progress.js'
import * as base from '../src/templates/base/progress.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (family: string) => readFileSync(new URL(`../src/styles/progress/${family}.css`, import.meta.url), 'utf8')
  .match(/\/\* 0\.7\.5 variants \*\/([^]*?)\/\* end 0\.7\.5 variants \*\//)?.[1] ?? ''
const tag = (html: string, slot: string) => html.match(new RegExp(`<[^>]*data-slot="${slot}"[^>]*>`))?.[0] ?? ''
const attr = (html: string, slot: string, name: string) => tag(html, slot).match(new RegExp(` ${name}="([^"]*)"`))?.[1]
const labelled = (ui: Ui, props: Record<string, unknown> = {}, valueProps: Record<string, unknown> = {}) =>
  renderToStaticMarkup(h(ui.Progress, { value: 64, ...props } as never,
    h(ui.ProgressLabel, {}, 'Publishing preset'), h(ui.ProgressValue, valueProps as never)))

describe('progressValueText', () => {
  it.each(editions)('%s rounds, clamps and formats the value', (_, ui) => {
    expect(ui.progressValueText(64, 100)).toBe('64%')
    expect(ui.progressValueText(150, 100)).toBe('100%')
    expect(ui.progressValueText(-5, 100)).toBe('0%')
    expect(ui.progressValueText(1, 3)).toBe('33%')
    expect(ui.progressValueText(null, 100)).toBeUndefined()
    expect(ui.progressValueText(undefined, 100)).toBeUndefined()
    expect(ui.progressValueText(3, 4, (value, max) => `${value} of ${max}`)).toBe('3 of 4')
    expect(ui.progressValueText(9, 4, (value, max) => `${value} of ${max}`)).toBe('4 of 4')
  })
})

describe('Progress label and value', () => {
  it.each(editions)('%s names the bar by its label and gives it the value text', (_, ui) => {
    const html = labelled(ui)
    expect(html.startsWith('<div data-slot="progress-field"')).toBe(true)
    expect(tag(html, 'progress-header')).toBeTruthy()
    const id = attr(html, 'progress-label', 'id')
    expect(id).toBeTruthy()
    expect(attr(html, 'progress', 'aria-labelledby')).toBe(id)
    expect(attr(html, 'progress', 'aria-valuetext')).toBe('64%')
    expect(attr(html, 'progress-value', 'aria-hidden')).toBe('true')
    expect(html).toMatch(/data-slot="progress-value"[^>]*>64%<\/span>/)
  })

  it.each(editions)('%s uses the value format for the text and the readout', (_, ui) => {
    const html = labelled(ui, { value: 3, max: 4 }, { format: (value: number, max: number) => `${value} of ${max} steps` })
    expect(attr(html, 'progress', 'aria-valuetext')).toBe('3 of 4 steps')
    expect(html).toContain('>3 of 4 steps</span>')
  })

  it.each(editions)('%s shows no value and no value text while indeterminate', (_, ui) => {
    const html = labelled(ui, { value: null })
    expect(attr(html, 'progress', 'aria-valuetext')).toBeUndefined()
    expect(html).toMatch(/data-slot="progress-value"[^>]*><\/span>/)
  })

  it.each(editions)('%s sets size and tone only when they are not the default', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Progress, { value: 40, size: 'lg', tone: 'success', 'aria-label': 'Build' } as never))
    expect(attr(html, 'progress', 'data-size')).toBe('lg')
    expect(attr(html, 'progress', 'data-tone')).toBe('success')
    const plain = renderToStaticMarkup(h(ui.Progress, { value: 40, size: 'default', tone: 'default', 'aria-label': 'Build' } as never))
    expect(plain).not.toMatch(/data-size|data-tone|progress-field/)
  })
})

describe('Progress default output', () => {
  // Recorded from the templates before the 0.7.5 variants (commit 488c8b7). Base UI formats the value text
  // with the runtime's default locale ("25%" in en-US, "25 %" in fr-FR), so the expected text does too.
  const percent = new Intl.NumberFormat(undefined, { style: 'percent' }).format(0.25)
  const before = {
    radix: '<div aria-valuemax="100" aria-valuemin="0" aria-valuenow="25" aria-valuetext="25%" role="progressbar" data-state="loading" data-value="25" data-max="100" data-slot="progress" class="" aria-label="Upload"><div data-state="loading" data-value="25" data-max="100" data-slot="progress-indicator" style="inline-size:25%"></div></div>',
    base: `<div data-progressing="" aria-valuemax="100" aria-valuemin="0" aria-valuenow="25" aria-valuetext="${percent}" role="progressbar" data-slot="progress" data-state="loading" data-value="25" data-max="100" aria-label="Upload"><div data-progressing="" style="inset-inline-start:0;width:25%;inline-size:25%" data-slot="progress-indicator" data-state="loading" data-value="25" data-max="100"></div><span role="presentation" style="clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:0;position:fixed;top:0;left:0">x</span></div>`,
  }
  it.each(editions)('%s keeps a bar without parts byte-identical', (edition, ui) => {
    expect(renderToStaticMarkup(h(ui.Progress, { value: 25, 'aria-label': 'Upload' } as never))).toBe(before[edition])
  })
})

describe('Progress 0.7.5 styles', () => {
  it.each(families)('%s draws sizes, tones, the header and forced colours', family => {
    const rules = block(family)
    for (const size of ['sm', 'lg']) expect(rules).toContain(`[data-slot='progress'][data-size='${size}']`)
    // Meter's segment colours: the strong -foreground tokens for success and warning.
    for (const [tone, fill] of [['success', 'var\\(--success-foreground, '], ['warning', 'var\\(--warning-foreground, '], ['destructive', 'var\\(--destructive\\)']])
      expect(rules).toMatch(new RegExp(`\\[data-slot='progress-indicator'\\]:is\\(\\[data-tone='${tone}'\\] > \\*\\) \\{[^}]*background: ${fill}`))
    expect(rules).toContain("[data-slot='progress-field']")
    expect(rules).toContain("[data-slot='progress-header']")
    expect(rules).toMatch(/@media \(forced-colors: active\)[^]*progress-indicator[^]*Highlight/)
  })
})

describe('Progress above its maximum', () => {
  it.each(editions)('%s is a complete bar whose value and readout agree', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Progress, { value: 150, max: 100 } as never, h(ui.ProgressLabel, {}, 'Upload'), h(ui.ProgressValue)))
    expect(attr(html, 'progress', 'aria-valuenow')).toBe('100')
    expect(attr(html, 'progress', 'data-state')).toBe('complete')
    expect(attr(html, 'progress', 'aria-valuetext')).toBe('100%')
  })
})
