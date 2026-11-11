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
export const createToastManager = ToastPrimitive.createToastManager

/**
 * How long a toast stays: 6000 ms, plus 60 ms per character of title and description beyond 80,
 * up to 10000 ms. A toast with an action stays until dismissed, as WCAG 2.2.1 asks. An explicit
 * duration wins.
 */
export function toastDuration(content: { title?: string; description?: string; action?: boolean }, explicit?: number): number {
  if (explicit !== undefined) return explicit
  if (content.action) return Infinity
  const length = (content.title ?? '').length + (content.description ?? '').length
  return Math.min(10000, 6000 + 60 * Math.max(0, length - 80))
}

type AddOptions = Parameters<ReturnType<typeof ToastPrimitive.useToastManager>['add']>[0]
const textOf = (node: unknown) => typeof node === 'string' || typeof node === 'number' ? String(node) : ''
/** The native manager; add() fills in toastDuration's timeout when none is given. */
export function useToastManager() {
  const manager = ToastPrimitive.useToastManager()
  const provided = React.useContext(ProviderDuration)
  return React.useMemo(() => ({
    ...manager,
    add: (options: AddOptions) => {
      const duration = toastDuration({ title: textOf(options.title), description: textOf(options.description), action: options.actionProps !== undefined }, provided)
      return manager.add({ ...options, timeout: options.timeout ?? (duration === Infinity ? 0 : duration) })
    },
  }), [manager, provided])
}
/** The provider's own duration, when one is set. */
const ProviderDuration = React.createContext<number | undefined>(undefined)

export type ToastProviderProps = Omit<React.ComponentProps<typeof ToastPrimitive.Provider>, 'timeout'> & {
  duration?: number
  swipeDirection?: SwipeDirection
}
export function ToastProvider({ duration, swipeDirection = 'right', children, ...props }: ToastProviderProps) {
  const timeout = duration ?? 6000
  return <SwipeContext.Provider value={swipeDirection}>
    <ProviderDuration.Provider value={duration}>
      <ToastPrimitive.Provider timeout={timeout === Infinity ? 0 : timeout} {...props}>{children}</ToastPrimitive.Provider>
    </ProviderDuration.Provider>
  </SwipeContext.Provider>
}
export type ToastViewportProps = Part<typeof ToastPrimitive.Viewport> & {
  /** Overlap the toasts; hovering or focusing the stack spreads them out. */
  stack?: boolean
}
export function ToastViewport({ className, stack, ...props }: ToastViewportProps) {
  return <ToastPrimitive.Viewport data-slot="toast-viewport" data-stack={stack ? '' : undefined} aria-label="Notifications" className={cn(className)} {...props} />
}
export type ToastProps = Part<typeof ToastPrimitive.Root> & { variant?: ToastVariant }
export function Toast({ className, children, variant, toast, swipeDirection, ...props }: ToastProps) {
  const defaultSwipe = React.useContext(SwipeContext)
  const type = toast.type === 'loading' ? 'default' : toast.type === 'error' ? 'destructive' : toast.type
  return <ToastPrimitive.Root data-slot="toast" data-variant={variant ?? type ?? 'default'}
    className={cn(className)} toast={toast} swipeDirection={swipeDirection ?? defaultSwipe}
    render={(rootProps, state) => <div {...rootProps} data-state={state.transitionStatus === 'ending' ? 'closed' : 'open'} />}
    {...props}>
    <ToastPrimitive.Content data-slot="toast-content">
      {toast.type === 'loading' ? <span data-slot="toast-spinner" aria-hidden="true" /> : null}
      {children}
    </ToastPrimitive.Content>
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

type Settled<T> = React.ReactNode | ((value: T) => React.ReactNode)
export type ToastPromiseProps<T> = {
  promise: Promise<T>
  loading: React.ReactNode
  success: Settled<T>
  error: Settled<unknown>
}

/** One toast that follows a task, through the manager's promise(): loading, then success or an error. */
export function ToastPromise<T>({ promise, loading, success, error }: ToastPromiseProps<T>) {
  const manager = ToastPrimitive.useToastManager()
  const provided = React.useContext(ProviderDuration)
  const started = React.useRef<Promise<T> | null>(null)
  React.useEffect(() => {
    if (started.current === promise) return
    started.current = promise
    const settled = (content: Settled<never>, value: unknown, type: string) => {
      const title = typeof content === 'function' ? (content as (value: unknown) => React.ReactNode)(value) : content
      const duration = toastDuration({ title: textOf(title) }, provided)
      return { title, type, timeout: duration === Infinity ? 0 : duration }
    }
    manager.promise(promise, {
      loading: { title: loading, type: 'loading', timeout: 0 },
      success: (value: T) => settled(success as Settled<never>, value, 'success'),
      error: (reason: unknown) => settled(error as Settled<never>, reason, 'error'),
    }).catch(() => {})
  }, [promise, loading, success, error, manager, provided])
  return null
}
