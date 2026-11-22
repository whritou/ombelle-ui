// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement as h, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radixField from '../src/templates/field.js'
import * as baseField from '../src/templates/base/field.js'
import * as radixDialog from '../src/templates/dialog.js'
import * as baseDialog from '../src/templates/base/dialog.js'
import * as radixSheet from '../src/templates/sheet.js'
import * as baseSheet from '../src/templates/base/sheet.js'
import * as radixCheckbox from '../src/templates/checkbox.js'
import * as baseCheckbox from '../src/templates/base/checkbox.js'
import { PasswordField, PasswordFieldInput, PasswordFieldStrength, type PasswordCheck } from '../src/templates/password-field.js'
import { TagInput, TagInputInput, TagInputList } from '../src/templates/tag-input.js'

// CAT-13: fixed English strings now have props; the defaults are unchanged.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const roots: Root[] = []
afterEach(async () => {
  await act(async () => { for (const root of roots.splice(0)) root.unmount() })
  document.body.innerHTML = ''
})
/** Renders in the browser, where the portals of open dialogs and sheets mount, and returns the page. */
async function rendered(element: ReactElement) {
  await act(async () => { for (const root of roots.splice(0)) root.unmount() })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => { root.render(element) })
  return document.body.innerHTML
}
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''

describe.each([['radix', radixField], ['base', baseField as unknown as typeof radixField]] as const)('%s FormErrorSummary', (_, ui) => {
  const form = (summary: Record<string, unknown>) => renderToStaticMarkup(h(ui.Form, { errors: { name: 'Taken.' }, summaryAction: 'saving' },
    h(ui.FormErrorSummary, summary), h(ui.Field, { name: 'name' }, h(ui.FieldLabel, null, 'Name'), h(ui.FieldControl, null, h('input')))))
  it('takes its title from title, given the count and the action', () => {
    expect(form({ title: (count: number, action: string) => `${count} champ à corriger (${action})` })).toContain('>1 champ à corriger (saving)</p>')
    expect(form({})).toContain('>Fix 1 field before saving</p>')
  })
})

describe.each([['radix', radixDialog], ['base', baseDialog as unknown as typeof radixDialog]] as const)('%s DialogContent', (_, ui) => {
  it('names its close button with closeLabel', async () => {
    const html = (props: Record<string, unknown>) => rendered(h(ui.Dialog, { open: true }, h(ui.DialogContent, props, h(ui.DialogTitle, null, 'T'))))
    expect(await html({ closeLabel: 'Fermer' })).toContain('<span class="sr-only">Fermer</span>')
    expect(await html({})).toContain('<span class="sr-only">Close</span>')
  })
})

describe.each([['radix', radixSheet], ['base', baseSheet as unknown as typeof radixSheet]] as const)('%s SheetContent', (_, ui) => {
  const sheet = (props: Record<string, unknown>, handle: Record<string, unknown> = {}) => rendered(h(ui.Sheet, { open: true },
    h(ui.SheetContent, props, h(ui.SheetTitle, null, 'T'), h(ui.SheetHandle, handle))))
  it('names its close button and edge handle with closeLabel and resizeLabel', async () => {
    const html = await sheet({ resizable: true, closeLabel: 'Fermer', resizeLabel: 'Redimensionner' })
    expect(tag(html, 'data-slot="sheet-dismiss"')).toContain('aria-label="Fermer"')
    expect(tag(html, 'data-slot="sheet-resize-handle"')).toContain('aria-label="Redimensionner"')
    const plain = await sheet({ resizable: true })
    expect(tag(plain, 'data-slot="sheet-dismiss"')).toContain('aria-label="Close"')
    expect(tag(plain, 'data-slot="sheet-resize-handle"')).toContain('aria-label="Resize panel"')
  })
  it("reads a snap point's value with formatSnapPoint", async () => {
    const html = await sheet({ side: 'bottom', snapPoints: [0.5, 1] }, { formatSnapPoint: (point: number) => `Moitié ${point}` })
    expect(tag(html, 'data-slot="sheet-handle"')).toContain('aria-valuetext="Moitié 0.5"')
    expect(tag(await sheet({ side: 'bottom', snapPoints: [0.5, 1] }), 'data-slot="sheet-handle"')).toContain('aria-valuetext="Half height"')
  })
})

describe.each([['radix', radixCheckbox], ['base', baseCheckbox as unknown as typeof radixCheckbox]] as const)('%s CheckboxGroupCount', (_, ui) => {
  it('sets the count text with format, also from the parent', () => {
    const group = (parent: Record<string, unknown>, count?: Record<string, unknown>) => renderToStaticMarkup(h(ui.CheckboxGroup, { defaultValue: ['a'] },
      h(ui.CheckboxGroupParent, { title: 'All', ...parent }), h(ui.Checkbox, { value: 'a', 'aria-label': 'A' }), h(ui.Checkbox, { value: 'b', 'aria-label': 'B' }),
      count ? h(ui.CheckboxGroupCount, count) : null))
    expect(group({ count: (checked: number, total: number) => `${checked} sur ${total}` })).toContain('>1 sur 2</span>')
    expect(group({ count: false }, { format: (checked: number, total: number) => `${checked}/${total}` })).toContain('>1/2</span>')
    expect(group({})).toContain('>1 of 2</span>')
  })
})

describe('PasswordFieldStrength', () => {
  const checks: PasswordCheck[] = [{ label: 'Use 12 characters', test: value => value.length >= 12 }, { label: 'Add a number', match: '\\d' }]
  const meter = (labels?: Record<string, unknown>) => tag(renderToStaticMarkup(h(PasswordField, null,
    h(PasswordFieldInput, { 'aria-label': 'Password', defaultValue: 'abc1' }), h(PasswordFieldStrength, { checks, labels }))), 'role="meter"')
  it('takes its words and hint from labels, and keeps the level', () => {
    const french = meter({ strong: 'Fort', hint: (check: string, last: boolean) => `${check}${last ? ' (dernier)' : ''}` })
    expect(french).toContain('aria-valuetext="Fort · Use 12 characters (dernier)"')
    expect(french).toContain('data-level="strong"')
    expect(meter()).toContain('aria-valuetext="Strong · Use 12 characters to reach the last check"')
  })
})

describe('TagInput', () => {
  it('takes the list and remove names from labels', () => {
    const html = (labels?: Record<string, unknown>) => renderToStaticMarkup(h(TagInput, { defaultValue: ['ui'], labels }, h(TagInputList), h(TagInputInput, { 'aria-label': 'Tags' })))
    const french = html({ list: 'Étiquettes', remove: (name: string) => `Retirer ${name}` })
    expect(french).toContain('aria-label="Étiquettes"')
    expect(french).toContain('aria-label="Retirer ui"')
    expect(html()).toContain('aria-label="Selected tags"')
    expect(html()).toContain('aria-label="Remove ui"')
  })
})
