'use client'
import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from './utils.js'
import './tabs.css'

export type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root>

export function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root data-slot="tabs" className={cn(className)} {...props} />
  )
}

export function TabsList({
  className,
  appearance = 'contained',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { appearance?: 'contained' | 'underline' | 'pills' }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-appearance={appearance}
      className={cn(className)}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(className)}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(className)}
      {...props}
    />
  )
}

/** A count in a trigger, such as the number of items in a list. It is part of the trigger's name. */
export function TabsCount({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="tabs-count" className={cn(className)} />
}
