'use client'
import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from './utils.js'
import './progress.css'

export type ProgressProps = React.ComponentProps<
  typeof ProgressPrimitive.Root
>

/**
 * A determinate bar when `value` is set, indeterminate when it is null or
 * omitted. Name it with aria-label or aria-labelledby. Radix sets
 * data-state to loading, complete or indeterminate.
 */
export function Progress({
  className,
  value = null,
  max = 100,
  ...props
}: ProgressProps) {
  const percent =
    value === null || value === undefined
      ? undefined
      : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(className)}
      value={value}
      max={max}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        style={percent === undefined ? undefined : { inlineSize: percent + '%' }}
      />
    </ProgressPrimitive.Root>
  )
}
