'use client'
import { InputGroup, InputGroupInput, InputGroupTextarea, InputGroupAddon, InputGroupText, InputGroupButton, InputGroupClear, InputGroupCount } from '@/components/ui/input-group'

export function Specimen() {
  return (
    <section aria-label="Input Group" data-component="input-group">
      <h2>Input Group</h2>
      <div className="preset-stack">
        <label htmlFor="preset-website">Website</label>
        <InputGroup>
          <InputGroupAddon><InputGroupText>https://</InputGroupText></InputGroupAddon>
          <InputGroupInput id="preset-website" placeholder="example.com" />
          <InputGroupAddon align="inline-end"><InputGroupButton>Check</InputGroupButton></InputGroupAddon>
        </InputGroup>
        <label htmlFor="preset-group-invalid">Project slug</label>
        <InputGroup><InputGroupInput id="preset-group-invalid" defaultValue="already-taken" aria-invalid="true" aria-describedby="preset-group-error" /></InputGroup>
        <p id="preset-group-error">Choose another slug.</p>
        <label htmlFor="preset-group-disabled">Managed domain</label>
        <InputGroup><InputGroupInput id="preset-group-disabled" defaultValue="acme.app" disabled /></InputGroup>
        <label htmlFor="preset-group-notes">Notes</label>
        <InputGroup><InputGroupTextarea id="preset-group-notes" placeholder="Add a note" aria-describedby="preset-group-count" /><InputGroupAddon align="block-end"><InputGroupText>Optional</InputGroupText><InputGroupCount id="preset-group-count" value={0} max={160} /></InputGroupAddon></InputGroup>
        <label htmlFor="preset-group-search">Search</label>
        <InputGroup><InputGroupInput id="preset-group-search" placeholder="Search" defaultValue="glass toast" /><InputGroupAddon align="inline-end"><InputGroupClear label="Clear search" /></InputGroupAddon></InputGroup>
      </div>
    </section>
  )
}
