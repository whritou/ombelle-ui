'use client'
import * as React from 'react'
import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from './utils.js'
import './progress.css'

export type ProgressProps = Omit<
  React.ComponentProps<typeof ProgressPrimitive.Root>,
  'className' | 'value'
> & {
  className?: string
  value?: number | null
}

/**
 * A determinate bar when `value` is set, indeterminate when it is null or
 * omitted. Name it with aria-label or aria-labelledby. The root and
 * indicator carry data-state loading, complete or indeterminate, as in the
 * Radix edition, next to Base UI's own data-progressing, data-complete and
 * data-indeterminate attributes.
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
  const state =
    value === null || value === undefined
      ? 'indeterminate'
      : value >= max
        ? 'complete'
        : 'loading'
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-state={state}
      data-value={value ?? undefined}
      data-max={max}
      className={cn(className)}
      value={value}
      max={max}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        data-state={state}
        data-value={value ?? undefined}
        data-max={max}
        // Base UI sizes the indicator inline (height: inherit); clear it so the
        // stylesheet sizes it, as in the Radix edition.
        style={{ height: '', ...(percent === undefined ? {} : { inlineSize: percent + '%' }) }}
      />
    </ProgressPrimitive.Root>
  )
}
