import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/field.js'
import * as base from '../src/templates/base/field.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (family: string) =>
  readFileSync(new URL(`../src/styles/field/${family}.css`, import.meta.url), 'utf8')
    .match(/\/\* 0\.7\.6 parts \*\/([^]*?)\/\* end 0\.7\.6 parts \*\//)?.[1] ?? ''
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''
const attr = (element: string, name: string) => element.match(new RegExp(` ${name}="([^"]*)"`))?.[1]

const savePreset = (ui: Ui, props: Record<string, unknown>) => h(ui.Form, props,
  h(ui.FormErrorSummary),
  h(ui.Field, { name: 'name', required: true },
    h(ui.FieldLabel, null, 'Preset name'),
    h(ui.FieldControl, null, h('input', { type: 'text' })),
    h(ui.FieldError)),
  h(ui.Field, { name: 'radius' },
    h(ui.FieldLabel, null, 'Radius'),
    h(ui.FieldControl, null, h('input', { type: 'number', min: 0, max: 48 })),
    h(ui.FieldError)))

describe('Form', () => {
  it.each(editions)('%s leaves validation to the browser until it hydrates', (_, ui) => {
    const html = renderToStaticMarkup(savePreset(ui, {}))
    expect(tag(html, 'data-slot="form"')).toMatch(/^<form/)
    expect(html.toLowerCase()).not.toContain('novalidate')
    expect(html).not.toContain('form-error-summary')
    expect(html).not.toContain('aria-invalid')
  })

  it.each(editions)('%s puts server errors on their field and in the summary', (edition, ui) => {
    const html = renderToStaticMarkup(savePreset(ui, { errors: { name: 'A preset with this name already exists.' } }))
    const control = tag(html, 'type="text"')
    expect(attr(control, 'aria-invalid')).toBe('true')
    expect(attr(control, 'name')).toBe('name')
    expect(html).toMatch(/data-slot="field-error"[^>]*>(<svg[^]*?<\/svg>)?A preset with this name already exists\.</)
    const summary = tag(html, 'data-slot="form-error-summary"')
    expect(attr(summary, 'role')).toBe('region')
    expect(attr(summary, 'tabindex')).toBe('-1')
    const titleId = attr(summary, 'aria-labelledby')
    expect(html).toContain(`id="${titleId}"`)
    expect(html).toMatch(/data-slot="form-error-summary-title"[^>]*>Fix 1 field before submitting</)
    // Base UI applies an explicit control id in a layout effect, so its server HTML still has the generated one.
    const link = tag(html, edition === 'radix' ? `href="#${attr(control, 'id')}"` : 'href="#[^"]*-field-name"')
    expect(link).toMatch(/^<a/)
    expect(html).toContain('>Preset name: a preset with this name already exists</a>')
    expect(attr(tag(html, 'type="number"'), 'aria-invalid')).toBeUndefined()
  })

  it.each(editions)('%s counts fields, names the save action and lists unknown names without a link', (_, ui) => {
    const html = renderToStaticMarkup(savePreset(ui, {
      summaryAction: 'saving',
      errors: { name: 'Taken.', radius: ['Enter a number from 0 to 48.', 'Second message'], ghost: 'Unknown field error.' },
    }))
    expect(html).toMatch(/data-slot="form-error-summary-title"[^>]*>Fix 3 fields before saving</)
    expect(html).toContain('>Radius: enter a number from 0 to 48</a>')
    expect(html).toMatch(/<li>ghost: unknown field error<\/li>/)
  })

  it.each(editions)('%s leaves a Field outside a Form unchanged by its name', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Field, { name: 'name' }, h(ui.FieldLabel, null, 'Name'), h(ui.FieldControl, null, h('input', { type: 'text' }))))
    expect(attr(tag(html, 'type="text"'), 'aria-invalid')).toBeUndefined()
  })
})

describe('Form styles', () => {
  it.each(families)('%s styles the summary, its title and its links, with forced colours', family => {
    const rules = block(family)
    for (const slot of ['form', 'form-error-summary', 'form-error-summary-title', 'form-error-summary-list']) expect(rules).toContain(`[data-slot='${slot}']`)
    expect(rules).toMatch(/\[data-slot='form-error-summary'\]:focus-visible/)
    expect(rules).toMatch(/@media \(forced-colors: active\)[^]*form-error-summary/)
  })
})
