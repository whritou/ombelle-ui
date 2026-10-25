# Textarea

Textarea is a native multi-line text control. It keeps shadcn's `Textarea` name and `data-slot="textarea"` marker and has no client boundary. It supports `flat`, `minimalist`, and `neo-brutalism` in light and dark modes. Liquid glass is unavailable for Textarea.

## Install and compose

Build the packages and initialize the target project with a local preset before using the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add textarea --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add textarea --cwd APP --yes
```

```tsx
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function SummaryField() {
  return (
    <>
      <Label htmlFor="summary">Summary</Label>
      <Textarea id="summary" rows={4} aria-invalid="true" aria-describedby="summary-error" />
      <p id="summary-error">Enter a summary.</p>
    </>
  )
}
```

| Export | Native element | Additional prop |
| --- | --- | --- |
| `Textarea` | `textarea` | — |

Props are `React.ComponentProps<'textarea'>`. `value`/`defaultValue`, `rows`, `placeholder`, `required`, `disabled`, `name`, ARIA attributes, event handlers, `className`, `style`, and React 19 refs are forwarded, so both controlled and uncontrolled use work as for a native `textarea`. The template spreads caller props first, then sets `data-slot="textarea"` and `className={cn(className)}`. Give every Textarea an accessible name, normally a [Label](label.md) with `htmlFor`. Associate error text with `aria-describedby`; the application decides when a value is invalid and sets `aria-invalid`.

## States and styles

Textarea uses its family's Input treatment: border token (`--border` in flat and neo-brutalism, `--input` in minimalist), radius, `0.5rem 1rem` padding, font, background, and foreground. Neo-brutalism adds Input's offset shadow; flat and minimalist have none. Width is 100%.

| State | Selector | Treatment |
| --- | --- | --- |
| Empty | `::placeholder` | Placeholder text in `--muted-foreground` |
| Filled | — | Grows with content through `field-sizing: content` where supported, otherwise follows `rows`. Minimum height is `calc(var(--control-height) * 2)`; resizing is vertical only |
| Focus | `:focus-visible` | `3px solid var(--ring)` outline at a 3px offset |
| Invalid | `[aria-invalid="true"]` | `--destructive` border at least 2px wide |
| Disabled | `:disabled` | Opacity 0.5 and `cursor: not-allowed` |

Under forced colors the control uses `Field`/`FieldText`, a system-color border, no shadow, and a `GrayText` placeholder. The invalid border becomes `double`, so the state does not rely on color. Minimalist also sets the focus outline to `Highlight`. The shared `[data-slot]` reduced-motion rule removes the background and border transitions. Textarea uses the saved global preset; a later theme operation can change semantic tokens but does not rewrite the installed `textarea.css`.

## Generated files and ownership

Compilation emits `components/ui/textarea.tsx`, colocated `components/ui/textarea.css`, and `examples/textarea.tsx`, together with the existing shared utility and theme artifacts. The example labels each control with `htmlFor` and `id` and shows an invalid control whose error is linked by `aria-describedby`. The installer honors configured aliases and destination paths; the ordinary default usage destination is `src/ombelle-examples/textarea.tsx`. Importing the generated Textarea loads `./textarea.css`; retain that import if moving the component. The standard registry item includes the exact component, utility, and Textarea CSS bytes.

Textarea adds no dependency versions: it uses React 19.3.1, clsx 2.1.1, and tailwind-merge 3.7.0. Generated source has no Ombelle runtime dependency.

Adding Textarea beside existing components preserves their source, the shared utility, and saved project defaults. Manager selection and lockfile ownership stay intact. The Ombelle ownership lock gains records for the three Textarea artifacts and retains prior entries; TSX and CSS have independent ownership hashes. An identical repeat is a no-op, dry-run writes nothing, and edits to either file produce `FILE_CONFLICT` even with `--yes`. A project installed before the native form controls must first refresh its shared stylesheet; see [Migrating installs created before native form controls](../foundation-local-usage.md#migrating-installs-created-before-native-form-controls).

Add `&forms=1` to a light/dark preview URL to inspect the shared form fixture. See [form controls verification evidence](../evidence/form-controls.md) for measured coverage. This catalog slice does not establish full-catalog stability or certify consuming applications.
