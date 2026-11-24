'use client'
import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from './utils.js'
import './tabs.css'

export type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root>

export function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root className={cn(className)} {...props} data-slot="tabs" />
  )
}

export function TabsList({
  className,
  appearance = 'contained',
  size = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { appearance?: 'contained' | 'underline' | 'pills'
  /** sm, default or lg on the shared size scale; default follows the density's control height. */
  size?: 'sm' | 'default' | 'lg'
}) {
  return (
    <TabsPrimitive.List
      data-appearance={appearance}
      data-size={size !== 'default' ? size : undefined}
      className={cn(className)}
      {...props}
      data-slot="tabs-list"
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(className)}
      {...props}
      data-slot="tabs-trigger"
    />
  )
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(className)}
      {...props}
      data-slot="tabs-content"
    />
  )
}

/** A count in a trigger, such as the number of items in a list. It is part of the trigger's name. */
export function TabsCount({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="tabs-count" className={cn(className)} />
}
