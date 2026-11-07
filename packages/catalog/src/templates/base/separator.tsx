'use client'
import * as React from 'react'
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import { cn } from './utils.js'
import './separator.css'

export type SeparatorProps = Omit<
  React.ComponentProps<typeof SeparatorPrimitive>,
  'className'
> & {
  className?: string
  /** Decorative separators are hidden from assistive technology (role="none"). */
  decorative?: boolean
}

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
    <SeparatorPrimitive
      data-slot="separator"
      data-labelled={children ? '' : undefined}
      orientation={orientation}
      // Base UI always renders role="separator"; a decorative line has no role,
      // as in the Radix edition. Orientation is only announced when semantic.
      {...(decorative ? { role: 'none', 'aria-orientation': undefined } : {})}
      className={cn(className)}
      {...props}
    >
      {children ? <span data-slot="separator-label">{children}</span> : null}
    </SeparatorPrimitive>
  )
}
