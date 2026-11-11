'use client'
import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from './utils.js'
import './toast.css'

export type ToastVariant = 'default' | 'success' | 'warning' | 'info' | 'destructive'

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

/** The provider's own duration, when one is set; toasts otherwise take toastDuration. */
const ProviderDuration = React.createContext<number | undefined>(undefined)
export type ToastProviderProps = React.ComponentProps<typeof ToastPrimitive.Provider>
export function ToastProvider({ duration, swipeDirection = 'right', ...props }: ToastProviderProps) {
  return <ProviderDuration.Provider value={duration}>
    <ToastPrimitive.Provider duration={duration ?? 6000} swipeDirection={swipeDirection} {...props} />
  </ProviderDuration.Provider>
}
export type ToastViewportProps = React.ComponentProps<typeof ToastPrimitive.Viewport> & {
  /** Overlap the toasts; hovering or focusing the stack spreads them out. */
  stack?: boolean
}
export function ToastViewport({ className, stack, ...props }: ToastViewportProps) {
  return <ToastPrimitive.Viewport data-slot="toast-viewport" data-stack={stack ? '' : undefined} label="Notifications ({hotkey})" className={cn(className)} {...props} />
}

const textOf = (node: React.ReactNode): string =>
  typeof node === 'string' || typeof node === 'number' ? String(node)
    : Array.isArray(node) ? node.map(textOf).join('')
      : React.isValidElement<{ children?: React.ReactNode }>(node) ? textOf(node.props.children) : ''
/** The title and description text, and whether an action is present, read from the toast's parts. */
function readContent(children: React.ReactNode) {
  const content = { title: '', description: '', action: false }
  React.Children.forEach(children, child => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return
    if (child.type === ToastTitle) content.title += textOf(child.props.children)
    else if (child.type === ToastDescription) content.description += textOf(child.props.children)
    else if (child.type === ToastAction) content.action = true
  })
  return content
}

export type ToastProps = React.ComponentProps<typeof ToastPrimitive.Root> & { variant?: ToastVariant }
export function Toast({ className, children, variant = 'default', duration, ...props }: ToastProps) {
  const provided = React.useContext(ProviderDuration)
  return <ToastPrimitive.Root data-slot="toast" data-variant={variant} className={cn(className)}
    duration={toastDuration(readContent(children), duration ?? provided)} {...props}>
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

type Settled<T> = React.ReactNode | ((value: T) => React.ReactNode)
export type ToastPromiseProps<T> = {
  promise: Promise<T>
  loading: React.ReactNode
  success: Settled<T>
  error: Settled<unknown>
  /** The toast stays open while the promise is pending, then takes the usual duration. */
  className?: string
}

/** One toast that follows a task: a spinner while it runs, then success or an error. */
export function ToastPromise<T>({ promise, loading, success, error, className }: ToastPromiseProps<T>) {
  const [state, setState] = React.useState<{ status: 'pending' | 'success' | 'error'; value?: unknown }>({ status: 'pending' })
  const [open, setOpen] = React.useState(true)
  React.useEffect(() => {
    let live = true
    setState({ status: 'pending' })
    setOpen(true)
    promise.then(
      value => { if (live) setState({ status: 'success', value }) },
      reason => { if (live) setState({ status: 'error', value: reason }) },
    )
    // A promise that settles after unmount changes nothing.
    return () => { live = false }
  }, [promise])
  const pick = (settled: Settled<never>) => typeof settled === 'function' ? (settled as (value: unknown) => React.ReactNode)(state.value) : settled
  const title = state.status === 'pending' ? loading : state.status === 'success' ? pick(success as Settled<never>) : pick(error as Settled<never>)
  return (
    // Radix announces a toast once, when it mounts, so the settled toast mounts anew to announce its result.
    <Toast key={state.status === 'pending' ? 'pending' : 'settled'} open={open} onOpenChange={setOpen} className={className}
      variant={state.status === 'success' ? 'success' : state.status === 'error' ? 'destructive' : 'default'}
      duration={state.status === 'pending' ? Infinity : undefined}
      data-toast-promise={state.status}>
      {state.status === 'pending' ? <span data-slot="toast-spinner" aria-hidden="true" /> : null}
      <ToastTitle>{title}</ToastTitle>
    </Toast>
  )
}
