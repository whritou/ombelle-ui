'use client'
import * as React from 'react'
import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from './utils.js'
import './context-menu.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's own attributes, so the shared
// stylesheet applies. A custom render prop replaces this bridge.
const openState = (open: boolean) => (open ? 'open' : 'closed')
const checkedState = (checked: boolean) => (checked ? 'checked' : 'unchecked')

type PositionerProps = React.ComponentProps<typeof ContextMenuPrimitive.Positioner>
type Placement = Pick<
  PositionerProps,
  'side' | 'sideOffset' | 'align' | 'alignOffset' | 'collisionPadding' | 'sticky'
>

/** A positioned menu popup in a portal, shared by the menu and its submenus. */
function MenuPopup({
  className,
  style,
  side,
  sideOffset,
  align,
  alignOffset,
  collisionPadding,
  sticky,
  ...props
}: Part<typeof ContextMenuPrimitive.Popup> & Placement) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        sticky={sticky}
      >
        <ContextMenuPrimitive.Popup
          className={cn(className)}
          // The shared stylesheet reads Radix's available-height variable.
          style={{
            '--radix-context-menu-content-available-height': 'var(--available-height)',
            ...(style as React.CSSProperties),
          } as React.CSSProperties}
          render={(popupProps, state) => (
            <div
              {...popupProps}
              data-state={openState(state.open)}
              data-side={state.side}
              data-align={state.align}
            />
          )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

export type ContextMenuProps = React.ComponentProps<typeof ContextMenuPrimitive.Root>

export function ContextMenu({ ...props }: ContextMenuProps) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

export function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
}

/**
 * The area that opens the menu on right-click, or with Shift+F10 or the context-menu key while
 * focused. Give it tabIndex={0} and a name when it is not already focusable.
 */
export function ContextMenuTrigger({
  className,
  ...props
}: Part<typeof ContextMenuPrimitive.Trigger>) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      className={cn(className)}
      render={(triggerProps, state) => (
        <div {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
    />
  )
}

/** The menu; it opens at the pointer. */
export function ContextMenuContent({
  ...props
}: Part<typeof ContextMenuPrimitive.Popup> & Placement) {
  return <MenuPopup data-slot="context-menu-content" {...props} />
}

export function ContextMenuGroup({
  className,
  ...props
}: Part<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group
      data-slot="context-menu-group"
      className={cn(className)}
      {...props}
    />
  )
}

/** A heading for menu items; it may stand outside a group, as in Radix. */
export function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<'div'> & {
  inset?: boolean
}) {
  return (
    <div
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
}: Part<typeof ContextMenuPrimitive.Item> & {
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
}: Part<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
    >
      <span data-slot="context-menu-item-indicator">
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <CheckIcon aria-hidden="true" />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

export function ContextMenuRadioGroup({
  className,
  ...props
}: Part<typeof ContextMenuPrimitive.RadioGroup>) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      className={cn(className)}
      {...props}
    />
  )
}

export function ContextMenuRadioItem({
  className,
  children,
  ...props
}: Part<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
    >
      <span data-slot="context-menu-item-indicator">
        <ContextMenuPrimitive.RadioItemIndicator>
          <span data-context-menu-dot="" aria-hidden="true" />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

export function ContextMenuSeparator({
  className,
  ...props
}: Part<typeof ContextMenuPrimitive.Separator>) {
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
}: React.ComponentProps<typeof ContextMenuPrimitive.SubmenuRoot>) {
  return <ContextMenuPrimitive.SubmenuRoot data-slot="context-menu-sub" {...props} />
}

export function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: Part<typeof ContextMenuPrimitive.SubmenuTrigger> & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      render={(triggerProps, state) => (
        <div {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon data-slot="context-menu-sub-icon" aria-hidden="true" />
    </ContextMenuPrimitive.SubmenuTrigger>
  )
}

export function ContextMenuSubContent({
  ...props
}: Part<typeof ContextMenuPrimitive.Popup> & Placement) {
  return <MenuPopup data-slot="context-menu-sub-content" side="right" {...props} />
}
