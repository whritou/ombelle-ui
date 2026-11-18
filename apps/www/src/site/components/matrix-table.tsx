'use client'

import { styleFamilies, styleSupport } from '@ombelle/contracts'
import { DataTable, type DataTableColumn } from '../../generated/ui/components/ui/data-table'
import { familyColumnTitle, supportLabels } from './matrix-labels'
import { componentDocs } from './catalog'

type MatrixRow = { id: string; name: string } & Record<string, string>

/** One row per catalog component: its name and its support label in every family. */
export function matrixRows(): MatrixRow[] {
  return componentDocs.map(doc => ({
    id: doc.id,
    name: doc.name,
    ...Object.fromEntries(styleFamilies.map(family => [family, supportLabels[styleSupport(doc.id, family)]])),
  }))
}

/** The component column links to its page and stays shown; each family is a column the View menu can hide. */
export function matrixColumns(): DataTableColumn<MatrixRow>[] {
  return [
    { accessorKey: 'name', header: 'Component', enableHiding: false, cell: ({ row }) => <a href={`/components/${row.original.id}`} className="underline underline-offset-4">{row.original.name}</a> },
    ...styleFamilies.map((family): DataTableColumn<MatrixRow> => ({ accessorKey: family, header: familyColumnTitle(family) })),
  ]
}

const rows = matrixRows()
const columns = matrixColumns()

/** The support matrix as a Data Table: sortable by component, filterable by name, with family columns to hide. */
export default function MatrixTable() {
  return (
    <DataTable aria-label="Support for every catalog component in each style family" columns={columns} data={rows} getRowId={row => row.id}
      filterColumn="name" filterLabel="Filter components" columnVisibility />
  )
}
