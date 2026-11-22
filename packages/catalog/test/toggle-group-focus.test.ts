// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import * as radix from '../src/templates/toggle-group.js'
import * as base from '../src/templates/base/toggle-group.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const editions = [['radix', radix], ['base', base]] as const
const roots: Root[] = []
afterEach(() => {
  act(() => roots.splice(0).forEach(root => root.unmount()))
  document.body.innerHTML = ''
})

async function mount(ui: typeof radix, props: Record<string, unknown>) {
  const container = document.createElement('div')
  document.body.append(container)
  const outside = document.createElement('button')
  document.body.append(outside)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(h(ui.ToggleGroup, { 'aria-label': 'Calendar view', ...props } as never,
    h(ui.ToggleGroupItem, { value: 'day' }, 'Day'), h(ui.ToggleGroupItem, { value: 'week' }, 'Week'), h(ui.ToggleGroupItem, { value: 'month' }, 'Month'))))
  const items = [...container.querySelectorAll<HTMLButtonElement>('[data-slot="toggle-group-item"]')]
  /** Where Tab from outside lands: the first tab stop in the group, followed if it moves focus on (Radix's group does). */
  const tabIn = async () => {
    const stop = [...container.querySelectorAll<HTMLElement>('[data-slot="toggle-group"], [data-slot="toggle-group-item"]')].find(element => element.tabIndex >= 0)
    await act(async () => stop?.focus())
    return document.activeElement?.textContent
  }
  return { items, outside, tabIn }
}
const tabStops = (items: HTMLElement[]) => items.filter(item => item.tabIndex === 0).map(item => item.textContent)

describe('Toggle Group tab stop (A11Y-09)', () => {
  it.each(editions)('%s single choice puts the one tab stop on the checked radio', async (_, ui) => {
    const { items, tabIn } = await mount(ui, { type: 'single', defaultValue: 'week' })
    expect(tabStops(items).length).toBeLessThanOrEqual(1)
    expect(await tabIn()).toBe('Week')
  })

  it('base single choice keeps arrow-key roving, and returns the tab stop to the checked radio on leaving', async () => {
    const { items, outside } = await mount(base as unknown as typeof radix, { type: 'single', defaultValue: 'week' })
    await act(async () => items[1]!.focus())
    await act(async () => { items[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })) })
    expect(document.activeElement).toBe(items[2])
    expect(tabStops(items)).toEqual(['Month'])
    await act(async () => outside.focus())
    expect(tabStops(items)).toEqual(['Week'])
  })

  it('base keeps a tab stop when the checked value has no item', async () => {
    const { items, tabIn } = await mount(base as unknown as typeof radix, { type: 'single', defaultValue: 'year' })
    expect(tabStops(items)).toEqual(['Day'])
    expect(await tabIn()).toBe('Day')
  })

  it.each(editions)('%s with nothing checked keeps the tab stop on the first item', async (_, ui) => {
    const { tabIn } = await mount(ui, { type: 'single' })
    expect(await tabIn()).toBe('Day')
  })

  it.each(editions)('%s multiple choice keeps a single tab stop (Radix enters on the pressed item, Base on the first)', async (_, ui) => {
    const { items, tabIn } = await mount(ui, { type: 'multiple', defaultValue: ['month'] })
    expect(tabStops(items).length).toBeLessThanOrEqual(1)
    expect(await tabIn()).toBe(ui === radix ? 'Month' : 'Day')
  })
})
