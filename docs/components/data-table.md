# Data Table

Data Table is a table with sorting, a text filter, faceted filters, row selection, column visibility, row actions and pages, drawn like Table. It is available in all eight families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.9.0** or later: `npx @ombelle-ui/cli@0.9.0 add data-table`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add data-table --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add data-table --cwd APP --yes
```

```tsx
import { DataTable, DataTableRowAction, DataTableRowActions, actionsColumn, type DataTableColumn } from '@/components/ui/data-table'

type Preset = { name: string; family: string; status: string }
const columns: DataTableColumn<Preset>[] = [
  { accessorKey: 'name', header: 'Preset' },
  { accessorKey: 'family', header: 'Family' },
  { accessorKey: 'status', header: 'Status' },
  actionsColumn(row => <DataTableRowActions label={`Actions for ${row.original.name}`}><DataTableRowAction>Open</DataTableRowAction></DataTableRowActions>),
]

export function Presets({ data }: { data: Preset[] }) {
  return <DataTable aria-label="Presets" columns={columns} data={data} selectable filterColumn="name" filterLabel="Filter presets"
    facets={[{ column: 'status', title: 'Status' }]} columnVisibility pagination pageSize={10} />
}
```

## API and accessibility

- `DataTable` takes TanStack Table column definitions and `data`. A string `header` becomes a sort button; the header cell carries `aria-sort` while sorted, and clicks cycle ascending, descending and unsorted.
- Declarative extras: `selectable` (a checkbox column; the header checkbox selects the rows on the current page only), `filterColumn` and `filterLabel` (a search field), `facets` (a popover of checkbox values per column, keeping rows that match any checked value; values and counts come from the data unless you pass `options`), `columnVisibility` (a View menu), `pagination` and `pageSize`. Without `pagination`, every row shows; with `selectable`, the selection count still shows.
- For full control pass `toolbar={table => …}`, and compose `DataTableToolbar`, `DataTableFilter`, `DataTableFacetedFilter`, `DataTableViewOptions`, `DataTablePagination`, `DataTableColumnHeader`, `selectColumn()`, `actionsColumn()` and `dataTableColumns<T>()` yourself. `useDataTable()` returns the table inside it.
- Every state can be controlled with `state` and the matching `onSortingChange`, `onColumnFiltersChange`, `onRowSelectionChange`, `onColumnVisibilityChange` and `onPaginationChange`, to move sorting, filters or pages to a server.
- The selection count, "2 of 40 row(s) selected.", is announced politely and counts selected rows a filter hides. With no rows, "No results." spans every column, and a status region that stays on the page announces it.
- The first page renders as plain table HTML before hydration.
- Data Table draws its own table under `data-table-*` slots, with each family's Table styles; it does not install or change Table.

## Recipe

The recipe sets `selection`, `columnVisibility`, `facets` and `pagination`, and the caption; its rows are a fixed list of catalog components. Compilation emits `components/ui/data-table.tsx`, `components/ui/data-table.css` and `examples/data-table.tsx`. Runtime dependencies are React 19.3.1, @tanstack/react-table 9.3.1, @radix-ui/react-dropdown-menu 2.2.1, @radix-ui/react-popover 1.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

## Base UI edition

The Base UI edition uses `Menu` and `Popover` from `@base-ui/react` for the View menu, facets and row actions.

## Liquid glass

Liquid glass is supported, without an accessibility guarantee.
