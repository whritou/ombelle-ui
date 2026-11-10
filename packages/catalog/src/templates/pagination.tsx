import * as React from 'react'
import { cn } from './utils.js'
import './pagination.css'

export type PaginationProps = React.ComponentProps<'nav'>
export type PaginationContentProps = React.ComponentProps<'ul'>
export type PaginationItemProps = React.ComponentProps<'li'>
export type PaginationLinkProps = React.ComponentProps<'a'> & {
  isActive?: boolean
  disabled?: boolean
}
export type PaginationPreviousProps = PaginationLinkProps
export type PaginationNextProps = PaginationLinkProps
export type PaginationEllipsisProps = React.ComponentProps<'span'>

export function Pagination({
  className,
  'aria-label': label = 'Pagination',
  ...props
}: PaginationProps) {
  return (
    <nav
      {...props}
      aria-label={label}
      data-slot="pagination"
      className={cn(className)}
    />
  )
}

export function PaginationContent({
  className,
  ...props
}: PaginationContentProps) {
  return (
    <ul {...props} data-slot="pagination-content" className={cn(className)} />
  )
}

export function PaginationItem({ className, ...props }: PaginationItemProps) {
  return <li {...props} data-slot="pagination-item" className={cn(className)} />
}

export function PaginationLink({
  className,
  isActive = false,
  disabled = false,
  href,
  tabIndex,
  onClick,
  onAuxClick,
  ...props
}: PaginationLinkProps) {
  return (
    <a
      {...props}
      href={disabled ? undefined : href}
      tabIndex={disabled ? -1 : tabIndex}
      onClick={disabled ? undefined : onClick}
      onAuxClick={disabled ? undefined : onAuxClick}
      aria-current={isActive ? 'page' : props['aria-current']}
      aria-disabled={disabled ? true : props['aria-disabled']}
      data-slot="pagination-link"
      data-active={isActive ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      className={cn(className)}
    />
  )
}

export function PaginationPrevious({
  className,
  children,
  'aria-label': label = 'Go to previous page',
  ...props
}: PaginationPreviousProps) {
  return (
    <PaginationLink
      {...props}
      aria-label={label}
      data-direction="previous"
      className={cn(className)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
        focusable="false"
      >
        <path d="m15 5-7 7 7 7" />
      </svg>
      {children ?? 'Previous'}
    </PaginationLink>
  )
}

export function PaginationNext({
  className,
  children,
  'aria-label': label = 'Go to next page',
  ...props
}: PaginationNextProps) {
  return (
    <PaginationLink
      {...props}
      aria-label={label}
      data-direction="next"
      className={cn(className)}
    >
      {children ?? 'Next'}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
        focusable="false"
      >
        <path d="m9 5 7 7-7 7" />
      </svg>
    </PaginationLink>
  )
}

export function PaginationEllipsis({
  className,
  children,
  ...props
}: PaginationEllipsisProps) {
  return (
    <span
      {...props}
      data-slot="pagination-ellipsis"
      role="presentation"
      aria-hidden="true"
      tabIndex={undefined}
      className={cn(className)}
    >
      {children ?? '…'}
    </span>
  )
}

export type PaginationCompactProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  page: number
  pageCount: number
  previousHref?: string
  nextHref?: string
  /** Called on a click of the previous link, as well as or instead of following previousHref. */
  onPrevious?: React.MouseEventHandler<HTMLAnchorElement>
  onNext?: React.MouseEventHandler<HTMLAnchorElement>
}

/** Previous, "Page 2 of 12" and next: for narrow tables and phones. Put it in a Pagination. */
export function PaginationCompact({
  className,
  page,
  pageCount,
  previousHref,
  nextHref,
  onPrevious,
  onNext,
  ...props
}: PaginationCompactProps) {
  return (
    <div {...props} data-slot="pagination-compact" className={cn(className)}>
      <PaginationLink href={previousHref} onClick={onPrevious} disabled={page <= 1} aria-label="Previous page" data-direction="previous">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" focusable="false">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </PaginationLink>
      <strong>Page {page} of {pageCount}</strong>
      <PaginationLink href={nextHref} onClick={onNext} disabled={page >= pageCount} aria-label="Next page" data-direction="next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" focusable="false">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </PaginationLink>
    </div>
  )
}

export type PaginationPageSizeProps = Omit<React.ComponentProps<'div'>, 'onChange'> & {
  value: number
  options?: readonly number[]
  onValueChange?: (value: number) => void
  label?: React.ReactNode
  /** A text such as "1–25 of 290". */
  range?: React.ReactNode
}

/** A labelled native select for the number of rows per page, with an optional range text. */
export function PaginationPageSize({
  className,
  value,
  options = [10, 25, 50, 100],
  onValueChange,
  label = 'Rows per page',
  range,
  id,
  ...props
}: PaginationPageSizeProps) {
  const own = React.useId()
  const select = id ?? own
  return (
    <div {...props} data-slot="pagination-page-size" className={cn(className)}>
      <label htmlFor={select}>{label}</label>
      <select id={select} value={value} onChange={event => onValueChange?.(Number(event.target.value))}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {range ? <span>{range}</span> : null}
    </div>
  )
}
