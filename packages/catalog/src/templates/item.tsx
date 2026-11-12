import * as React from 'react'
import { cn } from './utils.js'
import './item.css'

type ItemProps = React.ComponentProps<'div'> & { variant?: 'default' | 'outline' | 'muted'; size?: 'default' | 'sm'; asChild?: boolean }

const isActions = (child: React.ReactNode) => React.isValidElement(child) && child.type === ItemActions

/** A row of media, text and actions. With asChild the first element child (a link) becomes the row; ItemActions stay outside it. */
export function Item({ className, variant = 'default', size = 'default', asChild = false, children, ...props }: ItemProps) {
  const dataProps = { 'data-slot': 'item', 'data-variant': variant, 'data-size': size }
  if (!asChild) return <div {...props} data-slot="item" data-variant={variant} data-size={size} className={cn(className)}>{children}</div>
  const nodes = React.Children.toArray(children)
  const actions = nodes.filter(isActions)
  const child = nodes.find(node => React.isValidElement(node) && !isActions(node)) as React.ReactElement<Record<string, unknown>> | undefined
  if (!child) return null
  const childProps = child.props as { className?: string }
  if (!actions.length)
    return React.cloneElement(child, { ...props, ...dataProps, className: cn(className, childProps.className) } as Record<string, unknown>)
  // The link and its actions are siblings, so a button never sits inside the link.
  return (
    <div {...props} data-slot="item" data-variant={variant} data-size={size} data-as-child="" className={cn(className)}>
      {React.cloneElement(child, { 'data-item-link': '', className: cn(childProps.className) } as Record<string, unknown>)}
      {actions}
    </div>
  )
}

/** A list of Items. Each Item sits in a listitem wrapper, so a link Item keeps its link role. */
export function ItemGroup({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div role="list" {...props} data-slot="item-group" className={cn(className)}>
      {React.Children.map(children, child =>
        React.isValidElement(child) && child.type === Item ? <div role="listitem">{child}</div> : child,
      )}
    </div>
  )
}

export function ItemSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="separator" aria-orientation="horizontal" {...props} data-slot="item-separator" className={cn(className)} />
}

export function ItemMedia({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & { variant?: 'default' | 'icon' | 'image' }) {
  return <div {...props} data-slot="item-media" data-variant={variant} className={cn(className)} />
}

export function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="item-content" className={cn(className)} />
}

export function ItemTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="item-title" className={cn(className)} />
}

export function ItemDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p {...props} data-slot="item-description" className={cn(className)} />
}

export function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="item-actions" className={cn(className)} />
}
