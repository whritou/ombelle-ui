import * as React from 'react'
import { cn } from './utils.js'
import './alert.css'

export type AlertProps = React.ComponentProps<'div'> & {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
}

/**
 * Alerts announce polite status updates; only a destructive Alert is
 * announced immediately by default. Pass role to override.
 */
export function Alert({
  className,
  variant = 'default',
  ...props
}: AlertProps) {
  return (
    <div
      role={variant === 'destructive' ? 'alert' : 'status'}
      {...props}
      data-slot="alert"
      data-variant={variant}
      className={cn(className)}
    />
  )
}

export function AlertTitle({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="alert-title" className={cn(className)} />
}

export function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div {...props} data-slot="alert-description" className={cn(className)} />
  )
}
