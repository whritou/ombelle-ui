# Form Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Slider, Toggle Group, Chip, Tag Input and Input OTP to the catalog in both editions and all five families, with recipes. Then use them in the website editor chrome and the preview scenes.

**Architecture:**
- **Catalog:** follow sub-project 2 (branch `feat/display-components-073`) end to end. That covers contract ids, schema branches and appearance parts; templates and per-family styles; compiler specimens and gating; preview and website registration; docs.
- **Website editor:** a build-time script compiles three of the components into `apps/www/src/generated/ui/`. Nothing compiles when a page loads.

**Tech Stack:**
- TypeScript ES modules and React 19.
- Radix: `@radix-ui/react-slider` 1.6.1 and `@radix-ui/react-toggle-group` 1.2.1, plus `input-otp` 1.5.0.
- Base UI 1.9.0: `Slider`, `ToggleGroup`, `Toggle`, `OTPField`.
- Next.js 16 for `apps/www`.
- Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-form-controls-design.md`

## Global Constraints

- **Toolchain and branch:** Node 24.19.0 and pnpm 11.25.0 (`corepack pnpm …`). The branch is `feat/form-controls-073`, stacked on `feat/display-components-073` (PR #102).
- **Commits:** Conventional Commits, with no `codex` prefix.
- **Generated files:**
  - Edit `schemas/`, never `packages/contracts/src/*schema*.ts`.
  - Edit catalog sources, never `generated.ts`.
  - Run `pnpm build:packages` after package source changes.
- **New runtime dependencies, exact pins:**
  - `@radix-ui/react-slider` 1.6.1 (MIT);
  - `@radix-ui/react-toggle-group` 1.2.1 (MIT);
  - `input-otp` 1.5.0 (MIT).
  - The Base UI edition adds none.
- **Component ids:** `slider`, `toggle-group`, `chip`, `tag-input`, `input-otp`. The catalog has 40 components.
- **Family support:** glass support is `experimental` for all five. The other four families are supported. Glass findings are recorded, never blocking (user decision).
- **Default look:** each family follows its 0.7.3 board, `project/<Family>073Components.dc.html`, sections 01 Slider, 02 Toggle Group, 07 Input OTP and 14 Chip · Tag input.
- **Board checks:** compare computed styles with the specimen from the first audit run, not screenshots alone.
- **Install gate:** these five ids need CLI `0.7.3`, through the same set as `displayComponents` in `apps/www/src/snapshots/install-command.ts`.
- **CSS rules:**
  - One `data-slot` per selector in every component stylesheet.
  - Forced-colours blocks in every file.
  - Interactive targets at least 24px.
  - Reduced motion removes the thumb and caret transitions.
- **Website loading:** the site compiles components only at build time (`build-hosted-www.mjs`, `predev`). If any editor route's First Load JS grows by more than 10 kB gzipped, stop and report before merging.
- **Running checks:** do not re-run checks already shown to pass on unchanged code. Run only the tests affected by a change (user instruction).
- **Remote actions:** no release, no deployment and no push without asking.

## Review Focus

- **A single Toggle Group whose checked item is clicked again.** Both primitives send `''` (Radix) or `[]` (Base UI). A segmented editor control must keep its current value and never send an empty one. Task 10 pins this through `SegmentedControl`, and Task 4 documents the primitive behaviour in a test.
- **Tag Input given messy text.** Pasting `" a, b,,c , a"` adds `a`, `b`, `c` once each, trimmed. Text past `max`, or a duplicate, stays in the input and is announced. Task 3 pins this.
- **Input OTP given a paste with non-digits or extra characters.** `"12-34 56789"` under the default digit pattern fills `123456` and ignores the rest, in both editions. Task 6 pins this in the browser.
- **Range Slider thumbs pushed past each other.** Pressing ArrowRight on the minimum thumb at the maximum's value does not cross or swap the thumbs. The values stay ordered in `onValueChange`. Task 5 pins this.
- **A Tag Input inside a Field.** The label names the inner input, the hint and error describe it, and the required state reaches it, in both editions. Task 3 pins it for Radix in SSR, and Task 8 pins it for both editions in the browser.

---

### Task 1: Contracts, dependencies and size baseline

**Files:**
- Modify:
  - `packages/contracts/src/component-ids.ts`: append the five ids.
  - `packages/contracts/src/style-families.ts`: add them to `glassExperimental`.
  - `schemas/component-recipe.schema.json`: add five `oneOf` branches.
  - `packages/contracts/src/component-recipe-appearance.ts`: add the appearance parts.
  - `packages/contracts/src/component-recipe.ts` (`validateComposition`, next to the Stepper rule): add the new rules.
  - `packages/catalog/src/manifest.ts`: pin the three new dependencies in `runtimeDependencies`.
  - `packages/catalog/package.json` and `pnpm-lock.yaml`: add them as dev dependencies, the same way the existing Radix packages appear.
- Create: `docs/evidence/form-controls-073.md`, holding only the size baseline at this step.
- Test: `packages/contracts/test/component-recipe.test.ts` and `style-support.test.ts`.

**Interfaces (recipe fields, exact names and defaults):**

| Component | Props | Content |
| --- | --- | --- |
| `slider` | `mode` enum `single\|range` (default `single`); `min` integer (default 0); `max` integer (default 100); `step` integer ≥1 (default 1); `ticks` boolean (default false); `value` integer (default 12); `rangeValue` two integers (default `[20, 80]`) | `label` (default `Border radius`); `thumbLabels`: array of 2 strings (default `Minimum price`, `Maximum price`) |
| `toggle-group` | `type` enum `single\|multiple` (default `single`); `variant` enum `segmented\|toolbar` (default `segmented`) | `label` (default `Calendar view`); `items`: 2–6 `{ value, label, iconOnly }` (default Day, Week, Month; `iconOnly` false); `defaultValue` string (default `week`) |
| `chip` | `mode` enum `pressable\|removable` (default `pressable`) | `label` (default `Status filter`); `chips`: 1–6 `{ label, pressed }` (default On track pressed, Needs attention pressed, Shipped not pressed) |
| `tag-input` | `max` integer 1–20 (default 8) | `label` (default `Topics`); `placeholder` (default `Add a topic`); `tags`: 0–8 strings (default `design-tokens`, `glass`) |
| `input-otp` | `length` integer 4–8 (default 6); `separatorAfter` integer 0–7 (default 3; 0 means none) | `label` (default `Verification code`) |

- **Appearance parts:** use the existing helpers.
  - `slider`: `layout('slider-track')`, `mark('slider-range')`, `mark('slider-thumb')`.
  - `toggle-group`: `surface('toggle-group')`, `surface('toggle-group-item')`.
  - `chip`: `surface('chip')`.
  - `tag-input`: `surface('tag-input')`.
  - `input-otp`: `surface('input-otp-slot')`.
- **`validateComposition` rejects:**
  - a slider `value` outside `min`..`max`;
  - `rangeValue[0] > rangeValue[1]`, or either entry outside the range;
  - `min >= max`;
  - a single `toggle-group` whose `defaultValue` is not an item value;
  - `separatorAfter >= length`.

- [ ] **Step 0: Record the size baseline before anything changes.** Run `cd apps/www && corepack pnpm run build`. Copy the First Load JS of the `/editor/*` and `/preset-editor` routes from the route table into `docs/evidence/form-controls-073.md`, under "Website size, before". Also record the commit.
- [ ] **Step 1: Write the failing contract tests.**
  - All five ids are in `componentRecipeComponents`.
  - `styleSupport(id, 'liquid-glass') === 'experimental'`, and the other four families are `supported`.
  - Each default recipe validates.
  - Each rejection above fails, with the message naming the field.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/contracts`. Expected: the new cases FAIL.
- [ ] **Step 3: Implement** the ids, schema branches, appearance parts, rules and dependency pins. Install with `corepack pnpm install --ignore-scripts`.
- [ ] **Step 4: Run** `node scripts/sync-schema.mjs` and the contracts tests. Expected: PASS. The catalog build waits for the templates in Tasks 2–6.
- [ ] **Step 5: Commit** with `git commit -m "feat(contracts): add the form control ids and recipe schemas"`.

### Task 2: Chip

**Files:**
- Create:
  - `packages/catalog/src/templates/chip.tsx` (one template for both editions);
  - `packages/catalog/src/styles/chip/{flat,minimalist,neo-brutalism,ombelle,liquid-glass}.css`.
- Modify:
  - `packages/catalog/src/component-slots.ts`: `chip: ['chip','chip-remove','chip-group']`.
  - `packages/catalog/src/index.ts` `extraDependencies`: `chip: ['lucide-react']`.
  - `packages/catalog/src/expansion-examples.ts`: the chip example.
- Test: `packages/catalog/test/chip.test.ts`.

**Interfaces:**
- **`Chip`:** `Chip(props: React.ComponentProps<'span'> & { pressed?: boolean; defaultPressed?: boolean; onPressedChange?(pressed: boolean): void; disabled?: boolean })`.
  - With `pressed`, `defaultPressed` or `onPressedChange`, it renders a `button type="button"` with `aria-pressed` and `data-state="on|off"`.
  - Otherwise it renders a `span`. Both carry `data-slot="chip"` and `data-mode="pressable|static"`.
- **`ChipRemove`:** `ChipRemove(props: React.ComponentProps<'button'> & { label?: string; onRemove?(): void })` renders a button named by `label`, or "Remove " plus the chip's text. The chip passes its text through context. The icon is `XIcon` with `aria-hidden`.
- **`ChipGroup`:** `ChipGroup(props: React.ComponentProps<'div'>)` renders `role="group"` with `data-slot="chip-group"`.
- The template has `'use client'`.

- [ ] **Step 1: Write the failing tests.**
  - `expectComponentContract('chip', …)`: client, the three parts and slots, dependencies react, clsx, tailwind-merge and lucide-react, glass `experimental`.
  - A pressable chip renders `<button` with `aria-pressed="true"` when `defaultPressed`.
  - A static chip renders `<span`.
  - `ChipRemove` inside `<Chip>glass</Chip>` has `aria-label="Remove glass"`, and `label` overrides it.
  - `ChipGroup` has `role="group"`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/chip.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the template and the five stylesheets from board section 14 ("Filter chips" and the removable tokens), following the Global Constraints CSS rules.
- [ ] **Step 4: Run** `corepack pnpm build:packages` and the test. Expected: PASS, and the style lint passes.
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Chip"`.

### Task 3: Tag Input

**Files:**
- Create:
  - `packages/catalog/src/templates/tag-input.tsx` (one template for both editions);
  - `packages/catalog/src/styles/tag-input/{five families}.css`.
- Modify:
  - `component-slots.ts`: `tag-input: ['tag-input','tag-input-list','tag-input-input']`.
  - `index.ts` `extraDependencies`: `tag-input: ['lucide-react']`, and its registry dependency on `chip`, set the way `alert-dialog` depends on `button`.
  - `expansion-examples.ts`.
- Test: `packages/catalog/test/tag-input.test.ts`.

**Interfaces:**
- **`TagInput`:** `TagInput(props: Omit<React.ComponentProps<'div'>, 'defaultValue'> & { value?: string[]; defaultValue?: string[]; onValueChange?(value: string[]): void; separators?: string[]; max?: number; allowDuplicates?: boolean; disabled?: boolean; name?: string })`.
  - The default `separators` is `['Enter', ',']`.
  - It provides context to `TagInputList` (`React.ComponentProps<'ul'>`, which renders one `li > Chip > text + ChipRemove` per tag) and to `TagInputInput` (`React.ComponentProps<'input'>`).
  - With `name`, it renders one `<input type="hidden" name={name} value={tag}>` per tag.
- **Exported helper:** `addTags(current: string[], text: string, opts: { max?: number; allowDuplicates?: boolean; separators: string[] }): { value: string[]; rejected: { tag: string; reason: 'duplicate' | 'max' }[] }`. It splits on the separator characters (`Enter` is not a character), trims, and drops empty parts.
- **Live region:** a visually hidden `span` with `role="status"` and `aria-live="polite"`, containing "Added x", "Removed x", "x is already added" or "You can add up to N tags".
  - It needs a slot (`data-slot="tag-input-status"`), which goes into `component-slots.ts`.
  - A slot-scoped rule in each family CSS hides it visually, so it doesn't depend on Tailwind.

- [ ] **Step 1: Write the failing tests.**
  - Contract: client; parts `TagInput`, `TagInputList`, `TagInputInput`; slots including `tag-input-status`.
  - `addTags([], ' a, b,,c , a', …)` gives value `['a','b','c']` and rejects `a` as `duplicate` (Review Focus).
  - `addTags(['a'], 'b', { max: 1 })` gives value `['a']` with `max` rejected.
  - SSR of `<TagInput defaultValue={['glass']} name="topics">` includes `aria-label="Remove glass"` and a hidden input named `topics` with value `glass`.
  - SSR inside a Radix `Field` with `FieldControl` wrapping `TagInputInput`: the input carries the field's id, its `aria-describedby` and `required` (Review Focus, Radix half).
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/tag-input.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Keyboard: a separator key with text calls `addTags`. Backspace with an empty input removes the last tag. A remove button removes its tag and focuses the input.
  - The `paste` event runs `addTags` on the pasted text.
  - Styles follow board section 14, with the Input look and a `:focus-within` ring on `tag-input`.
- [ ] **Step 4: Run** `corepack pnpm build:packages` and the test. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Tag Input"`.

### Task 4: Toggle Group

**Files:**
- Create:
  - `packages/catalog/src/templates/toggle-group.tsx` (Radix);
  - `templates/base/toggle-group.tsx`;
  - `styles/toggle-group/{five}.css`.
- Modify:
  - `component-slots.ts`: `toggle-group: ['toggle-group','toggle-group-item']`.
  - `index.ts` `extraDependencies`: `['@radix-ui/react-toggle-group']`.
  - `expansion-examples.ts`.
- Test: `packages/catalog/test/toggle-group.test.ts`.

**Interfaces:**
- **`ToggleGroup`:** `ToggleGroup(props: ({ type: 'single'; value?: string; defaultValue?: string; onValueChange?(value: string): void } | { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?(value: string[]): void }) & { variant?: 'segmented' | 'toolbar'; orientation?: 'horizontal' | 'vertical'; disabled?: boolean; className?: string; children?: React.ReactNode } & aria props)`.
  - It emits `data-slot="toggle-group"`, `data-variant` and `data-type`, and passes `variant` and `type` to its items through context.
- **`ToggleGroupItem`:** `ToggleGroupItem(props: { value: string; disabled?: boolean } & React.ComponentProps<'button'>)` emits `data-slot="toggle-group-item"`, `data-variant` and `data-state="on|off"`.
- **Single mode** shows `role="radiogroup"` on the group, and `role="radio"` with `aria-checked` on each item, in both editions.
  - Radix 1.2.1 renders this itself. Verify in the test.
  - The Base template sets the roles and `aria-checked`, and removes `aria-pressed`, when `type === 'single'`.
- **Base UI:** it takes `value: string[]` and `multiple`. The Base template maps the single-mode string API onto them.

- [ ] **Step 1: Write the failing tests.**
  - Contract: Radix dependency `@radix-ui/react-toggle-group` 1.2.1; Base dependency includes `@base-ui/react`.
  - For each edition:
    - single renders one `role="radiogroup"`, three `role="radio"`, and `aria-checked="true"` on the default;
    - multiple renders `aria-pressed` and no `role="radio"`.
  - Record the primitive behaviour (Review Focus): a test that documents what `onValueChange` receives when the checked single item is activated again. It renders with `defaultValue` and simulates through the exported reducer if one exists; otherwise it is covered in the Task 8 browser test.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/toggle-group.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both templates and the five stylesheets from board section 02.
  - `segmented`: a muted bar, and the checked item raised on `card`.
  - `toolbar`: separate square buttons, pressed in primary.
- [ ] **Step 4: Run** `corepack pnpm build:packages` and the test. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Toggle Group"`.

### Task 5: Slider

**Files:**
- Create:
  - `templates/slider.tsx` and `templates/base/slider.tsx`;
  - `styles/slider/{five}.css`.
- Modify:
  - `component-slots.ts`: `slider: ['slider','slider-track','slider-range','slider-thumb','slider-ticks','slider-tick']`.
  - `index.ts` `extraDependencies`: `['@radix-ui/react-slider']`.
  - `expansion-examples.ts`.
- Test: `packages/catalog/test/slider.test.ts`.

**Interfaces:**
- **`Slider`:** `Slider(props: { value?: number[]; defaultValue?: number[]; onValueChange?(v: number[]): void; onValueCommit?(v: number[]): void; min?: number; max?: number; step?: number; orientation?: 'horizontal' | 'vertical'; disabled?: boolean; name?: string; thumbLabels?: string[]; getValueText?(value: number, index: number): string; className?: string } & aria-label | aria-labelledby)`.
  - It renders one thumb per value.
  - Thumb `i` gets `aria-label={thumbLabels?.[i]}`. With a single thumb and no `thumbLabels`, it gets the root's `aria-label` or `aria-labelledby`.
  - `getValueText` sets `aria-valuetext`.
- **`SliderTicks`:** `SliderTicks(props: { values: number[] } & React.ComponentProps<'div'>)` is `aria-hidden`, renders one `slider-tick` per value with its label, and is placed by the value's share of the range.
- The Base edition uses `Slider.Root`, `Slider.Control`, `Slider.Track`, `Slider.Indicator` and `Slider.Thumb`, with the same slots and props.

- [ ] **Step 1: Write the failing tests.**
  - Contract for both editions.
  - SSR `<Slider defaultValue={[12]} max={24} aria-label="Border radius" getValueText={v => `${v} pixels`} />` gives one `role="slider"` with `aria-valuenow="12"`, `aria-valuemax="24"`, `aria-valuetext="12 pixels"` and the name `Border radius`.
  - SSR of a range with `thumbLabels` gives two sliders named "Minimum price" and "Maximum price".
  - `SliderTicks` is `aria-hidden`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/slider.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both templates and the stylesheets from board section 01. Thumbs are at least 24px through padding or a pseudo-element target.
- [ ] **Step 4: Run** `corepack pnpm build:packages` and the test. Expected: PASS. The crossing and keyboard behaviour is pinned in Task 8's browser test (Review Focus).
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Slider"`.

### Task 6: Input OTP

**Files:**
- Create:
  - `templates/input-otp.tsx` (with `input-otp`) and `templates/base/input-otp.tsx` (with `OTPField`);
  - `styles/input-otp/{five}.css`.
- Modify:
  - `component-slots.ts`: `input-otp: ['input-otp','input-otp-group','input-otp-slot','input-otp-separator','input-otp-caret']`.
  - `index.ts` `extraDependencies`: `['input-otp']` for Radix only, set the way the Base template's imports decide its dependencies (Base Meter precedent).
  - `expansion-examples.ts`.
- Test: `packages/catalog/test/input-otp.test.ts`.

**Interfaces:**
- **`InputOTP`:** `InputOTP(props: { maxLength: number; value?: string; defaultValue?: string; onChange?(value: string): void; onComplete?(value: string): void; pattern?: string; disabled?: boolean; name?: string; autoComplete?: string; children: React.ReactNode } & aria props)`.
  - The default `pattern` is the digits-only regex source `^\d+$` (`REGEXP_ONLY_DIGITS` in `input-otp`), and the default `autoComplete` is `one-time-code`.
- **Other parts:** `InputOTPGroup(div)`, `InputOTPSlot({ index: number })` (shows the character and, when active, a caret span `data-slot="input-otp-caret"`) and `InputOTPSeparator(div role="separator")`.
- **Slot state:** `data-active` and `data-filled`.
- **Base edition:** `OTPField.Root` with `length={maxLength}`. Each `InputOTPSlot` renders `OTPField.Input` with `aria-label` "Digit n of N".

- [ ] **Step 1: Write the failing tests.**
  - Contract: the Radix dependencies include `input-otp` 1.5.0, and the Base dependencies don't.
  - SSR Radix `<InputOTP maxLength={6} aria-label="Verification code">` with six slots gives one `input` with `autocomplete="one-time-code"`, `maxlength="6"` and the name.
  - SSR Base gives six inputs labelled "Digit 1 of 6" … "Digit 6 of 6".
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/input-otp.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both templates and the stylesheets from board section 07. The caret blink is turned off under `prefers-reduced-motion: reduce`.
- [ ] **Step 4: Run** `corepack pnpm build:packages`, the test, and `corepack pnpm exec vitest run packages/catalog`. Expected: PASS, and the generated catalog has 40 components.
- [ ] **Step 5: Commit** with `git commit -m "feat(catalog): add Input OTP"`.

### Task 7: Compiler specimens and install gating

**Files:**
- Modify:
  - `packages/compiler/src/recipe-specimen.ts`: five `case`s.
  - `packages/compiler/src/compile.ts`: usage examples, if not covered.
  - `tests/helpers/catalog-recipe-fixtures.ts`: `editedFields`.
  - `apps/www/src/snapshots/install-command.ts`: add the five ids to the 0.7.3 set and rename it `catalog073Components`, updating its uses.
  - `packages/compiler/test/fixtures/stable-family-hashes.json`: regenerate with `corepack pnpm exec tsx scripts/record-stable-hashes.ts`.
- Test: `packages/compiler/test/form-controls.test.ts` and `apps/www/src/snapshots/display-install.test.ts`.

**Interfaces (specimens from the Task 1 fields):**
- `slider`: one `Slider` (single, `aria-label` = label, `getValueText` omitted) or a range with `thumbLabels`. `SliderTicks` at 0/25/50/75/100 % of the range when `ticks` is set.
- `toggle-group`: `ToggleGroup { type, variant, aria-label }` with one item per entry. Icon-only items take `aria-label` = label and show its first letter in a `span aria-hidden`, since recipes have no icon dependency.
- `chip`: `ChipGroup aria-label` with one `Chip` per entry, pressable with `defaultPressed`, or removable with `ChipRemove`.
- `tag-input`: a `label` and `TagInput { defaultValue: tags, max }` containing `TagInputList` and `TagInputInput { placeholder, 'aria-labelledby' }`.
- `input-otp`: `InputOTP { maxLength: length, 'aria-label': label }` with groups split after `separatorAfter`.

- [ ] **Step 1: Write the failing tests.**
  - Each default draft compiles in all five families.
  - The emitted part names match.
  - `findShadowedNames` is `[]`.
  - Output is deterministic.
  - Each of the five ids reports minimum CLI `0.7.3`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/compiler/test/form-controls.test.ts apps/www/src/snapshots`. Expected: FAIL.
- [ ] **Step 3: Implement**, then regenerate the hashes.
- [ ] **Step 4: Run** `corepack pnpm exec vitest run packages/compiler apps/www/src/snapshots`. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(compiler): describe and gate the form control recipes"`.

### Task 8: Preview, website catalog and browser tests

**Files:**
- Modify:
  - `apps/www/src/site/components/expansion.ts`: five docs entries with `minimumCli: '0.7.3'`.
  - `apps/preview/src/scenes/projects.tsx`: the Sheet status filters become `ChipGroup aria-label="Status filter"` with pressable Chips. Remove the Checkbox and Label rows.
  - `apps/preview/src/scenes/settings.tsx`: add a theme and density `ToggleGroup`, a corner-radius `Slider` (0–24, `getValueText` "n pixels"), a security card with `InputOTP` (6 digits), and a `Field` around a `TagInput` for project topics.
  - `apps/www/src/preset-editor/preview-scenes.ts`: register the five ids.
  - `fixtures/shared/preset-gallery.tsx`: five sections.
  - `fixtures/shared/edition-scenario.tsx` and `edition-scenario-base.tsx`: the browser-test fixtures below, each with a `data-testid`.
- Create: `tests/e2e/form-controls.spec.ts`, run with `playwright.specimen-audit.config.ts`. Add it to that config's `testMatch`.
- Test: `apps/www/src/preset-editor/model.test.ts`, which already requires every catalog id on a page.

**Browser tests:** each runs for `radix` and `base` on `/editions/ombelle/<edition>/?mode=light`.
- **Slider:** focus the single thumb, then press ArrowRight, Home and End. `aria-valuenow` goes to 13, then `min`, then `max`.
  - Review Focus: on the range fixture `[20, 80]`, focus the minimum thumb and press End. The minimum ends at 80 or below, and the maximum stays at 80.
- **Toggle Group, single:** Tab reaches only the checked item, and ArrowRight moves focus and checks the next one (`aria-checked`).
  - Activating the checked item again leaves exactly one checked item, provided the fixture uses the same no-empty guard as `SegmentedControl` (Task 10). Otherwise, record the raw primitive result.
- **Tag Input:**
  - type `alpha` and press Enter;
  - type `beta,`;
  - Backspace on the empty input removes `beta`;
  - the status text reads "Removed beta".
- **Tag Input inside Field:** the inner input's accessible name is the label, and `aria-describedby` includes the hint (Review Focus).
- **Input OTP:** paste `12-34 56789` through `page.evaluate` with a `ClipboardEvent`, or `keyboard.insertText` where paste is unsupported. The value is `123456` (the Radix hidden input value, or the Base `OTPField` hidden input), and the field is named.

- [ ] **Step 1: Run** `corepack pnpm exec vitest run apps/www/src/preset-editor/model.test.ts`. Expected: FAIL, because the five ids are missing.
- [ ] **Step 2: Write `tests/e2e/form-controls.spec.ts`** with the tests above.
- [ ] **Step 3: Implement** the scenes, gallery, fixtures and site entries.
- [ ] **Step 4: Run** `pnpm generate:preview`, the model test, and `corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/form-controls.spec.ts`. Expected: PASS. Fix the templates, not the tests, when a behaviour test fails.
- [ ] **Step 5: Commit** with `git commit -m "feat(preview): show the form controls in the scenes, gallery and site"`.

### Task 9: Website build step for catalog components

**Files:**
- Create: `scripts/generate-www-ui.mjs`. It calls `compile` from `@ombelle/compiler` (as `scripts/generate-preview.ts` does) for `slider`, `toggle-group` and `chip`, with the built-in Ombelle preset and the Radix edition. It writes the artifacts under `apps/www/src/generated/ui/`, using the paths `components/ui/*.tsx|.css` and `lib/utils.ts`.
- Modify:
  - `.gitignore`: add `apps/www/src/generated/`.
  - `scripts/build-hosted-www.mjs`: run `generate-www-ui.mjs` after `build.mjs`.
  - `apps/www/package.json`: `predev` also runs it, and the two Radix dependencies are added at 1.6.1 and 1.2.1.
  - `apps/www/tsconfig.json`: map `@/components/ui/*` and `@/lib/*` to `src/generated/ui/…`, if the compiled sources import those aliases.
  - `apps/www/src/app/globals.css`: add only the catalog tokens the three stylesheets read that the site lacks. Find them with the test below.
- Test: `apps/www/src/generated-ui.test.ts` (new).

**Interfaces:**
- Produces imports `@/components/ui/slider`, `@/components/ui/toggle-group` and `@/components/ui/chip` for Task 10. The exports are those of Tasks 2, 4 and 5.

- [ ] **Step 1: Write the failing test.**
  - Running the script twice produces identical files.
  - Every `var(--name)` that the three generated stylesheets read without a fallback is defined in `globals.css` under `:root`, with its dark override where the stylesheet changes with the mode.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run apps/www/src/generated-ui.test.ts`. Expected: FAIL, because the script is missing.
- [ ] **Step 3: Implement** the script, the wiring and the missing tokens. Copy the token values from the Ombelle preset's light and dark modes, so the components match the site's brand.
- [ ] **Step 4: Run** the test and `cd apps/www && corepack pnpm run build`. Expected: PASS and a successful build. No route changes size yet, because nothing imports the components.
- [ ] **Step 5: Commit** with `git commit -m "build(www): compile catalog form controls for the site at build time"`.

### Task 10: Editor chrome swaps

**Files:**
- Modify:
  - `apps/www/src/editor-shell/inspector.tsx`:
    - `SegmentedControl` renders `ToggleGroup type="single" variant="segmented"` with the same props, and ignores an empty `onValueChange` value.
    - `SliderRow` renders `Slider` in place of its range input, keeping the number field and the reset button. The number field clamps to `min`..`max` on commit, and both stay in sync.
  - `apps/www/src/editor-shell/editor-shell.module.css`: remove `.segmented` and `.sliderRange` rules that are no longer used.
  - `apps/www/src/preset-editor/components/preset-controls.tsx` (family picker), `apps/www/src/editor/components/family-picker.tsx`, `properties-panel.tsx` (variant picker) and `apps/www/src/preset-editor/components/glass-starting-points.tsx`: each becomes a single `ToggleGroup` whose `ToggleGroupItem` children keep the current rich content and `data-family` / `data-preset` attributes, with the same no-empty guard.
- Test:
  - Update `inspector.test.tsx`, `family-picker.test.tsx`, `glass-notice.test.tsx`, `properties-panel.test.tsx`, `glass-starting-points.test.tsx` and `preset-controls.test.tsx`, moving `aria-pressed` to `role="radio"` and `aria-checked`.
  - Update the e2e tests in `tests/e2e/editor.spec.ts`, `preset-editor.spec.ts` and `liquid-glass.spec.ts` that select by pressed state.

**Interfaces:** consumes the Task 9 imports. `SegmentedControl` and `SliderRow` keep their exported signatures.

- [ ] **Step 1: Update the unit tests first.**
  - `SegmentedControl` renders `role="radiogroup"` named by its label, with exactly one `aria-checked="true"`.
  - Calling its `onValueChange` with `''` does not call `onChange` (Review Focus).
  - `SliderRow` renders `role="slider"` and keeps the number input.
  - The pickers assert `aria-checked` on the selected `data-family` or `data-preset`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run apps/www/src/editor-shell apps/www/src/editor apps/www/src/preset-editor`. Expected: the updated tests FAIL.
- [ ] **Step 3: Implement** the swaps.
- [ ] **Step 4: Run** the same tests. Expected: PASS. Then update and run the three e2e files with the project's default Playwright config. Expected: PASS.
- [ ] **Step 5: Measure the size.**
  - Run `cd apps/www && corepack pnpm run build`.
  - Record the after values next to the baseline in `docs/evidence/form-controls-073.md`.
  - If any route grows by more than 10 kB gzipped, stop and report to the user before going on.
- [ ] **Step 6: Commit** with `git commit -m "feat(www): use catalog Toggle Group, Slider and Chip in the editor"`.

### Task 11: Audit and board comparison

**Files:**
- Modify: the family CSS that the audit or the board comparison flags.
- Modify: `packages/catalog/test/specimen-audit-fixes.test.ts`, one pinned declaration per fix.
- Modify: `docs/evidence/form-controls-073.md`.
- Create: `docs/evidence/images/form-controls/board-<family>-<section>.png`.

- [ ] **Step 1: Audit.** Run `pnpm generate:preview` and `pnpm test:specimen-audit`. Expected: no findings in the four stable families. Fix each finding with a test that fails first. Rerun only the configurations a fix affects.
- [ ] **Step 2: Compare with the boards.**
  - For every family, measure computed styles of matching elements on the board and on the audit specimen: font size, weight, case, colours, padding, borders, radius, shadow and size.
  - Fix differences in the components with tests.
  - Record the rest in a "Differences that remain" table, with the reason for each. Fonts and the Button and Input sizes are known preset-level differences from sub-project 2.
- [ ] **Step 3: Commit** with `git commit -m "fix(catalog): match the form controls to the 0.7.3 boards"`. If there are no fixes, use `docs:` and commit only the evidence.

### Task 12: Documentation

**Files:**
- Create: `docs/components/{slider,toggle-group,chip,tag-input,input-otp}.md`, following `docs/components/meter.md`: install note, examples, API and accessibility, recipe, Base UI edition, liquid glass.
- Modify:
  - `docs/accessibility-review.md`: check rows and results rows for the five, outside the PR5 count.
  - `docs/03-components-styles-accessibility.md`: a paragraph on the 0.7.3 form controls.
  - `README.md`: the count becomes 40.
  - `CHANGELOG.md`: under Unreleased, the five components, the editor's new radio-group semantics and the build-time site step.
  - `tests/integration/liquid-glass-cli.test.ts`: the glass id list and install order get the five ids.

- [ ] **Step 1: Write the docs.** Claim only what Tasks 1–11 measured.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/liquid-glass-cli.test.ts tests/integration/www-route.test.ts`. Expected: PASS.
- [ ] **Step 3: Commit** with `git commit -m "docs: document the form controls"`.
