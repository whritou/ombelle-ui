# Label

Label names a form control. It keeps shadcn's `Label` name and `data-slot="label"` marker, but renders a native `label` rather than Radix Label, so it has no client boundary. It supports `flat`, `minimalist`, and `neo-brutalism` in light and dark modes. Liquid glass is unavailable for Label.

## Install and compose

Build the packages and initialize the target project with a local preset before using the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add label --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add label --cwd APP --yes
```

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProjectName() {
  return (
    <>
      <Label htmlFor="project-name">
        Project name <span aria-hidden="true">*</span>
      </Label>
      <Input id="project-name" required />
    </>
  )
}
```

| Export | Native element | Additional prop |
| --- | --- | --- |
| `Label` | `label` | — |

Props are `React.ComponentProps<'label'>`. Children, `htmlFor`, native attributes, event handlers, `className`, `style`, and React 19 refs are forwarded. The template spreads caller props first, then sets `data-slot="label"` and `className={cn(className)}`, so the slot marker that selects the reviewed styles cannot be overridden. Associate the label with `htmlFor` and the control's `id`, or wrap the control. Clicking an associated label focuses its control.

## Required indication

Label has no `required` prop. Indicate a requirement by composition: put an `aria-hidden="true"` marker such as `*` inside the label, and set `required` or `aria-required="true"` on the control itself.

The requirement belongs to the control. Assistive technology reads it from the control, so the hidden marker keeps it from being announced twice, and a Label prop could not make the control required. Explain the marker in the surrounding form, for example "Fields marked * are required", because the asterisk alone is a visual convention. Label does not derive a disabled appearance from its control; style the surrounding field yourself if your form needs that.

## Styles

Label is `inline-flex` with a `0.5rem` gap, `0.875rem` text, line height 1.25, the family font, and `--foreground`. Weight is 500 in flat and minimalist and 700 in neo-brutalism. The direct child `[aria-hidden="true"]` marker uses `--destructive`. Under forced colors the label and marker use `CanvasText`. Label introduces no animation or transition. Label uses the saved global preset; a later theme operation can change semantic tokens but does not rewrite the installed `label.css`.

## Generated files and ownership

Compilation emits `components/ui/label.tsx`, colocated `components/ui/label.css`, and `examples/label.tsx`, together with the existing shared utility and theme artifacts. The installer honors configured aliases and destination paths; the ordinary default usage destination is `src/ombelle-examples/label.tsx`. Importing the generated Label loads `./label.css`; retain that import if moving the component. The standard registry item includes the exact component, utility, and Label CSS bytes.

Label adds no dependency versions: it uses React 19.3.1, clsx 2.1.1, and tailwind-merge 3.7.0. Generated source has no Ombelle runtime dependency.

Adding Label beside existing components preserves their source, the shared utility, and saved project defaults. Manager selection and lockfile ownership stay intact. The Ombelle ownership lock gains records for the three Label artifacts and retains prior entries; TSX and CSS have independent ownership hashes. An identical repeat is a no-op, dry-run writes nothing, and edits to either file produce `FILE_CONFLICT` even with `--yes`. A project installed before the native form controls must first refresh its shared stylesheet; see [Migrating installs created before native form controls](../foundation-local-usage.md#migrating-installs-created-before-native-form-controls).

Add `&forms=1` to a light/dark preview URL to inspect the shared form fixture. See [form controls verification evidence](../evidence/form-controls.md) for measured coverage. This catalog slice does not establish full-catalog stability or certify consuming applications.
