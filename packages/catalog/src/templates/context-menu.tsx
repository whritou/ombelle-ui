'use client'
import * as React from 'react'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from './utils.js'
import './context-menu.css'

export type ContextMenuProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Root
>

export function ContextMenu({ ...props }: ContextMenuProps) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

export function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  )
}

/**
 * The area that opens the menu on right-click, or with Shift+F10 or the context-menu key while
 * focused. Give it tabIndex={0} and a name when it is not already focusable. variant="zone"
 * draws it as a dashed drop area; by default it keeps the look of what it wraps.
 */
export function ContextMenuTrigger({
  className,
  variant,
  onKeyDown,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger> & { variant?: 'zone' }) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      data-variant={variant}
      className={cn(className)}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        // Radix opens on the browser's contextmenu event, which not every browser or input
        // method sends for the keyboard: open it at the trigger's corner instead.
        if (event.defaultPrevented || !((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu')) return
        event.preventDefault()
        const box = event.currentTarget.getBoundingClientRect()
        event.currentTarget.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true, cancelable: true, button: 2, clientX: box.left + 8, clientY: box.top + 8,
        }))
      }}
      {...props}
    />
  )
}

/** The menu; it opens at the pointer. */
export function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
}

export function ContextMenuGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  )
}

export function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      {...props}
    />
  )
}

export function ContextMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset ? '' : undefined}
      data-variant={variant}
      className={cn(className)}
      {...props}
    />
  )
}

export function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(className)}
      {...props}
    >
      <span data-slot="context-menu-item-indicator">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

export function ContextMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  )
}

export function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(className)}
      {...props}
    >
      <span data-slot="context-menu-item-indicator">
        <ContextMenuPrimitive.ItemIndicator>
          <span data-context-menu-dot="" aria-hidden="true" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

export function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn(className)}
      {...props}
    />
  )
}

export function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(className)}
      {...props}
    />
  )
}

export function ContextMenuSub({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />
}

export function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      {...props}
    >
      {children}
      <ChevronRightIcon data-slot="context-menu-sub-icon" aria-hidden="true" />
    </ContextMenuPrimitive.SubTrigger>
  )
}

export function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        data-slot="context-menu-sub-content"
        className={cn(className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
}
