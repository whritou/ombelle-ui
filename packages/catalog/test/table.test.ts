import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../src/templates/table.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Table catalog contract', () => {
  it('provides native table parts without client code or extra dependencies', () => {
    expectComponentContract('table', {
      client: false,
      parts: [
        'Table',
        'TableCaption',
        'TableHeader',
        'TableBody',
        'TableFooter',
        'TableRow',
        'TableHead',
        'TableCell',
      ],
      slots: [
        'table-container',
        'table',
        'table-caption',
        'table-header',
        'table-body',
        'table-footer',
        'table-row',
        'table-head',
        'table-cell',
      ],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
      ],
      selectors: [
        "[data-slot='table-container']",
        "[data-slot='table']",
        "[data-slot='table-caption']",
        "[data-slot='table-head']",
        "[data-slot='table-cell']",
        "[data-slot='table-row'][data-state='selected'] > [data-slot='table-cell']",
        "[data-slot='table-footer'] > [data-slot='table-row'] > *",
        "[data-slot='table-cell'][data-numeric]",
      ],
      glass: 'experimental',
    })
  })

  it('renders a scrollable native table with scoped headers and a selected row', () => {
    const html = renderToStaticMarkup(
      createElement(
        Table,
        { 'aria-label': 'Projects', className: 'custom' },
        createElement(TableCaption, null, 'All projects'),
        createElement(
          TableHeader,
          null,
          createElement(
            TableRow,
            null,
            createElement(TableHead, null, 'Project'),
            createElement(TableHead, { numeric: true }, 'Components'),
          ),
        ),
        createElement(
          TableBody,
          null,
          createElement(
            TableRow,
            { selected: true },
            createElement(TableCell, null, 'Website'),
            createElement(TableCell, { numeric: true }, '12'),
          ),
        ),
      ),
    )
    for (const text of [
      '<div data-slot="table-container"><table aria-label="Projects" data-slot="table" data-density="default" class="custom">',
      '<caption data-slot="table-caption"',
      '<th scope="col" data-slot="table-head"',
      'data-numeric=""',
      '<tr data-slot="table-row" data-state="selected"',
      '<td data-slot="table-cell"',
    ])
      expect(html).toContain(text)
    expect(
      renderToStaticMarkup(createElement(TableHead, { scope: 'row' }, 'Row')),
    ).toContain('scope="row"')
  })
})
