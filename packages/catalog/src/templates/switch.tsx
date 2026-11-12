'use client'
import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from './utils.js'
import './switch.css'

export type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  /** `sm` is the compact settings-row switch; its hit area stays at least 24 by 24 px. */
  size?: 'default' | 'sm'
}

export function Switch({ className, children, size, ...props }: SwitchProps) {
  const small = size === 'sm' ? 'sm' : undefined
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={small}
      className={cn(className)}
      {...props}
    >
      {children ?? <SwitchThumb data-size={small} />}
    </SwitchPrimitive.Root>
  )
}

export function SwitchThumb({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Thumb>) {
  return (
    <SwitchPrimitive.Thumb
      data-slot="switch-thumb"
      className={cn(className)}
      {...props}
    />
  )
}
