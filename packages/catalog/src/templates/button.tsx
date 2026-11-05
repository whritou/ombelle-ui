'use client'
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
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
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner, sets aria-busy and disables the button. Ignored with asChild. */
    loading?: boolean
  }
export function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  const busy = loading && !asChild
  return (
    <Component
      data-variant={variant}
      data-size={size}
      {...(!asChild ? { type } : {})}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || busy || undefined}
      aria-busy={busy || undefined}
      {...props}
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
