'use client'
import * as React from 'react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './sheet.css'

type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & { className?: string }
const openState = (open: boolean) => open ? 'open' : 'closed'

export type SheetProps = React.ComponentProps<typeof SheetPrimitive.Root>
export function Sheet(props: SheetProps) {
  return <SheetPrimitive.Root {...props} />
}
/** Compose another component with render={<Button />}. */
export function SheetTrigger({ className, ...props }: Part<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" className={cn(className)} {...props} />
}
export function SheetClose({ className, ...props }: Part<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" className={cn(className)} {...props} />
}
export type SheetContentProps = Part<typeof SheetPrimitive.Popup> & {
  side?: 'inline-start' | 'inline-end' | 'top' | 'bottom'
  size?: 'sm' | 'default' | 'lg'
}
export function SheetContent({ className, children, side = 'inline-end', size = 'default', ...props }: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop data-slot="sheet-overlay" render={(backdropProps, state) => <div {...backdropProps} data-state={openState(state.open)} />} />
      <SheetPrimitive.Popup data-slot="sheet-content" data-side={side} data-size={size} className={cn(className)}
        render={(popupProps, state) => <div {...popupProps} data-state={openState(state.open)} />} {...props}>
        {children}
        <SheetPrimitive.Close data-slot="sheet-dismiss" type="button" aria-label="Close">
          <XIcon aria-hidden="true" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}
export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn(className)} {...props} />
}
export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn(className)} {...props} />
}
export function SheetTitle({ className, ...props }: Part<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn(className)} {...props} />
}
export function SheetDescription({ className, ...props }: Part<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn(className)} {...props} />
}
