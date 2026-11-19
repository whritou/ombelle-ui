'use client'
import { Chip, ChipGroup, ChipRemove } from '@/components/ui/chip'

export function Specimen() {
  return (
    <section aria-label="Chip" data-component="chip">
      <h2>Chip</h2>
      <ChipGroup aria-label="Status filter"><Chip defaultPressed>On track</Chip><Chip defaultPressed={false}>Needs attention</Chip><Chip defaultPressed={false}>Shipped</Chip></ChipGroup>
      <div className="preset-variant"><Chip>glass<ChipRemove /></Chip></div>
    </section>
  )
}
