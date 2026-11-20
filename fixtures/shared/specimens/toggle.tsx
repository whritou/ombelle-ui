'use client'
import { Toggle } from '@/components/ui/toggle'

export function Specimen() {
  return (
    <section aria-label="Toggle" data-component="toggle">
      <h2>Toggle</h2>
      <div className="preset-row">
        <Toggle aria-label="Bold" defaultPressed><b aria-hidden="true">B</b></Toggle>
        <Toggle variant="outline" size="sm">Show grid</Toggle>
        <Toggle disabled>Disabled toggle</Toggle>
      </div>
    </section>
  )
}
