'use client'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldControl, FieldDescription, FieldError, FieldLegend, FieldSet, Form, FormErrorSummary } from '@/components/ui/field'

export function Specimen() {
  return (
    <section aria-label="Field" data-component="field">
      <h2>Field</h2>
      <Field required><FieldLabel>Project name</FieldLabel><FieldControl><Input placeholder="acme-dashboard" /></FieldControl>
        <FieldDescription>Shown in the CLI and the editor header.</FieldDescription><FieldError>Use lower case letters and dashes only.</FieldError></Field>
      <Field invalid><FieldLabel>Package scope</FieldLabel><FieldControl><Input defaultValue="Acme UI" /></FieldControl>
        <FieldError>Use lower case letters and dashes only.</FieldError></Field>
      <Form aria-label="Save preset" summaryAction="saving" errors={{ name: 'A preset with this name already exists.', radius: 'Enter a number from 0 to 48.' }} data-component="field~form">
        <FormErrorSummary />
        <FieldSet>
          <FieldLegend>Save preset</FieldLegend>
          <Field name="name"><FieldLabel>Preset name</FieldLabel><FieldControl><Input defaultValue="Ombelle" /></FieldControl><FieldError /></Field>
          <Field name="radius"><FieldLabel>Radius</FieldLabel><FieldControl><Input type="number" defaultValue="60" /></FieldControl><FieldError /></Field>
        </FieldSet>
      </Form>
    </section>
  )
}
