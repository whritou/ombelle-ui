'use client'
import * as React from 'react'
import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { cn } from './utils.js'
import './slider.css'

export type SliderProps = Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'dir' | 'children'> & {
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
  /** A label and a SliderValue, shown in a header above the track. Without a SliderValue, ignored. */
  children?: React.ReactNode
}

const asList = (value: number | readonly number[]) => (Array.isArray(value) ? [...value] : [value as number])

/**
 * A value, or a range with two thumbs, chosen along a track, on Base UI Slider. Each thumb is a
 * native range input with its own name: a single thumb takes the Slider's aria-label or
 * aria-labelledby; give a range thumbLabels. aria-describedby reaches every thumb (Base UI thumbs take
 * no aria-invalid; inside a Base UI Field the field sets it). Thumbs do not pass each other.
 * With a SliderValue among its children, the Slider shows its value beside the other children
 * (such as a label) in a header above the track.
 */
export function Slider({ children, ...props }: SliderProps) {
  const parts = React.Children.toArray(children)
  const value = parts.find(isSliderValue)
  if (!value) return <SliderControl {...props} />
  return <SliderField {...props} valueElement={value} header={parts.filter(part => part !== value)} />
}

type SliderControlProps = Omit<SliderProps, 'children'> & { thumbIds?: string[] }

// Base UI generates the id of a thumb's range input; with a SliderValue, the input takes the id the
// readout's htmlFor names, so the pair is linked in server-rendered markup too.
const withInputId = (id: string) => (props: React.ComponentProps<'div'>) => {
  const inner = props.children as React.ReactElement<{ children?: React.ReactNode }>
  return (
    <div {...props}>
      {React.Children.map(inner.props.children, child =>
        React.isValidElement(child) && child.type === 'input' ? React.cloneElement(child as React.ReactElement<{ id?: string }>, { id }) : child)}
    </div>
  )
}

function SliderControl({
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
  thumbIds,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': _ariaInvalid,
  ...props
}: SliderControlProps) {
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
              aria-describedby={ariaDescribedBy}
              render={thumbIds?.[index] ? withInputId(thumbIds[index]) : undefined}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

// slider value
export type SliderValueProps = Omit<React.ComponentProps<'output'>, 'children'> & {
  /** The shown value of a thumb; the thumbs speak it too when the Slider has no getValueText. */
  format?(value: number, index: number): string
  /** A text field that sets the value on Enter or blur, for a single thumb. A range shows the readout. */
  editable?: boolean
}

/**
 * The Slider's value, beside its label: `12 px`, or `20 – 80` for a range. Place it inside a Slider;
 * outside one it renders nothing. With editable, a single thumb's value is a small text field:
 * Enter or blur moves the thumb to the typed value (clamped and stepped), Escape restores it.
 */
export function SliderValue(_props: SliderValueProps): React.ReactNode {
  return null
}

/** Clamps a value to [min, max] and rounds it to the nearest step from min, without floating error. */
export function stepValue(value: number, min: number, max: number, step: number) {
  const clamped = Math.min(max, Math.max(min, value))
  const stepped = step > 0 ? min + Math.round((clamped - min) / step) * step : clamped
  const decimals = Math.max(decimalCount(step), decimalCount(min))
  return Math.min(max, Math.max(min, Number(stepped.toFixed(decimals))))
}

function decimalCount(value: number) {
  const [, fraction = ''] = String(value).split('.')
  const exponent = /e-(\d+)$/.exec(String(value))
  return exponent ? Number(exponent[1]) + fraction.replace(/e.*$/, '').length : fraction.length
}

function isSliderValue(child: React.ReactNode): child is React.ReactElement<SliderValueProps> {
  return React.isValidElement(child) && child.type === SliderValue
}

function SliderField({
  valueElement,
  header,
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  getValueText,
  ...props
}: Omit<SliderControlProps, 'thumbIds'> & { valueElement: React.ReactElement<SliderValueProps>; header: React.ReactNode[] }) {
  const { format, editable, className: valueClassName, ...outputProps } = valueElement.props
  const [own, setOwn] = React.useState<number[]>(defaultValue ?? [min])
  const values = value ?? own
  const id = React.useId()
  const thumbIds = values.map((_, index) => `${id}-thumb-${index}`)
  const text = format ?? getValueText ?? String
  const change = (next: number[]) => {
    if (value === undefined) setOwn(next)
    onValueChange?.(next)
  }
  const field = editable && values.length === 1
  return (
    <div data-slot="slider-field" data-slider-editable={field ? '' : undefined}>
      <div data-slot="slider-header">
        {header}
        {field ? null : (
          <output {...outputProps} data-slot="slider-value" htmlFor={thumbIds.join(' ')} aria-live="off" className={cn(valueClassName)}>
            {values.length > 1 ? `${text(values[0]!, 0)} – ${text(values[1]!, 1)}` : text(values[0]!, 0)}
          </output>
        )}
      </div>
      <SliderControl
        {...props}
        value={values}
        onValueChange={change}
        onValueCommit={onValueCommit}
        min={min}
        max={max}
        step={step}
        getValueText={getValueText ?? format}
        thumbIds={thumbIds}
      />
      {field ? (
        <SliderValueInput
          value={values[0]!}
          min={min}
          max={max}
          step={step}
          disabled={props.disabled}
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          className={valueClassName}
          onCommit={(next) => {
            change([next])
            onValueCommit?.([next])
          }}
        />
      ) : null}
    </div>
  )
}

type SliderValueInputProps = {
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  onCommit(value: number): void
}

// A draft that follows the value while the field is not focused. Enter or blur commits a number,
// stepped and clamped; other text, or Escape, restores the value.
function SliderValueInput({ value, min, max, step, onCommit, className, ...props }: SliderValueInputProps) {
  const [draft, setDraft] = React.useState<string | null>(null)
  const commit = () => {
    const typed = (draft ?? '').trim()
    const parsed = typed === '' ? Number.NaN : Number(typed)
    if (!Number.isFinite(parsed)) return value
    const next = stepValue(parsed, min, max, step)
    if (next !== value) onCommit(next)
    return next
  }
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      data-slot="slider-value-input"
      className={cn(className)}
      value={draft ?? String(value)}
      onFocus={() => setDraft(String(value))}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={() => {
        commit()
        setDraft(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          setDraft(String(commit()))
        } else if (event.key === 'Escape' && draft !== null && draft !== String(value)) {
          event.preventDefault()
          setDraft(String(value))
        }
      }}
    />
  )
}
// end slider value

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
