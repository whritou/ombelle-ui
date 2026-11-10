import * as React from 'react'
import { cn } from './utils.js'
import './badge.css'

export type BadgeProps = React.ComponentProps<'span'> & {
  variant?: 'default' | 'secondary' | 'outline' | 'accent' | 'destructive' | 'success' | 'warning' | 'info'
  size?: 'sm' | 'default'
  /** soft tints the intent, as Alert does; outline draws only its edge and text. */
  appearance?: 'solid' | 'soft' | 'outline'
}

export function Badge({
  className,
  variant = 'default',
  size = 'default',
  appearance,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      data-appearance={appearance}
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
