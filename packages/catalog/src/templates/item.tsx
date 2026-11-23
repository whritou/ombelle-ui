import * as React from 'react'
import { cn } from './utils.js'
import './item.css'

type ItemProps = React.ComponentProps<'div'> & { variant?: 'default' | 'outline' | 'muted'; size?: 'default' | 'sm'; asChild?: boolean }

const isActions = (child: React.ReactNode) => React.isValidElement(child) && child.type === ItemActions

type Handler = (...args: unknown[]) => unknown
/**
 * The props a child gets from the Item it renders as, merged as Radix Slot does: the child's own props win,
 * class names and styles merge, both refs are set, and when both have a handler for an event the child's runs, then the Item's.
 */
function slotProps(props: Record<string, unknown>, own: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...props, ...own }
  for (const key of Object.keys(props)) {
    const outer = props[key], inner = own[key]
    if (/^on[A-Z]/.test(key) && typeof outer === 'function' && typeof inner === 'function')
      merged[key] = (...args: unknown[]) => { const result = (inner as Handler)(...args); (outer as Handler)(...args); return result }
  }
  merged.className = cn(props.className as string, own.className as string)
  if (props.style && own.style) merged.style = { ...(props.style as React.CSSProperties), ...(own.style as React.CSSProperties) }
  const refs = [props.ref, own.ref] as (React.Ref<unknown> | undefined)[]
  if (refs[0] && refs[1])
    merged.ref = (element: unknown) => {
      for (const ref of refs) {
        if (typeof ref === 'function') ref(element)
        else if (ref) (ref as React.RefObject<unknown>).current = element
      }
    }
  return merged
}

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
    return React.cloneElement(child, { ...slotProps({ ...props, className }, child.props), ...dataProps })
  // The link and its actions are siblings, so a button never sits inside the link.
  return (
    <div {...props} data-slot="item" data-variant={variant} data-size={size} data-as-child="" className={cn(className)}>
      {React.cloneElement(child, { 'data-item-link': '', className: cn(childProps.className) } as Record<string, unknown>)}
      {actions}
    </div>
  )
}

/** A list of Items. Each Item and separator sits in a listitem wrapper, so a link Item keeps its link role and the list stays valid. */
export function ItemGroup({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div role="list" {...props} data-slot="item-group" className={cn(className)}>
      {React.Children.map(children, child =>
        React.isValidElement(child) && (child.type === Item || child.type === ItemSeparator) ? <div role="listitem">{child}</div> : child,
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
