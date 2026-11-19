'use client'

import type { StyleFamily } from '@ombelle/contracts'
import type { CSSProperties } from 'react'
import { useLanding } from './landing-state'

/** A switch drawn by the worn family. It is a real switch: Space and Enter toggle it. */
export function KitSwitch({ checked, onChange, label, labelledBy }: { checked: boolean; onChange: (checked: boolean) => void; label?: string; labelledBy?: string }) {
  return <button className="ol-sw" type="button" role="switch" aria-checked={checked} aria-label={label} aria-labelledby={labelledBy} onClick={() => onChange(!checked)} />
}

/** A single-choice row of pressed-state buttons drawn by the worn family. */
export function KitSegmented<T extends string>({ label, value, options, onChange, mono, style }: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  mono?: boolean
  style?: CSSProperties
}) {
  return (
    <div className="ol-seg" role="group" aria-label={label} style={style}>
      {options.map((option) => (
        <button key={option.value} className={mono ? 'ol-mono' : undefined} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** The looks a family offers: its palettes as swatches, or the glass presets as chips. */
export function LookPicker({ family, label }: { family: StyleFamily; label: string }) {
  const { look, setLook, lookOptions } = useLanding()
  const chosen = look[family] ?? 0
  const glass = family === 'liquid-glass'
  return (
    <div className="ol-pals" role="group" aria-label={label}>
      {lookOptions(family).map((option, index) => (
        <button
          key={option.name}
          className={glass ? 'ol-pal txt' : 'ol-pal'}
          type="button"
          // The default swatch carries the family itself, so it shows the family's own colours whatever palette is on.
          data-family={!glass && index === 0 ? family : undefined}
          style={option.swatch ? ({ '--bg': option.swatch.background, '--pri': option.swatch.mark } as CSSProperties) : undefined}
          aria-pressed={index === chosen}
          aria-label={glass ? `${option.name} preset` : `${option.name} palette`}
          onClick={() => setLook(family, index)}
        >
          {glass ? option.name : null}
        </button>
      ))}
    </div>
  )
}

/** The name of the look a family currently shows. */
export function useLookName(family: StyleFamily): string {
  const { look, lookOptions } = useLanding()
  return lookOptions(family)[look[family] ?? 0]?.name ?? 'Style default'
}
