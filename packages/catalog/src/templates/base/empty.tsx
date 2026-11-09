'use client'
import * as React from 'react'
import { useRender } from '@base-ui/react/use-render'
import { cn } from './utils.js'
import './empty.css'

/** A zero-data screen: media, title, description, then actions. */
export function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="empty" className={cn(className)} />
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="empty-header" className={cn(className)} />
}

export type EmptyMediaProps = React.ComponentProps<'div'> & { variant?: 'default' | 'icon' }

/** Holds an illustration, or with variant="icon" an icon on a tile. */
export function EmptyMedia({ className, variant = 'default', ...props }: EmptyMediaProps) {
  return <div {...props} data-slot="empty-media" data-variant={variant} className={cn(className)} />
}

/** Not a heading by default: pass render={<h2 />} with the heading level your page needs. */
export function EmptyTitle({ className, render, ...props }: useRender.ComponentProps<'div'>) {
  return useRender({ render: render ?? <div data-slot="empty-title" />, props: { ...props, 'data-slot': 'empty-title', className: cn(className) } })
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p {...props} data-slot="empty-description" className={cn(className)} />
}

export function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="empty-content" className={cn(className)} />
}
