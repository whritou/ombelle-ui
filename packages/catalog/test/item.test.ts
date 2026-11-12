import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from '../src/templates/item.js'
import { expectComponentContract } from './new-component-contract.js'
import { lintCatalogStyles, templateSlots } from '../../../scripts/catalog-style-lint.js'

const slots = ['item', 'item-media', 'item-content', 'item-title', 'item-description', 'item-actions', 'item-group', 'item-separator']

describe('Item', () => {
  it('provides the parts without client code or extra dependencies', () => {
    expectComponentContract('item', { client: false, parts: ['Item', 'ItemGroup', 'ItemSeparator', 'ItemMedia', 'ItemContent', 'ItemTitle', 'ItemDescription', 'ItemActions'], slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: [...slots.map(slot => `[data-slot='${slot}']`), '[data-item-action]', "a[data-slot='item']:focus-visible"], glass: 'experimental' })
  })

  it('serves both editions from one template without Radix', () => {
    const catalog = getCatalog('0.1.0')
    const base = getTemplate(catalog, 'item', 'base')
    expect(base.content).toBe(getTemplate(catalog, 'item', 'radix').content)
    expect(base.content).not.toMatch(/@radix-ui\//)
  })

  it('renders a link Item in a listitem with its actions beside the link', () => {
    const html = renderToStaticMarkup(h(ItemGroup, { 'aria-label': 'Presets' },
      h(Item, { asChild: true }, h('a', { href: '/presets/ombelle' }, h(ItemContent, null, h(ItemTitle, null, 'Ombelle'))), h(ItemActions, null, h('button', { type: 'button' }, 'Apply'))),
      h(ItemSeparator)))
    expect(html.match(/role="list"/g)).toHaveLength(1)
    expect(html).toMatch(/^<div[^>]*role="list"[^>]*><div role="listitem"><div[^>]*data-slot="item"[^>]*data-as-child/)
    const link = html.match(/<a [^>]*>/)![0]
    expect(link).not.toContain('role=')
    const inside = html.slice(html.indexOf('<a '), html.indexOf('</a>'))
    expect(inside).not.toContain('<button')
    expect(html.indexOf('</a>')).toBeLessThan(html.indexOf('<button'))
    expect(html).toContain('data-slot="item-actions"')
    expect(html).toContain('role="separator"')
    expect(html.match(/role="listitem"/g)).toHaveLength(2)
  })

  it('keeps every direct child of the list a listitem', () => {
    const html = renderToStaticMarkup(h(ItemGroup, null, h(Item), h(ItemSeparator), h(Item)))
    const inner = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</div>'))
    expect(inner.match(/<div role="listitem">/g)).toHaveLength(3)
    expect(inner.startsWith('<div role="listitem">')).toBe(true)
    expect(inner.endsWith('</div></div>')).toBe(true)
    expect(inner.replace(/<div role="listitem">.*?<\/div><\/div>/g, '')).toBe('')
  })

  it('merges the Item props into the link when there are no actions', () => {
    const html = renderToStaticMarkup(h(Item, { asChild: true, variant: 'muted', className: 'x' }, h('a', { href: '/a', className: 'own', 'aria-label': 'Open' }, 'Open')))
    expect(html).toMatch(/^<a /)
    expect(html).toContain('data-slot="item"')
    expect(html).toContain('data-variant="muted"')
    expect(html).toContain('href="/a"')
    expect(html).toContain('aria-label="Open"')
    expect(html).toMatch(/class="x own"/)
  })

  it('sets the variant and size data attributes', () => {
    expect(renderToStaticMarkup(h(Item, { variant: 'outline' }))).toContain('data-variant="outline"')
    expect(renderToStaticMarkup(h(Item))).toMatch(/data-variant="default"[^>]*data-size="default"|data-size="default"[^>]*data-variant="default"/)
    expect(renderToStaticMarkup(h(Item, { size: 'sm' }))).toContain('data-size="sm"')
  })

  it('renders media, text and actions', () => {
    expect(renderToStaticMarkup(h(ItemMedia, { variant: 'icon' }))).toContain('data-variant="icon"')
    expect(renderToStaticMarkup(h(ItemDescription, null, 'x'))).toMatch(/^<p[^>]*data-slot="item-description"/)
  })

  it('keeps targets, focus and reduced motion in every family', () => {
    const styles = getTemplate(getCatalog('0.1.0'), 'item').styles!
    for (const [family, css] of Object.entries(styles)) {
      expect(css, family).toMatch(/\[data-slot='item'\]\[data-variant='outline'\]/)
      expect(css, family).toMatch(/\[data-slot='item'\]\[data-variant='muted'\]/)
      expect(css, family).toMatch(/\[data-slot='item'\]\[data-size='sm'\]/)
      expect(css, family).toContain('[data-item-link]:focus-visible')
      expect(css, family).toContain("a[data-slot='item']:focus-visible")
      expect(css, family).toContain("button[data-slot='item']:focus-visible")
      expect(css, family).toContain('[data-item-link]:hover')
      expect(css, family).toMatch(/\[data-item-action\][^{]*\{[^}]*min-block-size:\s*(?:2[4-9]|[3-9]\d)px/)
      expect(css, family).toContain('prefers-reduced-motion')
    }
    expect(styles['liquid-glass']).toMatch(/:focus-visible \{[^}]*outline:\s*2px solid var\(--foreground\)/)
    expect(styles['liquid-glass']).not.toMatch(/outline-offset:\s*[1-9]/)
  })

  it('passes the catalog style lint', () => {
    const template = getTemplate(getCatalog('0.1.0'), 'item')
    expect(lintCatalogStyles({ componentStyles: { item: template.styles! }, familyStyles: {},
      slots: { item: templateSlots('item', [template.content], template.slots) } })).toEqual([])
  })
})
