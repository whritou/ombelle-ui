# Native Select

Native Select styles the browser's own `select` control. It follows shadcn's Native Select names, `data-slot` markers, and markup, and has no client boundary. It supports `flat`, `minimalist`, and `neo-brutalism` in light and dark modes. Liquid glass is unavailable for Native Select. A fully custom Select is a later component.

## Install and compose

Build the packages and initialize the target project with a local preset before using the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add native-select --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add native-select --cwd APP --yes
```

```tsx
import { Label } from '@/components/ui/label'
import {
  NativeSelect, NativeSelectOptGroup, NativeSelectOption,
} from '@/components/ui/native-select'

export function RegionField() {
  return (
    <>
      <Label htmlFor="region">Region</Label>
      <NativeSelect id="region" name="region" defaultValue="eu">
        <NativeSelectOptGroup label="Europe">
          <NativeSelectOption value="eu">European Union</NativeSelectOption>
          <NativeSelectOption value="uk">United Kingdom</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOption value="us">United States</NativeSelectOption>
      </NativeSelect>
    </>
  )
}
```

| Export | Renders | Additional prop |
| --- | --- | --- |
| `NativeSelect` / `NativeSelectProps` | `div` wrapper containing `select` and a chevron icon | `size?: 'sm' \| 'default'`, default `default` |
| `NativeSelectOption` | `option` | — |
| `NativeSelectOptGroup` | `optgroup` | — |

`NativeSelectProps` is `Omit<React.ComponentProps<'select'>, 'size'>` plus `size`. Native props, event handlers, `value`/`defaultValue`, `multiple`, `className`, `style`, and the React 19 `ref` all reach the `select`, so controlled and uncontrolled use work as for a native `select`. The wrapper accepts no props. `size` replaces the native list-box `size` attribute, as in shadcn: it selects the control height and is emitted as `data-size`. Option and optgroup forward their native props and set their own `data-slot`.

The rendered structure is:

```html
<div data-slot="native-select-wrapper">
  <select data-slot="native-select" data-size="default">…</select>
  <svg data-slot="native-select-icon" aria-hidden="true">…</svg>
</div>
```

The chevron is lucide-react's `ChevronDownIcon`. It is hidden from assistive technology and ignores pointer input, so clicks reach the `select`. Give every Native Select an accessible name, normally a [Label](label.md) with `htmlFor`. Associate error text with `aria-describedby`; the application decides when a value is invalid and sets `aria-invalid`. Keyboard behavior and the option popup are the browser's own; the popup is rendered by the browser and follows the page's `color-scheme`, so the catalog does not style it.

## Mapping from shadcn

| shadcn | Ombelle | Difference |
| --- | --- | --- |
| `NativeSelect`, `NativeSelectOption`, `NativeSelectOptGroup` | Same names | None |
| `native-select-wrapper`, `native-select`, `native-select-icon`, option and optgroup slots | Same slots | None |
| `size: 'sm' \| 'default'` replacing native `size` | Same | None |
| `ChevronDownIcon` from lucide-react | Same | None |
| Wrapper is `w-fit` | Wrapper is full width (`width: 100%; min-width: 0`) | Consumers cannot style the wrapper, so it matches Input's full-width layout instead. Constrain width with a surrounding layout element |
| Tailwind utility classes | Reviewed family CSS selected by `data-slot` | Styling comes from colocated `native-select.css` |

## States and styles

The `select` uses `appearance: none` and Textarea's treatment: border token (`--border` in flat and neo-brutalism, `--input` in minimalist), radius, `0.5rem 1rem` padding with inline-end padding of `2.5rem` that clears the icon, font, background, and foreground. Neo-brutalism adds the offset shadow; flat and minimalist have none. Minimum height is `var(--control-height)`.

| State | Selector | Treatment |
| --- | --- | --- |
| Default and selected | — | The selected option's text is shown; the chevron is 1rem, vertically centred at `inset-inline-end: 1rem` in `--muted-foreground`, so it mirrors in right-to-left layouts |
| Small | `[data-size="sm"]` | Matches Button's small size: minimum height `2rem`, block padding `0.25rem`, inline-start padding `0.75rem` |
| Focus | `:focus-visible` | `3px solid var(--ring)` outline at a 3px offset |
| Invalid | `[aria-invalid="true"]` | `--destructive` border at least 2px wide |
| Disabled | `[data-slot="native-select-wrapper"]:has(select:disabled)` | Opacity 0.5 dims the select and icon together, including a select disabled by a surrounding `fieldset`; the select uses `cursor: not-allowed` |
| Multiple | `[multiple]` | The chevron is hidden and the inline-end padding returns to `1rem` |

Under forced colors the select uses `Field`/`FieldText` with a system-color border and no shadow. The icon's SVG uses `currentColor` and becomes `ButtonText`. The invalid border becomes `double`, so the state does not rely on color. Minimalist also sets the focus outline to `Highlight`. The shared `[data-slot]` reduced-motion rule removes transitions. Native Select uses the saved global preset; a later theme operation can change semantic tokens but does not rewrite the installed `native-select.css`.

## Generated files and ownership

Compilation emits `components/ui/native-select.tsx`, colocated `components/ui/native-select.css`, and `examples/native-select.tsx`, together with the existing shared utility and theme artifacts. The example labels each control with `htmlFor` and `id` and shows a small, invalid select with error text linked by `aria-describedby`. The installer honors configured aliases and destination paths; the ordinary default usage destination is `src/ombelle-examples/native-select.tsx`. Importing the generated component loads `./native-select.css`; retain that import if moving it. The standard registry item includes the exact component, utility, and Native Select CSS bytes and lists `lucide-react@1.55.0`.

Native Select uses React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0, and `lucide-react` 1.55.0 (ISC license). `lucide-react` is pinned exactly and declared only by Native Select and Dialog. When it is missing from the project's `package.json`, the dry-run's dependency plan lists it and the apply step installs it with the project's own manager and lifecycle scripts disabled. Generated source has no Ombelle runtime dependency.

Adding Native Select beside existing components preserves their source, the shared utility, and saved project defaults. Manager selection and lockfile format stay intact. The Ombelle ownership lock gains records for the three Native Select artifacts and retains prior entries; TSX and CSS have independent ownership hashes. An identical repeat is a no-op, dry-run writes nothing, and edits to either file produce `FILE_CONFLICT` even with `--yes`. A project installed before the native form controls must first refresh its shared stylesheet; see [Migrating installs created before native form controls](../foundation-local-usage.md#migrating-installs-created-before-native-form-controls).

Add `&forms=1` to a light/dark preview URL to inspect the shared form fixture. See [form controls verification evidence](../evidence/form-controls.md) for measured coverage. This catalog slice does not establish full-catalog stability or certify consuming applications.
