'use client'
import { NumberInput } from '@/components/ui/number-input'

export function Specimen() {
  return (
    <section aria-label="Number Input" data-component="number-input">
      <h2>Number Input</h2>
      <div className="preset-stack">
        <label htmlFor="gallery-radius">Border radius</label>
        <NumberInput id="gallery-radius" defaultValue={12} min={0} max={32} unit="px" />
        <label htmlFor="gallery-duration">Motion duration</label>
        <NumberInput id="gallery-duration" defaultValue={160} min={0} max={1000} step={10} largeStep={100} unit="ms" />
      </div>
    </section>
  )
}
