'use client'

import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './editor-shell.module.css'

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
  onChange(value: string): void
  onReset(): void
}) {
  // A half-typed or invalid value parks the thumb at the minimum, not the browser's midpoint.
  // Only the HTML valid-floating-point grammar counts: '1.', '+5' and ' 5' would snap to the midpoint.
  const thumb = /^-?(d+(.d+)?|.d+)([eE][-+]?d+)?$/.test(value) ? value : String(min)
  const shared = {
    value,
    'aria-invalid': invalid ? (true as const) : undefined,
    'aria-describedby': describedBy,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  }
  return (
    <div className={styles.sliderRow} data-row="slider" data-edited={edited ? 'true' : undefined}>
      <label htmlFor={`${id}-number`} className={styles.sliderLabel}>
        {label}
      </label>
      <span className={styles.sliderNumber}>
        {/* Text, not type="number": a half-typed or invalid value stays visible and is reported, not discarded. */}
        <input id={`${id}-number`} type="text" inputMode="decimal" maxLength={80} {...shared} />
        <span aria-hidden="true">{unit}</span>
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
      <input
        id={id}
        type="range"
        className={styles.sliderRange}
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        {...shared}
        value={thumb}
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
    <div role="group" aria-label={label} className={styles.segmented}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}
