'use client'
import * as React from 'react'
import * as TogglePrimitive from '@radix-ui/react-toggle'
import { cn } from './utils.js'
import './toggle.css'

export type ToggleProps = React.ComponentProps<typeof TogglePrimitive.Root> & {
  /** default: the family's resting look; outline: always drawn with a border. */
  variant?: 'default' | 'outline'
  size?: 'sm' | 'default' | 'lg'
}

/**
 * A two-state button with aria-pressed. An icon-only Toggle needs an aria-label.
 * Use ToggleGroup when several toggles belong together.
 */
export function Toggle({ className, variant = 'default', size = 'default', ...props }: ToggleProps) {
  return <TogglePrimitive.Root {...props} data-slot="toggle" data-variant={variant} data-size={size} className={cn(className)} />
}
