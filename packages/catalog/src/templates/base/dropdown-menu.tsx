'use client'
import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from './utils.js'
import './dropdown-menu.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's own attributes, so the shared
// stylesheet applies. A custom render prop replaces this bridge.
const openState = (open: boolean) => (open ? 'open' : 'closed')
const checkedState = (checked: boolean) => (checked ? 'checked' : 'unchecked')

type PositionerProps = React.ComponentProps<typeof MenuPrimitive.Positioner>
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
}: Part<typeof MenuPrimitive.Popup> & Placement) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        sticky={sticky}
      >
        <MenuPrimitive.Popup
          className={cn(className)}
          // The shared stylesheet reads Radix's available-height variable.
          style={{
            '--radix-dropdown-menu-content-available-height': 'var(--available-height)',
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
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

export type DropdownMenuProps = React.ComponentProps<typeof MenuPrimitive.Root>

export function DropdownMenu({ ...props }: DropdownMenuProps) {
  return <MenuPrimitive.Root {...props} data-slot="dropdown-menu" />
}

export function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Portal>) {
  return <MenuPrimitive.Portal {...props} data-slot="dropdown-menu-portal" />
}

export function DropdownMenuTrigger({
  className,
  ...props
}: Part<typeof MenuPrimitive.Trigger>) {
  return (
    <MenuPrimitive.Trigger
      className={cn(className)}
      render={(triggerProps, state) => (
        <button {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
      data-slot="dropdown-menu-trigger"
    />
  )
}

export function DropdownMenuContent({
  sideOffset = 6,
  ...props
}: Part<typeof MenuPrimitive.Popup> & Placement) {
  return <MenuPopup sideOffset={sideOffset} {...props} data-slot="dropdown-menu-content" />
}

export function DropdownMenuGroup({
  className,
  ...props
}: Part<typeof MenuPrimitive.Group>) {
  return (
    <MenuPrimitive.Group
      className={cn(className)}
      {...props}
      data-slot="dropdown-menu-group"
    />
  )
}

/** A heading for menu items; it may stand outside a group, as in Radix. */
export function DropdownMenuLabel({
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
      data-slot="dropdown-menu-label"
    />
  )
}

export function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: Part<typeof MenuPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <MenuPrimitive.Item
      data-inset={inset ? '' : undefined}
      data-variant={variant}
      className={cn(className)}
      {...props}
      data-slot="dropdown-menu-item"
    />
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: Part<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem
      className={cn(className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
      data-slot="dropdown-menu-checkbox-item"
    >
      <span data-slot="dropdown-menu-item-indicator">
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon aria-hidden="true" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

export function DropdownMenuRadioGroup({
  className,
  ...props
}: Part<typeof MenuPrimitive.RadioGroup>) {
  return (
    <MenuPrimitive.RadioGroup
      className={cn(className)}
      {...props}
      data-slot="dropdown-menu-radio-group"
    />
  )
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: Part<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem
      className={cn(className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
      data-slot="dropdown-menu-radio-item"
    >
      <span data-slot="dropdown-menu-item-indicator">
        <MenuPrimitive.RadioItemIndicator>
          <span data-dropdown-menu-dot="" aria-hidden="true" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: Part<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      className={cn(className)}
      {...props}
      data-slot="dropdown-menu-separator"
    />
  )
}

export function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(className)}
      {...props}
      data-slot="dropdown-menu-shortcut"
    />
  )
}

export function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>) {
  return <MenuPrimitive.SubmenuRoot {...props} data-slot="dropdown-menu-sub" />
}

export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: Part<typeof MenuPrimitive.SubmenuTrigger> & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      render={(triggerProps, state) => (
        <div {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
      data-slot="dropdown-menu-sub-trigger"
    >
      {children}
      <ChevronRightIcon data-slot="dropdown-menu-sub-icon" aria-hidden="true" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

export function DropdownMenuSubContent({
  ...props
}: Part<typeof MenuPrimitive.Popup> & Placement) {
  return <MenuPopup side="right" {...props} data-slot="dropdown-menu-sub-content" />
}
