'use client'
import * as React from 'react'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils.js'
const buttonVariants = cva(
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
export type ButtonProps = Omit<ButtonPrimitive.Props, 'className'> &
  VariantProps<typeof buttonVariants> & {
    className?: string
    /** Shows a spinner, sets aria-busy and disables the button. Ignored with render. */
    loading?: boolean
  }
export function Button({
  className,
  variant = 'default',
  size = 'default',
  loading = false,
  type = 'button',
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  // A render prop replaces the element; it keeps its own type and loading UI.
  const rendered = props.render !== undefined
  const busy = loading && !rendered
  const ownRef = React.useRef<HTMLButtonElement | null>(null)
  const restingWidth = React.useRef<number | undefined>(undefined)
  // Loading keeps the width measured at rest, so the spinner never makes the button grow.
  // Every render at rest measures again, so a label or size changed since is kept too.
  React.useLayoutEffect(() => {
    if (!busy && ownRef.current) restingWidth.current = ownRef.current.getBoundingClientRect().width
  })
  React.useLayoutEffect(() => {
    const element = ownRef.current
    if (!busy || !element || restingWidth.current === undefined) return
    // Never wider than its container, which may have narrowed since the last render.
    element.style.setProperty('min-inline-size', `min(${restingWidth.current}px, 100%)`)
    return () => { element.style.removeProperty('min-inline-size') }
  }, [busy])
  const setRef = React.useCallback((element: HTMLButtonElement | null) => {
    ownRef.current = element
    if (typeof ref === 'function') ref(element)
    else if (ref) ref.current = element
  }, [ref])
  return (
    <ButtonPrimitive
      data-variant={variant}
      data-size={size}
      {...(!rendered ? { type } : {})}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || busy || undefined}
      aria-busy={busy || undefined}
      {...props}
      ref={setRef}
      // Set after the spread: a trigger rendering this Button (Tooltip,
      // Dialog) passes its own data-slot, which would hide the family styles.
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
    </ButtonPrimitive>
  )
}
