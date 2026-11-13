import * as React from 'react'
import { Checkbox, CheckboxGroup, CheckboxGroupParent, CheckboxOption } from '@/components/ui/checkbox'
import { Field, FieldControl, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'

// The 0.7.6 components in both editions (tests/e2e/components-076.spec.ts).
// scripts/generate-preview.ts copies this file next to each edition's scenario.
export function ComponentsScenario076() {
  const stack = { display: 'grid', gap: '1rem', maxInlineSize: '28rem' } as const
  return (
    <section aria-label="0.7.6 components" data-testid="components-076" style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={stack} data-testid="c076-checkbox-group">
        <FieldSet>
          <FieldLegend>Overlays to install</FieldLegend>
          <CheckboxGroup defaultValue={['dialog', 'popover']}>
            <CheckboxGroupParent title="All overlays" />
            <CheckboxOption value="dialog" title="Dialog" />
            <CheckboxOption value="popover" title="Popover" disabled />
            <CheckboxOption value="sheet" title="Sheet" />
            <CheckboxOption value="tooltip" title="Tooltip" />
          </CheckboxGroup>
        </FieldSet>
        <FieldSet disabled data-testid="c076-editions">
          <FieldLegend>Editions · locked by the project</FieldLegend>
          <CheckboxOption title="Radix" defaultChecked />
          <CheckboxOption title="Base UI" />
          <Field>
            <FieldLabel>Project path</FieldLabel>
            <FieldControl><input type="text" defaultValue="apps/web" /></FieldControl>
          </Field>
        </FieldSet>
        <Checkbox aria-label="Unrelated" />
      </div>
    </section>
  )
}
