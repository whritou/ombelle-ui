'use client'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'

export function Specimen() {
  return (
    <section aria-label="Empty State" data-component="empty">
      <h2>Empty State</h2>
      <Empty><EmptyHeader><EmptyMedia variant="icon" aria-hidden="true">+</EmptyMedia>
        <EmptyTitle asChild><h3>No presets yet</h3></EmptyTitle>
        <EmptyDescription>Start from a built-in family or import a preset file.</EmptyDescription></EmptyHeader>
        <EmptyContent><Button variant="outline">Import file</Button><Button>New preset</Button></EmptyContent></Empty>
    </section>
  )
}
