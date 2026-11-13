# Field

Field connects a label, a hint and an error to one control. The label names the control, the hint and error describe it, and the required, invalid and disabled states reach it. Field is a composition around the control you already use (Input, Textarea, Native Select). It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add field`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add field --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add field --cwd APP --yes
```

```tsx
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function ProjectName({ error }: { error?: string }) {
  return (
    <Field required invalid={Boolean(error)}>
      <FieldLabel>Project name</FieldLabel>
      <FieldControl>
        <Input name="name" />
      </FieldControl>
      <FieldDescription>Shown in the CLI and the editor header.</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
```

## API and accessibility

- `Field` takes `orientation` (`vertical` or `horizontal`), `required`, `invalid` and `disabled`, each mirrored as a `data-` attribute.
- `FieldControl` wraps exactly one control and passes it its `id`, `aria-describedby`, `aria-invalid`, `required` and `disabled`. `aria-describedby` lists any ids the control already had, then the hint, then the error while the field is invalid.
- `FieldLabel` points at that control and adds a decorative `*` when the field is required; assistive technology announces the control's own `required` state.
- `FieldError` renders only while the field is invalid, with a decorative alert icon.
- The Radix edition is a `div` with `role="group"`. It assigns ids during the server render, so the HTML is correct before hydration.
- The Base UI edition is built on `Field.Root`, `Field.Label`, `Field.Control`, `Field.Description` and `Field.Error` from `@base-ui/react/field`. Base UI links the hint after hydration. `FieldControl` moves the control's own `id` and `aria-describedby` onto `Field.Control`, so a control's own description is kept. One difference from the Radix edition: in Base UI the label points at the control's own `id` when it has one, while the Radix edition always replaces it with the field's id. `tests/e2e/display-components.spec.ts` checks both editions in a browser.

## Form and FieldSet (0.7.6)

`field.tsx` also exports `Form`, `FormErrorSummary`, `FieldSet` and `FieldLegend`. They ship in the Field component because a form has to hand each field its error: a project that installed Field before 0.7.6 gets them by adding Field again (`add field`), under the usual modified-file guard. They need CLI **0.7.6**.

```tsx
import { Field, FieldControl, FieldError, FieldLabel, FieldLegend, FieldSet, Form, FormErrorSummary } from '@/components/ui/field'

export function SavePreset({ errors }: { errors?: Record<string, string> }) {
  return (
    <Form summaryAction="saving" errors={errors} onSubmit={save}>
      <FormErrorSummary />
      <FieldSet>
        <FieldLegend>Preset</FieldLegend>
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
      </FieldSet>
      <button type="submit">Save preset</button>
    </Form>
  )
}
```

- **Before hydration** the form has no `novalidate`, so the browser validates. After hydration, a submit reads each named field's constraints (`required`, `min`, `max`, `pattern`, `type`), then calls `validate(values)`, which returns errors keyed by field name. A constraint message wins over the others. With errors, the submit is stopped and focus moves to the summary; without them, your `onSubmit` runs.
- **`errors`** holds the server's errors, keyed by field name, and they show at once. A new `errors` object shows them again. They do not stop the next submit: the server judges again.
- **A named `Field`** (`name`) receives its error and becomes invalid; `FieldError` with no children shows the message, and the control submits under that name. In the Base UI edition, `name` also sets the name the control submits with outside a Form, which is ordinary form behaviour.
- **A field's error clears** when its value changes. Nothing is reported before the first submit, except server errors.
- **`FormErrorSummary`** renders nothing until there are errors. Then it is a `role="region"` named by its title, "Fix 2 fields before submitting" (or "… before saving" with `summaryAction="saving"`), and takes focus after a failed submit. Each line reads "Radius: enter a number from 0 to 48" and is a link that moves focus to its field; an error for a name with no field is plain text.
- **`FieldSet`** names a group with `FieldLegend`; disabled, it disables every control inside. The Base UI edition uses `Fieldset` from `@base-ui/react/fieldset`.
- Both editions build Form on a native `form`. Base UI's `Form` always sets `noValidate` and stops the submit while any Base field is invalid, which would bypass the summary and the browser's validation before hydration.
- **Recipe:** `form` (`none` or `summary`), `fieldset` (`none`, `default` or `disabled`), and the content fields `legend` and up to four `fields`. A form or fieldset needs a legend.

## Recipe

The recipe editor sets the control (`input`, `textarea` or `native-select`), `required`, `invalid`, `disabled`, `orientation`, the label, hint, error and placeholder. A recipe compiles only its own component, so its preview uses a native control marked `data-field-input`, styled like each family's Input. Compilation emits `components/ui/field.tsx`, `components/ui/field.css` and `examples/field.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0, plus @base-ui/react 1.9.0 in the Base UI edition.

## Liquid glass

Liquid glass is experimental for Field, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [display components evidence](../evidence/display-components.md) for the board comparison and the specimen audit.
