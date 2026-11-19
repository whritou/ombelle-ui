'use client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function Specimen() {
  return (
    <section aria-label="Sign-in options" data-component="separator">
      <h2>Sign-in options</h2>
      <div className="preset-stack">
        <Button variant="outline">Continue with SSO</Button>
        <Separator>or</Separator>
        <Button>Continue with email</Button>
        <Separator />
        <nav aria-label="Gallery links" className="preset-row preset-inline-nav">
          <a href="#docs">Docs</a>
          <Separator orientation="vertical" />
          <a href="#components">Components</a>
          <Separator orientation="vertical" />
          <a href="#changelog">Changelog</a>
        </nav>
      </div>
    </section>
  )
}
