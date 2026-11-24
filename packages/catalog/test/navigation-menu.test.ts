import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/navigation-menu.js'
import * as base from '../src/templates/base/navigation-menu.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const slots = ['navigation-menu', 'navigation-menu-list', 'navigation-menu-item', 'navigation-menu-trigger', 'navigation-menu-content', 'navigation-menu-link', 'navigation-menu-indicator', 'navigation-menu-viewport']
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''

const menu = (ui: Ui) => h(ui.NavigationMenu, { 'aria-label': 'Main' },
  h(ui.NavigationMenuList, null,
    h(ui.NavigationMenuItem, null,
      h(ui.NavigationMenuTrigger, null, 'Docs'),
      h(ui.NavigationMenuContent, null, h(ui.NavigationMenuLink, { href: '/docs/installation' }, 'Installation'))),
    h(ui.NavigationMenuItem, null, h(ui.NavigationMenuLink, { href: '/docs', active: true, variant: 'trigger' }, 'Introduction')),
    h(ui.NavigationMenuItem, null, h(ui.NavigationMenuLink, { href: '/blog', variant: 'trigger' }, 'Blog')),
    h(ui.NavigationMenuIndicator)))

describe('Navigation Menu', () => {
  it('provides the parts in both editions', () => {
    expectComponentContract('navigation-menu', { client: true,
      parts: ['NavigationMenu', 'NavigationMenuList', 'NavigationMenuItem', 'NavigationMenuTrigger', 'NavigationMenuContent', 'NavigationMenuLink', 'NavigationMenuIndicator', 'NavigationMenuViewport'], slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-navigation-menu', version: '1.4.1' },
        { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='navigation-menu-list']", "[data-slot='navigation-menu-trigger']", "[data-slot='navigation-menu-viewport']", "[data-slot='navigation-menu-link']", "[data-slot='navigation-menu-indicator']"],
      glass: 'stable' })
    expect(getTemplate(getCatalog('0.1.0'), 'navigation-menu', 'base').dependencies.map(dependency => dependency.name)).toEqual(expect.arrayContaining(['@base-ui/react', 'lucide-react']))
  })

  it.each(editions)('%s renders plain links as anchors before hydration', (_, ui) => {
    const html = renderToStaticMarkup(menu(ui))
    expect(tag(html, 'href="/blog"')).toMatch(/^<a /)
    expect(tag(html, 'href="/blog"')).toContain('data-slot="navigation-menu-link"')
    expect(tag(html, 'href="/blog"')).toContain('data-variant="trigger"')
    expect(tag(html, 'data-slot="navigation-menu-trigger"')).toMatch(/^<button /)
  })

  it.each(editions)('%s marks the active link as the current page', (_, ui) => {
    const html = renderToStaticMarkup(menu(ui))
    expect(tag(html, 'href="/docs"')).toContain('aria-current="page"')
    expect(tag(html, 'href="/blog"')).not.toContain('aria-current')
  })
})
