'use client'
import { Spinner } from '@/components/ui/spinner'

export function Specimen() {
  return (
    <section aria-label="Spinner" data-component="spinner">
      <h2>Spinner</h2><p><Spinner size="sm" /> <Spinner /> <Spinner size="lg" aria-label="Saving" /></p>
    </section>
  )
}
