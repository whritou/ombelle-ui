'use client'
import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { columnFacetingFeature, columnFilteringFeature, columnVisibilityFeature, createColumnHelper, createFacetedRowModel, createFacetedUniqueValues, createFilteredRowModel, createPaginatedRowModel, createSortedRowModel, filterFns, rowPaginationFeature, rowSelectionFeature, rowSortingFeature, sortFns, tableFeatures, useTable } from '@tanstack/react-table'
import type { Column, ColumnDef, OnChangeFn, ReactTable, Row, RowData, TableOptions, TableState } from '@tanstack/react-table'
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

/** Every string Data Table shows or announces; pass any of them to DataTable's labels prop. */
export type DataTableLabels = {
  selectAll: string
  /** The name of a row's checkbox, from the row's first data cell. */
  selectRow: (name: string) => string
  actions: string
  view: string
  columns: string
  filter: string
  filterBy: (column: string) => string
  clearFilter: string
  selection: (selected: number, total: number) => string
  page: (page: number, pages: number) => string
  previousPage: string
  nextPage: string
  rowActions: string
}
export const dataTableLabels: DataTableLabels = {
  selectAll: 'Select all rows on this page',
  selectRow: name => `Select ${name}`,
  actions: 'Actions',
  view: 'View',
  columns: 'Columns',
  filter: 'Filter…',
  filterBy: column => `Filter by ${column}`,
  clearFilter: 'Clear filter',
  selection: (selected, total) => `${selected} of ${total} row(s) selected.`,
  page: (page, pages) => `Page ${page} of ${pages}`,
  previousPage: 'Previous page',
  nextPage: 'Next page',
  rowActions: 'Row actions',
}
const LabelsContext = React.createContext<DataTableLabels>(dataTableLabels)
const useLabels = () => React.useContext(LabelsContext)

/** A name for a row: its first data cell's text, else its position. */
function rowName<TData extends RowData>(row: Row<DataTableFeatures, TData>): string {
  for (const cell of row.getVisibleCells()) {
    if (cell.column.id === 'select' || cell.column.id === 'actions') continue
    const value = cell.getValue()
    if (typeof value === 'string' || typeof value === 'number') return String(value)
  }
  return `row ${row.index + 1}`
}

function SelectAllCheckbox<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const labels = useLabels()
  return (
    <input type="checkbox" data-data-table-select="" aria-label={labels.selectAll}
      checked={table.getIsAllPageRowsSelected()}
      ref={input => { if (input) input.indeterminate = !table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected() }}
      onChange={event => table.toggleAllPageRowsSelected(event.target.checked)} />
  )
}

function SelectRowCheckbox<TData extends RowData>({ row, label }: { row: Row<DataTableFeatures, TData>; label?: (row: Row<DataTableFeatures, TData>) => string }) {
  const labels = useLabels()
  return (
    <input type="checkbox" data-data-table-select="" aria-label={label ? label(row) : labels.selectRow(rowName(row))} checked={row.getIsSelected()}
      disabled={!row.getCanSelect()} onChange={event => row.toggleSelected(event.target.checked)} />
  )
}

function ActionsHeader() {
  return <span data-data-table-sr="">{useLabels().actions}</span>
}

/** Typed column helpers for Data Table: `const columns = dataTableColumns<Preset>()`. */
export function dataTableColumns<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}

/**
 * A checkbox column: the header selects the rows on the current page, each cell selects its row.
 * Each row checkbox is named from the row's first data cell ("Select Accordion"); pass `label` to name it yourself.
 */
export function selectColumn<TData extends RowData>({ label }: { label?: (row: Row<DataTableFeatures, TData>) => string } = {}): DataTableColumn<TData> {
  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => <SelectAllCheckbox table={table as unknown as DataTableInstance<TData>} />,
    cell: ({ row }) => <SelectRowCheckbox row={row} label={label} />,
  }
}

/** A narrow last column whose cells hold what `render` returns, usually a DataTableRowActions menu. */
export function actionsColumn<TData extends RowData>(render: (row: Row<DataTableFeatures, TData>) => React.ReactNode): DataTableColumn<TData> {
  return { id: 'actions', enableSorting: false, enableHiding: false, header: () => <ActionsHeader />, cell: ({ row }) => render(row) }
}

/** Keeps a row when its value is one of the checked facet values; an empty filter keeps every row. */
export function facetFilter(row: { getValue(columnId: string): unknown }, columnId: string, value: unknown): boolean {
  return !Array.isArray(value) || value.length === 0 || value.includes(String(row.getValue(columnId)))
}

// One empty facet list, so the columns memo holds across renders.
const NO_FACETS: NonNullable<DataTableProps<any>['facets']> = []

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
  /**
   * Controlled state, with the matching on…Change. To sort, filter or page on a server, also pass
   * tableOptions={{ manualSorting: true, manualFiltering: true, manualPagination: true, rowCount }}.
   */
  state?: DataTableState
  initialState?: DataTableState
  onSortingChange?: OnChangeFn<TableState<DataTableFeatures>['sorting']>
  onColumnFiltersChange?: OnChangeFn<TableState<DataTableFeatures>['columnFilters']>
  onRowSelectionChange?: OnChangeFn<TableState<DataTableFeatures>['rowSelection']>
  onColumnVisibilityChange?: OnChangeFn<TableState<DataTableFeatures>['columnVisibility']>
  onPaginationChange?: OnChangeFn<TableState<DataTableFeatures>['pagination']>
  /** Further TanStack Table options, applied last, such as manualSorting, manualPagination and rowCount. */
  tableOptions?: Partial<TableOptions<DataTableFeatures, TData>>
  /** Replaces any of the strings the table shows or announces. */
  labels?: Partial<DataTableLabels>
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
  /** Rows per page when pagination is on; 0 shows every row. */
  pageSize?: number
  emptyLabel?: string
  caption?: React.ReactNode
  getRowId?: (row: TData, index: number) => string
  className?: string
  'aria-label'?: string
}

/** A sortable, filterable table with row selection, column visibility and pagination, drawn like Table. */
export function DataTable<TData extends RowData>({ columns: columnsProp, data, state, initialState, toolbar, pageSize = 10, emptyLabel = 'No results.', caption, getRowId, className,
  selectable = false, filterColumn, filterLabel, facets = NO_FACETS, columnVisibility = false, pagination = false,
  onSortingChange, onColumnFiltersChange, onRowSelectionChange, onColumnVisibilityChange, onPaginationChange, tableOptions, labels: labelsProp, ...props }: DataTableProps<TData>) {
  const labels = React.useMemo(() => ({ ...dataTableLabels, ...labelsProp }), [labelsProp])
  // Facet columns match any checked value; plain data columns need no functions, so recipes can describe them.
  const columns = React.useMemo(() => {
    const faceted = new Set(facets.map(facet => facet.column))
    const described = columnsProp.map(column => {
      const id = column.id ?? ('accessorKey' in column ? String(column.accessorKey) : undefined)
      return id && faceted.has(id) && !column.filterFn ? { ...column, filterFn: facetFilter } as DataTableColumn<TData> : column
    })
    return selectable ? [selectColumn<TData>(), ...described] : described
  }, [columnsProp, selectable, facets])
  const paginate = pagination && pageSize > 0
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state,
    initialState: { pagination: { pageIndex: 0, pageSize: pageSize || 10 }, ...initialState },
    // Without pagination every row shows: the page model is skipped, not just the pager.
    manualPagination: !paginate,
    ...(onSortingChange ? { onSortingChange } : {}),
    ...(onColumnFiltersChange ? { onColumnFiltersChange } : {}),
    ...(onRowSelectionChange ? { onRowSelectionChange } : {}),
    ...(onColumnVisibilityChange ? { onColumnVisibilityChange } : {}),
    ...(onPaginationChange ? { onPaginationChange } : {}),
    ...tableOptions,
  })
  const rows = table.getRowModel().rows
  const visible = table.getVisibleLeafColumns().length
  return (
    <LabelsContext.Provider value={labels}>
    <TableContext.Provider value={table as unknown as DataTableInstance<any>}>
      <div data-slot="data-table" className={cn(className)}>
        {toolbar ? toolbar(table) : filterColumn || facets.length || columnVisibility ? (
          <DataTableToolbar>
            {filterColumn && table.getColumn(filterColumn) ? <DataTableFilter column={table.getColumn(filterColumn)!} aria-label={filterLabel ?? labels.filterBy(filterColumn)} placeholder={filterLabel ?? labels.filter} /> : null}
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
                  <td data-slot="data-table-cell" data-data-table-empty="" colSpan={visible}>{emptyLabel}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Always on the page, so screen readers announce "No results." when a filter empties the table. */}
        <p data-slot="data-table-status" role="status">{rows.length ? '' : emptyLabel}</p>
        {paginate ? <DataTablePagination table={table} /> : selectable ? <DataTableSelection table={table} /> : null}
      </div>
    </TableContext.Provider>
    </LabelsContext.Provider>
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
export function DataTableViewOptions<TData extends RowData>({ table, label: labelProp }: { table: DataTableInstance<TData>; label?: string }) {
  const labels = useLabels()
  const label = labelProp ?? labels.view
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
              <MenuPrimitive.GroupLabel data-slot="data-table-menu-label">{labels.columns}</MenuPrimitive.GroupLabel>
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
  const labels = useLabels()
  const selected = new Set((column.getFilterValue() as string[] | undefined) ?? [])
  // Options are strings; faceted values keep the cell's type, so count by their text.
  const counts = new Map<string, number>()
  for (const [key, count] of column.getFacetedUniqueValues()) counts.set(String(key), (counts.get(String(key)) ?? 0) + count)
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
          {selected.size ? <button type="button" data-slot="data-table-button" data-data-table-clear="" onClick={() => column.setFilterValue(undefined)}>{labels.clearFilter}</button> : null}
        </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/** "2 of 40 row(s) selected.", announced politely; it counts selected rows a filter hides. */
export function DataTableSelection<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const labels = useLabels()
  const selected = Object.values(table.state.rowSelection ?? {}).filter(Boolean).length
  return <p data-slot="data-table-selection" aria-live="polite">{labels.selection(selected, table.getCoreRowModel().rows.length)}</p>
}

/** The selection count, then the page and page buttons. */
export function DataTablePagination<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const labels = useLabels()
  const pages = Math.max(table.getPageCount(), 1)
  return (
    <div data-slot="data-table-pagination">
      <DataTableSelection table={table} />
      <p data-data-table-page="">{labels.page(table.state.pagination.pageIndex + 1, pages)}</p>
      <button type="button" data-slot="data-table-button" aria-label={labels.previousPage} disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
        <ChevronLeftIcon aria-hidden="true" />
      </button>
      <button type="button" data-slot="data-table-button" aria-label={labels.nextPage} disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
        <ChevronRightIcon aria-hidden="true" />
      </button>
    </div>
  )
}

/** A ⋯ button named "Row actions" that opens a menu of DataTableRowAction items. */
export function DataTableRowActions({ label: labelProp, children }: { label?: string; children: React.ReactNode }) {
  const fallback = useLabels().rowActions
  const label = labelProp ?? fallback
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
