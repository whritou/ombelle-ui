'use client'
import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './sheet.css'

export type SheetProps = React.ComponentProps<typeof SheetPrimitive.Root>
export function Sheet(props: SheetProps) {
  return <SheetPrimitive.Root {...props} />
}
export function SheetTrigger({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" className={cn(className)} {...props} />
}
export function SheetClose({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" className={cn(className)} {...props} />
}
export type SheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'inline-start' | 'inline-end' | 'top' | 'bottom'
  size?: 'sm' | 'default' | 'lg'
}
export function SheetContent({ className, children, side = 'inline-end', size = 'default', asChild, ...props }: SheetContentProps) {
  const dismiss = <SheetPrimitive.Close data-slot="sheet-dismiss" type="button" aria-label="Close">
    <XIcon aria-hidden="true" />
  </SheetPrimitive.Close>
  // Slot receives exactly one element in asChild mode. Put the built-in close
  // inside that element so native content composition retains both controls.
  const content = asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
    ? React.cloneElement(children, undefined, children.props.children, dismiss)
    : <>{children}{dismiss}</>
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" />
      <SheetPrimitive.Content data-slot="sheet-content" data-side={side} data-size={size} className={cn(className)} asChild={asChild} {...props}>
        {content}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}
export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn(className)} {...props} />
}
export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn(className)} {...props} />
}
export function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn(className)} {...props} />
}
export function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn(className)} {...props} />
}
