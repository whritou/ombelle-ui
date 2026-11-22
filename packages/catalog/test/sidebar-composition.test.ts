// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement as h, createRef, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'
import { createRoot } from 'react-dom/client'
import * as radix from '../src/templates/sidebar.js'
import * as base from '../src/templates/base/sidebar.js'

// CAT-09, CAT-10 and A11Y-20: SidebarMenuButton refs are typed for the element rendered and its
// composed child keeps both click handlers; SidebarRail runs the caller's onClick; the trigger
// points at the sidebar with aria-controls.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
afterEach(() => { document.body.innerHTML = '' })

// Type-level (pnpm typecheck): a button ref, a link ref and a composed child's ref all compile, and so do handlers typed for each.
declare const buttonRef: RefObject<HTMLButtonElement | null>
declare const linkRef: RefObject<HTMLAnchorElement | null>
export const typed = () => [
  h(radix.SidebarMenuButton, { ref: buttonRef, onClick: (event: ReactMouseEvent<HTMLButtonElement>) => event.currentTarget.form }),
  h(radix.SidebarMenuButton, { ref: linkRef, href: '/a', onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => event.currentTarget.href }),
  h(radix.SidebarMenuButton, { ref: linkRef, asChild: true }, h('a', { href: '/a' })),
  h(base.SidebarMenuButton, { ref: buttonRef }),
  h(base.SidebarMenuButton, { ref: linkRef, href: '/a' }),
  h(base.SidebarMenuButton, { ref: linkRef, render: h('a', { href: '/a' }) }),
]

async function mount(element: ReturnType<typeof h>) {
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () => { createRoot(container).render(element) })
  return container
}

type Ui = typeof radix
describe.each([['radix', radix], ['base', base as unknown as Ui]] as const)('%s Sidebar composition', (edition, ui) => {
  it('runs both the item handler and the child link handler on a composed item, and sets both refs', async () => {
    const item = vi.fn(), child = vi.fn()
    const itemRef = createRef<HTMLElement>(), childRef = createRef<HTMLAnchorElement>()
    const link = h('a', { href: '#docs', onClick: (event: MouseEvent) => { child(); event.preventDefault() }, ref: childRef })
    const button = edition === 'radix'
      ? h(radix.SidebarMenuButton, { asChild: true, onClick: item, ref: itemRef }, link)
      : h(base.SidebarMenuButton, { render: link, onClick: item, ref: itemRef }, 'Docs')
    const container = await mount(h(ui.SidebarProvider, null, h(ui.Sidebar, null, button)))
    const anchor = container.querySelector('a')!
    await act(async () => { anchor.click() })
    expect(child).toHaveBeenCalledTimes(1)
    expect(item).toHaveBeenCalledTimes(1)
    expect(itemRef.current).toBe(anchor)
    expect(childRef.current).toBe(anchor)
  })

  it("runs the rail's onClick, and a prevented click does not toggle", async () => {
    const onClick = vi.fn((event: { preventDefault(): void }) => event.preventDefault())
    const container = await mount(h(ui.SidebarProvider, null, h(ui.Sidebar, null, h(ui.SidebarRail, { onClick }))))
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-slot="sidebar-rail"]')!.click() })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-slot="sidebar"]')!.getAttribute('data-state')).toBe('expanded')
  })

  it('points the trigger at the sidebar, also when the sidebar has its own id', async () => {
    for (const id of [undefined, 'main-nav']) {
      const container = await mount(h(ui.SidebarProvider, null, h(ui.Sidebar, { id }), h(ui.SidebarTrigger)))
      const sidebar = container.querySelector('[data-slot="sidebar"]')!
      expect(sidebar.id).toBeTruthy()
      if (id) expect(sidebar.id).toBe(id)
      expect(container.querySelector('[data-slot="sidebar-trigger"]')!.getAttribute('aria-controls')).toBe(sidebar.id)
    }
  })
})
