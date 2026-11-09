import * as React from 'react'
import { cn } from './utils.js'
import './breadcrumb.css'

export type BreadcrumbProps = React.ComponentProps<'nav'>
export type BreadcrumbListProps = React.ComponentProps<'ol'>
export type BreadcrumbItemProps = React.ComponentProps<'li'>
export type BreadcrumbLinkProps = React.ComponentProps<'a'>
export type BreadcrumbPageProps = React.ComponentProps<'span'>
export type BreadcrumbSeparatorProps = React.ComponentProps<'li'>
export type BreadcrumbEllipsisProps = React.ComponentProps<'span'>

export function Breadcrumb({
  className,
  'aria-label': label = 'Breadcrumb',
  ...props
}: BreadcrumbProps) {
  return (
    <nav
      {...props}
      aria-label={label}
      data-slot="breadcrumb"
      className={cn(className)}
    />
  )
}

export function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
  return <ol {...props} data-slot="breadcrumb-list" className={cn(className)} />
}

export function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return <li {...props} data-slot="breadcrumb-item" className={cn(className)} />
}

export function BreadcrumbLink({ className, ...props }: BreadcrumbLinkProps) {
  return <a {...props} data-slot="breadcrumb-link" className={cn(className)} />
}

export function BreadcrumbPage({ className, ...props }: BreadcrumbPageProps) {
  return (
    <span
      {...props}
      aria-current="page"
      data-slot="breadcrumb-page"
      className={cn(className)}
    />
  )
}

export function BreadcrumbSeparator({
  className,
  children,
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <li
      {...props}
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      tabIndex={undefined}
      className={cn(className)}
    >
      {children ?? (
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
      )}
    </li>
  )
}

export function BreadcrumbEllipsis({
  className,
  children,
  ...props
}: BreadcrumbEllipsisProps) {
  return (
    <span
      {...props}
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      tabIndex={undefined}
      className={cn(className)}
    >
      {children ?? '…'}
    </span>
  )
}
