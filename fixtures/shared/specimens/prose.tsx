'use client'
import { Prose, ProseLead } from '@/components/ui/prose'

export function Specimen() {
  return (
    <section aria-label="Prose" data-component="prose">
      <h2>Prose</h2>
      <Prose measure="narrow">
        <h3>Building an app shell</h3>
        <ProseLead>A sidebar, a header and a content area that reads well at any width.</ProseLead>
        <p>Add the <code>sidebar</code> component and read <a href="#install">the install guide</a>.</p>
        <ul><li>Collapses to icons</li><li>Opens as a sheet on phones</li></ul>
        <blockquote>Keep navigation where people expect it.</blockquote>
      </Prose>
    </section>
  )
}
