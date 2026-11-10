import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/tabs.js'
import * as base from '../src/templates/base/tabs.js'
import { Pagination, PaginationCompact, PaginationPageSize } from '../src/templates/pagination.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (file: string) => {
  const css = readFileSync(new URL(`../src/styles/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  return css.slice(css.indexOf('/* 0.7.3 variants */'))
}
const tabs = (ui: Ui, appearance?: string) => h(ui.Tabs, { defaultValue: 'all' },
  h(ui.TabsList, { 'aria-label': 'Project lists', ...(appearance ? { appearance } : {}) } as never,
    h(ui.TabsTrigger, { value: 'all' }, 'All', h(ui.TabsCount, {}, '12')),
    h(ui.TabsTrigger, { value: 'review' }, 'Review', h(ui.TabsCount, {}, '3'))),
  h(ui.TabsContent, { value: 'all' }, 'Everything'))

describe('Tabs 0.7.3 variants', () => {
  it.each(editions)('%s puts the count inside the trigger, and sets pills only when asked', (_, ui) => {
    const html = renderToStaticMarkup(tabs(ui, 'pills'))
    expect(html).toMatch(/<button[^>]*role="tab"[^>]*>All<span[^>]*data-slot="tabs-count"[^>]*>12<\/span><\/button>/)
    expect(html).toMatch(/data-slot="tabs-list"[^>]*data-appearance="pills"|data-appearance="pills"[^>]*data-slot="tabs-list"/)
    expect(renderToStaticMarkup(tabs(ui))).toContain('data-appearance="contained"')
  })

  it.each(families)('%s styles pills and counts', family => {
    const css = block(`tabs/${family}.css`)
    expect(css).toMatch(/\[data-slot='tabs-list'\]\[data-appearance='pills'\][^{]*\{[^}]*gap/)
    expect(css).toMatch(/\[data-slot='tabs-trigger'\]:is\(\[data-appearance='pills'\] > \*\)\[data-state='active'\][^{]*\{[^}]*var\(--primary\)/)
    expect(css).toMatch(/\[data-slot='tabs-count'\]:is\(\[data-state='active'\] > \*\)[^{]*\{[^}]*color-mix\(in oklab, var\(--primary-foreground\) 25%/)
    expect(css).toMatch(/@media \(forced-colors: active\)/)
  })
})

describe('Pagination 0.7.3 variants', () => {
  it('shows the page, and disables previous on the first page', () => {
    const html = renderToStaticMarkup(h(Pagination, { 'aria-label': 'Project pages' }, h(PaginationCompact, { page: 1, pageCount: 12, previousHref: '#p0', nextHref: '#p2' })))
    expect(html).toContain('Page 1 of 12')
    expect(html).toMatch(/aria-label="Previous page"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*aria-label="Previous page"/)
    const next = /<a[^>]*aria-label="Next page"[^>]*>/.exec(html)![0]
    expect(next).toContain('href="#p2"')
    expect(next).not.toContain('aria-disabled')
  })

  it('disables next on the last page', () => {
    const html = renderToStaticMarkup(h(PaginationCompact, { page: 12, pageCount: 12, previousHref: '#p11', nextHref: '#p13' }))
    expect(/<a[^>]*aria-label="Next page"[^>]*>/.exec(html)![0]).toContain('aria-disabled="true"')
  })

  it('labels a page size select with four options and shows the range', () => {
    const html = renderToStaticMarkup(h(PaginationPageSize, { value: 25, range: '1–25 of 290' }))
    const id = /<select[^>]*id="([^"]+)"/.exec(html)![1]
    expect(html).toContain(`for="${id}">Rows per page</label>`)
    expect(html.match(/<option/g)).toHaveLength(4)
    expect(html).toContain('1–25 of 290')
    expect(html).toContain('data-slot="pagination-page-size"')
  })

  it.each(families)('%s styles the compact layout and the page size', family => {
    const css = block(`pagination/${family}.css`)
    expect(css).toContain("[data-slot='pagination-compact']")
    expect(css).toContain("[data-slot='pagination-page-size']")
  })
})
