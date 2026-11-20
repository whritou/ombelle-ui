'use client'
import { Badge, BadgeDot } from '@/components/ui/badge'

export function Specimen() {
  return (
    <section aria-label="Status" data-component="badge">
      <h2>Status</h2>
      <div className="preset-row">
        <Badge>Up to date</Badge>
        <Badge variant="destructive">Needs attention</Badge>
      </div>
      <div className="preset-row preset-variant">
        <Badge size="sm"><BadgeDot />Active</Badge>
        <Badge><BadgeDot />Default</Badge>
      </div>
      <div className="preset-row preset-variant">
        <Badge appearance="soft" variant="success"><BadgeDot />Live</Badge>
        <Badge appearance="soft" variant="warning">Degraded</Badge>
        <Badge appearance="soft" variant="info">Info</Badge>
        <Badge appearance="outline" variant="destructive">Deprecated</Badge>
      </div>
    </section>
  )
}
