import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '../src/templates/table.js'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (family: string) => {
  const css = readFileSync(new URL(`../src/styles/table/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  return css.slice(css.indexOf('/* 0.7.3 variants */'))
}
const head = (props: Record<string, unknown>, text = 'Updated') =>
  renderToStaticMarkup(h('table', {}, h('thead', {}, h('tr', {}, h(TableHead, props, text)))))

describe('Table 0.7.3 variants', () => {
  it('puts aria-sort on a sorted head and a named button inside it', () => {
    const html = head({ sort: 'descending', onSort: vi.fn() })
    expect(html).toMatch(/<th[^>]*aria-sort="descending"/)
    expect(html).toMatch(/<button[^>]*type="button"[^>]*data-slot="table-sort"[^>]*>Updated<svg[^>]*aria-hidden="true"/)
  })

  it('leaves aria-sort off for none and for a head that is not sortable', () => {
    expect(head({ sort: 'none', onSort: vi.fn() })).not.toContain('aria-sort')
    expect(head({})).not.toContain('data-slot="table-sort"')
    expect(head({ sort: 'ascending' })).not.toContain('data-slot="table-sort"')
  })

  it('names an empty actions head with hidden text and marks action cells', () => {
    expect(head({ actions: true }, '')).toMatch(/<th[^>]*data-actions=""[^>]*><span class="sr-only">Actions<\/span><\/th>/)
    expect(renderToStaticMarkup(h('table', {}, h('tbody', {}, h('tr', {}, h(TableCell, { actions: true }, 'x')))))).toContain('data-actions=""')
  })

  it('draws rows × columns skeleton bars, hidden from assistive technology', () => {
    const html = renderToStaticMarkup(h('table', {}, h('tbody', {}, h(TableSkeletonRows, { rows: 3, columns: 4 }))))
    expect(html.match(/data-slot="table-skeleton"/g)).toHaveLength(12)
    expect(html.match(/<tr/g)).toHaveLength(3)
    expect(html).not.toMatch(/data-slot="table-skeleton"(?![^>]*aria-hidden="true")[^>]*>/)
  })

  it('marks a loading and a sticky table, and adds nothing by default', () => {
    const sticky = renderToStaticMarkup(h(Table, { stickyHeader: true, loading: true, maxBlockSize: '20rem', 'aria-label': 'Deploys' }))
    expect(sticky).toContain('aria-busy="true"')
    expect(sticky).toContain('data-table-sticky=""')
    expect(sticky).toContain('--table-max-block-size:20rem')
    const plain = renderToStaticMarkup(h(Table, { 'aria-label': 'Deploys' }, h(TableHeader, {}, h(TableRow, {}, h(TableHead, {}, 'A'))), h(TableBody)))
    expect(plain).not.toMatch(/aria-busy|data-table-sticky|data-actions|aria-sort|max-block-size/)
  })

  it.each(families)('%s styles the sticky header, sort button, actions column and skeleton bars', family => {
    const css = block(family)
    expect(css).toMatch(/\[data-slot='table-container'\]:has\(> \[data-table-sticky\]\)\s*\{[^}]*max-block-size: var\(--table-max-block-size, 24rem\)/)
    expect(css).toMatch(/\[data-slot='table-head'\]:is\(\[data-table-sticky\] \*\)\s*\{[^}]*position: sticky/)
    expect(css).toContain("[data-slot='table-sort']:focus-visible")
    expect(css).toMatch(/\[data-slot='table-head'\]\[data-actions\][^{]*\{[^}]*text-align: end/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\[data-slot='table-skeleton'\]/)
  })
})
