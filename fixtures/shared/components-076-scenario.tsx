import * as React from 'react'
import { Checkbox, CheckboxGroup, CheckboxGroupParent, CheckboxOption } from '@/components/ui/checkbox'
import { PasswordField, PasswordFieldCapsLock, PasswordFieldControl, PasswordFieldInput, PasswordFieldStrength, PasswordFieldToggle, type PasswordCheck } from '@/components/ui/password-field'
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet, Form, FormErrorSummary, type FormErrors } from '@/components/ui/field'

// The 0.7.6 components in both editions (tests/e2e/components-076.spec.ts).
// scripts/generate-preview.ts copies this file next to each edition's scenario.
function SavePresetForm() {
  const [errors, setErrors] = React.useState<FormErrors | undefined>()
  const [saved, setSaved] = React.useState(0)
  return (
    <Form
      data-testid="c076-form"
      summaryAction="saving"
      errors={errors}
      onSubmit={event => {
        event.preventDefault()
        setSaved(count => count + 1)
      }}
    >
      <FormErrorSummary />
      <Field name="name" required>
        <FieldLabel>Preset name</FieldLabel>
        <FieldControl><input type="text" /></FieldControl>
        <FieldError />
      </Field>
      <Field name="radius">
        <FieldLabel>Radius</FieldLabel>
        <FieldControl><input type="number" min={0} max={48} /></FieldControl>
        <FieldError />
      </Field>
      <Field name="description">
        <FieldLabel>Description</FieldLabel>
        <FieldControl><input type="text" /></FieldControl>
        <FieldDescription>Shown in the preset list.</FieldDescription>
      </Field>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit">Save preset</button>
        <button type="button" onClick={() => setErrors({ name: 'A preset with this name already exists.', ghost: 'Unknown field error.' })}>Return server errors</button>
      </div>
      <p role="status">{saved ? `Saved ${saved}` : ''}</p>
    </Form>
  )
}

const passwordChecks: PasswordCheck[] = [
  { label: 'at least 12 characters', test: value => value.length >= 12 },
  { label: 'a number', test: value => /\d/.test(value) },
  { label: 'add a symbol', test: value => /[^A-Za-z0-9]/.test(value) },
]

function PasswordForm() {
  return (
    <form data-testid="c076-password" onSubmit={event => event.preventDefault()} style={{ display: 'grid', gap: '0.75rem' }}>
      <PasswordField>
        <label htmlFor="c076-new-password">Password</label>
        <PasswordFieldControl>
          <PasswordFieldInput id="c076-new-password" name="password" autoComplete="new-password" />
          <PasswordFieldToggle />
        </PasswordFieldControl>
        <PasswordFieldCapsLock />
        <PasswordFieldStrength checks={passwordChecks} />
      </PasswordField>
      <PasswordField>
        <label htmlFor="c076-confirm-password">Confirm password</label>
        <PasswordFieldControl>
          <PasswordFieldInput id="c076-confirm-password" name="confirm" autoComplete="new-password" />
          <PasswordFieldToggle />
        </PasswordFieldControl>
      </PasswordField>
      <button type="submit">Set password</button>
    </form>
  )
}

export function ComponentsScenario076() {
  const stack = { display: 'grid', gap: '1rem', maxInlineSize: '28rem' } as const
  return (
    <section aria-label="0.7.6 components" data-testid="components-076" style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={stack}>
        <SavePresetForm />
        <PasswordForm />
      </div>
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
