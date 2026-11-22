'use client'
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils.js'
const buttonClasses = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'bg-background text-foreground',
        ghost: 'bg-transparent text-foreground',
        link: 'text-primary underline',
        'link-destructive': 'text-destructive underline',
      },
      size: {
        sm: 'text-sm',
        default: 'text-sm',
        lg: 'text-base',
        icon: 'aspect-square',
        'icon-sm': 'aspect-square',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonClasses> & {
    asChild?: boolean
    /** Shows a spinner, sets aria-busy and disables the button. Ignored with asChild. */
    loading?: boolean
  }
export function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading,
  type = 'button',
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  const busy = loading === true && !asChild
  // Only a Button that takes a loading prop (true or false) measures itself.
  const watchesLoading = loading !== undefined && !asChild
  const ownRef = React.useRef<HTMLButtonElement | null>(null)
  const restingWidth = React.useRef<number | undefined>(undefined)
  // Loading keeps the width measured at rest, so the spinner never makes the button grow.
  // Every render at rest measures again, so a label or size changed since is kept too; a Button
  // without a loading prop never forces that layout read.
  React.useLayoutEffect(() => {
    if (watchesLoading && !busy && ownRef.current) restingWidth.current = ownRef.current.getBoundingClientRect().width
  })
  React.useLayoutEffect(() => {
    const element = ownRef.current
    if (!busy || !element || restingWidth.current === undefined) return
    // Never wider than its container, which may have narrowed since the last render.
    const own = element.style.getPropertyValue('min-inline-size')
    element.style.setProperty('min-inline-size', `min(${restingWidth.current}px, 100%)`)
    // Put back a min width the consumer set, rather than clearing it.
    return () => {
      if (own) element.style.setProperty('min-inline-size', own)
      else element.style.removeProperty('min-inline-size')
    }
  }, [busy])
  const setRef = React.useCallback((element: HTMLButtonElement | null) => {
    ownRef.current = element
    const cleanup = typeof ref === 'function' ? ref(element) : undefined
    if (ref && typeof ref !== 'function') ref.current = element
    // A React 19 callback ref may return a cleanup, which React then calls instead of ref(null).
    if (typeof cleanup === 'function') return () => { ownRef.current = null; cleanup() }
  }, [ref])
  return (
    <Component
      data-variant={variant}
      data-size={size}
      {...(!asChild ? { type } : {})}
      className={cn(buttonClasses({ variant, size }), className)}
      disabled={disabled || busy || undefined}
      aria-busy={busy || undefined}
      {...props}
      ref={setRef}
      // Set after the spread: an asChild trigger (Tooltip, Dialog) passes its
      // own data-slot through Radix Slot, which would hide the family styles.
      data-slot="button"
    >
      {busy ? (
        <>
          <span
            data-slot="button-spinner"
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          />
          {children}
        </>
      ) : (
        children
      )}
    </Component>
  )
}

export type ButtonVariantsOptions = VariantProps<typeof buttonClasses> & { className?: string }
// Read from an element, so a beside install, which renames the slot in markup, renames it here too.
const buttonSlot = (<span data-slot="button" /> as React.ReactElement<{ 'data-slot': string }>).props['data-slot']
/**
 * The attributes an element needs to look like a Button: the family stylesheets select
 * data-slot, data-variant and data-size, not a class. Spread the result onto the element.
 */
export function buttonVariants({ variant = 'default', size = 'default', className }: ButtonVariantsOptions = {}) {
  return {
    'data-slot': buttonSlot,
    'data-variant': variant ?? 'default',
    'data-size': size ?? 'default',
    className: cn(buttonClasses({ variant, size }), className),
  } as const
}
