# Display components: Spinner, Kbd, Empty State, Field, Meter, Stepper

Sub-project 2 of the 0.7.3 work. It adds six components that need no new
dependency, in the Radix and Base UI editions and all five style families,
with component-editor recipes, as the 0.7.2 batch did for Input Group, Sheet,
Alert Dialog, Breadcrumb, Pagination and Toast.

## Intent

The 0.7.3 design artifact
(https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, "0.7.3 new components"
boards) defines these six components and their look in each family. The
preview and the website already imitate several of them by hand: a custom
loading spinner, inline key captions, rebuilt label and hint markup, and
zero-data screens. Shipping them lets the catalog, the editors and consumers
use one reviewed version.

Decisions taken in brainstorming:

- **Scope:** every component ships with a recipe and a component editor
  entry, like the 0.7.2 batch.
- **Field:** a composition, not a props wrapper.
- **Delivery:** one batch on branch `feat/display-components-073`, stacked on
  `test/specimen-audit-harness` (PR #101), so the specimen audit covers the
  six components from the start.
- **Appearance:** the default look in each family is the one on that
  family's 0.7.3 board, checked side by side against audit page screenshots.

## 1. Components and public API

Names follow shadcn where an equivalent exists, per the catalog authoring
contract in `docs/03-components-styles-accessibility.md`. Every part forwards
native props, refs, `className` and `style`, and carries a `data-slot` named
after the part.

### Spinner

`Spinner({ size = 'default' })` renders an SVG arc.

- `size` is `sm`, `default` or `lg`.
- Accessibility: `role="status"`, with an accessible name that defaults to
  "Loading" and is overridable through `aria-label`. With `aria-hidden`
  (inside a Button whose own label speaks), it has no role.
- Motion: one turn every 0.9s. Under `prefers-reduced-motion: reduce` it
  turns once every 3s instead of stopping, so it still reads as busy.

### Kbd

- `Kbd` renders the native `kbd` element.
- `KbdGroup` lays out a key combination such as Ctrl K.
- Presentational, with no role.

### Empty State

Parts: `Empty`, `EmptyHeader`, `EmptyMedia` (`variant` `default` or `icon`),
`EmptyTitle`, `EmptyDescription`, `EmptyContent`.

- `EmptyTitle` renders a `div` so the application chooses the heading level
  with `asChild` (Radix) or `render` (Base UI).
- Actions are ordinary Buttons placed in `EmptyContent`.

### Field

Parts:

- `Field`, with props `orientation` (`vertical` or `horizontal`), `invalid`,
  `required` and `disabled`.
- `FieldLabel`, `FieldControl`, `FieldDescription` and `FieldError`.

Wiring:

- `Field` provides generated ids through context.
- `FieldLabel` is a `label` bound to the control's id.
- `FieldControl` passes `id`, `aria-describedby` (description, then error
  when shown), `aria-invalid` and `required` to the single control it wraps:
  Input, Textarea, Native Select, the Select trigger, Checkbox or any native
  control.
- `FieldError` renders only while `invalid` is true.
- The required mark is decorative (`aria-hidden`); `required` on the control
  carries the meaning.

Editions:

- **Radix:** `FieldControl` uses `@radix-ui/react-slot`, which the catalog
  already depends on.
- **Base UI:** the parts use Base UI's `Field` primitives (`Field.Root`,
  `Field.Label`, `Field.Control`, `Field.Description`, `Field.Error`) and
  their render composition.

### Meter (Segmented progress)

`Meter({ value, min = 0, max, segments, warningAt })` uses `role="meter"`,
with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-valuetext`
defaulting to "<value> of <max>". It is named through `aria-label`,
`aria-labelledby` or a `MeterLabel` part.

It has two modes:

- **Discrete:** `segments` (2 to 20) draws that many cells. Filled cells use
  `primary`; filled cells past the fraction `warningAt` (0 to 1) use
  `warning`.
- **Labelled:** `MeterSegment` children (`value`, `tone` `primary`, `info`,
  `success` or `warning`) are drawn as separate pills, with the remainder in
  `muted`. A `MeterLegend` with `MeterLegendItem` parts names each segment.
  The root's value is the sum of its segments, and `segments` and
  `warningAt` do not apply: each segment sets its own `tone`.

Editions:

- **Base UI:** the root uses Base UI's `Meter` primitive.
- **Radix:** Radix has no meter, so the root is a `div` with the same ARIA.

### Stepper

Parts:

- `Stepper`: a `nav` with `aria-label`, holding an `ol`; `orientation` is
  `horizontal` or `vertical`.
- `StepperItem`: `li`, with `status` `complete`, `current` or `upcoming`.
- `StepperIndicator`, `StepperTitle`, `StepperDescription`,
  `StepperSeparator`.

Accessibility:

- The current item carries `aria-current="step"`.
- A complete item includes visually hidden text "Completed: ".
- The indicator shows a check for complete items and the step number
  otherwise. Separators are `aria-hidden`.

It is a status display: it does not route or take focus.

## 2. Default appearance per family

The source is the six sections of each family's "0.7.3 new components" board.
The catalog CSS ports their rules and maps board variables to catalog tokens:

| Board variable | Catalog token |
| --- | --- |
| `--pri` | `primary` |
| `--line` | `input` |
| `--bd` | `border` |
| `--mut` | `muted` |
| `--acc` | `accent` |
| `--sec` | `secondary` |
| `--des` | `destructive` |
| `--rl` | the family's large radius |
| `--bw` | the family's border width |
| `--shc`, `--shd` | the family's shadows |

### Shared across families

- **Field**
  - A column with a 6px gap.
  - The label is bold, 14px.
  - The required mark uses `destructive`.
  - The hint is 12px in `muted-foreground`.
  - The error is 12px semibold in `destructive`, with its icon.
  - Field never restyles the control: Input, Select and the others keep their
    own family styles, including focus.
- **Kbd:** keys in a group with a 3px gap.
- **Spinner:** an inline-block SVG arc.
- **Empty State**
  - A centred column on `muted`, with a dashed `input` border and 36px by
    24px padding.
  - A 64px icon tile on `accent`, with a 6px gap below.
  - A 20px extra-bold title.
  - A 14px `muted-foreground` description, at most 380px wide.
  - Actions 8px below.
- **Stepper, horizontal**
  - Indicators are 32px circles: a border in `input` on `card`, with a 13px
    bold number.
  - Connectors use `border`, turning `primary` once reached.
  - Complete: filled `primary`, `primary-foreground` check.
  - Current: `primary` border on `card`, plus a 3px halo of `primary` at 25%.
  - Upcoming: `muted-foreground` text.
  - Descriptions: 12px `muted-foreground`.
- **Stepper, vertical:** a 32px indicator column beside the title and
  description, with a vertical connector.
- **Meter, discrete:** cells 12px high, as pills, with 4px gaps. Empty cells
  are `muted` with a `border` edge.
- **Meter, labelled**
  - Separate pills 14px high, 3px apart, with an `input` edge.
  - Segments in `primary`, `info` and `success`; the remainder is `muted`.
  - The legend uses 10px swatches with a 3px radius and 12px
    `muted-foreground` text.

### What each family changes

| Family | Field label | Empty State | Other |
| --- | --- | --- | --- |
| Ombelle | Bold, 14px | 20px radius; icon tile on `accent` with a 3px offset ink shadow | |
| Flat | Bold, 14px | 12px radius; icon tile on `secondary`, no shadow | 0px borders |
| Minimalist | 13px, weight 500 | Transparent background with an `input` dashed border; title weight 600; transparent, unshadowed icon tile | 4px radius |
| Neo-brutalism | 12px, weight 800, uppercase, 0.05em tracking | 2.5px dashed border on `card`; icon tile on `primary` | Error text in the darker destructive ink; 3px and 4px hard offset shadows |
| Liquid glass | Bold, 14px | Icon tile on translucent `accent` | Stepper indicators and Meter segments frosted with `blur(14px) saturate(1.4)`; focus is the 2px ink ring; opaque, reduced-transparency and forced-colors fallbacks as for every glass surface |

The boards draw a Field's focused input with the old offset ring. The
catalog keeps each family's current control focus style instead, including
the liquid-glass ink ring.

### Dark mode and forced colors

- Dark mode uses the family's dark tokens.
- Under forced colors:
  - Stepper indicators and Meter cells keep visible borders.
  - Filled cells and complete indicators use `Highlight`.
  - Error text stays readable as `CanvasText` with its icon.

## 3. Recipes, files, tests and docs

### Recipes

Each component gets a recipe schema branch in
`schemas/component-recipe.schema.json`, with these editor fields. Every slot
is an appearance part with colours and sizes, as in existing recipes.

| Component | Props | Content |
| --- | --- | --- |
| Spinner | `size` | `label` (default "Loading") |
| Kbd | none | `keys` (default "Ctrl K"; split on spaces) |
| Empty State | `media` (`icon` or `none`) | `title`, `description`, `primaryAction`, `secondaryAction` (optional) |
| Field | `control` (`input`, `textarea`, `native-select`), `required`, `invalid`, `disabled`, `orientation` | `label`, `description`, `error`, `placeholder` |
| Meter | `mode` (`discrete` or `labelled`), `value`, `max`, `segments`, `warningAt` | `label`; in labelled mode, up to 4 parts (label and value) |
| Stepper | `orientation`, `current` (index) | up to 6 steps (title and description) |

Defaults reproduce the board examples:

- Field: "Project name" with its hint.
- Meter: "Deploys this month", 128 of 200, 10 segments, warning at 0.6.
- Stepper: Preset, Components, Install CLI, current at index 1.
- Empty State: "No presets yet".

### Files

The pattern is the 0.7.2 batch (commit `ebb4adc`).

**Contracts**

- Component ids.
- Style-family support for all five families (glass experimental).
- Recipe schema branches.
- Appearance parts.
- Regenerated contract TypeScript.

**Catalog**

- Radix templates for all six.
- Base UI templates for Field and Meter; the other four share their
  template between editions.
- Styles for all five families.
- Component slot lists, manifest entries and usage examples.
- Meter reuses the `success`, `warning` and `info` palette pairs added for
  Alert, with their reviewed fallbacks.

**Compiler**

- Recipe specimens in `recipe-specimen.ts`.
- Edition usage examples.
- Stable hash fixtures.

**Preview**

- The preset editor pages show the six components; the test that checks
  every catalog component appears requires it.
- The preset gallery.
- The audit pages pick them up from the catalog.

**Website**

- Catalog entries with minimum CLI 0.7.3.
- Component editor support through the shared catalog editor.

**CLI**

- `add` accepts the six ids.

### Tests

**Rendered semantics, both editions**

- Spinner: role and name.
- Kbd: native `kbd`.
- Empty State: structure.
- Field: `aria-describedby`, `aria-invalid` and `required` reach the wrapped
  control; the error appears only when invalid.
- Meter: role, values and value text; segment and warning cells.
- Stepper: `aria-current="step"` and the hidden completion text.

**Compiler and contracts**

- Deterministic output.
- Recipe round trips.
- Edition parity.
- Stable hashes.
- Glass contrast plates for the new glass surfaces.

**Specimen audit**

- The six components join all 20 configurations.
- Stable families must pass.
- Liquid-glass findings are recorded, not blocking.

**Visual review**

- Side-by-side screenshots of each board section and the audit page, in light
  mode, per family, recorded in the evidence doc.

### Docs

- `docs/components/<id>.md` for each component.
- `docs/evidence/display-components.md`.
- Component-specific rows in `docs/accessibility-review.md`.
- The component list and status in
  `docs/03-components-styles-accessibility.md`.
- `CHANGELOG.md` under Unreleased.
- Website catalog copy.

## Out of scope

- Button `loading` and the other variants that use Spinner: sub-project 6.
- Interactive Stepper navigation and Meter animation.
- New palette tokens beyond the existing success, warning and info pairs.
- Releases, deployment and pushes.

## Verification

Run, and record the environment of each run:

- `pnpm build:packages`
- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm generate:preview`
- `pnpm test:specimen-audit`

Do not re-run checks already shown to pass on unchanged code.
