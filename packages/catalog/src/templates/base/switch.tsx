'use client'
import * as React from 'react'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from './utils.js'
import './switch.css'

export type SwitchProps = Omit<
  React.ComponentProps<typeof SwitchPrimitive.Root>,
  'className'
> & {
  className?: string
  /** `sm` is the compact settings-row switch; its hit area stays at least 24 by 24 px. */
  size?: 'default' | 'sm'
}

// Radix-compatible data-state next to Base UI's data-checked/data-unchecked,
// so the shared stylesheet applies. A custom render prop replaces this bridge.
const checkedState = (checked: boolean) => (checked ? 'checked' : 'unchecked')

// The size reaches a thumb passed as a child too.
const SwitchSize = React.createContext<'sm' | undefined>(undefined)

export function Switch({ className, children, size, ...props }: SwitchProps) {
  const small = size === 'sm' ? 'sm' : undefined
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={small}
      className={cn(className)}
      render={(rootProps, state) => (
        <span {...rootProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
    >
      <SwitchSize.Provider value={small}>{children ?? <SwitchThumb />}</SwitchSize.Provider>
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
      data-size={React.useContext(SwitchSize)}
      className={cn(className)}
      render={(thumbProps, state) => (
        <span {...thumbProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
    />
  )
}
