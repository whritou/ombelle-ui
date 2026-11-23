// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../src/templates/base/select.js'

// CAT-12: Base UI's Select keeps its value through a form reset; the Base edition starts again from defaultValue.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const roots: Root[] = []
afterEach(async () => {
  await act(async () => { for (const root of roots.splice(0)) root.unmount() })
  document.body.innerHTML = ''
})

it.each([false, true])('returns to its default value when the form is reset (multiple: %s)', async (multiple) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(h('form', null, h(Select<string, boolean>, { name: 'kit', multiple, defaultValue: multiple ? ['flat'] : 'flat', defaultOpen: true },
      h(SelectTrigger, { 'aria-label': 'Kit' }, h(SelectValue)),
      h(SelectContent, null, h(SelectItem, { value: 'ombelle' }, 'Ombelle'), h(SelectItem, { value: 'flat' }, 'Flat')))))
  })
  const form = container.querySelector('form')!
  const chosen = () => new FormData(form).getAll('kit')
  expect(chosen()).toEqual(['flat'])
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
  const item = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')].find(node => node.textContent === 'Ombelle')!
  // An assistive-technology click: Base UI ignores a mouse click that did not start on the item.
  const click = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })
  Object.defineProperty(click, 'pointerType', { value: '' })
  await act(async () => { item.dispatchEvent(click) })
  expect(chosen()).toContain('ombelle')
  await act(async () => { form.reset() })
  expect(chosen()).toEqual(['flat'])
})
