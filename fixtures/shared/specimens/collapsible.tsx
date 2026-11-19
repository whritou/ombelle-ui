'use client'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export function Specimen() {
  return (
    <section aria-label="Collapsible" data-component="collapsible">
      <h2>Collapsible</h2>
      <div className="preset-stack">
        <Collapsible defaultOpen>
          <CollapsibleTrigger>Advanced</CollapsibleTrigger>
          <CollapsibleContent><p>Shadow offsets and blur.</p></CollapsibleContent>
        </Collapsible>
        <Collapsible>
          <CollapsibleTrigger>Closed by default</CollapsibleTrigger>
          <CollapsibleContent><p>Hidden until opened.</p></CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  )
}
