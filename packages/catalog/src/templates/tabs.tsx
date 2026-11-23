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
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { appearance?: 'contained' | 'underline' | 'pills' }) {
  return (
    <TabsPrimitive.List
      data-appearance={appearance}
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
