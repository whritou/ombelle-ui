// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, createElement as h, createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { NumberInput } from '../src/templates/number-input.js'

// CAT-10 and CAT-12: NumberInput replaced a caller's ref with its own, and ignored form reset.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
afterEach(() => { document.body.innerHTML = '' })

async function mount(element: ReturnType<typeof h>) {
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () => { createRoot(container).render(element) })
  return container
}

it("sets a caller's ref on the input and keeps the steppers working", async () => {
  const ref = createRef<HTMLInputElement>()
  const container = await mount(h(NumberInput, { ref, 'aria-label': 'Size', defaultValue: 4 }))
  const input = container.querySelector('input')!
  expect(ref.current).toBe(input)
  await act(async () => { container.querySelector<HTMLButtonElement>('[data-slot="number-input-increment"]')!.click() })
  expect(input.value).toBe('5')
})

it('returns to its default value when the form is reset, and reports it', async () => {
  const onValueChange = vi.fn()
  const container = await mount(h('form', null, h(NumberInput, { name: 'size', 'aria-label': 'Size', defaultValue: 4, onValueChange })))
  const form = container.querySelector('form')!
  await act(async () => { container.querySelector<HTMLButtonElement>('[data-slot="number-input-increment"]')!.click() })
  expect(new FormData(form).get('size')).toBe('5')
  await act(async () => { form.reset() })
  expect(new FormData(form).get('size')).toBe('4')
  expect(container.querySelector('input')!.value).toBe('4')
  expect(onValueChange).toHaveBeenLastCalledWith(4, { text: '4', valid: true })
})
