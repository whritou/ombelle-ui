'use client'
import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { cn } from './utils.js'
import './alert-dialog.css'

type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & { className?: string }
const openState = (open: boolean) => open ? 'open' : 'closed'

export type AlertDialogProps = React.ComponentProps<typeof AlertDialogPrimitive.Root>
export function AlertDialog(props: AlertDialogProps) {
  return <AlertDialogPrimitive.Root {...props} />
}
/** Compose another component with render={<Button />}. */
export function AlertDialogTrigger({ className, ...props }: Part<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" className={cn(className)} {...props} />
}
export type AlertDialogContentProps = Part<typeof AlertDialogPrimitive.Popup>
export function AlertDialogContent({ className, children, ref, initialFocus, ...props }: AlertDialogContentProps) {
  const popupRef = React.useRef<HTMLDivElement | null>(null)
  const mergedRef = React.useCallback((element: HTMLDivElement | null) => {
    popupRef.current = element
    const cleanup = typeof ref === 'function' ? ref(element) : undefined
    if (ref && typeof ref !== 'function') ref.current = element
    return () => {
      popupRef.current = null
      if (typeof cleanup === 'function') cleanup()
      else if (typeof ref === 'function') ref(null)
      else if (ref) ref.current = null
    }
  }, [ref])
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" render={(backdropProps, state) => <div {...backdropProps} data-state={openState(state.open)} />} />
      <AlertDialogPrimitive.Popup data-slot="alert-dialog-content" className={cn(className)}
        render={(popupProps, state) => <div {...popupProps} data-state={openState(state.open)} />}
        {...props} ref={mergedRef}
        initialFocus={initialFocus ?? (() => popupRef.current?.querySelector<HTMLElement>('[data-slot="alert-dialog-cancel"]:not(:disabled)') ?? true)}>
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  )
}
export function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-header" className={cn(className)} {...props} />
}
export function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-footer" className={cn(className)} {...props} />
}
export function AlertDialogTitle({ className, ...props }: Part<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn(className)} {...props} />
}
export function AlertDialogDescription({ className, ...props }: Part<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn(className)} {...props} />
}
export function AlertDialogCancel({ className, ...props }: Part<typeof AlertDialogPrimitive.Close>) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" className={cn(className)} {...props} />
}
export function AlertDialogAction({ className, ...props }: Part<typeof AlertDialogPrimitive.Close>) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-action" className={cn(className)} {...props} />
}
