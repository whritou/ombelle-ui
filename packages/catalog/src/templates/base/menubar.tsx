'use client'
import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Menubar as MenubarPrimitive } from '@base-ui/react/menubar'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from './utils.js'
import './menubar.css'

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
            '--radix-menubar-content-available-height': 'var(--available-height)',
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


/** A row of menus such as File, Edit and View: one Tab stop, arrow keys between menus, and Left or Right open the next menu while one is open. */
export function Menubar({ className, ...props }: Omit<React.ComponentProps<typeof MenubarPrimitive>, 'className'> & { className?: string }) {
  return <MenubarPrimitive className={cn(className)} {...props} data-slot="menubar" />
}

export type MenubarMenuProps = React.ComponentProps<typeof MenuPrimitive.Root>

export function MenubarMenu({ ...props }: MenubarMenuProps) {
  return <MenuPrimitive.Root {...props} data-slot="menubar-menu" />
}

export function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Portal>) {
  return <MenuPrimitive.Portal {...props} data-slot="menubar-portal" />
}

export function MenubarTrigger({
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
      data-slot="menubar-trigger"
    />
  )
}

export function MenubarContent({
  sideOffset = 6,
  align = 'start',
  ...props
}: Part<typeof MenuPrimitive.Popup> & Placement) {
  return <MenuPopup sideOffset={sideOffset} align={align} {...props} data-slot="menubar-content" />
}

export function MenubarGroup({
  className,
  ...props
}: Part<typeof MenuPrimitive.Group>) {
  return (
    <MenuPrimitive.Group
      className={cn(className)}
      {...props}
      data-slot="menubar-group"
    />
  )
}

/** A heading for menu items; it may stand outside a group, as in Radix. */
export function MenubarLabel({
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
      data-slot="menubar-label"
    />
  )
}

export function MenubarItem({
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
      data-slot="menubar-item"
    />
  )
}

export function MenubarCheckboxItem({
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
      data-slot="menubar-checkbox-item"
    >
      <span data-slot="menubar-item-indicator">
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon aria-hidden="true" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

export function MenubarRadioGroup({
  className,
  ...props
}: Part<typeof MenuPrimitive.RadioGroup>) {
  return (
    <MenuPrimitive.RadioGroup
      className={cn(className)}
      {...props}
      data-slot="menubar-radio-group"
    />
  )
}

export function MenubarRadioItem({
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
      data-slot="menubar-radio-item"
    >
      <span data-slot="menubar-item-indicator">
        <MenuPrimitive.RadioItemIndicator>
          <span data-menubar-dot="" aria-hidden="true" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

export function MenubarSeparator({
  className,
  ...props
}: Part<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      className={cn(className)}
      {...props}
      data-slot="menubar-separator"
    />
  )
}

export function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(className)}
      {...props}
      data-slot="menubar-shortcut"
    />
  )
}

export function MenubarSub({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>) {
  return <MenuPrimitive.SubmenuRoot {...props} data-slot="menubar-sub" />
}

export function MenubarSubTrigger({
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
      data-slot="menubar-sub-trigger"
    >
      {children}
      <ChevronRightIcon data-slot="menubar-sub-icon" aria-hidden="true" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

export function MenubarSubContent({
  ...props
}: Part<typeof MenuPrimitive.Popup> & Placement) {
  return <MenuPopup side="right" {...props} data-slot="menubar-sub-content" />
}
