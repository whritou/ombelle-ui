import * as React from 'react'
import { XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './alert.css'

export type AlertProps = React.ComponentProps<'div'> & {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  /** Shows a Dismiss button that calls this. The Alert stays until you remove it. */
  onDismiss?: () => void
  /** The Dismiss button's accessible name. */
  dismissLabel?: string
  /** compact puts the icon, text and a trailing action on one line. */
  layout?: 'default' | 'compact'
}

/**
 * Alerts announce polite status updates; only a destructive Alert is
 * announced immediately by default. Pass role to override.
 * After a dismiss, move focus to a sensible place, such as the next heading.
 */
export function Alert({
  className,
  variant = 'default',
  onDismiss,
  dismissLabel,
  layout,
  children,
  ...props
}: AlertProps) {
  // A Dismiss button, given by onDismiss or as a child, reserves room in the corner.
  const dismissible = onDismiss !== undefined ||
    React.Children.toArray(children).some(child => React.isValidElement(child) && child.type === AlertDismiss)
  return (
    <div
      role={variant === 'destructive' ? 'alert' : 'status'}
      {...props}
      data-slot="alert"
      data-variant={variant}
      data-layout={layout === 'compact' ? 'compact' : undefined}
      data-dismissible={dismissible || undefined}
      className={cn(className)}
    >
      {children}
      {onDismiss ? <AlertDismiss label={dismissLabel} onClick={onDismiss} /> : null}
    </div>
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

/** Buttons or links under the description. */
export function AlertActions({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="alert-actions" className={cn(className)} />
}

/** A Dismiss button in the Alert's corner. Alert renders one itself when given onDismiss. */
export function AlertDismiss({
  className,
  label,
  ...props
}: React.ComponentProps<'button'> & { label?: string }) {
  return (
    <button
      type="button"
      aria-label={label ?? 'Dismiss'}
      {...props}
      data-slot="alert-dismiss"
      className={cn(className)}
    >
      <XIcon aria-hidden="true" />
    </button>
  )
}
