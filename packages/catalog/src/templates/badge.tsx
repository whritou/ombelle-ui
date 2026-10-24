import * as React from 'react'
import { cn } from './utils.js'
import './badge.css'

export type BadgeProps = React.ComponentProps<'span'> & {
  variant?: 'default' | 'destructive'
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      data-slot="badge"
      data-variant={variant}
      className={cn(className)}
    />
  )
}
