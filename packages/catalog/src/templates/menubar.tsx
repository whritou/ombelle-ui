'use client'
import * as React from 'react'
import * as MenubarPrimitive from '@radix-ui/react-menubar'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from './utils.js'
import './menubar.css'


/** A row of menus such as File, Edit and View: one Tab stop, arrow keys between menus, and Left or Right open the next menu while one is open. */
export function Menubar({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  return <MenubarPrimitive.Root className={cn(className)} {...props} data-slot="menubar" />
}

export type MenubarMenuProps = React.ComponentProps<
  typeof MenubarPrimitive.Menu
>

export function MenubarMenu({ ...props }: MenubarMenuProps) {
  return <MenubarPrimitive.Menu {...props} data-slot="menubar-menu" />
}

export function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return (
    <MenubarPrimitive.Portal {...props} data-slot="menubar-portal" />
  )
}

export function MenubarTrigger({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      {...props}
      data-slot="menubar-trigger"
    />
  )
}

export function MenubarContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content>) {
  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(className)}
        {...props}
        data-slot="menubar-content"
      />
    </MenubarPrimitive.Portal>
  )
}

export function MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return (
    <MenubarPrimitive.Group {...props} data-slot="menubar-group" />
  )
}

export function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.Label
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
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <MenubarPrimitive.Item
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
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem
      className={cn(className)}
      {...props}
      data-slot="menubar-checkbox-item"
    >
      <span data-slot="menubar-item-indicator">
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
}

export function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return (
    <MenubarPrimitive.RadioGroup
      {...props}
      data-slot="menubar-radio-group"
    />
  )
}

export function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  return (
    <MenubarPrimitive.RadioItem
      className={cn(className)}
      {...props}
      data-slot="menubar-radio-item"
    >
      <span data-slot="menubar-item-indicator">
        <MenubarPrimitive.ItemIndicator>
          <span data-menubar-dot="" aria-hidden="true" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  )
}

export function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator
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
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub {...props} data-slot="menubar-sub" />
}

export function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.SubTrigger
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      {...props}
      data-slot="menubar-sub-trigger"
    >
      {children}
      <ChevronRightIcon data-slot="menubar-sub-icon" aria-hidden="true" />
    </MenubarPrimitive.SubTrigger>
  )
}

export function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.SubContent
        className={cn(className)}
        {...props}
        data-slot="menubar-sub-content"
      />
    </MenubarPrimitive.Portal>
  )
}
