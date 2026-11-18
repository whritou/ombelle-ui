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
  return <MenubarPrimitive data-slot="menubar" className={cn(className)} {...props} />
}

export type MenubarMenuProps = React.ComponentProps<typeof MenuPrimitive.Root>

export function MenubarMenu({ ...props }: MenubarMenuProps) {
  return <MenuPrimitive.Root data-slot="menubar-menu" {...props} />
}

export function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Portal>) {
  return <MenuPrimitive.Portal data-slot="menubar-portal" {...props} />
}

export function MenubarTrigger({
  className,
  ...props
}: Part<typeof MenuPrimitive.Trigger>) {
  return (
    <MenuPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn(className)}
      render={(triggerProps, state) => (
        <button {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
    />
  )
}

export function MenubarContent({
  sideOffset = 6,
  align = 'start',
  ...props
}: Part<typeof MenuPrimitive.Popup> & Placement) {
  return <MenuPopup data-slot="menubar-content" sideOffset={sideOffset} align={align} {...props} />
}

export function MenubarGroup({
  className,
  ...props
}: Part<typeof MenuPrimitive.Group>) {
  return (
    <MenuPrimitive.Group
      data-slot="menubar-group"
      className={cn(className)}
      {...props}
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
      data-slot="menubar-label"
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      {...props}
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
      data-slot="menubar-item"
      data-inset={inset ? '' : undefined}
      data-variant={variant}
      className={cn(className)}
      {...props}
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
      data-slot="menubar-checkbox-item"
      className={cn(className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
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
      data-slot="menubar-radio-group"
      className={cn(className)}
      {...props}
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
      data-slot="menubar-radio-item"
      className={cn(className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
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
      data-slot="menubar-separator"
      className={cn(className)}
      {...props}
    />
  )
}

export function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn(className)}
      {...props}
    />
  )
}

export function MenubarSub({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>) {
  return <MenuPrimitive.SubmenuRoot data-slot="menubar-sub" {...props} />
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
      data-slot="menubar-sub-trigger"
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      render={(triggerProps, state) => (
        <div {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon data-slot="menubar-sub-icon" aria-hidden="true" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

export function MenubarSubContent({
  ...props
}: Part<typeof MenuPrimitive.Popup> & Placement) {
  return <MenuPopup data-slot="menubar-sub-content" side="right" {...props} />
}
