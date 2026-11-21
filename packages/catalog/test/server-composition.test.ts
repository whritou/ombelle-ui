import { describe, expect, it } from 'vitest'
import * as radixCarousel from '../src/templates/carousel.js'
import * as radixCheckbox from '../src/templates/checkbox.js'
import * as radixCombobox from '../src/templates/combobox.js'
import * as radixCommand from '../src/templates/command.js'
import * as radixField from '../src/templates/field.js'
import * as radixMeter from '../src/templates/meter.js'
import * as radixSelect from '../src/templates/select.js'
import * as radixToast from '../src/templates/toast.js'
import * as baseCheckbox from '../src/templates/base/checkbox.js'
import * as baseCombobox from '../src/templates/base/combobox.js'
import * as baseField from '../src/templates/base/field.js'
import * as baseMeter from '../src/templates/base/meter.js'
import * as baseSelect from '../src/templates/base/select.js'
import { el, renderClientPage, renderServerPage, type ServerNode } from './server-composition.js'

// CAT-01: parents that learn their parts from `children` must know them when the page that
// composes them is a Server Component (a Next.js App Router page without 'use client'), where
// each part reaches the client parent as a client reference instead of the component.
// Each page is rendered both ways and must give the same HTML as a client-composed page.
type Modules = Record<string, Record<string, unknown>>
const radix: Modules = { carousel: radixCarousel, checkbox: radixCheckbox, combobox: radixCombobox, command: radixCommand, field: radixField, meter: radixMeter, select: radixSelect, toast: radixToast }
const base: Modules = { carousel: radixCarousel, checkbox: baseCheckbox, combobox: baseCombobox, field: baseField, meter: baseMeter, select: baseSelect }

const combobox = el('combobox', 'Combobox', { defaultValue: 'b' },
  el('combobox', 'ComboboxInput', { 'aria-label': 'Fruit' }),
  el('combobox', 'ComboboxContent', null,
    el('combobox', 'ComboboxList', null,
      el('combobox', 'ComboboxItem', { value: 'a' }, 'Apple'),
      el('combobox', 'ComboboxItem', { value: 'b' }, 'Banana'))))
const carousel = el('carousel', 'Carousel', { 'aria-label': 'Kits' },
  el('carousel', 'CarouselContent', null,
    el('carousel', 'CarouselItem', null, 'One'),
    el('carousel', 'CarouselItem', null, 'Two'),
    el('carousel', 'CarouselItem', null, 'Three')),
  el('carousel', 'CarouselNext'),
  el('carousel', 'CarouselCounter'))
const select = el('select', 'Select', { multiple: true, defaultValue: ['designer'], name: 'roles' },
  el('select', 'SelectTrigger', { 'aria-label': 'Roles' }, el('select', 'SelectValue', { placeholder: 'Choose roles' })),
  el('select', 'SelectContent', null,
    el('select', 'SelectItem', { value: 'designer' }, 'Designer'),
    el('select', 'SelectItem', { value: 'engineer' }, 'Engineer')))
const checkboxGroup = el('checkbox', 'CheckboxGroup', { defaultValue: ['a'] },
  el('checkbox', 'CheckboxGroupParent', { title: 'All' }),
  el('checkbox', 'CheckboxOption', { value: 'a', title: 'A' }),
  el('checkbox', 'CheckboxOption', { value: 'b', title: 'B' }))
const field = el('field', 'Field', null,
  el('field', 'FieldLabel', null, 'Project name'),
  el('field', 'FieldControl', null, el(undefined, 'input', { type: 'text' })),
  el('field', 'FieldDescription', null, 'Shown in the CLI.'))
const meter = el('meter', 'Meter', { value: 40, max: 100 },
  el('meter', 'MeterLabel', null, 'Storage'),
  el('meter', 'MeterSegment', { value: 30, label: 'Photos' }),
  el('meter', 'MeterLegend'))

const cases: [string, ServerNode, (html: string, edition: string) => void][] = [
  ['Combobox shows the label of its value', combobox, html => expect(html).toContain('value="Banana"')],
  ['Carousel counts its slides', carousel, html => expect(html).toContain('aria-label="1 of 3"')],
  ['multiple Select shows the label of its value', select, html => expect(html).toMatch(/data-slot="select-chip"[^>]*>Designer</)],
  ['CheckboxGroup reads its options', checkboxGroup, html => expect(html).toContain('aria-checked="mixed"')],
  // Base UI's Field links the description after hydration, in either kind of page.
  ['Field describes its control', field, (html, edition) => { if (edition === 'radix') expect(html).toMatch(/<input[^>]*aria-describedby="[^"]+"/) }],
  ['Meter finds its label and segments', meter, () => {}],
]

describe.each([['radix', radix], ['base', base]] as const)('%s composition in a Server Component', (edition, modules) => {
  it.each(cases)('%s', async (_name, tree, check) => {
    const server = await renderServerPage(tree, modules)
    check(server, edition)
    expect(server).toBe(renderClientPage(tree, modules))
  })
})

describe('radix composition in a Server Component, parts that change behaviour', () => {
  it('CommandDialog lifts its trigger out of the closed dialog', async () => {
    const tree = el('command', 'CommandDialog', null,
      el('command', 'CommandDialogTrigger', null, el(undefined, 'button', { type: 'button' }, 'Open')),
      el('command', 'Command', null, el('command', 'CommandInput', { placeholder: 'Search' })))
    const server = await renderServerPage(tree, radix)
    expect(server).toContain('>Open</button>')
    expect(server).toBe(renderClientPage(tree, radix))
  })

  it('Toast with an action is read as having one', async () => {
    const tree = el('toast', 'ToastProvider', null,
      el('toast', 'Toast', { open: true },
        el('toast', 'ToastTitle', null, 'Saved'),
        el('toast', 'ToastAction', { altText: 'Undo the save' }, 'Undo')),
      el('toast', 'ToastViewport'))
    expect(await renderServerPage(tree, radix)).toBe(renderClientPage(tree, radix))
  })
})
