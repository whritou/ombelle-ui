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
  const shared = {
    min,
    max,
    step,
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
        <input id={`${id}-number`} type="number" {...shared} />
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
        {...shared}
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
