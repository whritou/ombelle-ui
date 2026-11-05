import * as React from 'react'
import { cn } from './utils.js'
import './skeleton.css'

export type SkeletonProps = React.ComponentProps<'div'> & {
  /** `text` is a line, `circle` an avatar placeholder, `block` a card or image area. */
  shape?: 'text' | 'circle' | 'block'
}

/**
 * A decorative loading placeholder, hidden from assistive technology. Mark
 * the region that is loading with aria-busy and give it an accessible name.
 */
export function Skeleton({ className, shape = 'text', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      {...props}
      data-slot="skeleton"
      data-shape={shape}
      className={cn(className)}
    />
  )
}
