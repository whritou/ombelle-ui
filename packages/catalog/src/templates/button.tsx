'use client'
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils.js'
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium disabled:pointer-events-none disabled:opacity-50',
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
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }
export function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...(!asChild ? { type } : {})}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
