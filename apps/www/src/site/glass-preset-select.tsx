'use client'

import { useId } from 'react'
import type { StartingPresetId } from '@ombelle/catalog'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../generated/ui/components/ui/combobox'
import { glassPresetId, glassPresetOptions } from './glass-presets'

const standard = 'standard'

export function GlassPresetSelect({ value, onChange, label = 'Glass preview preset', allowNone = false }: {
  value: StartingPresetId | undefined
  onChange: (id: StartingPresetId | undefined) => void
  label?: string
  allowNone?: boolean
}) {
  const options = glassPresetOptions(value)
  const id = useId()
  return (
    <div className="inline-flex flex-wrap items-center gap-2 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      <Combobox value={value ?? (allowNone ? standard : '')}
        onValueChange={(next) => onChange(next === standard ? undefined : glassPresetId(next))}>
        <ComboboxInput id={id} placeholder="Search presets" />
        <ComboboxContent>
          <ComboboxList>
            {allowNone && <ComboboxItem value={standard}>Standard preview</ComboboxItem>}
            {options.map((option) => <ComboboxItem key={option.value} value={option.value}>{option.label}</ComboboxItem>)}
          </ComboboxList>
          <ComboboxEmpty>No preset matches.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
