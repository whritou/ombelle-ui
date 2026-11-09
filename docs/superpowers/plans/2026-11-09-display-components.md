# Display Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Spinner, Kbd, Empty State, Field, Meter and Stepper to the catalog in both editions and all five families, with component-editor recipes, matching the 0.7.3 design boards.

**Architecture:** Follow the 0.7.2 batch (commit `ebb4adc`) end to end:
- contract ids, recipe schema branches and appearance parts;
- catalog templates and per-family styles;
- compiler specimens and usage examples;
- preview and website registration;
- docs.

The specimen audit (PR #101, the base of this branch) measures every new component automatically.

**Tech Stack:** TypeScript ES modules, React 19, Radix (`@radix-ui/react-slot` only), Base UI 1.9.0 (`Field`, `Meter`), PostCSS-processed family CSS, Vitest, Playwright specimen audit.

**Spec:** `docs/superpowers/specs/2026-11-09-display-components-design.md`

## Global Constraints

- Node 24.19.0 and pnpm 11.25.0 (`corepack pnpm …`). Branch `feat/display-components-073`, stacked on `test/specimen-audit-harness`.
- Conventional Commits; no `codex` prefix.
- Edit `schemas/`, never `packages/contracts/src/*schema*.ts`, and edit catalog sources, never `generated.ts`. Run `pnpm build:packages` after package source changes.
- Add no new runtime dependency. Radix uses `@radix-ui/react-slot` 1.5.0 (already pinned). Base UI uses `@base-ui/react` 1.9.0 (already pinned).
- Component ids: `spinner`, `kbd`, `empty`, `field`, `meter`, `stepper`.
- Glass support for all six is `experimental`; the other four families are supported.
- The default look per family is the family's 0.7.3 board section (design artifact `https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U`, `project/<Family>073Components.dc.html`). Board variables map to catalog tokens as in spec §2. The control inside a Field keeps its family's existing focus style.
- Meter colours use the existing `success`, `warning` and `info` palette pairs with their fallbacks; add no new tokens.
- Website and CLI install gating: these six ids require CLI `0.7.3`.
- Do not re-run checks already shown to pass on unchanged code (user instruction).
- No release, deployment or push.

## Review Focus

- **Field's description and error ids:** a `Field` without a `FieldDescription`, or with `invalid` false, must not reference those ids in `aria-describedby`. Task 4 pins this.
- **A control that already has its own `aria-describedby`:** FieldControl must merge its ids with the control's, not overwrite them. Task 4 pins this.
- **A Meter value outside its range:** `value` above `max` or below `min` is clamped for both `aria-valuenow` and the drawn cells. `segments` outside 2–20 is clamped. Task 5 pins this.
- **A Spinner inside a Button with `aria-hidden`:** it renders no `role="status"`, so a button reads "Saving", not "Saving Loading". Task 2 pins this.
- **A Stepper with every step complete:** no item has `aria-current`, and every item has its hidden "Completed: " text. Task 6 pins this.

---

### Task 1: Contracts

**Files:**
- Modify: `packages/contracts/src/component-ids.ts`. Append the six ids to `supportedComponentIds`.
- Modify: `packages/contracts/src/style-families.ts`. Add the six ids to `glassExperimental`.
- Modify: `schemas/component-recipe.schema.json`. Add six `oneOf` branches.
- Modify: `packages/contracts/src/component-recipe-appearance.ts`. Add appearance parts.
- Test: `packages/contracts/test/component-recipe.test.ts` and `packages/contracts/test/style-support.test.ts`.

**Interfaces:**
- Produces the recipe fields, with exact names and defaults:

| Component | Props | Content |
| --- | --- | --- |
| `spinner` | `size` enum `sm\|default\|lg`, default `default` | `label` string, default `Loading` |
| `kbd` | none | `keys` string, default `Ctrl K` |
| `empty` | `media` enum `icon\|none`, default `icon` | `title` (default `No presets yet`); `description` (default `Start from a built-in family or import a preset file. You can change everything later in the editor.`); `primaryAction` (default `New preset`); `secondaryAction` (optional, default `Import file`) |
| `field` | `control` enum `input\|textarea\|native-select` (default `input`); `required` bool (default true); `invalid` bool; `disabled` bool; `orientation` enum `vertical\|horizontal` (default `vertical`) | `label` (default `Project name`); `description` (default `Shown in the CLI and the editor header.`); `error` (default `Use lower case letters and dashes only.`); `placeholder` (default `acme-dashboard`) |
| `meter` | `mode` enum `discrete\|labelled` (default `discrete`); `value` integer 0–100000 (default 128); `max` integer 1–100000 (default 200); `segments` integer 2–20 (default 10); `warningAt` number 0–1 (default 0.6) | `label` (default `Deploys this month`); `parts`: array of at most 4 `{ label, value }` items, default Builds 4.2, Assets 2.2, Logs 1 |
| `stepper` | `orientation` enum `horizontal\|vertical` (default `horizontal`); `current` integer 0–5 (default 1) | `steps`: array of 2–6 `{ title, description }` items, default Preset/"Ombelle", Components/"Choose 4", Install CLI/"" |

- Produces the appearance parts per id, using the existing `surface`, `mark`, `text` and `layout` helpers:
  - `spinner`: `mark('spinner','Spinner')`.
  - `kbd`: `surface('kbd','Key')`.
  - `empty`: `surface('empty','Panel')`, `surface('empty-media','Icon tile')`, `text('empty-title','Title')`, `text('empty-description','Description')`.
  - `field`: `text('field-label','Label')`, `text('field-description','Hint')`, `text('field-error','Error')`.
  - `meter`: `layout('meter-track','Track')`, `mark('meter-cell','Cell')`, `text('meter-label','Label')`.
  - `stepper`: `mark('stepper-indicator','Indicator')`, `text('stepper-title','Title')`, `text('stepper-description','Description')`, `mark('stepper-separator','Connector')`.

- [ ] **Step 1: Write failing contract tests.**
  - `componentRecipeComponents` contains all six ids.
  - `styleSupport(id, 'liquid-glass') === 'experimental'`, and `'supported'` in the other four families.
  - `validateComponentRecipe` accepts each default recipe built with `defaultRecipeFields(componentRecipeFields(id).content)`.
  - It rejects `meter` with `segments: 1`, `warningAt: 1.5` or `max: 0`.
  - It rejects `stepper` with 7 steps or `current: 6`.
  - It rejects `field` with `control: 'select'`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/contracts`. Expected: the new cases FAIL.
- [ ] **Step 3: Implement** the ids, the support entries, the schema branches with the exact fields above (titles in sentence case, `maxLength` 200 on strings as in Badge), and the appearance parts.
- [ ] **Step 4: Verify.** Run `corepack pnpm build:packages`, then the contracts tests. Expected: build exit 0 and tests PASS. Catalog tests then fail because the templates are missing; Task 2 starts them.
- [ ] **Step 5: Commit** with `git commit -m "feat(contracts): add display component ids and recipe schemas"`.

### Task 2: Spinner and Kbd

**Files:**
- Create: `packages/catalog/src/templates/spinner.tsx` and `kbd.tsx`.
- Create: `packages/catalog/src/styles/{spinner,kbd}/{flat,minimalist,neo-brutalism,ombelle,liquid-glass}.css`.
- Modify: `packages/catalog/src/component-slots.ts` (`spinner: ['spinner']`, `kbd: ['kbd','kbd-group']`).
- Modify: `packages/catalog/src/manifest.ts` and `packages/catalog/src/expansion-examples.ts` (usage `spinner`, `kbd`).
- Test: `packages/catalog/test/spinner.test.ts` and `kbd.test.ts`.

**Interfaces:**
- Spinner: `Spinner(props: React.ComponentProps<'svg'> & { size?: 'sm' | 'default' | 'lg' })`, emitting `data-slot="spinner"` and `data-size`.
- Kbd: `Kbd(props: React.ComponentProps<'kbd'>)` and `KbdGroup(props: React.ComponentProps<'span'>)`.
- Neither needs a client boundary or a Base template.

- [ ] **Step 1: Write the failing tests.**
  - `expectComponentContract('spinner', { client: false, parts: ['Spinner'], slots: ['spinner'], dependencies: [react 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0], selectors: ["[data-slot='spinner']"], glass: 'experimental' })`. The dependency list is the same as in `packages/catalog/test/alert.test.ts`.
  - The same contract for `kbd`, with parts `['Kbd','KbdGroup']` and slots `['kbd','kbd-group']`.
  - Rendered Spinner: `role="status"` and `aria-label="Loading"`; `aria-label="Saving"` overrides it.
  - Review Focus: `renderToStaticMarkup(h(Spinner, { 'aria-hidden': true }))` contains no `role=` and no `aria-label`.
  - Rendered Kbd: a native `<kbd` with `data-slot="kbd"`. KbdGroup is a `span` with `data-slot="kbd-group"`.
  - Every family's CSS for `spinner` contains `@media (prefers-reduced-motion: reduce)` with `animation-duration: 3s`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/spinner.test.ts packages/catalog/test/kbd.test.ts`. Expected: FAIL, because the modules are missing.
- [ ] **Step 3: Implement** the templates and the 10 stylesheets, ported from each family's board `Kbd & Spinner` section (spec §2 shared and family rules). Each file starts with `/* <family> Spinner */` or `/* <family> Kbd */` and includes a `@media (forced-colors: active)` block. The glass files follow the glass surface conventions: `@supports (backdrop-filter)` enhancement, plus opaque, reduced-transparency and forced-colors fallbacks.
- [ ] **Step 4: Run** `corepack pnpm build:packages` and the two test files. Expected: PASS, with the catalog style lint passing.
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Spinner and Kbd"`.

### Task 3: Empty State

**Files:**
- Create: `packages/catalog/src/templates/empty.tsx`, `packages/catalog/src/styles/empty/<5 families>.css`, and `packages/catalog/test/empty.test.ts`.
- Modify: `component-slots.ts` (`empty: ['empty','empty-header','empty-media','empty-title','empty-description','empty-content']`), `manifest.ts` and `expansion-examples.ts`.

**Interfaces:**
- Parts: `Empty`, `EmptyHeader`, `EmptyMedia({ variant?: 'default' | 'icon' })`, `EmptyTitle`, `EmptyDescription` and `EmptyContent`.
- Ruling: the spec says the other four share a template between editions, but `EmptyTitle`'s `asChild` needs `@radix-ui/react-slot`, so Empty gets a Base template too.
- All parts are `div`s except `EmptyDescription`, which is a `p`.
- `EmptyTitle` takes `asChild` through `@radix-ui/react-slot`. That import makes the component Radix-backed, so it also needs a Base template using Base UI's `useRender` with `render`. Task 3 adds `packages/catalog/src/templates/base/empty.tsx`.

- [ ] **Step 1: Write the failing tests.**
  - `expectComponentContract('empty', …)` with the six slots.
  - The rendered title is a `div` by default.
  - With `asChild` and an `h2` child, the title renders `<h2 data-slot="empty-title"`.
  - The Base edition with `render={<h2 />}` renders the same.
  - EmptyMedia with `variant: 'icon'` carries `data-variant="icon"`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/empty.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the templates and the 5 stylesheets from the boards' `Empty State` sections, using spec §2's shared rules and each family's row of the table.
- [ ] **Step 4: Run** `pnpm build:packages`, then the test. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Empty State"`.

### Task 4: Field

**Files:**
- Create: `packages/catalog/src/templates/field.tsx` (Radix), `packages/catalog/src/templates/base/field.tsx`, and `packages/catalog/src/styles/field/<5>.css`.
- Test: `packages/catalog/test/field.test.ts`.
- Modify: `component-slots.ts` (`field: ['field','field-label','field-description','field-error']`), `manifest.ts` and `expansion-examples.ts`.

**Interfaces:**
- Parts: `Field({ orientation?, invalid?, required?, disabled? })` (`data-orientation`, `data-invalid`, `data-disabled`), `FieldLabel`, `FieldControl({ children: ReactElement })`, `FieldDescription` and `FieldError`.
- The Radix template starts with `'use client'`.
- Context: `useField(): { controlId: string; descriptionId?: string; errorId?: string; invalid: boolean; required: boolean; disabled: boolean }`.
- `descriptionId` is set only when `Field`'s children contain a `FieldDescription` element. `Field` finds it while rendering, by walking `props.children` recursively, so server-rendered HTML is correct without an effect. `errorId` is set only while `invalid` is true.
- `FieldControl` uses `Slot` and passes `id`, `aria-describedby` (the control's own ids first, then description, then error, space-joined, omitted when empty), `aria-invalid` (only when invalid), `required` and `disabled`.
- The Base edition maps the parts to `Field.Root`, `Field.Label`, `Field.Control` (`render` for the wrapped control), `Field.Description` and `Field.Error` (`match` always shown while `invalid`).

- [ ] **Step 1: Write failing tests**, each run against both editions:
  - Label `for` equals the control id. `aria-describedby` equals `<descId>` when valid and `<descId> <errId>` when `invalid`. `aria-invalid="true"` is present only when invalid. `required` reaches the input.
  - FieldError is absent when valid.
  - Review Focus: a Field with no FieldDescription and `invalid` false renders the control without `aria-describedby`.
  - Review Focus: `h(FieldControl, null, h('input', { 'aria-describedby': 'own' }))` yields `aria-describedby="own <descId>"`.
  - The required mark is `aria-hidden="true"`.
  - Radix: assert on `renderToStaticMarkup` output; the repository has no DOM test environment.
  - Base UI wires descriptions after hydration, so the Base assertions on `aria-describedby` and `aria-invalid` run in a browser. Create `tests/e2e/display-components.spec.ts` (add it to `testMatch` in `playwright.specimen-audit.config.ts`). It opens `/audit/ombelle/base/?mode=light` and checks that the Field section's control has `aria-describedby` referencing the description's id. Static Base tests cover structure only.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/field.test.ts`. Expected: FAIL. The e2e case runs in Task 9, once the audit pages include Field.
- [ ] **Step 3: Implement** the templates and the 5 stylesheets from the boards' `Field` sections. Style only the slots: `field`, `field-label`, `field-description` and `field-error`. Never style the control.
- [ ] **Step 4: Run** `pnpm build:packages` and the test. Expected: PASS in both editions.
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Field"`.

### Task 5: Meter

**Files:**
- Create: `packages/catalog/src/templates/meter.tsx`, `packages/catalog/src/templates/base/meter.tsx`, and `packages/catalog/src/styles/meter/<5>.css`.
- Test: `packages/catalog/test/meter.test.ts`.
- Modify: `component-slots.ts` (`meter: ['meter','meter-label','meter-track','meter-cell','meter-segment','meter-legend','meter-legend-item']`), `manifest.ts` and `expansion-examples.ts`.
- Modify: `packages/catalog/src/index.ts` `editionDependencies`. When the edition is `base` and the Base template imports `@base-ui/react`, include `@base-ui/react` even if the Radix template has no Radix package. This is Meter's case.

**Interfaces:**
- Parts:
  - `Meter({ value, min = 0, max, segments?, warningAt?, children? })`, with `role="meter"`, `aria-valuenow` (clamped), `aria-valuemin`, `aria-valuemax`, and `aria-valuetext` defaulting to `` `${value} of ${max}` ``.
  - `MeterLabel`, and `MeterSegment({ value, tone: 'primary' | 'info' | 'success' | 'warning' })`.
  - `MeterLegend` and `MeterLegendItem({ tone })`.
- Modes:
  - **Discrete:** when `segments` is set, the root renders a `meter-track` containing `clamp(segments, 2, 20)` `meter-cell` elements. A cell has `data-state="filled"` when its index is below `round(clamp(value)/max × n)`, and `data-warning` when it is filled and `(index + 1) / n > warningAt`.
  - **Labelled:** with `MeterSegment` children, the root's value is their sum. Each segment's width is `value / max`, and a final `meter-segment` with `data-rest` fills the remainder.
- Base edition: the root uses `Meter.Root` with `getAriaValueText` for the value text.

- [ ] **Step 1: Write failing tests** for both editions:
  - Default ARIA, including `aria-valuetext="128 of 200"`.
  - Discrete mode with `{ value: 128, max: 200, segments: 10, warningAt: 0.6 }`: 6 filled cells, of which the 6th (index 5) is not a warning; at `value: 150`, cells with index 6 and up are warnings.
  - Labelled mode: three segments plus a rest, with widths summing to 100%.
  - Review Focus: `value: 260, max: 200` gives `aria-valuenow="200"` and 10 filled cells. `value: -5` gives `"0"`. `segments: 1` draws 2 cells and `segments: 40` draws 20.
  - The Base edition's dependencies include `@base-ui/react`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/meter.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the templates, the `editionDependencies` rule and the 5 stylesheets from the boards' `Segmented progress` sections. Use the existing fallback pairs for `warning`, `info` and `success`.
- [ ] **Step 4: Run** `pnpm build:packages`, the meter test and `packages/catalog/test/catalog.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Meter"`.

### Task 6: Stepper

**Files:**
- Create: `packages/catalog/src/templates/stepper.tsx`, `packages/catalog/src/styles/stepper/<5>.css`, and `packages/catalog/test/stepper.test.ts`.
- Modify: `component-slots.ts` (`stepper: ['stepper','stepper-list','stepper-item','stepper-indicator','stepper-title','stepper-description','stepper-separator']`), `manifest.ts` and `expansion-examples.ts`.

**Interfaces:**
- Parts:
  - `Stepper({ orientation = 'horizontal', 'aria-label' = 'Progress' })` renders a `nav` and an inner `ol` (`stepper-list`) with `data-orientation`.
  - `StepperItem({ status })` renders an `li` with `data-status`, and `aria-current="step"` only when `status === 'current'`.
  - `StepperIndicator` renders a lucide `CheckIcon` (`lucide-react` is already a catalog dependency; add it to `extraDependencies.stepper`) for complete steps, and its children (the number) otherwise.
  - `StepperTitle` prepends `<span className="sr-only">Completed: </span>` for complete items: the Tailwind visually hidden class Dialog's close button already uses.
  - `StepperDescription`, and `StepperSeparator` (`aria-hidden`).
- No client boundary is needed.

- [ ] **Step 1: Write the failing tests.**
  - `nav[aria-label]` > `ol`, with `aria-current="step"` on the current item only.
  - A complete title contains "Completed: ". The separator is `aria-hidden`.
  - `data-orientation="vertical"` passes through.
  - Review Focus: all items complete gives no `aria-current`, and three "Completed: " texts.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/stepper.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the template and the 5 stylesheets from the boards' `Stepper` sections, covering the horizontal (`.stp`) and vertical (`.stv`) rules.
- [ ] **Step 4: Run** `pnpm build:packages` and the test. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Stepper"`.

### Task 7: Compiler specimens, examples and install gating

**Files:**
- Modify: `packages/compiler/src/recipe-specimen.ts`. Add six `case`s.
- Modify: `packages/compiler/src/compile.ts`. Add usage examples where `expansionExamples` does not cover them.
- Modify: `tests/helpers/catalog-recipe-fixtures.ts`. Add `editedFields`: spinner `label`, kbd `keys`, empty `title`, field `label`, meter `label`, stepper is handled like `tabs`, editing its first step title.
- Modify: `apps/www/src/snapshots/install-command.ts`. Add `displayComponents = new Set([...six ids])` requiring `displayCatalogMinimumCli = '0.7.3'`.
- Modify: `packages/compiler/test/fixtures/stable-family-hashes.json` and `style-baseline.json`, regenerated with `corepack pnpm exec tsx scripts/record-stable-hashes.ts`.
- Test: `packages/compiler/test/display-components.test.ts` and `packages/compiler/test/glass-expansion-plates.test.ts` (glass contrast plates for the new glass surfaces: `empty`, `empty-media`, `meter-cell` and `stepper-indicator`).

**Interfaces:**
- Specimens (built from the recipe props and content in Task 1):
  - **spinner:** `Spinner { size }`, plus a `span` "Saving…" in a `div`.
  - **kbd:** `KbdGroup` with one `Kbd` per key in `keys`, split on spaces.
  - **empty:** `Empty` > `EmptyHeader` > (`EmptyMedia variant=icon` when `media === 'icon'`), `EmptyTitle`, `EmptyDescription`; then `EmptyContent` with a `Button` per action. Button imports come from `@/components/ui/button`, as the dependency resolution does for Alert Dialog.
  - **field:** `Field { required, invalid, disabled, orientation }` > `FieldLabel`, `FieldControl` > (`Input`, `Textarea` or `NativeSelect`, chosen by `control`, with `placeholder`), `FieldDescription`, `FieldError`.
  - **meter:**
    - discrete: `Meter { value, max, segments, warningAt }` > `MeterLabel`.
    - labelled: `Meter` > `MeterLabel`, a `MeterSegment` per part (tones `primary`, `info`, `success`, then `warning`), and `MeterLegend`.
  - **stepper:** `Stepper { orientation }` > a `StepperItem` per step. Status is `complete` before `current`, `current` at `current`, and `upcoming` after. Each item holds `StepperIndicator` (its 1-based number), `StepperTitle`, an optional `StepperDescription`, and `StepperSeparator` between items.

- [ ] **Step 1: Write the failing tests.**
  - For each id, `compileComponentRecipe` of its default draft succeeds in all five families.
  - The emitted `.tsx` contains the expected part names.
  - `findShadowedNames` is `[]`, reusing `recipe-shadowing.ts`.
  - Output is identical across two runs.
  - `expansionDocs`-gated install: `displayCatalogMinimumCli === '0.7.3'`, and a recipe of each id reports that minimum.
  - Glass plates: the four new glass surfaces pass the existing plate assertions.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/compiler/test/display-components.test.ts packages/compiler/test/glass-expansion-plates.test.ts apps/www/src/snapshots`. Expected: FAIL.
- [ ] **Step 3: Implement** the specimens, examples, fixtures, gating and hash regeneration.
- [ ] **Step 4: Run** `corepack pnpm exec vitest run packages apps/www/src`. Expected: PASS, except the two known local-only failures (`transaction`, `snapshot-cache`), which must be named in the task record.
- [ ] **Step 5: Commit** with `git commit -m "feat(compiler): describe and gate the display component recipes"`.

### Task 8: Preview and website

**Files:**
- Modify: `apps/www/src/site/components/expansion.ts`. Add six docs entries with `minimumCli: '0.7.3'`, and `api`, `states` and `basis` taken from spec §1.
- Modify: `apps/www/src/preset-editor/preview-scenes.ts` and the scenes under `apps/preview/src/scenes/`.
  - Settings page: Field around the existing inputs, a Spinner on Save, and Kbd hints.
  - Projects page: an Empty State when the filter matches nothing, and a Meter for deploys.
  - Sign-in or Dashboard page: a Stepper for onboarding.
- Modify: `fixtures/shared/preset-gallery.tsx`, `edition-scenario.tsx` and `edition-scenario-base.tsx`.
- Test: `apps/www/src/preset-editor/model.test.ts`, which checks that every catalog component appears across the pages, and `tests/integration/www-route.test.ts`.

**Interfaces:** Consumes the template parts from Tasks 2–6.

- [ ] **Step 1: Check the existing tests fail.** Run `corepack pnpm exec vitest run apps/www/src/preset-editor/model.test.ts`. Expected: FAIL, because the six ids are missing from `sceneComponents`.
- [ ] **Step 2: Implement** the scenes, the gallery, the edition scenarios and the website entries.
- [ ] **Step 3: Verify.** Run `pnpm generate:preview`, `corepack pnpm exec vitest run apps/www/src` and `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/www-route.test.ts tests/integration/preview-routing.test.ts`. Expected: PASS.
- [ ] **Step 4: Commit** with `git commit -m "feat(preview): show the display components on the editor pages and site"`.

### Task 9: Audit and design review

**Files:**
- Modify: any `packages/catalog/src/styles/<id>/<family>.css` that the audit flags.
- Create: `docs/evidence/display-components.md` and `docs/evidence/images/display-components/`.

- [ ] **Step 0: Add the Base Field wiring test** (Task 4), run it, and expect PASS.
- [ ] **Step 1: Run the audit.** Run `pnpm generate:preview` and `pnpm test:specimen-audit`. Expected: the stable families have no findings for the six new sections. If any are flagged, fix the family CSS, one commit per defect, with a catalog test pinning the fixed declaration (`packages/catalog/test/specimen-audit-fixes.test.ts`). Liquid glass findings are recorded only.
- [ ] **Step 2: Compare with the boards.** For each component and family in light mode, save the audit page section screenshot (`.artifacts/specimen-audit/<family>/radix/light/<id>.png`) next to the matching board section, captured from the artifact page. Write `docs/evidence/display-components.md` with a table per family, marking each pair "matches" or listing the visible differences and whether they were fixed or ruled out.
- [ ] **Step 3: Commit** with `git commit -m "docs: record the display components audit and design review"`.

### Task 10: Documentation

**Files:**
- Create: `docs/components/{spinner,kbd,empty,field,meter,stepper}.md`, following `docs/components/breadcrumb.md`: API, states, accessibility, consumer responsibilities and the minimum CLI version.
- Modify: `docs/accessibility-review.md` (a row and specific checks per component), `docs/03-components-styles-accessibility.md` (the component list and status), `CHANGELOG.md` (Unreleased) and `README.md` (component count, if stated).

- [ ] **Step 1: Write the docs.** Claim only what Tasks 1–9 measured.
- [ ] **Step 2: Verify.** Run `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/www-route.test.ts`. Expected: PASS.
- [ ] **Step 3: Commit** with `git commit -m "docs: document the display components"`.
