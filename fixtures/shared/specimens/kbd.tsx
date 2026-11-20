'use client'
import { Kbd, KbdGroup } from '@/components/ui/kbd'

export function Specimen() {
  return (
    <section aria-label="Kbd" data-component="kbd">
      <h2>Kbd</h2><p>Search with <KbdGroup><Kbd>Ctrl</Kbd><Kbd>K</Kbd></KbdGroup></p>
    </section>
  )
}
