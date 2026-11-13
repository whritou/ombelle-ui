import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radixCheckbox from '../src/templates/checkbox.js'
import * as baseCheckbox from '../src/templates/base/checkbox.js'
import * as radixField from '../src/templates/field.js'
import * as baseField from '../src/templates/base/field.js'

type Ui = typeof radixCheckbox
type FieldUi = typeof radixField
const editions = [
  ['radix', radixCheckbox, radixField],
  ['base', baseCheckbox as unknown as Ui, baseField as unknown as FieldUi],
] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (component: string, family: string) =>
  readFileSync(new URL(`../src/styles/${component}/${family}.css`, import.meta.url), 'utf8')
    .match(/\/\* 0\.7\.6 parts \*\/([^]*?)\/\* end 0\.7\.6 parts \*\//)?.[1] ?? ''
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''
const attr = (element: string, name: string) => element.match(new RegExp(` ${name}="([^"]*)"`))?.[1]

const overlays = (ui: Ui) => h(ui.CheckboxGroup, { defaultValue: ['dialog', 'popover'] },
  h(ui.CheckboxGroupParent, { title: 'All overlays' }),
  h(ui.CheckboxOption, { value: 'dialog', title: 'Dialog' }),
  h(ui.CheckboxOption, { value: 'popover', title: 'Popover' }),
  h(ui.CheckboxOption, { value: 'sheet', title: 'Sheet' }),
  h(ui.CheckboxOption, { value: 'tooltip', title: 'Tooltip' }))

describe('FieldSet and FieldLegend', () => {
  it.each(editions)('%s renders a fieldset with its legend', (_, __, field) => {
    const html = renderToStaticMarkup(h(field.FieldSet, { disabled: true }, h(field.FieldLegend, null, 'Overlays to install')))
    expect(tag(html, 'data-slot="field-set"')).toMatch(/^<fieldset/)
    expect(tag(html, 'data-slot="field-set"')).toContain('disabled')
    expect(html).toMatch(/data-slot="field-legend"[^>]*>Overlays to install</)
  })
})

describe('CheckboxGroup', () => {
  it.each(editions)('%s reads mixed from its children and counts them', (_, ui) => {
    const html = renderToStaticMarkup(overlays(ui))
    expect(tag(html, 'data-slot="checkbox-group"')).toContain('role="group"')
    const parent = tag(html, 'data-checkbox-group-parent')
    expect(attr(parent, 'aria-checked')).toBe('mixed')
    const ids = attr(parent, 'aria-controls')?.split(' ') ?? []
    expect(ids).toHaveLength(4)
    for (const id of ids) expect(html).toContain(`id="${id}"`)
    expect(html).toMatch(/data-slot="checkbox-group-count"[^>]*>2 of 4</)
    const dialog = tag(html, `id="${ids[0]}"`)
    expect(attr(dialog, 'aria-checked')).toBe('true')
    expect(attr(tag(html, `id="${ids[2]}"`), 'aria-checked')).toBe('false')
  })

  it.each(editions)('%s reads checked when every child is checked, and unchecked when none is', (_, ui) => {
    const all = renderToStaticMarkup(h(ui.CheckboxGroup, { defaultValue: ['a', 'b'] },
      h(ui.CheckboxGroupParent, { title: 'All' }), h(ui.Checkbox, { value: 'a', 'aria-label': 'A' }), h(ui.Checkbox, { value: 'b', 'aria-label': 'B' })))
    expect(attr(tag(all, 'data-checkbox-group-parent'), 'aria-checked')).toBe('true')
    const none = renderToStaticMarkup(h(ui.CheckboxGroup, null,
      h(ui.CheckboxGroupParent, { title: 'All' }), h(ui.Checkbox, { value: 'a', 'aria-label': 'A' }), h(ui.Checkbox, { value: 'b', 'aria-label': 'B' })))
    expect(attr(tag(none, 'data-checkbox-group-parent'), 'aria-checked')).toBe('false')
  })

  it.each(editions)('%s leaves a Checkbox outside a group unchanged', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Checkbox, { 'aria-label': 'Accept terms', value: 'yes' }))
    expect(html).not.toMatch(/checkbox-group|aria-controls/)
  })
})

describe('0.7.6 Field and Checkbox styles', () => {
  it.each(families)('%s styles the fieldset and legend', family => {
    const rules = block('field', family)
    expect(rules).toContain("[data-slot='field-set']")
    expect(rules).toContain("[data-slot='field-legend']")
    expect(rules).toMatch(/\[data-slot='field-set'\]:disabled/)
  })

  it.each(families)('%s styles the group, the parent and the count, with forced colours', family => {
    const rules = block('checkbox', family)
    for (const slot of ['checkbox-group', 'checkbox-group-parent', 'checkbox-group-count']) expect(rules).toContain(`[data-slot='${slot}']`)
    expect(rules).toContain('[data-checkbox-group-item]')
    expect(rules).toMatch(/@media \(forced-colors: active\)[^]*Highlight/)
  })
})
