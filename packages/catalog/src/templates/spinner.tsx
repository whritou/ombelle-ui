import * as React from 'react'
import { cn } from './utils.js'
import './spinner.css'

export type SpinnerProps = React.ComponentProps<'svg'> & {
  size?: 'sm' | 'default' | 'lg'
}

/**
 * A busy indicator announced as a status named "Loading". Pass aria-label to
 * rename it, or aria-hidden when a labelled control around it already speaks.
 */
export function Spinner({
  className,
  size = 'default',
  'aria-label': label = 'Loading',
  'aria-hidden': hidden,
  ...props
}: SpinnerProps) {
  const announced = !hidden || hidden === 'false'
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      {...(announced ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true })}
      {...props}
      data-slot="spinner"
      data-size={size}
      className={cn(className)}
    >
      <circle cx="12" cy="12" r="9" data-spinner-track="" />
      <path d="M21 12a9 9 0 0 0-9-9" data-spinner-arc="" />
    </svg>
  )
}
