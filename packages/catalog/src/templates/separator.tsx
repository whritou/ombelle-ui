'use client'
import * as React from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from './utils.js'
import './separator.css'

export type SeparatorProps = React.ComponentProps<
  typeof SeparatorPrimitive.Root
>

/**
 * Decorative by default (role="none"). Pass decorative={false} when the
 * line separates content semantically. Children render as a centred label,
 * such as "or" between two sign-in options.
 */
export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  children,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      data-labelled={children ? '' : undefined}
      orientation={orientation}
      decorative={decorative}
      className={cn(className)}
      {...props}
    >
      {children ? <span data-slot="separator-label">{children}</span> : null}
    </SeparatorPrimitive.Root>
  )
}
