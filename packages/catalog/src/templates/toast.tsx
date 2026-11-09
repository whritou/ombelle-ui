'use client'
import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from './utils.js'
import './toast.css'

export type ToastVariant = 'default' | 'success' | 'warning' | 'info' | 'destructive'
export type ToastProviderProps = React.ComponentProps<typeof ToastPrimitive.Provider>
export function ToastProvider({ duration = 5000, swipeDirection = 'right', ...props }: ToastProviderProps) {
  return <ToastPrimitive.Provider duration={duration} swipeDirection={swipeDirection} {...props} />
}
export function ToastViewport({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return <ToastPrimitive.Viewport data-slot="toast-viewport" label="Notifications ({hotkey})" className={cn(className)} {...props} />
}
export type ToastProps = React.ComponentProps<typeof ToastPrimitive.Root> & { variant?: ToastVariant }
export function Toast({ className, children, variant = 'default', ...props }: ToastProps) {
  return <ToastPrimitive.Root data-slot="toast" data-variant={variant} className={cn(className)} {...props}>
    <div data-slot="toast-content">{children}</div>
  </ToastPrimitive.Root>
}
export function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title data-slot="toast-title" className={cn(className)} {...props} />
}
export function ToastDescription({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description data-slot="toast-description" className={cn(className)} {...props} />
}
/** altText explains the action in the screen reader announcement. */
export function ToastAction({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Action>) {
  return <ToastPrimitive.Action data-slot="toast-action" className={cn(className)} {...props} />
}
export function ToastClose({ className, children, ...props }: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return <ToastPrimitive.Close data-slot="toast-close" aria-label="Dismiss notification" className={cn(className)} {...props}>
    {children ?? <span aria-hidden="true">×</span>}
  </ToastPrimitive.Close>
}
