'use client'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@/components/ui/button-group'

export function Specimen() {
  return (
    <section aria-label="Button Group" data-component="button-group">
      <h2>Button Group</h2>
      <div className="preset-row">
        <ButtonGroup aria-label="Alignment"><Button variant="outline">Left</Button><Button variant="outline">Center</Button><Button variant="outline">Right</Button></ButtonGroup>
        <ButtonGroup aria-label="Zoom"><ButtonGroupText>Zoom</ButtonGroupText><ButtonGroupSeparator /><Button variant="outline">100%</Button></ButtonGroup>
      </div>
    </section>
  )
}
