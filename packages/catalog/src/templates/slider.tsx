'use client'
import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from './utils.js'
import './slider.css'

export type SliderProps = Omit<React.ComponentProps<typeof SliderPrimitive.Root>, 'children'> & {
  /** One name per thumb, such as "Minimum price" and "Maximum price". */
  thumbLabels?: string[]
  /** The spoken value of a thumb, such as "12 pixels". */
  getValueText?(value: number, index: number): string
}

/**
 * A value, or a range with two thumbs, chosen along a track. Each thumb is a slider with its own
 * name: a single thumb takes the Slider's aria-label or aria-labelledby; give a range thumbLabels.
 * aria-describedby and aria-invalid reach every thumb.
 * Thumbs keep their order and do not pass each other.
 */
export function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  thumbLabels,
  getValueText,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: SliderProps) {
  const [own, setOwn] = React.useState<number[]>(defaultValue ?? [min])
  const values = value ?? own
  return (
    <SliderPrimitive.Root
      {...props}
      min={min}
      max={max}
      value={values}
      onValueChange={(next) => {
        if (value === undefined) setOwn(next)
        onValueChange?.(next)
      }}
      preserveThumbOrder
      data-slot="slider"
      className={cn(className)}
    >
      <SliderPrimitive.Track data-slot="slider-track">
        <SliderPrimitive.Range data-slot="slider-range" />
      </SliderPrimitive.Track>
      {values.map((thumbValue, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          aria-label={thumbLabels?.[index] ?? (values.length === 1 ? ariaLabel : undefined)}
          aria-labelledby={!thumbLabels?.[index] && values.length === 1 ? ariaLabelledBy : undefined}
          aria-valuetext={getValueText?.(thumbValue, index)}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export type SliderTicksProps = React.ComponentProps<'div'> & { values: number[]; min?: number; max?: number }

/** Labelled marks under a Slider, such as 0 25 50 75 100. Decorative: the thumbs carry the value. */
export function SliderTicks({ className, values, min = 0, max = 100, ...props }: SliderTicksProps) {
  const span = max - min || 1
  return (
    <div aria-hidden="true" {...props} data-slot="slider-ticks" className={cn(className)}>
      {values.map(value => (
        <span key={value} data-slot="slider-tick" style={{ insetInlineStart: `${((value - min) / span) * 100}%` }}>{value}</span>
      ))}
    </div>
  )
}
