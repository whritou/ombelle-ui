'use client'
import * as React from 'react'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from './utils.js'
import './switch.css'

export type SwitchProps = Omit<
  React.ComponentProps<typeof SwitchPrimitive.Root>,
  'className'
> & { className?: string }

// Radix-compatible data-state next to Base UI's data-checked/data-unchecked,
// so the shared stylesheet applies. A custom render prop replaces this bridge.
const checkedState = (checked: boolean) => (checked ? 'checked' : 'unchecked')

export function Switch({ className, children, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(className)}
      render={(rootProps, state) => (
        <span {...rootProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
    >
      {children ?? <SwitchThumb />}
    </SwitchPrimitive.Root>
  )
}

export function SwitchThumb({
  className,
  ...props
}: Omit<React.ComponentProps<typeof SwitchPrimitive.Thumb>, 'className'> & {
  className?: string
}) {
  return (
    <SwitchPrimitive.Thumb
      data-slot="switch-thumb"
      className={cn(className)}
      render={(thumbProps, state) => (
        <span {...thumbProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
    />
  )
}
