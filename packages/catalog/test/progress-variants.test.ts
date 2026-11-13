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

// Output of the Task 1 commit (db22321b) for a labelled, toned bar.
const task1Bar: Record<'radix' | 'base', string> = {
  radix: '<div data-slot="progress-field"><div data-slot="progress-header"><span id="_R_0_-label" data-slot="progress-label" class="">Up</span><span aria-hidden="true" data-slot="progress-value" class="">64%</span></div><div aria-valuemax="100" aria-valuemin="0" aria-valuenow="64" aria-valuetext="64%" role="progressbar" data-state="loading" data-value="64" data-max="100" data-slot="progress" data-size="lg" data-tone="success" class="" aria-labelledby="_R_0_-label"><div data-state="loading" data-value="64" data-max="100" data-slot="progress-indicator" style="inline-size:64%"></div></div></div>',
  base: '<div data-slot="progress-field"><div data-slot="progress-header"><span id="_R_0_-label" data-slot="progress-label" class="">Up</span><span aria-hidden="true" data-slot="progress-value" class="">64%</span></div><div data-progressing="" aria-labelledby="_R_0_-label" aria-valuemax="100" aria-valuemin="0" aria-valuenow="64" aria-valuetext="64%" role="progressbar" data-slot="progress" data-state="loading" data-value="64" data-max="100" data-size="lg" data-tone="success"><div data-progressing="" style="inset-inline-start:0;width:64%;inline-size:64%" data-slot="progress-indicator" data-state="loading" data-value="64" data-max="100"></div><span role="presentation" style="clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:0;position:fixed;top:0;left:0">x</span></div></div>',
}
const dash = (html: string, slot: string) => attr(html, slot, 'stroke-dasharray')
const ring = (ui: Ui, props: Record<string, unknown> = {}, value = true, label = false) =>
  renderToStaticMarkup(h(ui.Progress, { shape: 'circle', value: 64, 'aria-label': 'Uploading preset', ...props } as never,
    ...(label ? [h(ui.ProgressLabel, {}, 'Uploading preset')] : []), ...(value ? [h(ui.ProgressValue)] : [])))
const ringCss = (family: string) => readFileSync(new URL(`../src/styles/progress/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  .match(/\/\* 0\.7\.6 variants \*\/([^]*?)\/\* end 0\.7\.6 variants \*\//)?.[1] ?? ''

describe('Progress shape circle', () => {
  it.each(editions)('%s draws a ring with the number inside and the label alone in the header', (_, ui) => {
    const html = ring(ui, { size: 'lg', 'aria-label': undefined }, true, true)
    expect(attr(html, 'progress', 'data-shape')).toBe('circle')
    expect(attr(html, 'progress-field', 'data-progress-shape')).toBe('circle')
    expect(attr(html, 'progress-ring', 'viewBox')).toBe('0 0 64 64')
    expect(attr(html, 'progress-ring', 'aria-hidden')).toBe('true')
    expect(dash(html, 'progress-ring-indicator')).toBe('64 100')
    expect(attr(html, 'progress-ring-indicator', 'pathLength')).toBe('100')
    expect(attr(html, 'progress-ring-track', 'pathLength')).toBe('100')
    expect(attr(html, 'progress-ring-value', 'aria-hidden')).toBe('true')
    expect(html).toMatch(/data-slot="progress-ring-value"[^>]*>64%<\/span>/)
    expect(attr(html, 'progress', 'aria-valuetext')).toBe('64%')
    expect(attr(html, 'progress', 'aria-labelledby')).toBe(attr(html, 'progress-label', 'id'))
    expect(html).not.toContain('data-slot="progress-value"')
    expect(html).not.toContain('data-slot="progress-indicator"')
    expect(html.match(/<div data-slot="progress-header">(.*?)<\/div>/)?.[1]).toMatch(/^<span[^>]*data-slot="progress-label"[^>]*>Uploading preset<\/span>$/)
  })

  it.each(editions)('%s shows no number without ProgressValue and needs no field', (_, ui) => {
    const html = ring(ui, {}, false)
    expect(html).not.toContain('progress-ring-value')
    expect(html).not.toContain('progress-field')
    expect(attr(html, 'progress', 'aria-label')).toBe('Uploading preset')
  })

  it.each(editions)('%s turns a quarter while indeterminate and has no value text', (_, ui) => {
    const html = ring(ui, { value: null })
    expect(dash(html, 'progress-ring-indicator')).toBe('25 100')
    expect(attr(html, 'progress', 'aria-valuetext')).toBeUndefined()
    expect(attr(html, 'progress', 'data-state')).toBe('indeterminate')
    expect(ring(ui, { value: null }, true)).toMatch(/data-slot="progress-ring-value"[^>]*><\/span>/)
  })

  it.each(editions)('%s clamps a value past the maximum and keeps size and tone', (_, ui) => {
    const html = ring(ui, { value: 150, size: 'sm', tone: 'warning' })
    expect(dash(html, 'progress-ring-indicator')).toBe('100 100')
    expect(attr(html, 'progress', 'aria-valuenow')).toBe('100')
    expect(attr(html, 'progress', 'aria-valuetext')).toBe('100%')
    expect(attr(html, 'progress', 'data-size')).toBe('sm')
    expect(attr(html, 'progress', 'data-tone')).toBe('warning')
  })

  it.each(editions)('%s sets nothing for shape bar or no shape, and renders as the Task 1 commit did', (edition, ui) => {
    const bar = (extra: Record<string, unknown>) => renderToStaticMarkup(h(ui.Progress, { value: 64, size: 'lg', tone: 'success', ...extra } as never,
      h(ui.ProgressLabel, {}, 'Up'), h(ui.ProgressValue)))
    expect(bar({})).toBe(task1Bar[edition])
    expect(bar({ shape: 'bar' })).toBe(task1Bar[edition])
    expect(task1Bar[edition]).not.toContain('data-shape')
  })

  it.each(families)('%s draws three ring sizes, a guarded spin and forced colours', family => {
    const rules = ringCss(family)
    expect(rules).toMatch(/\[data-slot='progress'\]\[data-shape='circle'\] \{[^}]*inline-size: 48px;[^}]*block-size: 48px/)
    expect(rules).toMatch(/\[data-shape='circle'\]\[data-size='sm'\] \{[^}]*inline-size: 18px;[^}]*block-size: 18px/)
    expect(rules).toMatch(/\[data-shape='circle'\]\[data-size='lg'\] \{[^}]*inline-size: 96px;[^}]*block-size: 96px/)
    expect(rules).toMatch(/progress-ring-value'\]:is\(\[data-size='lg'\] > \*\) \{[^}]*font-size: 16px/)
    const neo = family === 'neo-brutalism'
    expect(rules).toContain(`stroke-linecap: ${neo ? 'butt' : 'round'};`)
    expect(rules).toMatch(new RegExp(`progress-ring-indicator'\\] \\{[^}]*stroke: ${neo ? 'var\\(--foreground\\)' : 'var\\(--primary\\)'};`))
    const guard = /@media \(prefers-reduced-motion: no-preference\) \{[^]*?\n\}/
    expect(rules.match(guard)?.[0]).toContain('animation: progress-ring-spin calc(var(--motion-duration, 150ms) * 20 / 3) linear infinite')
    expect(rules.replace(guard, '')).not.toMatch(/animation:/)
    const forced = rules.match(/@media \(forced-colors: active\) \{([^]*)\n\}\n?$/)?.[1] ?? ''
    expect(forced).toMatch(/progress-ring-indicator[^}]*stroke: Highlight/)
    expect(forced).toMatch(/progress-ring-track[^}]*stroke: GrayText/)
  })
})
