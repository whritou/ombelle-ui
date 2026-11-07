'use client'
import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import { cn } from './utils.js'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's data-open/data-closed.
const openState = (open: boolean) => (open ? 'open' : 'closed')

export const Dialog = DialogPrimitive.Root
/** Use `render` (for example render={<Button />}) to render the trigger as another component. */
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

/** Groups the title and description at the top of the dialog; families style it as one block. */
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn(className)} {...props} />
}

export function DialogTitle({
  className,
  ...props
}: Part<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn(className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: Part<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description data-slot="dialog-description" className={cn(className)} {...props} />
  )
}

export function DialogContent({
  className,
  children,
  ...props
}: Part<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0"
        render={(backdropProps, state) => (
          <div {...backdropProps} data-state={openState(state.open)} />
        )}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn('fixed', className)}
        render={(popupProps, state) => (
          <div {...popupProps} data-state={openState(state.open)} />
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close data-slot="dialog-close" type="button">
          <XIcon aria-hidden="true" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}
