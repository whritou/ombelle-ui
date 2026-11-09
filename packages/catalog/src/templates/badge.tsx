import * as React from 'react'
import { cn } from './utils.js'
import './badge.css'

export type BadgeProps = React.ComponentProps<'span'> & {
  variant?: 'default' | 'secondary' | 'outline' | 'accent' | 'destructive'
  size?: 'sm' | 'default'
}

export function Badge({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      className={cn(className)}
    />
  )
}

/** Decorative status marker. Keep the status in the Badge's visible text. */
export function BadgeDot({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      {...props}
      data-slot="badge-dot"
      aria-hidden="true"
      className={cn(className)}
    />
  )
}
