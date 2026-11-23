// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '../src/templates/select.js'

// CAT-10, CAT-12 and A11Y-19 for the multiple Select (Radix edition).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// jsdom has no layout.
Element.prototype.scrollIntoView ??= () => {}
const roots: Root[] = []
afterEach(async () => {
  await act(async () => { for (const root of roots.splice(0)) root.unmount() })
  document.body.innerHTML = ''
})

async function mount(element: ReturnType<typeof h>) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => { root.render(element) })
  return container
}

const onItemClick = vi.fn()
const select = (props: Record<string, unknown> = {}) => h(Select, { multiple: true, name: 'kits', defaultOpen: true, ...props },
  h(SelectTrigger, { 'aria-label': 'Kits' }, h(SelectValue, { placeholder: 'None', className: 'value', title: 'Chosen kits' })),
  h(SelectContent, { side: 'top', align: 'end', id: 'kits-list', style: { maxBlockSize: 200 }, className: 'content' },
    h(SelectGroup, { className: 'group', title: 'Styles' },
      h(SelectLabel, { className: 'label', title: 'Heading' }, 'Styles'),
      h(SelectItem, { value: 'ombelle', id: 'kit-ombelle', textValue: 'Kit Ombelle', onClick: onItemClick, className: 'item' }, h('b', null, 'Ombelle')),
      h(SelectItem, { value: 'flat' }, 'Flat')),
    h(SelectSeparator, { className: 'rule', title: 'between' })))

it('passes the props the single Select accepts to the parts of a multiple one', async () => {
  await mount(select())
  const value = document.querySelector('[data-slot="select-value"]')!
  expect(value.className).toBe('value')
  expect(value.getAttribute('title')).toBe('Chosen kits')
  const content = document.querySelector<HTMLElement>('[data-slot="select-content"]')!
  expect(content.id).toBe('kits-list')
  expect(content.getAttribute('data-side')).toBe('top')
  expect(content.getAttribute('data-align')).toBe('end')
  expect(content.style.maxBlockSize).toBe('200px')
  expect(content.style.getPropertyValue('--radix-select-trigger-width')).toBe('var(--radix-popover-trigger-width)')
  expect(document.querySelector('[data-slot="select-group"]')!.getAttribute('title')).toBe('Styles')
  expect(document.querySelector('[data-slot="select-label"]')!.getAttribute('title')).toBe('Heading')
  expect(document.querySelector('[data-slot="select-separator"]')!.getAttribute('title')).toBe('between')
  const item = document.querySelector<HTMLElement>('[data-slot="select-item"]')!
  expect(item.id).toBe('kit-ombelle')
  // The trigger points at the option by the caller's id.
  const trigger = document.querySelector('[data-slot="select-trigger"]')!
  await act(async () => { trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })) })
  expect(trigger.getAttribute('aria-activedescendant')).toBe('kit-ombelle')
  await act(async () => { item.click() })
  expect(onItemClick).toHaveBeenCalledTimes(1)
  expect(item.getAttribute('aria-selected')).toBe('true')
})

it('types ahead by textValue', async () => {
  await mount(select())
  const trigger = document.querySelector<HTMLElement>('[data-slot="select-trigger"]')!
  await act(async () => { trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true })) })
  expect(trigger.getAttribute('aria-activedescendant')).toBe('kit-ombelle')
})

it('does not wrap the listbox in an unnamed dialog', async () => {
  await mount(select())
  expect(document.querySelector('[data-slot="select-content"]')!.getAttribute('role')).toBe('presentation')
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(document.querySelector('[role="listbox"]')).not.toBeNull()
})

it('returns to its default value when the form is reset', async () => {
  const onValueChange = vi.fn()
  const container = await mount(h('form', null, select({ defaultValue: ['flat'], defaultOpen: false, onValueChange })))
  const form = container.querySelector('form')!
  const trigger = container.querySelector<HTMLElement>('[data-slot="select-trigger"]')!
  await act(async () => { trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
  await act(async () => { document.querySelector<HTMLElement>('[data-slot="select-item"]')!.click() })
  expect(new FormData(form).getAll('kits')).toEqual(['ombelle', 'flat'])
  await act(async () => { form.reset() })
  expect(new FormData(form).getAll('kits')).toEqual(['flat'])
  expect(onValueChange).toHaveBeenLastCalledWith(['flat'])
  expect(trigger.textContent).toBe('Flat')
})
