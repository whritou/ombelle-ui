'use client'
import * as React from 'react'
import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from './utils.js'
import './progress.css'

type Size = 'sm' | 'default' | 'lg'
type Tone = 'default' | 'success' | 'warning' | 'destructive'
type Format = (value: number, max: number) => string

/** The readout for a value: `format(clamped, max)`, or the rounded percentage; nothing while indeterminate. */
export function progressValueText(value: number | null | undefined, max: number, format?: Format): string | undefined {
  if (value === null || value === undefined) return undefined
  const clamped = Math.min(Math.max(value, 0), max)
  return format ? format(clamped, max) : `${Math.round((clamped / max) * 100)}%`
}

/** The ring's dash length out of 100 (its pathLength): the percentage, or a quarter while indeterminate. */
function ringDash(percent: number | undefined) {
  return `${percent === undefined ? 25 : Number(percent.toFixed(2))} 100`
}

const ProgressLabelId = React.createContext<string | undefined>(undefined)
const ProgressText = React.createContext<string | undefined>(undefined)

export type ProgressProps = Omit<
  React.ComponentProps<typeof ProgressPrimitive.Root>,
  'className' | 'value'
> & {
  className?: string
  value?: number | null
  size?: Size
  /** A status colour; pair it with status text in the label. */
  tone?: Tone
  /** `circle` draws a ring instead of the bar; its number shows only with a ProgressValue. */
  shape?: 'bar' | 'circle'
}

/**
 * A determinate bar when `value` is set, indeterminate when it is null or
 * omitted. Name it with ProgressLabel, aria-label or aria-labelledby. The root and
 * indicator carry data-state loading, complete or indeterminate, as in the
 * Radix edition, next to Base UI's own data-progressing, data-complete and
 * data-indeterminate attributes.
 */
export function Progress({
  className,
  value = null,
  max = 100,
  size,
  tone,
  shape,
  children,
  ...props
}: ProgressProps) {
  const labelId = React.useId() + '-label'
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
  const items = React.Children.toArray(children)
  const label = items.find(child => React.isValidElement(child) && child.type === ProgressLabel)
  const readout = items.find((child): child is React.ReactElement<ProgressValueProps> =>
    React.isValidElement(child) && child.type === ProgressValue)
  const text = progressValueText(value, max, readout?.props.format)
  const circle = shape === 'circle'
  const bar = (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-state={state}
      data-value={value ?? undefined}
      data-max={max}
      data-size={size === 'default' ? undefined : size}
      data-tone={tone === 'default' ? undefined : tone}
      data-shape={circle ? 'circle' : undefined}
      className={cn(className)}
      value={value}
      max={max}
      {...(label ? { 'aria-labelledby': labelId } : {})}
      {...(readout ? { 'aria-valuetext': text } : {})}
      {...props}
    >
      {circle ? (
        <>
          <svg data-slot="progress-ring" viewBox="0 0 64 64" aria-hidden="true">
            <circle data-slot="progress-ring-track" cx="32" cy="32" r="26" pathLength="100" />
            <circle data-slot="progress-ring-indicator" cx="32" cy="32" r="26" pathLength="100" strokeDasharray={ringDash(percent)} />
          </svg>
          {readout && <span data-slot="progress-ring-value" aria-hidden="true">{text}</span>}
        </>
      ) : (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          data-state={state}
          data-value={value ?? undefined}
          data-max={max}
          // Base UI sizes the indicator inline (height: inherit); clear it so the
          // stylesheet sizes it, as in the Radix edition.
          style={{ height: '', ...(percent === undefined ? {} : { inlineSize: percent + '%' }) }}
        />
      )}
    </ProgressPrimitive.Root>
  )
  // A ring carries its number inside, so only a label makes a field around it.
  if (circle ? !label : !label && !readout) return bar
  // The bar's own children are presentational, so the label and value sit beside it.
  return (
    <ProgressLabelId.Provider value={labelId}>
      <ProgressText.Provider value={text}>
        <div data-slot="progress-field" data-progress-shape={circle ? 'circle' : undefined}>
          <div data-slot="progress-header">{label}{circle ? null : readout}</div>
          {bar}
        </div>
      </ProgressText.Provider>
    </ProgressLabelId.Provider>
  )
}

/** The visible name of a Progress; it labels the bar. */
export function ProgressLabel({ className, ...props }: React.ComponentProps<'span'>) {
  return <span id={React.useContext(ProgressLabelId)} {...props} data-slot="progress-label" className={cn(className)} />
}

export type ProgressValueProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  /** Writes the readout and the bar's aria-valuetext; the default is the rounded percentage. */
  format?: Format
}

/** The visible readout of a Progress. Hidden from assistive technology: the bar's aria-valuetext carries it. */
export function ProgressValue({ className, format: _format, ...props }: ProgressValueProps) {
  return (
    <span aria-hidden="true" {...props} data-slot="progress-value" className={cn(className)}>
      {React.useContext(ProgressText)}
    </span>
  )
}
