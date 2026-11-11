# Textarea

Textarea is a native multi-line text control. It keeps shadcn's `Textarea` name and `data-slot="textarea"` marker and has no client boundary. It supports `flat`, `minimalist`, `neo-brutalism`, and `ombelle` in light and dark modes. Liquid glass is experimental for Textarea; see [Liquid glass](#liquid-glass).

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

Textarea uses its family's Input treatment: border token (`--border` in flat, neo-brutalism and ombelle, `--input` in minimalist), radius, `0.5rem 1rem` padding, font, background, and foreground. Neo-brutalism and ombelle add Input's offset shadow; flat and minimalist have none. Width is 100%.

| State | Selector | Treatment |
| --- | --- | --- |
| Empty | `::placeholder` | Placeholder text in `--muted-foreground` |
| Filled | — | Grows with content through `field-sizing: content` where supported, otherwise follows `rows`. Minimum height is `calc(var(--control-height) * 2)`; resizing is vertical only |
| Focus | `:focus-visible` | `3px solid var(--ring)` outline at a 3px offset |
| Invalid | `[aria-invalid="true"]` | `--destructive` border at least 2px wide |
| Disabled | `:disabled` | Opacity 0.5 and `cursor: not-allowed` |

Under forced colors the control uses `Field`/`FieldText`, a system-color border, no shadow, and a `GrayText` placeholder. The invalid border becomes `double`, so the state does not rely on color. Minimalist also sets the focus outline to `Highlight`. The shared `[data-slot]` reduced-motion rule removes the background and border transitions. Textarea uses the saved global preset; a later theme operation can change semantic tokens but does not rewrite the installed `textarea.css`.

## Sizes (0.7.3)

These need CLI **0.7.3** or later, including in component recipes. Leaving a prop out renders what earlier releases render.

- **`size`**: `Input` and `Textarea` take `size="sm"` or `size="lg"`; `default`, or no size, keeps each family's size.
  - `sm` is 2rem high with 0.8125rem text, and `lg` is 3rem with 1rem text.
  - On `Input`, the prop replaces the HTML `size` attribute.
- **Character counter**: see `InputGroupCount` on the Input Group page. It also works on its own beside a Textarea.

## Generated files and ownership

Compilation emits `components/ui/textarea.tsx`, colocated `components/ui/textarea.css`, and `examples/textarea.tsx`, together with the existing shared utility and theme artifacts. The example labels each control with `htmlFor` and `id` and shows an invalid control whose error is linked by `aria-describedby`. The installer honors configured aliases and destination paths; the ordinary default usage destination is `src/ombelle-examples/textarea.tsx`. Importing the generated Textarea loads `./textarea.css`; retain that import if moving the component. The standard registry item includes the exact component, utility, and Textarea CSS bytes.

Textarea adds no dependency versions: it uses React 19.3.1, clsx 2.1.1, and tailwind-merge 3.7.0. Generated source has no Ombelle runtime dependency.

Adding Textarea beside existing components preserves their source, the shared utility, and saved project defaults. Manager selection and lockfile ownership stay intact. The Ombelle ownership lock gains records for the three Textarea artifacts and retains prior entries; TSX and CSS have independent ownership hashes. An identical repeat is a no-op, dry-run writes nothing, and edits to either file produce `FILE_CONFLICT` even with `--yes`. A project installed before the native form controls must first refresh its shared stylesheet; see [Migrating installs created before native form controls](../foundation-local-usage.md#migrating-installs-created-before-native-form-controls).

Add `&forms=1` to a light/dark preview URL to inspect the shared form fixture. See [form controls verification evidence](../evidence/form-controls.md) for measured coverage. This catalog slice does not establish full-catalog stability or certify consuming applications.

## Liquid glass

In liquid glass, Textarea is the Input field surface: `background` glass at 55% of the glass opacity under a 60% sheen, with the `input` border, a `foreground` value and a `mutedForeground` placeholder, both declared contrast pairs at that coverage. Focus adds the ring-coloured border and a 3px ring offset by 2px; `aria-invalid` gives a 2px `destructive` border; disabled is dashed at 50% opacity. Nested in glass, it drops its own blur and paints at the full nested opacity. It keeps `resize: vertical`, which the kit tile does not draw. Reduced transparency and missing backdrop filters paint `background` opaque; forced colours use `Field` and `FieldText`. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass form controls evidence](../evidence/glass-form-controls.md) for screenshots.
