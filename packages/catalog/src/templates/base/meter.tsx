'use client'
import * as React from 'react'
import { Meter as MeterPrimitive } from '@base-ui/react/meter'
import { cn } from './utils.js'
import './meter.css'

type Tone = 'primary' | 'info' | 'success' | 'warning'
const MeterLabelId = React.createContext<string | undefined>(undefined)
const MeterReading = React.createContext({ now: 0, max: 0 })
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export type MeterProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  value?: number
  min?: number
  max: number
  /** Discrete mode: the number of cells, from 2 to 20. */
  segments?: number
  /** Discrete mode: filled cells past this fraction (0 to 1) use the warning colour. */
  warningAt?: number
  children?: React.ReactNode
}

/**
 * A measurement within a known range, such as a quota: a meter, not a task's
 * progress. Name it with MeterLabel, aria-label or aria-labelledby. With
 * MeterSegment children it draws labelled parts and its value is their sum.
 */
export function Meter({
  className,
  value = 0,
  min = 0,
  max,
  segments,
  warningAt,
  'aria-valuetext': valueText,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  children,
  ...props
}: MeterProps) {
  const labelId = React.useId() + '-label'
  const items = React.Children.toArray(children)
  const parts = items.filter((child): child is React.ReactElement<MeterSegmentProps> =>
    React.isValidElement(child) && child.type === MeterSegment)
  const legend = items.filter(child => React.isValidElement(child) && child.type === MeterLegend)
  const rest = items.filter(child => !parts.includes(child as never) && !legend.includes(child))
  const hasLabel = rest.some(child => React.isValidElement(child) && child.type === MeterLabel)
  const total = parts.length ? parts.reduce((sum, part) => sum + part.props.value, 0) : value
  const now = clamp(total, min, max)
  // A meter's children are presentational, so the label and legend sit beside Meter.Root, the role="meter" track.
  return (
    <MeterLabelId.Provider value={labelId}>
      <MeterReading.Provider value={{ now, max }}>
      <div {...props} data-slot="meter" data-mode={parts.length ? 'labelled' : segments ? 'discrete' : 'bar'} className={cn(className)}>
        {rest}
        <MeterPrimitive.Root
          value={now}
          min={min}
          max={max}
          aria-valuetext={valueText ?? `${now} of ${max}`}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy ?? (hasLabel ? labelId : undefined)}
          data-slot="meter-track"
          data-mode={parts.length ? 'labelled' : segments ? 'discrete' : 'bar'}
        >
          <MeterFill now={now} min={min} span={max - min || 1} segments={segments} warningAt={warningAt} parts={parts} />
        </MeterPrimitive.Root>
        {legend}
      </div>
      </MeterReading.Provider>
    </MeterLabelId.Provider>
  )
}

/** The cells or segments inside the track. */
function MeterFill({ now, min, span, segments, warningAt, parts }: {
  now: number; min: number; span: number; segments?: number; warningAt?: number
  parts: React.ReactElement<MeterSegmentProps>[]
}) {
  if (parts.length) {
    let used = 0
    const drawn = parts.map((part, index) => {
      const width = clamp((part.props.value / span) * 100, 0, 100 - used)
      used += width
      return React.cloneElement(part, { key: index, style: { ...part.props.style, inlineSize: `${width}%` } })
    })
    return <>{drawn}{used < 100 && <span data-slot="meter-segment" data-rest="" style={{ inlineSize: `${100 - used}%` }} />}</>
  }
  const count = segments ? clamp(Math.round(segments), 2, 20) : 0
  if (!count) return <span data-slot="meter-cell" data-state="filled" style={{ inlineSize: `${((now - min) / span) * 100}%` }} />
  // A cell lights once any part of it is reached.
  const lit = Math.ceil(((now - min) / span) * count)
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          data-slot="meter-cell"
          data-state={index < lit ? 'filled' : 'empty'}
          data-warning={index < lit && warningAt !== undefined && (index + 1) / count > warningAt ? '' : undefined}
        />
      ))}
    </>
  )
}

export function MeterLabel({ className, ...props }: React.ComponentProps<'span'>) {
  return <span id={React.useContext(MeterLabelId)} {...props} data-slot="meter-label" className={cn(className)} />
}

/** The reading shown beside the label, "128 / 200" unless you pass children. */
export function MeterValue({ className, children, ...props }: React.ComponentProps<'span'>) {
  const { now, max } = React.useContext(MeterReading)
  return (
    <span {...props} data-slot="meter-value" className={cn(className)}>
      {children ?? `${now} / ${max}`}
    </span>
  )
}

export type MeterSegmentProps = React.ComponentProps<'span'> & { value: number; tone?: Tone }

/** One labelled part of a Meter; name it in a MeterLegendItem with the same tone. */
export function MeterSegment({ className, value: _value, tone = 'primary', ...props }: MeterSegmentProps) {
  return <span {...props} data-slot="meter-segment" data-tone={tone} className={cn(className)} />
}

export function MeterLegend({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="meter-legend" className={cn(className)} />
}

export function MeterLegendItem({ className, tone = 'primary', children, ...props }: React.ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span {...props} data-slot="meter-legend-item" data-tone={tone} className={cn(className)}>
      <i aria-hidden="true" />
      {children}
    </span>
  )
}
