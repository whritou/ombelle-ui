# Native form controls and lucide adoption

Date: 25 October 2026. Design approved in conversation section by section; this written spec awaits review before an implementation plan is written.

## Intent

Add Label, Textarea, and Native Select as the next M2 catalog rows, with the same preview, compiler, registry, installer, and source-ownership guarantees as Badge and Card. Because Ombelle builds on shadcn, the three components keep shadcn's public names, `data-slot` markers, and composition. The slice also completes the form-control family: Input gains invalid styling in flat and neo-brutalism, and Dialog's close control adopts shadcn's `XIcon` through a new pinned `lucide-react` dependency.

The catalog is work in progress and has not been published. This slice deliberately changes existing `ui-style.css` and `dialog.tsx` bytes under catalog release `0.1.0` and documents how local installations migrate.

## Goals

- Provide `Label`, `Textarea`, `NativeSelect`, `NativeSelectOption`, and `NativeSelectOptGroup` with native prop and ref forwarding and no client boundary.
- Support flat, minimalist, and neo-brutalism in light and dark modes, with the matrix states from [Components, styles and accessibility](../../03-components-styles-accessibility.md): Label default and required indication; Textarea empty, filled, focus, invalid, disabled; Native Select default, selected, focus, invalid, disabled.
- Style the Input invalid state in every implemented family; today only minimalist styles `aria-invalid`.
- Replace Dialog's text close control with shadcn's icon close control while keeping its accessible name "Close".
- Add `lucide-react` as an exactly pinned runtime dependency, declared only by components that import it.
- Generate deterministic TSX, colocated CSS, and usage artifacts; include them in the standard registry and local CLI path.
- Document a migration route for local installations created before this change, and make the stale shared-stylesheet conflict name it.

## Non-goals

- Liquid glass, which the matrix marks unavailable for all three new components.
- Checkbox, Switch, Tabs, Tooltip, a custom Select, or a Field/FormItem composition component.
- A `required` prop on Label, or Label styling derived from an adjacent disabled control.
- An `update` command, automatic replacement of stale managed files during `add`, or a catalog release bump.
- Replacing text or icons in components other than Dialog's close control.
- Component-scoped presets, recipes, remote publishing, editor integration, or a claim that the twelve-component catalog is stable.

## Decisions

| Topic | Decision | Reason |
| --- | --- | --- |
| Input invalid state | Fix flat and neo-brutalism in this slice | All form controls show errors consistently; the catalog is unpublished |
| Release versioning | Change `0.1.0` bytes in place; intentionally update `style-baseline.json` | A release bump would touch presets, locks, and fixtures beyond this slice |
| Existing installs | Refresh through `theme add <saved preset>`; no automatic `add` replacement | Preserves the rule that managed files change only on an explicit update or preset request |
| Native Select markup | shadcn's wrapper, `select`, and `ChevronDownIcon` | Matches shadcn's DOM and API |
| Icon dependency | Add `lucide-react`; Dialog close also adopts `XIcon` | Aligns with shadcn; the user accepted the dependency |
| Label basis | Native `label`, shadcn name and slot, no Radix Label | Documented native basis; avoids a client boundary for double-click selection prevention |
| Required indication | Composition with an `aria-hidden` marker; the control carries `required` | Keeps shadcn's API; avoids a prop that does not make the control required |
| Style placement | Colocated CSS per new component; `ui-style.css` changes only for Input and Dialog | Follows Badge and Card ownership boundaries; future form-control changes do not rewrite shared bytes |

## Component contracts

Every new template spreads native props first, then sets `data-slot`, then `className={cn(className)}`, as Badge and Card do. Each imports its colocated stylesheet. None declares `'use client'`.

### Label

```tsx
export function Label({ className, ...props }: React.ComponentProps<'label'>)
// <label {...props} data-slot="label" className={cn(className)} />
```

Required indication is composition: `<Label htmlFor="email">Email <span aria-hidden="true">*</span></Label>` paired with `required` or `aria-required` on the control. Assistive technology receives the requirement from the control, so it is not announced twice.

### Textarea

```tsx
export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>)
// <textarea {...props} data-slot="textarea" className={cn(className)} />
```

### Native Select

```tsx
export type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  size?: 'sm' | 'default'
}
export function NativeSelect({ className, size = 'default', ...props }: NativeSelectProps)
// <div data-slot="native-select-wrapper">
//   <select {...props} data-slot="native-select" data-size={size} className={cn(className)} />
//   <ChevronDownIcon data-slot="native-select-icon" aria-hidden="true" />
// </div>
export function NativeSelectOption(props: React.ComponentProps<'option'>)
// data-slot="native-select-option"
export function NativeSelectOptGroup(props: React.ComponentProps<'optgroup'>)
// data-slot="native-select-optgroup"
```

Native props, `ref`, and `className` reach the `select`. The wrapper accepts no props. `size` replaces the native list-box `size` attribute, as in shadcn.

### Dialog close control

`DialogContent` renders its close control as `<XIcon aria-hidden="true" /><span className="sr-only">Close</span>` inside the existing `DialogPrimitive.Close`. It stays the last element of the content, preserving focus order, and keeps the accessible name "Close". `sr-only` is a Tailwind utility, like the `fixed` and `inset-0` utilities Dialog already uses.

### Input

`input.tsx` is unchanged. Only its rules in `ui-style.css` change.

### Dependencies and usage

| Component | Runtime dependencies |
| --- | --- |
| Label, Textarea | `react`, `clsx`, `tailwind-merge` |
| Native Select | `react`, `clsx`, `tailwind-merge`, `lucide-react` |
| Dialog | Existing dependencies plus `lucide-react` |

`lucide-react` is pinned to the newest exact release at least two weeks old when the implementation plan is written. Version 1.61.0, published 21 October 2026, is too recent. Its ISC license and its React 19 peer range must be recorded.

The compiler emits `examples/label.tsx`, `examples/textarea.tsx`, and `examples/native-select.tsx`. Each labels its control with `htmlFor` and `id`. The Textarea and Native Select examples also show an invalid control with `aria-invalid` and an error linked by `aria-describedby`.

## Styling

All rules use existing semantic tokens. Each new component has flat, minimalist, and neo-brutalism CSS. The shared `[data-slot]` reduced-motion rule already applies. Every file includes a forced-colors block in which no state relies on color alone.

### Textarea

- Uses each family's Input treatment: border token (`--border` in flat and neo-brutalism, `--input` in minimalist), radius, padding, font, background, and focus ring (`3px solid var(--ring)`, offset 3px). Neo-brutalism adds Input's offset shadow.
- Grows with content through `field-sizing: content`, falling back to `rows` where unsupported. Minimum height is `calc(var(--control-height) * 2)`, resize is vertical only, and width is `100%`.
- Placeholder uses `--muted-foreground`.
- Invalid (`[aria-invalid="true"]`) uses a `--destructive` border of `max(var(--border-width), 2px)`; under forced colors the border becomes `double`.
- Disabled uses opacity 0.5 and `cursor: not-allowed`.

### Native Select

- The wrapper is `position: relative; width: 100%; min-width: 0`. That is full width like Input, rather than shadcn's `w-fit`, because consumers cannot style the wrapper.
- The `select` uses `appearance: none` and Textarea's border, focus, invalid, and shadow treatment, with inline-end padding that clears the icon.
- The icon is 1rem, absolutely positioned at `inset-inline-end: 1rem` and vertically centred, with `pointer-events: none` and `--muted-foreground`. The SVG uses `currentColor`, so it follows system colors under forced colors.
- `data-size="sm"` matches Button's small size: `min-height: 2rem`, padding `0.25rem 0.75rem`.
- Disabled uses `[data-slot="native-select-wrapper"]:has(select:disabled)` to dim the select and the icon together.
- The option popup remains browser-rendered and follows the page's existing `color-scheme`.

### Label

- `inline-flex`, gap 0.5rem, 0.875rem text, the family font, and `--foreground`.
- Weight is 500, or 700 in neo-brutalism.
- The required marker `[data-slot="label"] > [aria-hidden="true"]` uses `--destructive`, and tests check its contrast.

### Shared `ui-style.css` changes

1. Flat and neo-brutalism add the minimalist Input invalid rule (`--destructive` border, 2px minimum) and a forced-colors `double` invalid border. Minimalist's invalid rule is unchanged.
2. All three families restyle `dialog-close` as a top-corner icon control:
   - Position is absolute at `inset-block-start` and `inset-inline-end` 0.75rem, so it mirrors in right-to-left layouts.
   - Size is a minimum of `var(--control-height)` in both dimensions (at least 24 CSS pixels), with inline padding. A legacy text "Close" control therefore still fits.
   - The old `margin-top` is removed, and the `XIcon` is 1rem.
   - Flat and minimalist use a transparent background and border, with `--accent` on hover. Neo-brutalism keeps its border, secondary fill, and offset shadow.
   - `dialog-content` reserves inline-end padding so the title cannot run under the control.
   - The focus ring is unchanged.

## Catalog, CLI, and migration

### Catalog and contracts

- `supportedComponentIds` adds `label`, `native-select`, and `textarea`. CLI and registry item names match shadcn (`add native-select`).
- `runtimeDependencies` adds the pinned `lucide-react`.
- The hardcoded dependency and slot conditions in `packages/catalog/src/index.ts` become per-component lookups. Native Select and Dialog declare `lucide-react`. Native Select's slots are wrapper, select, icon, option, and optgroup.
- `scripts/sync-catalog.mjs` loads the three new component style folders through the mechanism Badge and Card use. `packages/catalog/src/generated.ts` changes only through `pnpm build:packages`.
- The catalog release remains `0.1.0`. `packages/compiler/test/fixtures/style-baseline.json` is updated intentionally, with the reason stated, for each family's `ui-style.css` and for `dialog.tsx`. Tests prove that Button, Badge, Card, and Input TSX, their colocated CSS, the utility, and Button component-scoped preset and recipe artifacts keep their bytes.

### Installation and dependencies

- The generic `planAdd` path already plans colocated CSS, ownership hashes, and missing dependencies, and installs dependencies with lifecycle scripts disabled. No component-specific installer logic is added.
- Registry items for the new components and Dialog list `lucide-react@<pin>`. Every registry item embeds `ui-style.css`, so every item's bytes change.

### Migration of earlier local installations

1. **Stale shared stylesheet.** A project initialized before this change receives `FILE_CONFLICT` on `ui-style.css` at its next `add` of any component. When the installed file's hash matches its lock record but differs from the catalog output, the conflict's suggested action names `theme add <saved preset file>`. That command already replaces an unedited, hash-matched stylesheet while leaving tokens unchanged. An edited stylesheet still conflicts and requires manual reconciliation.
2. **Dialog close control.** An existing Dialog keeps its text control; `add dialog` reports a conflict. To migrate, delete `dialog.tsx` and run `add dialog`. A missing file plans as a create, so the lock entry needs no manual edit.
3. **Mixed state.** A refreshed stylesheet with a legacy `dialog.tsx` renders the text "Close" as a small corner control, because the new rules set minimum rather than fixed dimensions.

### Fixtures and consumers

- `fixtures/vite` and `fixtures/next` pin `lucide-react`.
- Node and Bun consumer preparation installs the three new components after the existing ones. The suite stays at 34 consumers. The npm, pnpm, Yarn Classic, modern Yarn (node-modules and Plug'n'Play), and Bun text and binary lockfile ownership checks are unchanged. Plug'n'Play confirms `lucide-react` resolution.

## Testing

### Unit

- Catalog: the new IDs, templates, three family styles each, per-component dependencies (`lucide-react` only for Native Select and Dialog), and Native Select slots.
- Compiler: a test file per new component, plus Dialog and Input updates:
  - exact paths and the CSS import;
  - determinism for duplicate and reordered IDs;
  - the intentional baseline delta;
  - unchanged bytes for every other existing artifact.
- Registry: new item TSX and CSS bytes, and the pinned `lucide-react` dependency.

### Integration (built CLI, Vite and Next.js)

- For each new component: no-write dry-run, apply, repeat no-op, custom alias, and `FILE_CONFLICT` for TSX or CSS edits even with `--yes`.
- `lucide-react` appears in the dependency plan, and manager and lockfile ownership are preserved.
- Migration:
  1. an old-bytes project's `add textarea` conflicts with a suggestion naming `theme add`;
  2. `theme add ./ui-preset.json` refreshes the stylesheet;
  3. `add textarea` then succeeds;
  4. an edited stylesheet still conflicts;
  5. deleting `dialog.tsx` and running `add dialog` installs the icon version.

### Browser

- A shared `fixtures/shared/forms-fixture.tsx`, gated by `?forms=1`, renders:
  - a labelled form with a required marker;
  - Textarea empty, filled, invalid, and disabled;
  - Native Select default and `sm`, invalid, disabled, and with an optgroup.
- It runs across 30 cases: three families × light/dark × preview, pnpm Vite, pnpm Next.js, npm Vite, and npm Next.js.
- Each case verifies:
  - DOM, source, and computed-style parity between preview and installed source;
  - Textarea and Native Select border, radius, focus ring, and invalid treatment against Input in the same family and mode;
  - a label click focuses its control, and Native Select changes value by keyboard;
  - the icon is `aria-hidden` and does not intercept pointer input;
  - forced colors;
  - 320 CSS pixel reflow;
  - required marker and error text contrast.
- Existing state coverage extends to Input invalid styling in flat and neo-brutalism.
- Dialog coverage adds:
  - the icon is present and the accessible name is "Close";
  - the target is at least 24 CSS pixels;
  - the title does not overlap the control at 320 CSS pixels;
  - focus return is unchanged.

### Documentation and evidence

- Add `docs/components/label.md`, `textarea.md`, and `native-select.md` following the Card document. The Native Select document records the shadcn mapping and the full-width wrapper difference.
- Record a full `pnpm check:foundation` run in `docs/evidence/form-controls.md` and `docs/evidence/form-controls-run.json`. Note the Windows `tsx` workaround if it is still required, and record the `lucide-react` version and license.
- Update the delivery plan with the new M2 rows.
- Update the component lists in `docs/03-components-styles-accessibility.md`, `docs/05-cli-specification.md`, and `docs/foundation-local-usage.md` to include the new components and Card, which they currently omit.
- Add the migration route to `docs/foundation-local-usage.md`.

## Acceptance

- Generated TSX matches the contracts above. Label, Textarea, and Native Select render native semantics with no client boundary.
- Compilation is deterministic for every family. Only `ui-style.css` per family and `dialog.tsx` change among existing artifacts, and the baseline update is intentional.
- Registry output contains the exact new component and CSS bytes and the pinned `lucide-react` dependency.
- CLI installation works across the declared consumer matrix and preserves the manager, lockfile, and unrelated project state. Dry-run, repeat no-op, and edit conflicts behave as for Card.
- The documented migration succeeds, and the stale-stylesheet conflict names `theme add`.
- Preview and installed fixtures agree in DOM and computed styling for all families, modes, and states listed above. Input invalid styling is distinguishable in every family, including forced colors.
- Dialog keeps its accessible name, focus behavior, and an unobstructed title, with an icon close control of at least 24 CSS pixels.
- Documentation covers composition, native props, required indication, sizes, family behavior, generated files, installation, ownership, migration, the shadcn mapping, and the glass exclusion. Evidence states measured results without claiming application-level accessibility certification or manual assistive-technology review.

## Builder decisions

The implementation plan may settle exact padding and inline-end values for the Native Select icon and Dialog content, label line height, fixture sample text, the precise wording of the stale-stylesheet suggestion, test-file placement, and how many tasks the work is divided into, provided the contracts and safeguards above hold.
