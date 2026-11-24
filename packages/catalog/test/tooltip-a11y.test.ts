// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import * as radix from '../src/templates/tooltip.js'
import * as base from '../src/templates/base/tooltip.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const roots: Root[] = []
afterEach(() => {
  act(() => roots.splice(0).forEach(root => root.unmount()))
  document.body.innerHTML = ''
})

async function mount(ui: Ui, tooltip: Record<string, unknown>, trigger: Record<string, unknown> = {}, content: Record<string, unknown> = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(h(ui.TooltipProvider, null, h(ui.Tooltip, tooltip as never,
    h(ui.TooltipTrigger, { type: 'button', ...trigger } as never, 'Details'),
    h(ui.TooltipContent, content as never, 'View project details')))))
  return container.querySelector<HTMLButtonElement>('[data-slot="tooltip-trigger"]')!
}
const description = (trigger: Element) =>
  (trigger.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map(id => document.getElementById(id))

describe('Tooltip accessibility (A11Y-06)', () => {
  it.each(editions)('%s describes an open trigger by a role="tooltip" element holding the text', async (_, ui) => {
    const trigger = await mount(ui, { open: true })
    const tooltips = description(trigger).filter(element => element?.getAttribute('role') === 'tooltip')
    expect(tooltips).toHaveLength(1)
    expect(tooltips[0]!.textContent).toBe('View project details')
  })

  it('base leaves a closed trigger undescribed', async () => {
    const trigger = await mount(base as unknown as Ui, { open: false })
    expect(trigger.hasAttribute('aria-describedby')).toBe(false)
  })

  it('base keeps a description of your own next to the tooltip, and follows an id you give the content', async () => {
    const own = document.createElement('p')
    own.id = 'own-hint'
    own.textContent = 'Opens in a panel'
    document.body.append(own)
    const trigger = await mount(base as unknown as Ui, { open: true }, { 'aria-describedby': 'own-hint' }, { id: 'project-tip' })
    expect(trigger.getAttribute('aria-describedby')).toBe('own-hint project-tip')
    expect(document.getElementById('project-tip')?.getAttribute('role')).toBe('tooltip')
  })
})
