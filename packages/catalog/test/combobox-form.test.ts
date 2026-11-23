// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement as h, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/combobox.js'
import * as base from '../src/templates/base/combobox.js'

// CAT-10, CAT-12, CAT-13 and A11Y-19 for Combobox.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const roots: Root[] = []
afterEach(async () => {
  await act(async () => { for (const root of roots.splice(0)) root.unmount() })
  document.body.innerHTML = ''
})

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const

const options = (ui: Ui, input: Record<string, unknown> = {}, item: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => [
  h(ui.ComboboxInput, { 'aria-label': 'Preset', key: 'input', ...input }),
  h(ui.ComboboxContent, { key: 'content', ...content }, h(ui.ComboboxList, null,
    h(ui.ComboboxItem, { value: 'glass', ...item }, 'Liquid glass'),
    h(ui.ComboboxItem, { value: 'ombelle' }, 'Ombelle'),
    h(ui.ComboboxCreate))),
]

async function mount(element: ReturnType<typeof h>) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => { root.render(element) })
  return container
}
/** Types into the field as a person would, which opens the list. */
async function type(input: HTMLInputElement, text: string) {
  input.focus()
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
  await act(async () => { input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text })) })
}
const chooseFirst = async (input: HTMLInputElement, text = 'Liq') => {
  await type(input, text)
  await act(async () => { document.querySelector<HTMLElement>('[data-slot="combobox-item"]')!.click() })
}
const submitted = (form: HTMLFormElement) => new FormData(form).getAll('preset')

describe.each(editions)('%s Combobox in a form', (_, ui) => {
  it('returns to its default value when the form is reset', async () => {
    const onValueChange = vi.fn()
    const container = await mount(h('form', null, h(ui.Combobox, { name: 'preset', defaultValue: 'ombelle', onValueChange }, options(ui))))
    const form = container.querySelector('form')!
    const input = container.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!
    await chooseFirst(input)
    expect(submitted(form)).toEqual(['glass'])
    await act(async () => { form.reset() })
    expect(submitted(form)).toEqual(['ombelle'])
    expect(input.value).toBe('Ombelle')
    expect(onValueChange).toHaveBeenLastCalledWith('ombelle')
  })

  it('returns a multiple combobox to its default chips on reset', async () => {
    const container = await mount(h('form', null, h(ui.Combobox, { name: 'preset', multiple: true, defaultValue: ['glass'] }, options(ui))))
    const form = container.querySelector('form')!
    await act(async () => { container.querySelector<HTMLElement>('[data-slot="combobox-chip-remove"]')!.click() })
    expect(submitted(form)).toEqual([])
    await act(async () => { form.reset() })
    expect(submitted(form)).toEqual(['glass'])
  })

  it('validates the chosen value when required, not the typed text, and says so on the field', async () => {
    for (const [root, input] of [[{ required: true }, {}], [{}, { required: true }]] as const) {
      const container = await mount(h('form', null, h(ui.Combobox, root, options(ui, input))))
      const form = container.querySelector('form')!
      const field = container.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!
      expect(field.getAttribute('aria-required')).toBe('true')
      expect(field.required).toBe(false)
      expect(form.checkValidity()).toBe(false)
      await type(field, 'Nothing like it')
      expect(form.checkValidity()).toBe(false)
      await chooseFirst(field)
      expect(form.checkValidity()).toBe(true)
      await act(async () => { for (const root of roots.splice(0)) root.unmount() })
    }
  })

  it('takes its words from labels', () => {
    const labels = { selected: 'Choisis', remove: (label: string) => `Retirer ${label}`, create: (query: string) => `Créer ${query}` }
    const chips = renderToStaticMarkup(h(ui.Combobox, { multiple: true, defaultValue: ['glass'], labels }, options(ui)))
    expect(chips).toContain('aria-label="Choisis"')
    expect(chips).toContain('aria-label="Retirer Liquid glass"')
    expect(renderToStaticMarkup(h(ui.Combobox, { multiple: true, defaultValue: ['glass'] }, options(ui)))).toContain('aria-label="Remove Liquid glass"')
  })

  it('shows the create row in the labels language', async () => {
    await mount(h(ui.Combobox, { labels: { create: (query: string) => `Créer « ${query} »` } }, options(ui)))
    await type(document.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!, 'Papier')
    expect(document.querySelector('[data-slot="combobox-create"]')?.textContent).toContain('Créer « Papier »')
  })
})

describe('radix Combobox parts keep what the caller passes', () => {
  it("sets a caller's ref on the input and keeps its own, so a click on the field still focuses the input", async () => {
    const ref = createRef<HTMLInputElement>()
    const container = await mount(h(radix.Combobox, null, options(radix, { ref })))
    const input = container.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!
    expect(ref.current).toBe(input)
    const field = container.querySelector<HTMLElement>('[data-slot="combobox-field"]')!
    await act(async () => { field.click() })
    expect(document.activeElement).toBe(input)
  })

  it("runs an item's onClick and onMouseDown and still chooses it, and sets the item's ref", async () => {
    const onClick = vi.fn(), onMouseDown = vi.fn(), onValueChange = vi.fn()
    const ref = createRef<HTMLDivElement>()
    const container = await mount(h(radix.Combobox, { onValueChange }, options(radix, {}, { onClick, onMouseDown, ref })))
    await type(container.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!, 'Liq')
    const item = document.querySelector<HTMLElement>('[data-slot="combobox-item"]')!
    expect(ref.current).toBe(item)
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    await act(async () => { item.dispatchEvent(down) })
    expect(onMouseDown).toHaveBeenCalledTimes(1)
    expect(down.defaultPrevented).toBe(true)
    await act(async () => { item.click() })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('glass')
  })

  it("runs the content's onOpenAutoFocus and keeps focus in the field; the list is not wrapped in a dialog", async () => {
    const onOpenAutoFocus = vi.fn()
    const container = await mount(h(radix.Combobox, null, options(radix, {}, {}, { onOpenAutoFocus })))
    const input = container.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!
    input.focus()
    await act(async () => { input.click() })
    expect(onOpenAutoFocus).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(input)
    const content = document.querySelector('[data-slot="combobox-content"]')!
    expect(content.getAttribute('role')).toBe('presentation')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(content.querySelector('[role="listbox"]')).not.toBeNull()
  })
})
