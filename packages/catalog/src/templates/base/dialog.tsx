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
  size,
  ...props
}: Part<typeof DialogPrimitive.Popup> & {
  /** `sm` 24rem, `lg` 48rem, `fullscreen` the viewport less 1rem on each side; below 640px `lg` and `fullscreen` fill the screen. */
  size?: DialogSize
}) {
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
        data-size={size === 'default' ? undefined : size}
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

export type DialogSize = 'sm' | 'default' | 'lg' | 'fullscreen'

/**
 * The scrolling middle of a dialog. It is a region named by the dialog's title; while its content
 * overflows it is a Tab stop, so keyboard users can scroll it, and it carries data-overflowing.
 */
export function DialogBody({ className, ref, ...props }: React.ComponentProps<'div'>) {
  const own = React.useRef<HTMLDivElement | null>(null)
  const [labelledBy, setLabelledBy] = React.useState<string | undefined>()
  const [overflowing, setOverflowing] = React.useState(false)
  React.useEffect(() => {
    const body = own.current
    if (!body) return
    // The dialog may set its aria-labelledby after this effect runs, so read it again whenever the body is measured.
    const measure = () => {
      setLabelledBy(body.closest('[role="dialog"], [role="alertdialog"]')?.getAttribute('aria-labelledby') ?? undefined)
      setOverflowing(body.scrollHeight > body.clientHeight + 1)
    }
    const resize = new ResizeObserver(measure)
    const watch = () => {
      resize.disconnect()
      resize.observe(body)
      for (const child of Array.from(body.children)) resize.observe(child)
      measure()
    }
    const mutations = new MutationObserver(watch)
    mutations.observe(body, { childList: true })
    watch()
    return () => {
      resize.disconnect()
      mutations.disconnect()
    }
  }, [])
  const setRef = React.useCallback((element: HTMLDivElement | null) => {
    own.current = element
    if (typeof ref === 'function') ref(element)
    else if (ref) ref.current = element
  }, [ref])
  return (
    <div
      role="region"
      aria-labelledby={labelledBy}
      tabIndex={overflowing ? 0 : undefined}
      data-overflowing={overflowing ? '' : undefined}
      {...props}
      ref={setRef}
      data-slot="dialog-body"
      data-dialog-body=""
      className={cn(className)}
    />
  )
}

/** A row of actions at the end of the dialog; it stays visible while the body scrolls. */
export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-footer" className={cn(className)} {...props} />
}
