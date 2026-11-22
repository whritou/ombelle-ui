import { expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { styleFamilies, supportedComponentIds } from '@ombelle/contracts'
import { SupportMatrix } from './support-matrix'

it('renders every component and family with explicit support labels and scoped headings', () => {
  const html = renderToStaticMarkup(createElement(SupportMatrix))
  expect(html.match(/scope="row"/g)).toHaveLength(supportedComponentIds.length)
  expect(html.match(/scope="col"/g)).toHaveLength(styleFamilies.length + 1)
  for (const id of supportedComponentIds) expect(html).toContain(`href="/components/${id}"`)
  expect(html).not.toContain('>Experimental</td>')
  expect(html.match(/>Stable<\/td>/g)).toHaveLength(supportedComponentIds.length * styleFamilies.length)
  expect(html).toContain('accessibility is not guaranteed')
  expect(html).toContain('Unavailable combinations cannot be installed.')
})

it('describes the interactive matrix as plain data: a sortable component column linking to each page, and one column per family', async () => {
  const { matrixColumns, matrixRows } = await import('./matrix-table')
  const rows = matrixRows()
  expect(rows).toHaveLength(supportedComponentIds.length)
  expect(rows.find(row => row.id === 'sidebar')).toMatchObject({ name: 'Sidebar', 'liquid-glass': 'Stable' })
  const columns = matrixColumns()
  expect(columns.map(column => column.header)).toEqual(['Component', ...styleFamilies.map(family => expect.any(String))])
  expect(columns[0]).toMatchObject({ enableHiding: false })
})
