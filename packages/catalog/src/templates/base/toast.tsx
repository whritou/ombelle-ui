'use client'
import * as React from 'react'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { cn } from './utils.js'
import './toast.css'

type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & { className?: string }
export type ToastVariant = 'default' | 'success' | 'warning' | 'info' | 'destructive'
type SwipeDirection = React.ComponentProps<typeof ToastPrimitive.Root>['swipeDirection']
const SwipeContext = React.createContext<SwipeDirection>('right')
/** Base UI owns notifications through its native manager, rather than open props. */
export const useToastManager = ToastPrimitive.useToastManager
export const createToastManager = ToastPrimitive.createToastManager

export type ToastProviderProps = Omit<React.ComponentProps<typeof ToastPrimitive.Provider>, 'timeout'> & {
  duration?: number
  swipeDirection?: SwipeDirection
}
export function ToastProvider({ duration = 5000, swipeDirection = 'right', children, ...props }: ToastProviderProps) {
  return <SwipeContext.Provider value={swipeDirection}>
    <ToastPrimitive.Provider timeout={duration === Infinity ? 0 : duration} {...props}>{children}</ToastPrimitive.Provider>
  </SwipeContext.Provider>
}
export function ToastViewport({ className, ...props }: Part<typeof ToastPrimitive.Viewport>) {
  return <ToastPrimitive.Viewport data-slot="toast-viewport" aria-label="Notifications" className={cn(className)} {...props} />
}
export type ToastProps = Part<typeof ToastPrimitive.Root> & { variant?: ToastVariant }
export function Toast({ className, children, variant, toast, swipeDirection, ...props }: ToastProps) {
  const defaultSwipe = React.useContext(SwipeContext)
  return <ToastPrimitive.Root data-slot="toast" data-variant={variant ?? toast.type ?? 'default'}
    className={cn(className)} toast={toast} swipeDirection={swipeDirection ?? defaultSwipe}
    render={(rootProps, state) => <div {...rootProps} data-state={state.transitionStatus === 'ending' ? 'closed' : 'open'} />}
    {...props}>
    <ToastPrimitive.Content data-slot="toast-content">{children}</ToastPrimitive.Content>
  </ToastPrimitive.Root>
}
export function ToastTitle({ className, ...props }: Part<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title data-slot="toast-title" className={cn(className)} {...props} />
}
export function ToastDescription({ className, ...props }: Part<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description data-slot="toast-description" className={cn(className)} {...props} />
}
export type ToastActionProps = Part<typeof ToastPrimitive.Action> & { altText: string }
/** altText supplies a meaningful accessible label; actions retain native Base UI behavior. */
export function ToastAction({ className, altText, ...props }: ToastActionProps) {
  return <ToastPrimitive.Action data-slot="toast-action" aria-label={altText} className={cn(className)} {...props} />
}
export function ToastClose({ className, children, ...props }: Part<typeof ToastPrimitive.Close>) {
  return <ToastPrimitive.Close data-slot="toast-close" aria-label="Dismiss notification" className={cn(className)} {...props}>
    {children ?? <span aria-hidden="true">×</span>}
  </ToastPrimitive.Close>
}
