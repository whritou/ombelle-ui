import * as React from 'react'
import { cn } from './utils.js'
import './table.css'

/**
 * A native table in a scroll container, so wide tables scroll instead of
 * overflowing. Give the table a caption or an aria-label.
 */
export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container">
      <table {...props} data-slot="table" className={cn(className)} />
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

/** Column and row headers. `numeric` right-aligns figures in tabular digits. */
export function TableHead({
  className,
  numeric,
  scope = 'col',
  ...props
}: React.ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      scope={scope}
      {...props}
      data-slot="table-head"
      data-numeric={numeric ? '' : undefined}
      className={cn(className)}
    />
  )
}

export function TableCell({
  className,
  numeric,
  ...props
}: React.ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      {...props}
      data-slot="table-cell"
      data-numeric={numeric ? '' : undefined}
      className={cn(className)}
    />
  )
}
