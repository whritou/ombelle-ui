'use client'
import * as React from 'react'
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { cn } from './utils.js'
import './toggle.css'

export type ToggleProps = Omit<React.ComponentProps<'button'>, 'onChange' | 'className'> & {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?(pressed: boolean): void
  /** default: the family's resting look; outline: always drawn with a border. */
  variant?: 'default' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

/**
 * A two-state button with aria-pressed, on Base UI Toggle. An icon-only Toggle needs an aria-label.
 * Use ToggleGroup when several toggles belong together.
 */
export function Toggle({ className, variant = 'default', size = 'default', onPressedChange, ...props }: ToggleProps) {
  return (
    <TogglePrimitive
      type="button"
      {...(props as React.ComponentProps<typeof TogglePrimitive>)}
      onPressedChange={onPressedChange ? (pressed: boolean) => onPressedChange(pressed) : undefined}
      data-slot="toggle"
      data-variant={variant}
      data-size={size}
      className={cn(className)}
      // Radix-compatible data-state next to Base UI's data-pressed, so the shared stylesheet applies.
      render={(rootProps, state) => <button {...rootProps} data-state={state.pressed ? 'on' : 'off'} />}
    />
  )
}
