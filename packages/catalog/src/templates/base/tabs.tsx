'use client'
import * as React from 'react'
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from './utils.js'
import './tabs.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's data-active/data-hidden, so
// the shared stylesheet applies. A custom render prop replaces this bridge.
const activeState = (active: boolean) => (active ? 'active' : 'inactive')

export type TabsProps = Part<typeof TabsPrimitive.Root>

export function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root data-slot="tabs" className={cn(className)} {...props} />
  )
}

/** Tabs activate on focus by default, like the Radix edition's automatic mode. */
export function TabsList({
  className,
  activateOnFocus = true,
  appearance = 'contained',
  ...props
}: Part<typeof TabsPrimitive.List> & { appearance?: 'contained' | 'underline' | 'pills' }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-appearance={appearance}
      className={cn(className)}
      activateOnFocus={activateOnFocus}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: Part<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(className)}
      render={(tabProps, state) => (
        <button
          {...tabProps}
          data-state={activeState(state.active)}
          data-orientation={state.orientation}
        />
      )}
      {...props}
    />
  )
}

/** Inactive panels stay in the DOM, hidden, as in the Radix edition. */
export function TabsContent({
  className,
  keepMounted = true,
  ...props
}: Part<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(className)}
      keepMounted={keepMounted}
      render={(panelProps, state) => (
        <div
          {...panelProps}
          data-state={activeState(!state.hidden)}
          data-orientation={state.orientation}
        />
      )}
      {...props}
    />
  )
}

/** A count in a trigger, such as the number of items in a list. It is part of the trigger's name. */
export function TabsCount({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="tabs-count" className={cn(className)} />
}
