'use client'
import { ColorPicker, ColorPickerPair } from '@/components/ui/color-picker'

export function Specimen() {
  return (
    <section aria-label="Color Picker" data-component="color-picker">
      <h2>Color Picker</h2>
      <ColorPickerPair label="Primary">
        <ColorPicker mode="light" defaultValue="oklch(0.55 0.22 6)" contrastWith="oklch(0.99 0 0)" contrastLabel="primary foreground"
          swatches={[{ label: 'Rose', value: 'oklch(0.55 0.22 6)' }, { label: 'Ink', value: 'oklch(0.22 0.012 275)' }]} />
        <ColorPicker mode="dark" defaultValue="oklch(0.7 0.18 6)" contrastWith="oklch(0.16 0.01 275)" contrastLabel="primary foreground" />
      </ColorPickerPair>
    </section>
  )
}
