// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import * as radix from '../src/templates/command.js'
import * as base from '../src/templates/base/command.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// cmdk scrolls the selected item into view; jsdom has no layout.
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const roots: Root[] = []
afterEach(() => {
  act(() => roots.splice(0).forEach(root => root.unmount()))
  document.body.innerHTML = ''
})

async function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(node))
  return container
}
const list = (ui: Ui) => h(ui.CommandList, null, h(ui.CommandItem, null, 'Add Button'), h(ui.CommandItem, null, 'Add Dialog'))
const menu = (ui: Ui, props: Record<string, unknown> = {}) =>
  h(ui.Command, { label: 'Commands', ...props } as never, h(ui.CommandInput, { placeholder: 'Search' }), list(ui), h(ui.CommandEmpty, null, 'No results.'))

/** Types as a browser does: input events carry an inputType. */
async function type(input: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setValue.call(input, value)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
  })
}
const key = (target: Element, name: string) =>
  act(async () => { target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true })) })

describe('Command accessibility (A11Y-07)', () => {
  it.each(editions)('%s names the list box "Suggestions" by default', (_, ui) => {
    expect(renderToStaticMarkup(menu(ui))).toMatch(/<div[^>]*role="listbox"[^>]*aria-label="Suggestions"|<div[^>]*aria-label="Suggestions"[^>]*role="listbox"/)
    expect(renderToStaticMarkup(h(ui.Command, null, h(ui.CommandList, { label: 'Actions' } as never)))).toContain('aria-label="Actions"')
  })

  it.each(editions)('%s marks the first command selected on the first render', async (_, ui) => {
    const container = await mount(menu(ui))
    const options = [...container.querySelectorAll('[role="option"]')]
    expect(options.map(option => option.getAttribute('aria-selected'))).toEqual(['true', 'false'])
  })

  it.each(editions)('%s keeps aria-activedescendant on an element that exists, and drops it when nothing matches', async (_, ui) => {
    const container = await mount(menu(ui))
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement
    input.focus()
    await type(input, 'add')
    await key(input, 'ArrowDown')
    await type(input, 'zzz')
    expect(container.querySelector('[data-slot="command-empty"]')!.textContent).toBe('No results.')
    expect(input.hasAttribute('aria-activedescendant')).toBe(false)
    await type(input, 'dialog')
    const active = input.getAttribute('aria-activedescendant')
    if (active !== null) expect(document.getElementById(active)?.textContent).toBe('Add Dialog')
  })
})

describe('Command controlled search (CAT-11)', () => {
  it.each(editions)('%s shows and filters by the search it is given, and reports typing', async (_, ui) => {
    const seen: string[] = []
    const container = await mount(menu(ui, { search: 'dialog', onSearchChange: (search: string) => seen.push(search) }))
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement
    expect(input.value).toBe('dialog')
    expect([...container.querySelectorAll('[role="option"]')].map(option => option.textContent)).toEqual(['Add Dialog'])
    input.focus()
    await type(input, 'dialogs')
    expect(seen).toEqual(['dialogs'])
    // Controlled: the text stays until the caller passes the new search.
    expect(input.value).toBe('dialog')
  })

  it.each(editions)('%s reports typing with filter={false}, leaving the items to the caller', async (_, ui) => {
    const seen: string[] = []
    const container = await mount(menu(ui, { filter: false, onSearchChange: (search: string) => seen.push(search) }))
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement
    input.focus()
    await type(input, 'zzz')
    expect(seen).toEqual(['zzz'])
    expect(input.value).toBe('zzz')
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(2)
  })
})
