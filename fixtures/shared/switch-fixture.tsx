'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const row = { display: 'flex', alignItems: 'center', gap: 12 }

export function SwitchFixture() {
  const [result, setResult] = React.useState('Not submitted')
  const [direction, setDirection] = React.useState<'ltr' | 'rtl'>('ltr')
  return (
    <section
      data-testid="switch-fixture"
      aria-label="Switch examples"
      dir={direction}
      style={{ display: 'grid', gap: 24, marginTop: 24, maxWidth: 600 }}
    >
      <h2>Switch preferences</h2>
      <form
        aria-label="Switch preferences"
        style={{ display: 'grid', gap: 16 }}
        onSubmit={(event) => {
          event.preventDefault()
          setResult(JSON.stringify(Array.from(new FormData(event.currentTarget).entries())))
        }}
      >
        <div style={row}>
          <Switch id="switch-live" name="live" value="enabled" />
          <Label htmlFor="switch-live">Live previews</Label>
        </div>
        <div style={row}>
          <Switch id="switch-announcements" name="announcements" value="email" defaultChecked />
          <Label htmlFor="switch-announcements">Email announcements</Label>
        </div>
        <div style={row}>
          <Switch id="switch-locked" name="locked" disabled defaultChecked />
          <Label htmlFor="switch-locked">Locked setting</Label>
        </div>
        <div className="actions">
          <Button type="submit">Submit preferences</Button>
          <Button type="reset" variant="outline">Reset preferences</Button>
        </div>
        <output aria-label="Submitted preferences" data-testid="switch-form-result" style={{ overflowWrap: 'anywhere' }}>
          {result}
        </output>
      </form>
      <Button variant="outline" onClick={() => setDirection(direction === 'ltr' ? 'rtl' : 'ltr')}>
        Use {direction === 'ltr' ? 'right-to-left' : 'left-to-right'} layout
      </Button>
    </section>
  )
}
