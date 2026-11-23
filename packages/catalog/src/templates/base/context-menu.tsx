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
  return <ContextMenuPrimitive.Root {...props} data-slot="context-menu" />
}

export function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return <ContextMenuPrimitive.Portal {...props} data-slot="context-menu-portal" />
}

/**
 * The area that opens the menu on right-click, or with Shift+F10 or the context-menu key while
 * focused. Give it tabIndex={0} and a name when it is not already focusable. variant="zone"
 * draws it as a dashed drop area; by default it keeps the look of what it wraps.
 */
export function ContextMenuTrigger({
  className,
  variant,
  ...props
}: Part<typeof ContextMenuPrimitive.Trigger> & { variant?: 'zone' }) {
  return (
    <ContextMenuPrimitive.Trigger
      data-variant={variant}
      className={cn(className)}
      render={(triggerProps, state) => (
        <div {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
      data-slot="context-menu-trigger"
    />
  )
}

/** The menu; it opens at the pointer. */
export function ContextMenuContent({
  ...props
}: Part<typeof ContextMenuPrimitive.Popup> & Placement) {
  return <MenuPopup {...props} data-slot="context-menu-content" />
}

export function ContextMenuGroup({
  className,
  ...props
}: Part<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group
      className={cn(className)}
      {...props}
      data-slot="context-menu-group"
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
}: Part<typeof ContextMenuPrimitive.Item> & {
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
}: Part<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      className={cn(className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
      data-slot="context-menu-checkbox-item"
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
      className={cn(className)}
      {...props}
      data-slot="context-menu-radio-group"
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
      className={cn(className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
      data-slot="context-menu-radio-item"
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
}: React.ComponentProps<typeof ContextMenuPrimitive.SubmenuRoot>) {
  return <ContextMenuPrimitive.SubmenuRoot {...props} data-slot="context-menu-sub" />
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
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      render={(triggerProps, state) => (
        <div {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
      data-slot="context-menu-sub-trigger"
    >
      {children}
      <ChevronRightIcon data-slot="context-menu-sub-icon" aria-hidden="true" />
    </ContextMenuPrimitive.SubmenuTrigger>
  )
}

export function ContextMenuSubContent({
  ...props
}: Part<typeof ContextMenuPrimitive.Popup> & Placement) {
  return <MenuPopup side="right" {...props} data-slot="context-menu-sub-content" />
}
