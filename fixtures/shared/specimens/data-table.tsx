'use client'
import { DataTable } from '@/components/ui/data-table'

export function Specimen() {
  return (
    <section aria-label="Data Table" data-component="data-table">
      <h2>Data Table</h2>
      <DataTable aria-label="Gallery presets" columns={[{ accessorKey: 'name', header: 'Preset' }, { accessorKey: 'status', header: 'Status' }]}
        data={[{ name: 'Ombelle', status: 'Stable' }, { name: 'Papier', status: 'Stable' }, { name: 'Cristal', status: 'Experimental' }]}
        selectable filterColumn="name" filterLabel="Filter presets" facets={[{ column: 'status', title: 'Status' }]} columnVisibility pagination pageSize={5} />
    </section>
  )
}
