'use client'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Specimen() {
  return (
    <section aria-label="Scroll Area" data-component="scroll-area">
      <h2>Scroll Area</h2>
      <ScrollArea aria-label="Release notes" style={{ blockSize: '8rem', inlineSize: '16rem' }}>
        {Array.from({ length: 24 }, (_, index) => <p key={index}>Release note {index + 1}</p>)}
      </ScrollArea>
    </section>
  )
}
