import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/data-table.js'
import * as base from '../src/templates/base/data-table.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix
type Preset = { name: string; family: string }
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''
const presets: Preset[] = Array.from({ length: 25 }, (_, index) => ({ name: `Preset ${String(index + 1).padStart(2, '0')}`, family: index % 2 ? 'Papier' : 'Ombelle' }))
const columns = (ui: Ui) => {
  const helper = ui.dataTableColumns<Preset>()
  return [
    ui.selectColumn<Preset>(),
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('family', { header: 'Family' }),
  ] as radix.DataTableColumn<Preset>[]
}

describe('Data Table', () => {
  it('provides the parts in both editions', () => {
    expectComponentContract('data-table', { client: true,
      parts: ['DataTableToolbar', 'DataTableRowActions', 'DataTableRowAction'],
      slots: ['data-table', 'data-table-container', 'data-table-table', 'data-table-caption', 'data-table-header', 'data-table-body', 'data-table-row', 'data-table-head', 'data-table-cell',
        'data-table-sort', 'data-table-toolbar', 'data-table-filter', 'data-table-button', 'data-table-menu', 'data-table-menu-label', 'data-table-menu-item', 'data-table-menu-indicator',
        'data-table-count', 'data-table-pagination', 'data-table-selection', 'data-table-status', 'data-table-row-actions'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-dropdown-menu', version: '2.2.1' }, { name: '@radix-ui/react-popover', version: '1.3.1' },
        { name: '@tanstack/react-table', version: '9.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='data-table-container']", "[data-slot='data-table-head']", "[data-slot='data-table-cell']", "[data-slot='data-table-menu']", "[data-slot='data-table-pagination']"],
      glass: 'experimental' })
    // The parts generic over the row type.
    for (const part of ['DataTable', 'DataTableColumnHeader', 'DataTableFilter', 'DataTableViewOptions', 'DataTableFacetedFilter', 'DataTablePagination', 'selectColumn', 'actionsColumn', 'dataTableColumns'])
      expect(getTemplate(getCatalog('0.1.0'), 'data-table').content).toContain(`export function ${part}<TData extends RowData>(`)
    expect(getTemplate(getCatalog('0.1.0'), 'data-table', 'base').dependencies.map(dependency => dependency.name)).toEqual(expect.arrayContaining(['@base-ui/react', '@tanstack/react-table']))
  })

  it('leaves Table untouched', () => {
    expect(getTemplate(getCatalog('0.1.0'), 'data-table').content).not.toContain("from './table")
  })

  it.each(editions)('%s renders the first page as plain table rows', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.DataTable<Preset>, { columns: columns(ui), data: presets, pagination: true, pageSize: 10, 'aria-label': 'Presets' }))
    const body = html.slice(html.indexOf('data-slot="data-table-body"'))
    expect(body.match(/data-slot="data-table-row"/g)).toHaveLength(10)
    expect(html).toContain('Preset 01')
    expect(html).not.toContain('Preset 11')
  })

  it.each(editions)('%s renders the empty state across every column', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.DataTable<Preset>, { columns: columns(ui), data: [] }))
    const cell = tag(html, 'data-data-table-empty')
    expect(cell).toContain('colSpan="3"')
    expect(html).toContain('No results.')
  })

  it.each(editions)('%s sets aria-sort on a sorted header', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.DataTable<Preset>, { columns: columns(ui), data: presets, initialState: { sorting: [{ id: 'name', desc: true }] } }))
    expect(html).toContain('aria-sort="descending"')
    expect(html.indexOf('Preset 25')).toBeGreaterThan(-1)
  })
})

describe('Data Table described by plain data', () => {
  const plain: radix.DataTableColumn<Preset>[] = [{ accessorKey: 'name', header: 'Name' }, { accessorKey: 'family', header: 'Family' }]
  it.each(editions)('%s turns string headers into sort buttons and adds the selection column, filter and pagination on request', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.DataTable<Preset>, { columns: plain, data: presets, selectable: true, filterColumn: 'name', filterLabel: 'Filter presets', pagination: true, pageSize: 5 }))
    expect(html.match(/data-slot="data-table-sort"/g)).toHaveLength(2)
    expect(html).toContain('aria-label="Select all rows on this page"')
    expect(tag(html, 'data-slot="data-table-filter"')).toContain('aria-label="Filter presets"')
    expect(html).toContain('0 of 25 row(s) selected.')
    expect(html).toContain('Page 1 of 5')
  })
})

describe('facetFilter', () => {
  const row = (value: string) => ({ getValue: () => value })
  it('keeps a row whose value is checked, and every row when nothing is checked', () => {
    expect(radix.facetFilter(row('Experimental'), 'status', ['Experimental'])).toBe(true)
    expect(radix.facetFilter(row('Stable'), 'status', ['Experimental'])).toBe(false)
    expect(radix.facetFilter(row('Stable'), 'status', [])).toBe(true)
    expect(radix.facetFilter(row('Stable'), 'status', undefined)).toBe(true)
  })
})

describe('Data Table review fixes', () => {
  const body = (html: string) => html.slice(html.indexOf('data-slot="data-table-body"'))
  it.each(editions)('%s shows every row when pagination is off, and still reports the selection count when rows are selectable', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.DataTable<Preset>, { columns: columns(ui), data: presets, selectable: true }))
    expect(body(html).match(/data-slot="data-table-row"/g)).toHaveLength(25)
    expect(html).toContain('0 of 25 row(s) selected.')
  })

  it.each(editions)('%s announces "No results." from a live region that stays on the page, and keeps the empty cell a plain cell', (_, ui) => {
    const empty = renderToStaticMarkup(h(ui.DataTable<Preset>, { columns: columns(ui), data: [] }))
    expect(tag(empty, 'data-data-table-empty')).not.toContain('role=')
    expect(tag(empty, 'data-slot="data-table-status"')).toContain('role="status"')
    expect(empty).toMatch(/data-slot="data-table-status"[^>]*>No results\.</)
    const full = renderToStaticMarkup(h(ui.DataTable<Preset>, { columns: columns(ui), data: presets }))
    expect(tag(full, 'data-slot="data-table-status"')).toContain('role="status"')
  })
})
