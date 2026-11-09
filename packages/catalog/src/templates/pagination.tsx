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
