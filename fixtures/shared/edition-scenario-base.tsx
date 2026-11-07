import * as React from 'react'
import { Button } from '@/components/ui/button'

// Ported components rendered identically in both editions; the parity test
// compares computed styles of every [data-slot] element per section.
// Keep this file and its other-edition twin in sync, except for APIs that
// differ by edition (asChild in Radix, render in Base UI).
function Parity({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section data-parity={id} className="specimen">
      <button type="button" data-parity-start={id}>
        Start {id}
      </button>
      {children}
    </section>
  )
}

export default function EditionScenario() {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    const dark = new URLSearchParams(window.location.search).get('mode') === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    setReady(true)
  }, [])
  return (
    <main data-ready={String(ready)}>
      <Parity id="button">
        <div className="actions">
          <Button>Save</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add">+</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Saving</Button>
        </div>
      </Parity>
    </main>
  )
}
