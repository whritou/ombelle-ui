import * as React from 'react'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'
import { cn } from './utils.js'
import './table.css'

/**
 * A native table in a scroll container, so wide tables scroll instead of
 * overflowing. Give the table a caption or an aria-label.
 */
export type TableProps = React.ComponentProps<'table'> & {
  density?: 'default' | 'compact'
  striped?: boolean
  /** Keeps the header in view while the rows scroll in a container of at most maxBlockSize. */
  stickyHeader?: boolean
  /** The scroll container's maximum block size with stickyHeader, 24rem by default. */
  maxBlockSize?: string
  /** Marks the table busy, for example while TableSkeletonRows stand in for the rows. */
  loading?: boolean
}

export function Table({
  className,
  density = 'default',
  striped = false,
  stickyHeader = false,
  maxBlockSize,
  loading = false,
  ...props
}: TableProps) {
  return (
    <div
      data-slot="table-container"
      style={stickyHeader && maxBlockSize ? ({ '--table-max-block-size': maxBlockSize } as React.CSSProperties) : undefined}
    >
      <table
        aria-busy={loading || undefined}
        {...props}
        data-slot="table"
        data-density={density}
        data-striped={striped ? '' : undefined}
        data-table-sticky={stickyHeader ? '' : undefined}
        className={cn(className)}
      />
    </div>
  )
}

export function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption {...props} data-slot="table-caption" className={cn(className)} />
  )
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<'thead'>) {
  return <thead {...props} data-slot="table-header" className={cn(className)} />
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<'tbody'>) {
  return <tbody {...props} data-slot="table-body" className={cn(className)} />
}

export function TableFooter({
  className,
  ...props
}: React.ComponentProps<'tfoot'>) {
  return <tfoot {...props} data-slot="table-footer" className={cn(className)} />
}

/** `selected` highlights the row; pair it with a visible control such as a checkbox. */
export function TableRow({
  className,
  selected,
  ...props
}: React.ComponentProps<'tr'> & { selected?: boolean }) {
  return (
    <tr
      {...props}
      data-slot="table-row"
      data-state={selected ? 'selected' : undefined}
      className={cn(className)}
    />
  )
}

export type TableSort = 'ascending' | 'descending' | 'none'

/**
 * Column and row headers. `numeric` right-aligns figures in tabular digits.
 * With onSort, the header is a sort button and `sort` sets aria-sort; sorting the rows is yours.
 * `actions` makes a narrow end column, named "Actions" when it has no text.
 */
export function TableHead({
  className,
  numeric,
  scope = 'col',
  sort,
  onSort,
  actions,
  children,
  ...props
}: React.ComponentProps<'th'> & { numeric?: boolean; sort?: TableSort; onSort?: () => void; actions?: boolean }) {
  const Arrow = sort === 'ascending' ? ArrowUpIcon : sort === 'descending' ? ArrowDownIcon : ArrowUpDownIcon
  const content = actions && (children === undefined || children === null || children === '')
    ? <span className="sr-only">Actions</span>
    : children
  return (
    <th
      scope={scope}
      aria-sort={onSort && sort && sort !== 'none' ? sort : undefined}
      {...props}
      data-slot="table-head"
      data-numeric={numeric ? '' : undefined}
      data-actions={actions ? '' : undefined}
      className={cn(className)}
    >
      {onSort ? (
        <button type="button" data-slot="table-sort" onClick={onSort}>
          {content}
          <Arrow aria-hidden="true" />
        </button>
      ) : content}
    </th>
  )
}

export function TableCell({
  className,
  numeric,
  actions,
  ...props
}: React.ComponentProps<'td'> & { numeric?: boolean; actions?: boolean }) {
  return (
    <td
      {...props}
      data-slot="table-cell"
      data-numeric={numeric ? '' : undefined}
      data-actions={actions ? '' : undefined}
      className={cn(className)}
    />
  )
}

const skeletonWidths = ['80%', '60%', '50%', '65%', '70%', '40%']

/** Placeholder rows while data loads; set loading on the Table. The bars are decorative. */
export function TableSkeletonRows({ rows = 3, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} data-slot="table-row">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} data-slot="table-cell">
              <span data-slot="table-skeleton" aria-hidden="true" style={{ inlineSize: skeletonWidths[(row * columns + column) % skeletonWidths.length] }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
