import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarGroup, AvatarStatus } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

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
      <Parity id="separator">
        <Separator />
        <Separator decorative={false} />
        <Separator>or</Separator>
        <nav aria-label="Footer" className="actions">
          <a href="#docs">Docs</a>
          <Separator orientation="vertical" />
          <a href="#changelog">Changelog</a>
        </nav>
      </Parity>
      <Parity id="progress">
        <p id="install-label">Installing components</p>
        <Progress value={64} aria-labelledby="install-label" />
        <Progress value={100} aria-label="Installed" />
        <Progress value={0} aria-label="Queued" />
        <Progress aria-label="Checking contrast" />
      </Parity>
      <Parity id="avatar">
        <Avatar size="lg" variant="primary" role="img" aria-label="Ada Lovelace, online">
          <AvatarFallback>AL</AvatarFallback>
          <AvatarStatus />
        </Avatar>
        <Avatar size="sm" role="img" aria-label="Grace Hopper, offline">
          <AvatarFallback>GH</AvatarFallback>
          <AvatarStatus status="offline" />
        </Avatar>
        <AvatarGroup aria-label="Reviewers">
          <Avatar role="img" aria-label="Grace Hopper">
            <AvatarFallback>GH</AvatarFallback>
          </Avatar>
          <Avatar variant="secondary" role="img" aria-label="3 more reviewers">
            <AvatarFallback>+3</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      </Parity>
      <Parity id="switch">
        <label className="field">
          Notifications
          <Switch name="notifications" />
        </label>
        <label className="field">
          Sync
          <Switch defaultChecked name="sync" />
        </label>
        <label className="field">
          Locked off
          <Switch disabled name="locked-off" />
        </label>
        <label className="field">
          Locked on
          <Switch disabled defaultChecked name="locked-on" />
        </label>
      </Parity>
      <Parity id="checkbox">
        <label htmlFor="terms">Accept terms</label>
        <Checkbox id="terms" name="terms" value="accepted" required aria-invalid="true" aria-describedby="terms-error" />
        <p id="terms-error">Accept the terms to continue.</p>
        <label htmlFor="news">Newsletter</label>
        <Checkbox id="news" defaultChecked />
        <label htmlFor="selection">Select all items</label>
        <Checkbox id="selection" defaultChecked="indeterminate" />
        <label htmlFor="locked">Locked</label>
        <Checkbox id="locked" disabled defaultChecked />
      </Parity>
    </main>
  )
}
