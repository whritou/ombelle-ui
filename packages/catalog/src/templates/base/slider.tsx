'use client'
import * as React from 'react'
import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { cn } from './utils.js'
import './slider.css'

export type SliderProps = Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'dir'> & {
  value?: number[]
  defaultValue?: number[]
  onValueChange?(value: number[]): void
  onValueCommit?(value: number[]): void
  min?: number
  max?: number
  step?: number
  orientation?: 'horizontal' | 'vertical'
  disabled?: boolean
  name?: string
  /** One name per thumb, such as "Minimum price" and "Maximum price". */
  thumbLabels?: string[]
  /** The spoken value of a thumb, such as "12 pixels". */
  getValueText?(value: number, index: number): string
}

const asList = (value: number | readonly number[]) => (Array.isArray(value) ? [...value] : [value as number])

/**
 * A value, or a range with two thumbs, chosen along a track, on Base UI Slider. Each thumb is a
 * native range input with its own name: a single thumb takes the Slider's aria-label or
 * aria-labelledby; give a range thumbLabels. Thumbs do not pass each other.
 */
export function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step,
  orientation = 'horizontal',
  disabled,
  name,
  thumbLabels,
  getValueText,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: SliderProps) {
  const [own, setOwn] = React.useState<number[]>(defaultValue ?? [min])
  const values = value ?? own
  return (
    <SliderPrimitive.Root
      {...props}
      value={values}
      min={min}
      max={max}
      step={step}
      orientation={orientation}
      disabled={disabled}
      name={name}
      thumbCollisionBehavior="none"
      onValueChange={(next) => {
        const list = asList(next)
        if (value === undefined) setOwn(list)
        onValueChange?.(list)
      }}
      onValueCommitted={(next) => onValueCommit?.(asList(next))}
      data-slot="slider"
      data-orientation={orientation}
      className={cn(className)}
    >
      <SliderPrimitive.Control>
        <SliderPrimitive.Track data-slot="slider-track">
          <SliderPrimitive.Indicator data-slot="slider-range" />
          {values.map((thumbValue, index) => (
            <SliderPrimitive.Thumb
              key={index}
              index={index}
              data-slot="slider-thumb"
              aria-label={thumbLabels?.[index] ?? (values.length === 1 ? ariaLabel : undefined)}
              aria-labelledby={!thumbLabels?.[index] && values.length === 1 ? ariaLabelledBy : undefined}
              aria-valuetext={getValueText?.(thumbValue, index)}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
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
