'use client'
import * as React from 'react'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cn } from './utils.js'
import './toggle-group.css'

type Variant = 'segmented' | 'toolbar'
const ToggleGroupVariant = React.createContext<Variant>('segmented')

export type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  /** segmented: one bar with a raised selected item; toolbar: separate square buttons. */
  variant?: Variant
}

/**
 * A row of toggle buttons with one Tab stop and arrow-key movement. type="single" is a radio
 * group (aria-checked); type="multiple" is a toolbar of pressed buttons. Name it with aria-label.
 */
export function ToggleGroup({ className, variant = 'segmented', ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupVariant.Provider value={variant}>
      <ToggleGroupPrimitive.Root {...props} data-slot="toggle-group" data-variant={variant} data-type={props.type} className={cn(className)} />
    </ToggleGroupVariant.Provider>
  )
}

/** One option. Give an icon-only item an aria-label. */
export function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const variant = React.useContext(ToggleGroupVariant)
  return <ToggleGroupPrimitive.Item {...props} data-slot="toggle-group-item" data-variant={variant} className={cn(className)} />
}
