# Field

Field connects a label, a hint and an error to one control. The label names the control, the hint and error describe it, and the required, invalid and disabled states reach it. Field is a composition around the control you already use (Input, Textarea, Native Select). It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later. Until 0.7.3 is published, install it from a built local checkout:

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
- The Base UI edition is built on `Field.Root`, `Field.Label`, `Field.Control`, `Field.Description` and `Field.Error` from `@base-ui/react/field`. Base UI links the hint after hydration. `tests/e2e/display-components.spec.ts` checks both editions in a browser.

## Recipe

The recipe editor sets the control (`input`, `textarea` or `native-select`), `required`, `invalid`, `disabled`, `orientation`, the label, hint, error and placeholder. A recipe compiles only its own component, so its preview uses a native control marked `data-field-input`, styled like each family's Input. Compilation emits `components/ui/field.tsx`, `components/ui/field.css` and `examples/field.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0, plus @base-ui/react 1.9.0 in the Base UI edition.

## Liquid glass

Liquid glass is experimental for Field, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [display components evidence](../evidence/display-components.md) for the board comparison and the specimen audit.
