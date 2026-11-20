'use client'
import { Combobox, ComboboxContent, ComboboxCreate, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'

export function Specimen() {
  return (
    <section aria-label="Combobox" data-component="combobox">
      <h2>Combobox</h2>
      <label id="gallery-preset">Preset</label>
      <Combobox defaultValue="ombelle">
        <ComboboxInput aria-labelledby="gallery-preset" placeholder="Search presets" />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="liquid-glass">Liquid glass</ComboboxItem>
            <ComboboxItem value="liquid-glass-givre">Liquid glass — Givre</ComboboxItem>
            <ComboboxItem value="ombelle">Ombelle</ComboboxItem>
            <ComboboxCreate />
          </ComboboxList>
          <ComboboxEmpty>No presets found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </section>
  )
}
