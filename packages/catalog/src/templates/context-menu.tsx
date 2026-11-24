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
  return <ContextMenuPrimitive.Root {...props} data-slot="context-menu" />
}

export function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return (
    <ContextMenuPrimitive.Portal {...props} data-slot="context-menu-portal" />
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
      data-slot="context-menu-trigger"
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
        className={cn(className)}
        {...props}
        data-slot="context-menu-content"
      />
    </ContextMenuPrimitive.Portal>
  )
}

export function ContextMenuGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group {...props} data-slot="context-menu-group" />
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
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      {...props}
      data-slot="context-menu-label"
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
      data-inset={inset ? '' : undefined}
      data-variant={variant}
      className={cn(className)}
      {...props}
      data-slot="context-menu-item"
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
      className={cn(className)}
      {...props}
      data-slot="context-menu-checkbox-item"
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
      {...props}
      data-slot="context-menu-radio-group"
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
      className={cn(className)}
      {...props}
      data-slot="context-menu-radio-item"
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
      className={cn(className)}
      {...props}
      data-slot="context-menu-separator"
    />
  )
}

export function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(className)}
      {...props}
      data-slot="context-menu-shortcut"
    />
  )
}

export function ContextMenuSub({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub {...props} data-slot="context-menu-sub" />
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
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      {...props}
      data-slot="context-menu-sub-trigger"
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
        className={cn(className)}
        {...props}
        data-slot="context-menu-sub-content"
      />
    </ContextMenuPrimitive.Portal>
  )
}
