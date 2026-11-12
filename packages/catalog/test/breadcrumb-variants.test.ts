import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/breadcrumb.js'
import * as base from '../src/templates/base/breadcrumb.js'
import { getCatalog, getTemplate } from '../src/index.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const trail = (ui: Ui, props: Record<string, unknown> = {}) => renderToStaticMarkup(h(ui.Breadcrumb, props as never, h(ui.BreadcrumbList, {},
  h(ui.BreadcrumbItem, {}, h(ui.BreadcrumbLink, { href: '/presets' }, 'Presets')), h(ui.BreadcrumbSeparator),
  h(ui.BreadcrumbItem, {}, h(ui.BreadcrumbLink, { href: '/presets/glass' }, 'Liquid glass')), h(ui.BreadcrumbSeparator),
  h(ui.BreadcrumbItem, {}, h(ui.BreadcrumbLink, { href: '/presets/glass/givre' }, 'Givre')), h(ui.BreadcrumbSeparator),
  h(ui.BreadcrumbItem, {}, h(ui.BreadcrumbPage, {}, 'Button')))))

describe('collapsedCount', () => {
  it('folds the fewest middle items that make the trail fit', () => {
    expect(radix.collapsedCount([60, 80, 80, 80, 90], 16, 32, 1000)).toBe(0)
    // Full: 390 + 4 x 16 = 454. One folded: 310 + 3 x 16 + 48 = 406. Two: 230 + 32 + 48 = 310. Three: 150 + 16 + 48 = 214.
    expect(radix.collapsedCount([60, 80, 80, 80, 90], 16, 32, 454)).toBe(0)
    expect(radix.collapsedCount([60, 80, 80, 80, 90], 16, 32, 453)).toBe(1)
    expect(radix.collapsedCount([60, 80, 80, 80, 90], 16, 32, 310)).toBe(2)
    expect(radix.collapsedCount([60, 80, 80, 80, 90], 16, 32, 300)).toBe(3)
  })

  it('never folds a trail of two, and folds every middle item when nothing fits', () => {
    expect(radix.collapsedCount([60, 90], 16, 32, 10)).toBe(0)
    expect(radix.collapsedCount([90], 16, 32, 10)).toBe(0)
    expect(radix.collapsedCount([200, 80, 80, 200], 16, 32, 100)).toBe(2)
  })

  it('is the same function in both editions', () => {
    expect(base.collapsedCount([60, 80, 80, 80, 90], 16, 32, 310)).toBe(2)
  })
})

describe('Breadcrumb collapse', () => {
  it.each(editions)('%s server-renders the full trail with collapse="auto"', (_, ui) => {
    const html = trail(ui, { collapse: 'auto' })
    expect(html).not.toMatch(/ hidden=""|data-breadcrumb-hidden/)
    expect(html.match(/data-slot="breadcrumb-item"/g)).toHaveLength(4)
    expect(html).not.toContain('Show ')
  })

  // Recorded from the template before the 0.7.5 collapse (commit f3e1615).
  const before = '<nav aria-label="Breadcrumb" data-slot="breadcrumb" class=""><ol data-slot="breadcrumb-list" class=""><li data-slot="breadcrumb-item" class=""><a href="/presets" data-slot="breadcrumb-link" class="">Presets</a></li><li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" class=""><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7"></path></svg></li><li data-slot="breadcrumb-item" class=""><span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" class="">…</span></li><li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" class=""><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7"></path></svg></li><li data-slot="breadcrumb-item" class=""><span aria-current="page" data-slot="breadcrumb-page" class="">Button</span></li></ol></nav>'
  it.each(editions)('%s renders a trail without collapse byte-identical to before, ellipsis included', (_, ui) => {
    expect(renderToStaticMarkup(h(ui.Breadcrumb, {}, h(ui.BreadcrumbList, {},
      h(ui.BreadcrumbItem, {}, h(ui.BreadcrumbLink, { href: '/presets' }, 'Presets')), h(ui.BreadcrumbSeparator),
      h(ui.BreadcrumbItem, {}, h(ui.BreadcrumbEllipsis)), h(ui.BreadcrumbSeparator),
      h(ui.BreadcrumbItem, {}, h(ui.BreadcrumbPage, {}, 'Button')))))).toBe(before)
  })

  it.each(editions)('%s renders the default trail as before', (_, ui) => {
    expect(trail(ui)).toBe(trail(ui, { collapse: 'none' }))
    expect(trail(ui)).not.toMatch(/data-collapse/)
  })

  it('Radix uses the dropdown menu primitive and Base UI its Menu, as client components', () => {
    const catalog = getCatalog('0.1.0')
    const names = (template: { dependencies: { name: string }[] }) => template.dependencies.map(dependency => dependency.name)
    const radixTemplate = getTemplate(catalog, 'breadcrumb')
    const baseTemplate = getTemplate(catalog, 'breadcrumb', 'base')
    expect(radixTemplate.content).toMatch(/^['"]use client['"]/)
    expect(baseTemplate.content).toMatch(/^['"]use client['"]/)
    expect(names(radixTemplate)).toContain('@radix-ui/react-dropdown-menu')
    expect(names(baseTemplate)).toContain('@base-ui/react')
    expect(names(baseTemplate)).not.toContain('@radix-ui/react-dropdown-menu')
  })
})
