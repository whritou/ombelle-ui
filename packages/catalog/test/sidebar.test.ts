import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/sidebar.js'
import * as base from '../src/templates/base/sidebar.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const parts = ['SidebarProvider', 'Sidebar', 'SidebarTrigger', 'SidebarRail', 'SidebarInset', 'SidebarHeader', 'SidebarContent', 'SidebarFooter', 'SidebarInput',
  'SidebarGroup', 'SidebarGroupLabel', 'SidebarGroupAction', 'SidebarGroupContent', 'SidebarGroupCollapsible', 'SidebarGroupCollapsibleTrigger', 'SidebarGroupCollapsibleContent',
  'SidebarMenu', 'SidebarMenuItem', 'SidebarMenuButton', 'SidebarMenuAction', 'SidebarMenuBadge', 'SidebarMenuSub', 'SidebarMenuSubItem', 'SidebarMenuSubButton']
const slots = ['sidebar-wrapper', 'sidebar', 'sidebar-sheet', 'sidebar-sheet-overlay', 'sidebar-trigger', 'sidebar-rail', 'sidebar-inset', 'sidebar-header', 'sidebar-content', 'sidebar-footer',
  'sidebar-input', 'sidebar-group', 'sidebar-group-label', 'sidebar-group-action', 'sidebar-group-content', 'sidebar-group-collapsible', 'sidebar-group-collapsible-trigger',
  'sidebar-group-collapsible-content', 'sidebar-menu', 'sidebar-menu-item', 'sidebar-menu-button', 'sidebar-tooltip', 'sidebar-menu-action', 'sidebar-menu-badge', 'sidebar-menu-sub',
  'sidebar-menu-sub-item', 'sidebar-menu-sub-button']
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''

const shell = (ui: Ui, provider: Record<string, unknown> = {}, sidebar: Record<string, unknown> = {}) => h(ui.SidebarProvider, provider,
  h(ui.Sidebar, { label: 'Workspace', ...sidebar },
    h(ui.SidebarContent, null, h(ui.SidebarGroup, null, h(ui.SidebarGroupLabel, null, 'Workspace'), h(ui.SidebarGroupContent, null,
      h(ui.SidebarMenu, null,
        h(ui.SidebarMenuItem, null, h(ui.SidebarMenuButton, { isActive: true, tooltip: 'Overview' }, 'Overview')),
        h(ui.SidebarMenuItem, null, h(ui.SidebarMenuButton, { href: '/projects', tooltip: 'Projects' }, 'Projects'))))))),
  h(ui.SidebarInset, null, h(ui.SidebarTrigger), 'Main'))

describe('Sidebar', () => {
  it('provides the parts in both editions', () => {
    expectComponentContract('sidebar', { client: true, parts, slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-dialog', version: '1.3.1' }, { name: '@radix-ui/react-collapsible', version: '1.2.1' },
        { name: '@radix-ui/react-slot', version: '1.5.0' }, { name: '@radix-ui/react-tooltip', version: '1.4.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='sidebar']", "[data-slot='sidebar-sheet']", "[data-slot='sidebar-menu-button']", "[data-slot='sidebar-tooltip']", "[data-slot='sidebar-trigger']"],
      glass: 'stable' })
    expect(getTemplate(getCatalog('0.1.0'), 'sidebar', 'base').dependencies.map(dependency => dependency.name)).toEqual(expect.arrayContaining(['@base-ui/react', 'lucide-react']))
  })

  it.each(editions)('%s marks the active item as the current page, on a button and on a link', (_, ui) => {
    const html = renderToStaticMarkup(shell(ui))
    const active = tag(html, 'data-active=""')
    expect(active).toContain('data-slot="sidebar-menu-button"')
    expect(active).toContain('aria-current="page"')
    expect(tag(html, 'href="/projects"')).toContain('data-slot="sidebar-menu-button"')
    expect(tag(html, 'href="/projects"')).not.toContain('aria-current')
  })

  it.each(editions)('%s server-renders the content in flow, with no dialog', (_, ui) => {
    const html = renderToStaticMarkup(shell(ui))
    expect(html).toContain('href="/projects"')
    expect(html).not.toContain('role="dialog"')
    expect(tag(html, 'data-slot="sidebar"')).toContain('aria-label="Workspace"')
  })

  it.each(editions)('%s renders the collapsed state markers', (_, ui) => {
    const root = tag(renderToStaticMarkup(shell(ui, { defaultOpen: false }, { collapsible: 'icon' })), 'data-slot="sidebar"')
    expect(root).toContain('data-state="collapsed"')
    expect(root).toContain('data-collapsible="icon"')
    // Before hydration a phone shows the sidebar inline, so a closed off-canvas sidebar must not be inert yet.
    const hidden = tag(renderToStaticMarkup(shell(ui, { defaultOpen: false }, { collapsible: 'offcanvas' })), 'data-slot="sidebar"')
    expect(hidden).not.toContain('inert')
    expect(hidden).not.toContain('data-hydrated')
  })

  it.each(editions)('%s names the trigger and reports whether the sidebar is open', (_, ui) => {
    const trigger = tag(renderToStaticMarkup(shell(ui)), 'data-slot="sidebar-trigger"')
    expect(trigger).toContain('aria-expanded="true"')
    expect(renderToStaticMarkup(shell(ui))).toContain('Toggle sidebar')
  })
})

describe('Sidebar review fixes', () => {
  it('limits the phone layout to before hydration in every family, so a custom mobileBreakpoint is not fought by CSS', () => {
    for (const [family, css] of Object.entries(getTemplate(getCatalog('0.1.0'), 'sidebar').styles!)) {
      const phone = css!.slice(css!.indexOf('@media (max-width: 767.98px)'))
      expect(phone, family).toContain(":not([data-hydrated])")
    }
  })

  it('keeps text initials visible when collapsed to icons', () => {
    for (const [family, css] of Object.entries(getTemplate(getCatalog('0.1.0'), 'sidebar').styles!))
      expect(css, family).toMatch(/\[data-sidebar-initial\][^{]*\{[^}]*font-size:/)
  })

  it('radix renders a framework link through asChild, with the button look and the current page', () => {
    const html = renderToStaticMarkup(h(radix.SidebarProvider, null, h(radix.Sidebar, null,
      h(radix.SidebarMenuButton, { asChild: true, isActive: true }, h('a', { href: '/docs', 'data-router': '' }, 'Docs')))))
    expect(html.match(/<a /g)).toHaveLength(1)
    expect(tag(html, 'data-router')).toContain('data-slot="sidebar-menu-button"')
    expect(tag(html, 'data-router')).toContain('aria-current="page"')
  })

  it('base renders a framework link through render, with the button look and the current page', () => {
    const html = renderToStaticMarkup(h(base.SidebarProvider, null, h(base.Sidebar, null,
      h((base as any).SidebarMenuButton, { render: h('a', { href: '/docs', 'data-router': '' }), isActive: true }, 'Docs'))))
    expect(html.match(/<a /g)).toHaveLength(1)
    expect(tag(html, 'data-router')).toContain('data-slot="sidebar-menu-button"')
    expect(tag(html, 'data-router')).toContain('aria-current="page"')
    expect(html).toContain('>Docs</a>')
  })
})
