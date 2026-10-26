'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const row = { display: 'flex', alignItems: 'center', gap: 12 }

export function CheckboxFixture() {
  const [result, setResult] = React.useState('Not submitted')
  const [direction, setDirection] = React.useState<'ltr' | 'rtl'>('ltr')
  return (
    <section
      data-testid="checkbox-fixture"
      aria-label="Checkbox examples"
      dir={direction}
      style={{ display: 'grid', gap: 24, marginTop: 24, maxWidth: 600 }}
    >
      <h2>Checkbox preferences</h2>
      <form
        aria-label="Checkbox preferences"
        style={{ display: 'grid', gap: 16 }}
        onSubmit={(event) => {
          event.preventDefault()
          setResult(JSON.stringify(Array.from(new FormData(event.currentTarget).entries())))
        }}
      >
        <div style={row}>
          <Checkbox id="checkbox-updates" name="updates" value="yes" />
          <Label htmlFor="checkbox-updates">Accept updates</Label>
        </div>
        <div style={row}>
          <Checkbox id="checkbox-teams" name="teams" value="all" defaultChecked="indeterminate" />
          <Label htmlFor="checkbox-teams">Review all teams</Label>
        </div>
        <div style={row}>
          <Checkbox id="checkbox-archived" name="archived" disabled defaultChecked />
          <Label htmlFor="checkbox-archived">Archived preference</Label>
        </div>
        <div style={row}>
          <Checkbox id="checkbox-approval" aria-invalid="true" aria-describedby="checkbox-approval-error" />
          <Label htmlFor="checkbox-approval">Required approval</Label>
        </div>
        <p id="checkbox-approval-error">Approval is needed before publishing.</p>
        <div className="actions">
          <Button type="submit">Submit preferences</Button>
          <Button type="reset" variant="outline">Reset preferences</Button>
        </div>
        <output aria-label="Submitted preferences" data-testid="checkbox-form-result" style={{ overflowWrap: 'anywhere' }}>
          {result}
        </output>
      </form>
      <Button variant="outline" onClick={() => setDirection(direction === 'ltr' ? 'rtl' : 'ltr')}>
        Use {direction === 'ltr' ? 'right-to-left' : 'left-to-right'} layout
      </Button>
    </section>
  )
}
