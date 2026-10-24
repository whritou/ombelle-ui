'use client'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'

export function BadgeFixture() {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [attached, setAttached] = React.useState(false)
  React.useEffect(() => setAttached(ref.current instanceof HTMLSpanElement), [])
  return (
    <section
      data-testid="badge-fixture"
      data-ref-attached={String(attached)}
      aria-label="Badge examples"
      style={{
        width: 360,
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: 24,
        marginTop: 24,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'start',
        gap: 16,
        background: 'var(--card)',
      }}
    >
      <Badge
        ref={ref}
        className="consumer-badge"
        title="Synchronization status"
      >
        Synced
      </Badge>
      <Badge variant="destructive">Needs attention</Badge>
      <Badge>{'Label <script> & text'}</Badge>
      <Badge>
        Long descriptive status with an unbroken identifier:
        abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz
      </Badge>
    </section>
  )
}
