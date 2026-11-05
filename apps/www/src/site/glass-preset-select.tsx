'use client'

import type { StartingPresetId } from '@ombelle/catalog'
import { glassPresetId, glassPresetOptions } from './glass-presets'

const options = glassPresetOptions()

export function GlassPresetSelect({ value, onChange, label = 'Glass preview preset', allowNone = false }: {
  value: StartingPresetId | undefined
  onChange: (id: StartingPresetId | undefined) => void
  label?: string
  allowNone?: boolean
}) {
  return (
    <label className="inline-flex flex-wrap items-center gap-2 text-sm font-medium">
      <span>{label}</span>
      <select
        className="min-h-9 rounded-md border border-border bg-background px-2 text-foreground"
        value={value ?? ''}
        onChange={(event) => onChange(glassPresetId(event.target.value))}
      >
        {allowNone && <option value="">Standard preview</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
