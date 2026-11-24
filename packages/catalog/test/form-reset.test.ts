// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement as h, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TagInput, TagInputInput, TagInputList } from '../src/templates/tag-input.js'
import * as radixCalendar from '../src/templates/calendar.js'
import * as baseCalendar from '../src/templates/base/calendar.js'
import { PasswordField, PasswordFieldInput, PasswordFieldStrength, type PasswordCheck } from '../src/templates/password-field.js'

// CAT-12: custom controls kept their value in React state through a form reset; they now
// return to their default, as the native fields beside them do.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const roots: Root[] = []
afterEach(async () => {
  await act(async () => { for (const root of roots.splice(0)) root.unmount() })
  document.body.innerHTML = ''
})

async function mount(element: ReactElement) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => { root.render(h('form', null, element)) })
  return container.querySelector('form')!
}
async function type(input: HTMLInputElement, text: string) {
  input.focus()
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
  await act(async () => { input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text })) })
}

it('TagInput returns to its default tags, and clears the typed text and the announcement', async () => {
  const onValueChange = vi.fn()
  const form = await mount(h(TagInput, { name: 'tags', defaultValue: ['ui'], onValueChange }, h(TagInputList), h(TagInputInput, { 'aria-label': 'Tags' })))
  const input = form.querySelector<HTMLInputElement>('[data-slot="tag-input-input"]')!
  await type(input, 'kit')
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
  await type(input, 'half')
  expect(new FormData(form).getAll('tags')).toEqual(['ui', 'kit'])
  await act(async () => { form.reset() })
  expect(new FormData(form).getAll('tags')).toEqual(['ui'])
  expect(onValueChange).toHaveBeenLastCalledWith(['ui'])
  expect(input.value).toBe('')
  expect(form.querySelector('[data-slot="tag-input-status"]')!.textContent).toBe('')
})

describe.each([['radix', radixCalendar], ['base', baseCalendar as unknown as typeof radixCalendar]] as const)('%s DatePicker', (_, ui) => {
  it('returns to its default date when the form is reset', async () => {
    const onValueChange = vi.fn()
    const form = await mount(h(ui.DatePicker, { name: 'day', defaultValue: '2026-03-04', 'aria-label': 'Day', onValueChange }))
    // Choose another day through the calendar.
    await act(async () => { form.querySelector<HTMLButtonElement>('[data-slot="date-picker-trigger"]')!.click() })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    const day = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="calendar-day-button"]')].find(button => button.textContent === '10')!
    await act(async () => { day.click() })
    expect(new FormData(form).get('day')).toBe('2026-03-10')
    await act(async () => { form.reset() })
    expect(new FormData(form).get('day')).toBe('2026-03-04')
    expect(onValueChange).toHaveBeenCalledTimes(2)
    expect(form.querySelector('[data-slot="date-picker-trigger"]')!.textContent).toContain('Mar 4, 2026')
  })
})

it("PasswordFieldStrength follows the input back to its default value", async () => {
  const checks: PasswordCheck[] = [{ label: 'Use 12 characters', test: value => value.length >= 12 }, { label: 'Add a number', match: '\\d' }]
  const form = await mount(h(PasswordField, null, h(PasswordFieldInput, { 'aria-label': 'Password', name: 'password', defaultValue: 'abc' }), h(PasswordFieldStrength, { checks })))
  const meter = form.querySelector('[role="meter"]')!
  expect(meter.getAttribute('aria-valuenow')).toBe('0')
  await type(form.querySelector<HTMLInputElement>('input')!, 'abcdefghijk12')
  expect(meter.getAttribute('aria-valuenow')).toBe('2')
  await act(async () => { form.reset() })
  expect(form.querySelector('input')!.value).toBe('abc')
  expect(meter.getAttribute('aria-valuenow')).toBe('0')
})
