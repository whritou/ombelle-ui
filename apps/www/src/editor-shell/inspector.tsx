'use client'

import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './editor-shell.module.css'
import { Slider } from '../generated/ui/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '../generated/ui/components/ui/toggle-group'
import { NumberInput } from '../generated/ui/components/ui/number-input'

export function InspectorSection({
  id,
  title,
  meta,
  children,
}: {
  id: string
  title: string
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 id={id}>{title}</h2>
        {meta ? <span className={styles.sectionMeta}>{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}

export function ControlRow({
  label,
  htmlFor,
  edited,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  edited?: boolean
  children: ReactNode
}) {
  return (
    <div className={styles.row} data-edited={edited ? 'true' : undefined}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}

// Only the HTML valid-floating-point grammar counts: '1.', '+5' and ' 5' are half-typed.
const decimal = /^-?(\d+(\.\d+)?|\.\d+)([eE][-+]?\d+)?$/

/**
 * Where the slider thumb sits for the text in the number field: the typed number, or for an empty
 * field the value in effect, kept within the bounds as a native range input does; a half-typed or
 * invalid value parks it at the minimum.
 */
export function sliderThumbValue(value: string, placeholder: string | undefined, min: number, max = Infinity): number {
  const clamp = (number: number) => Math.min(max, Math.max(min, number))
  if (decimal.test(value)) return clamp(Number(value))
  if (value === '' && placeholder !== undefined && decimal.test(placeholder)) return clamp(Number(placeholder))
  return min
}

/** A single-choice change handler that ignores the empty value both primitives send when the checked option is activated again. */
export function keepChoice<T extends string>(onChange: (value: T) => void): (value: string) => void {
  return (value) => {
    if (value) onChange(value as T)
  }
}

export function SliderRow({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  edited,
  invalid,
  describedBy,
  placeholder,
  onChange,
  onReset,
}: {
  id: string
  label: string
  value: string
  min: number
  max: number
  step: number
  unit: string
  edited: boolean
  invalid?: boolean
  describedBy?: string
  /** The value in effect while the field is empty, such as the preset's. */
  placeholder?: string
  onChange(value: string): void
  onReset(): void
}) {
  const shared = {
    'aria-invalid': invalid ? (true as const) : undefined,
    'aria-describedby': describedBy,
  }
  return (
    <div className={styles.sliderRow} data-row="slider" data-edited={edited ? 'true' : undefined}>
      <label htmlFor={`${id}-number`} className={styles.sliderLabel}>
        {label}
      </label>
      <span className={styles.sliderNumber}>
        {/* Text, not type="number": a half-typed or invalid value stays visible and is reported, not discarded. */}
        <NumberInput id={`${id}-number`} maxLength={80} placeholder={placeholder} min={min} max={max} step={step}
          unit={unit || undefined} text={value} {...shared}
          onValueChange={(_, details) => onChange(details.text)} />
      </span>
      {edited ? (
        <button
          type="button"
          className={styles.sliderReset}
          aria-label={`Reset ${label.toLowerCase()}`}
          onClick={onReset}
        >
          <RotateCcw aria-hidden="true" size={14} />
        </button>
      ) : null}
      <Slider
        id={id}
        className={styles.sliderRange}
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        {...shared}
        value={[sliderThumbValue(value, placeholder, min, max)]}
        onValueChange={([next]) => onChange(String(next))}
      />
    </div>
  )
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string; icon?: ReactNode }[]
  onChange(value: T): void
}) {
  return (
    <ToggleGroup type="single" variant="segmented" aria-label={label} value={value} onValueChange={keepChoice(onChange)}>
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.icon}
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
