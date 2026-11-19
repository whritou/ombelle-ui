'use client'
import { Button } from '@/components/ui/button'

export function Specimen() {
  return (
    <section aria-label="Actions" data-component="button">
      <h2>Actions</h2>
      <div className="preset-row">
        <Button data-testid="preset-button">Save changes</Button>
        <Button variant="secondary">Secondary action</Button>
        <Button disabled>Disabled</Button>
        <Button disabled aria-busy="true">
          Saving…
        </Button>
        <Button variant="link-destructive">Remove member</Button>
      </div>
    </section>
  )
}
