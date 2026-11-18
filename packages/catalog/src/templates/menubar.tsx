'use client'
import * as React from 'react'
import * as MenubarPrimitive from '@radix-ui/react-menubar'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from './utils.js'
import './menubar.css'


/** A row of menus such as File, Edit and View: one Tab stop, arrow keys between menus, and Left or Right open the next menu while one is open. */
export function Menubar({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  return <MenubarPrimitive.Root data-slot="menubar" className={cn(className)} {...props} />
}

export type MenubarMenuProps = React.ComponentProps<
  typeof MenubarPrimitive.Menu
>

export function MenubarMenu({ ...props }: MenubarMenuProps) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />
}

export function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return (
    <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />
  )
}

export function MenubarTrigger({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      {...props}
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
        data-slot="menubar-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(className)}
        {...props}
      />
    </MenubarPrimitive.Portal>
  )
}

export function MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return (
    <MenubarPrimitive.Group data-slot="menubar-group" {...props} />
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
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <MenubarPrimitive.Item
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
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={cn(className)}
      {...props}
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
      data-slot="menubar-radio-group"
      {...props}
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
      data-slot="menubar-radio-item"
      className={cn(className)}
      {...props}
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
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />
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
      data-slot="menubar-sub-trigger"
      data-inset={inset ? '' : undefined}
      className={cn(className)}
      {...props}
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
        data-slot="menubar-sub-content"
        className={cn(className)}
        {...props}
      />
    </MenubarPrimitive.Portal>
  )
}
