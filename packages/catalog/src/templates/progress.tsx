'use client'
import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
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

const ProgressLabelId = React.createContext<string | undefined>(undefined)
const ProgressText = React.createContext<string | undefined>(undefined)

export type ProgressProps = React.ComponentProps<
  typeof ProgressPrimitive.Root
> & {
  size?: Size
  /** A status colour; pair it with status text in the label. */
  tone?: Tone
}

/**
 * A determinate bar when `value` is set, indeterminate when it is null or
 * omitted. Name it with ProgressLabel, aria-label or aria-labelledby. Radix sets
 * data-state to loading, complete or indeterminate.
 */
export function Progress({
  className,
  value = null,
  max = 100,
  size,
  tone,
  children,
  ...props
}: ProgressProps) {
  const labelId = React.useId() + '-label'
  const percent =
    value === null || value === undefined
      ? undefined
      : Math.min(100, Math.max(0, (value / max) * 100))
  const items = React.Children.toArray(children)
  const label = items.find(child => React.isValidElement(child) && child.type === ProgressLabel)
  const readout = items.find((child): child is React.ReactElement<ProgressValueProps> =>
    React.isValidElement(child) && child.type === ProgressValue)
  const text = progressValueText(value, max, readout?.props.format)
  const bar = (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-size={size === 'default' ? undefined : size}
      data-tone={tone === 'default' ? undefined : tone}
      className={cn(className)}
      // Radix treats a value outside 0..max as indeterminate; clamp it, as the readout and Base UI do.
      value={value === null || value === undefined ? value : Math.min(Math.max(value, 0), max)}
      max={max}
      {...(label ? { 'aria-labelledby': labelId } : {})}
      {...(readout ? { 'aria-valuetext': text } : {})}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        style={percent === undefined ? undefined : { inlineSize: percent + '%' }}
      />
    </ProgressPrimitive.Root>
  )
  if (!label && !readout) return bar
  // The bar's own children are presentational, so the label and value sit beside it.
  return (
    <ProgressLabelId.Provider value={labelId}>
      <ProgressText.Provider value={text}>
        <div data-slot="progress-field">
          <div data-slot="progress-header">{label}{readout}</div>
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
