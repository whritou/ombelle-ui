'use client'
import { HoverCard, HoverCardArrow, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

export function Specimen() {
  return (
    <section aria-label="Hover Card" data-component="hover-card">
      <h2>Hover Card</h2>
      <p>Built with <HoverCard><HoverCardTrigger href="#ombelle">@ombelle</HoverCardTrigger><HoverCardContent><strong>Ombelle UI</strong><p>Reviewed React components with deterministic presets.</p><HoverCardArrow /></HoverCardContent></HoverCard> presets.</p>
    </section>
  )
}
