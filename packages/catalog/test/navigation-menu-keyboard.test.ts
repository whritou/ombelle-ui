// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import * as base from '../src/templates/base/navigation-menu.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

const roots: Root[] = []
afterEach(() => {
  act(() => roots.splice(0).forEach(root => root.unmount()))
  document.body.innerHTML = ''
})

async function mount(props: Record<string, unknown> = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(h(base.NavigationMenu, { 'aria-label': 'Main', ...props } as never,
    h(base.NavigationMenuList, null,
      h(base.NavigationMenuItem, { value: 'docs' },
        h(base.NavigationMenuTrigger, null, 'Docs'),
        h(base.NavigationMenuContent, null,
          h(base.NavigationMenuLink, { href: '/docs/installation' }, 'Installation'),
          h(base.NavigationMenuLink, { href: '/docs/theming' }, 'Theming'))),
      h(base.NavigationMenuItem, null, h(base.NavigationMenuLink, { href: '/docs', variant: 'trigger' }, 'Introduction')),
      h(base.NavigationMenuItem, null, h(base.NavigationMenuLink, { href: '/blog', variant: 'trigger' }, 'Blog'))))))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  return container
}
const press = (name: string) => act(async () => {
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }))
})
// A trigger's text ends with its chevron's.
const focused = () => document.activeElement?.textContent?.replace(/▼$/, '')

describe('Base Navigation Menu keyboard and landmarks (A11Y-10)', () => {
  it('moves to the first and last top-level item with Home and End', async () => {
    const container = await mount()
    await act(async () => container.querySelector<HTMLElement>('[data-slot="navigation-menu-trigger"]')!.focus())
    await press('End')
    expect(focused()).toBe('Blog')
    await press('Home')
    expect(focused()).toBe('Docs')
  })

  it('moves into an open panel with ArrowDown on its trigger', async () => {
    const container = await mount({ defaultValue: 'docs' })
    const trigger = container.querySelector<HTMLElement>('[data-slot="navigation-menu-trigger"]')!
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    await act(async () => trigger.focus())
    await press('ArrowDown')
    expect(focused()).toBe('Installation')
  })

  it('keeps the open panel out of the landmarks: one named navigation only', async () => {
    await mount({ defaultValue: 'docs' })
    expect(document.body.textContent).toContain('Installation')
    const landmarks = [...document.querySelectorAll('nav, [role="navigation"]')]
    expect(landmarks).toHaveLength(1)
    expect(landmarks[0]!.getAttribute('aria-label')).toBe('Main')
  })
})
