import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/data-table.js'
import * as base from '../src/templates/base/data-table.js'

type Ui = typeof radix
type Kit = { name: string; size: number }
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const kits: Kit[] = [{ name: 'Accordion', size: 2 }, { name: 'Badge', size: 2 }, { name: 'Card', size: 3 }]
const columns = (ui: Ui) => {
  const helper = ui.dataTableColumns<Kit>()
  return [helper.accessor('name', { header: 'Name' }), helper.accessor('size', { header: 'Size' })] as radix.DataTableColumn<Kit>[]
}
const labelsOf = (html: string) => [...html.matchAll(/<input[^>]*aria-label="([^"]*)"/g)].map(match => match[1])

describe.each(editions)('%s Data Table', (_, ui) => {
  it('names each row checkbox after its row (A11Y-08)', () => {
    const html = renderToStaticMarkup(h(ui.DataTable<Kit>, { columns: columns(ui), data: kits, selectable: true, 'aria-label': 'Kits' }))
    expect(labelsOf(html)).toEqual(['Select all rows on this page', 'Select Accordion', 'Select Badge', 'Select Card'])
    const own = renderToStaticMarkup(h(ui.DataTable<Kit>, { columns: [ui.selectColumn<Kit>({ label: row => `Pick ${row.original.name}` }), ...columns(ui)], data: kits, 'aria-label': 'Kits' }))
    expect(labelsOf(own).slice(1)).toEqual(['Pick Accordion', 'Pick Badge', 'Pick Card'])
  })

  it('takes every visible and spoken string from labels (CAT-13)', () => {
    const html = renderToStaticMarkup(h(ui.DataTable<Kit>, {
      columns: columns(ui), data: kits, selectable: true, pagination: true, pageSize: 2, 'aria-label': 'Kits',
      labels: { selectAll: 'Tout sélectionner', selectRow: name => `Sélectionner ${name}`, page: (page, pages) => `Page ${page} sur ${pages}`,
        previousPage: 'Page précédente', nextPage: 'Page suivante', selection: (selected, total) => `${selected} sur ${total} sélectionnées` },
    }))
    expect(labelsOf(html)).toEqual(['Tout sélectionner', 'Sélectionner Accordion', 'Sélectionner Badge'])
    expect(html).toContain('Page 1 sur 2')
    expect(html).toContain('aria-label="Page précédente"')
    expect(html).toContain('aria-label="Page suivante"')
    expect(html).toContain('0 sur 3 sélectionnées')
  })

  it('pages on a server when tableOptions asks for it (CAT-07)', () => {
    // One page of rows from a server that holds 30.
    const html = renderToStaticMarkup(h(ui.DataTable<Kit>, {
      columns: columns(ui), data: kits.slice(0, 2), pagination: true, pageSize: 2, 'aria-label': 'Kits',
      tableOptions: { manualPagination: true, rowCount: 30 },
    }))
    expect(html).toContain('Page 1 of 15')
    expect(html).toMatch(/<button[^>]*aria-label="Next page"(?![^>]*disabled)[^>]*>/)
  })
})
