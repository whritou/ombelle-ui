'use client'
import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { columnFacetingFeature, columnFilteringFeature, columnVisibilityFeature, createColumnHelper, createFacetedRowModel, createFacetedUniqueValues, createFilteredRowModel, createPaginatedRowModel, createSortedRowModel, filterFns, rowPaginationFeature, rowSelectionFeature, rowSortingFeature, sortFns, tableFeatures, useTable } from '@tanstack/react-table'
import type { Column, ColumnDef, ReactTable, Row, RowData, TableState } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, EllipsisIcon, ListFilterIcon, Settings2Icon } from 'lucide-react'
import { cn } from './utils.js'
import './data-table.css'

/** The table features Data Table registers: sorting, filtering, faceting, selection, column visibility and pagination. */
export const dataTableFeatures = tableFeatures({
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
})

export type DataTableFeatures = typeof dataTableFeatures
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any>
export type DataTableInstance<TData extends RowData> = ReactTable<DataTableFeatures, TData>
export type DataTableState = Partial<TableState<DataTableFeatures>>

/** Typed column helpers for Data Table: `const columns = dataTableColumns<Preset>()`. */
export function dataTableColumns<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}

/** A checkbox column: the header selects the rows on the current page, each cell selects its row. */
export function selectColumn<TData extends RowData>(): DataTableColumn<TData> {
  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <input type="checkbox" data-data-table-select="" aria-label="Select all rows on this page"
        checked={table.getIsAllPageRowsSelected()}
        ref={input => { if (input) input.indeterminate = !table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected() }}
        onChange={event => table.toggleAllPageRowsSelected(event.target.checked)} />
    ),
    cell: ({ row }) => (
      <input type="checkbox" data-data-table-select="" aria-label="Select row" checked={row.getIsSelected()}
        disabled={!row.getCanSelect()} onChange={event => row.toggleSelected(event.target.checked)} />
    ),
  }
}

/** A narrow last column whose cells hold what `render` returns, usually a DataTableRowActions menu. */
export function actionsColumn<TData extends RowData>(render: (row: Row<DataTableFeatures, TData>) => React.ReactNode): DataTableColumn<TData> {
  return { id: 'actions', enableSorting: false, enableHiding: false, header: () => <span data-data-table-sr="">Actions</span>, cell: ({ row }) => render(row) }
}

/** Keeps a row when its value is one of the checked facet values; an empty filter keeps every row. */
export function facetFilter(row: { getValue(columnId: string): unknown }, columnId: string, value: unknown): boolean {
  return !Array.isArray(value) || value.length === 0 || value.includes(String(row.getValue(columnId)))
}

const TableContext = React.createContext<DataTableInstance<any> | null>(null)

/** The table instance of the surrounding DataTable, for toolbars and custom parts. */
export function useDataTable<TData extends RowData>(): DataTableInstance<TData> {
  const table = React.useContext(TableContext)
  if (!table) throw new Error('useDataTable must be used inside <DataTable>')
  return table as DataTableInstance<TData>
}

export type DataTableProps<TData extends RowData> = {
  columns: DataTableColumn<TData>[]
  data: TData[]
  /** Controlled state; pass with the matching on…Change to move sorting, filters or pages to a server. */
  state?: DataTableState
  initialState?: DataTableState
  onSortingChange?: (updater: any) => void
  onColumnFiltersChange?: (updater: any) => void
  onRowSelectionChange?: (updater: any) => void
  onColumnVisibilityChange?: (updater: any) => void
  onPaginationChange?: (updater: any) => void
  /** Rendered above the table, with the table instance; replaces the toolbar the props below describe. */
  toolbar?: (table: DataTableInstance<TData>) => React.ReactNode
  /** Adds a checkbox column first, as selectColumn() does. */
  selectable?: boolean
  /** A text filter on this column, named by filterLabel. */
  filterColumn?: string
  filterLabel?: string
  /** Faceted filters: a popover of values per column, which keeps rows that match any checked value. */
  facets?: readonly { column: string; title: string; options?: readonly { label: string; value: string }[] }[]
  /** A View menu that shows and hides columns. */
  columnVisibility?: boolean
  /** The selection count and page buttons below the table. */
  pagination?: boolean
  /** Rows per page; 0 shows every row with no pagination. */
  pageSize?: number
  emptyLabel?: string
  caption?: React.ReactNode
  getRowId?: (row: TData, index: number) => string
  className?: string
  'aria-label'?: string
}

/** A sortable, filterable table with row selection, column visibility and pagination, drawn like Table. */
export function DataTable<TData extends RowData>({ columns: columnsProp, data, state, initialState, toolbar, pageSize = 10, emptyLabel = 'No results.', caption, getRowId, className,
  selectable = false, filterColumn, filterLabel, facets = [], columnVisibility = false, pagination = false,
  onSortingChange, onColumnFiltersChange, onRowSelectionChange, onColumnVisibilityChange, onPaginationChange, ...props }: DataTableProps<TData>) {
  // Facet columns match any checked value; plain data columns need no functions, so recipes can describe them.
  const columns = React.useMemo(() => {
    const faceted = new Set(facets.map(facet => facet.column))
    const described = columnsProp.map(column => {
      const id = column.id ?? ('accessorKey' in column ? String(column.accessorKey) : undefined)
      return id && faceted.has(id) && !column.filterFn ? { ...column, filterFn: facetFilter } as DataTableColumn<TData> : column
    })
    return selectable ? [selectColumn<TData>(), ...described] : described
  }, [columnsProp, selectable, facets])
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state,
    initialState: { pagination: { pageIndex: 0, pageSize: pageSize || Math.max(data.length, 1) }, ...initialState },
    ...(onSortingChange ? { onSortingChange } : {}),
    ...(onColumnFiltersChange ? { onColumnFiltersChange } : {}),
    ...(onRowSelectionChange ? { onRowSelectionChange } : {}),
    ...(onColumnVisibilityChange ? { onColumnVisibilityChange } : {}),
    ...(onPaginationChange ? { onPaginationChange } : {}),
  })
  const rows = table.getRowModel().rows
  const visible = table.getVisibleLeafColumns().length
  return (
    <TableContext.Provider value={table as unknown as DataTableInstance<any>}>
      <div data-slot="data-table" className={cn(className)}>
        {toolbar ? toolbar(table) : filterColumn || facets.length || columnVisibility ? (
          <DataTableToolbar>
            {filterColumn && table.getColumn(filterColumn) ? <DataTableFilter column={table.getColumn(filterColumn)!} aria-label={filterLabel ?? `Filter by ${filterColumn}`} placeholder={filterLabel ?? 'Filter…'} /> : null}
            {facets.map(facet => table.getColumn(facet.column) ? <DataTableFacetedFilter key={facet.column} column={table.getColumn(facet.column)!} title={facet.title} options={facet.options} /> : null)}
            {columnVisibility ? <DataTableViewOptions table={table} /> : null}
          </DataTableToolbar>
        ) : null}
        <div data-slot="data-table-container">
          <table data-slot="data-table-table" aria-label={props['aria-label']}>
            {caption ? <caption data-slot="data-table-caption">{caption}</caption> : null}
            <thead data-slot="data-table-header">
              {table.getHeaderGroups().map(group => (
                <tr key={group.id} data-slot="data-table-row">
                  {group.headers.map(header => {
                    const sorted = header.column.getCanSort() ? header.column.getIsSorted() : false
                    return (
                      <th key={header.id} scope="col" data-slot="data-table-head" colSpan={header.colSpan}
                        data-select={header.column.id === 'select' ? '' : undefined} data-actions={header.column.id === 'actions' ? '' : undefined}
                        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}>
                        {header.isPlaceholder ? null : typeof header.column.columnDef.header === 'string'
                          ? <DataTableColumnHeader column={header.column} title={header.column.columnDef.header} />
                          : <table.FlexRender header={header} />}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody data-slot="data-table-body">
              {rows.length ? rows.map(row => (
                <tr key={row.id} data-slot="data-table-row" data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} data-slot="data-table-cell" data-select={cell.column.id === 'select' ? '' : undefined} data-actions={cell.column.id === 'actions' ? '' : undefined}>
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              )) : (
                <tr data-slot="data-table-row">
                  <td data-slot="data-table-cell" data-data-table-empty="" colSpan={visible} role="status">{emptyLabel}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pagination ? <DataTablePagination table={table} /> : null}
      </div>
    </TableContext.Provider>
  )
}

/** A sortable header: a button that cycles ascending, descending and unsorted; the column header cell carries aria-sort. */
export function DataTableColumnHeader<TData extends RowData>({ column, title, className }: { column: Column<DataTableFeatures, TData, any>; title: string; className?: string }) {
  if (!column.getCanSort()) return <span className={cn(className)}>{title}</span>
  const sorted = column.getIsSorted()
  const Arrow = sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ArrowUpDownIcon
  return (
    <button type="button" data-slot="data-table-sort" className={cn(className)} onClick={() => column.toggleSorting(undefined, false)}>
      {title}
      <Arrow aria-hidden="true" />
    </button>
  )
}

/** The row above the table: filters on the start side, view options on the end side. */
export function DataTableToolbar({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="data-table-toolbar" className={cn(className)} />
}

/** A text field that filters one column; give it a label or aria-label. */
export function DataTableFilter<TData extends RowData>({ column, className, ...props }: { column: Column<DataTableFeatures, TData, any> } & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  return (
    <input type="search" {...props} data-slot="data-table-filter" className={cn(className)}
      value={(column.getFilterValue() as string | undefined) ?? ''} onChange={event => column.setFilterValue(event.target.value || undefined)} />
  )
}

/** A menu of checkboxes that show and hide the columns that can be hidden. */
export function DataTableViewOptions<TData extends RowData>({ table, label = 'View' }: { table: DataTableInstance<TData>; label?: string }) {
  const columns = table.getAllLeafColumns().filter(column => column.getCanHide())
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger data-slot="data-table-button" data-data-table-end="">
        <Settings2Icon aria-hidden="true" />{label}
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" sideOffset={6}>
          <MenuPrimitive.Popup data-slot="data-table-menu">
            <MenuPrimitive.Group>
              <MenuPrimitive.GroupLabel data-slot="data-table-menu-label">Columns</MenuPrimitive.GroupLabel>
              {columns.map(column => (
                <MenuPrimitive.CheckboxItem key={column.id} data-slot="data-table-menu-item" checked={column.getIsVisible()} closeOnClick={false}
                  onCheckedChange={value => column.toggleVisibility(value === true)}>
                  <MenuPrimitive.CheckboxItemIndicator data-slot="data-table-menu-indicator"><CheckIcon aria-hidden="true" /></MenuPrimitive.CheckboxItemIndicator>
                  {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                </MenuPrimitive.CheckboxItem>
              ))}
            </MenuPrimitive.Group>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}

/** A popover of checkboxes, one per value, that keeps the rows whose column has any checked value; counts come from the data, and so do the values when options is left out. */
export function DataTableFacetedFilter<TData extends RowData>({ column, title, options: optionsProp }: { column: Column<DataTableFeatures, TData, any>; title: string; options?: readonly { label: string; value: string }[] }) {
  const selected = new Set((column.getFilterValue() as string[] | undefined) ?? [])
  const counts = column.getFacetedUniqueValues()
  // Without options, every value in the column is one, in order.
  const options = optionsProp ?? [...counts.keys()].map(String).sort().map(value => ({ label: value, value }))
  const toggle = (value: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(value)
    else next.delete(value)
    column.setFilterValue(next.size ? [...next] : undefined)
  }
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger data-slot="data-table-button" aria-label={selected.size ? `${title}, ${selected.size} selected` : title}>
        <ListFilterIcon aria-hidden="true" />{title}
        {selected.size ? <span data-slot="data-table-count" aria-hidden="true">{selected.size}</span> : null}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner align="start" sideOffset={6}>
        <PopoverPrimitive.Popup data-slot="data-table-menu" aria-label={title}>
          <fieldset data-data-table-facets="">
            <legend data-slot="data-table-menu-label">{title}</legend>
            {options.map(option => (
              <label key={option.value} data-slot="data-table-menu-item">
                <input type="checkbox" checked={selected.has(option.value)} onChange={event => toggle(option.value, event.target.checked)} />
                <span>{option.label}</span>
                <span data-slot="data-table-count">{counts.get(option.value) ?? 0}</span>
              </label>
            ))}
          </fieldset>
          {selected.size ? <button type="button" data-slot="data-table-button" data-data-table-clear="" onClick={() => column.setFilterValue(undefined)}>Clear filter</button> : null}
        </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/** "2 of 40 row(s) selected.", announced politely, then page buttons. */
export function DataTablePagination<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const selected = Object.values(table.state.rowSelection ?? {}).filter(Boolean).length
  const total = table.getCoreRowModel().rows.length
  const pages = Math.max(table.getPageCount(), 1)
  return (
    <div data-slot="data-table-pagination">
      <p data-slot="data-table-selection" aria-live="polite">{selected} of {total} row(s) selected.</p>
      <p data-data-table-page="">Page {table.state.pagination.pageIndex + 1} of {pages}</p>
      <button type="button" data-slot="data-table-button" aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
        <ChevronLeftIcon aria-hidden="true" />
      </button>
      <button type="button" data-slot="data-table-button" aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
        <ChevronRightIcon aria-hidden="true" />
      </button>
    </div>
  )
}

/** A ⋯ button named "Row actions" that opens a menu of DataTableRowAction items. */
export function DataTableRowActions({ label = 'Row actions', children }: { label?: string; children: React.ReactNode }) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger data-slot="data-table-row-actions" aria-label={label}>
        <EllipsisIcon aria-hidden="true" />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" sideOffset={4}>
          <MenuPrimitive.Popup data-slot="data-table-menu">{children}</MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}

export function DataTableRowAction({ variant = 'default', className, ...props }: Omit<React.ComponentProps<typeof MenuPrimitive.Item>, 'className'> & { className?: string; variant?: 'default' | 'destructive' }) {
  return <MenuPrimitive.Item {...props} data-slot="data-table-menu-item" data-variant={variant} className={cn(className)} />
}
