# Editor inputs (0.7.5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Number Input and Color Picker (with its `ColorPickerPair` part) to the catalog in both editions and all five families, with recipes. Then replace the website editors' native colour inputs and number fields with them.

**Architecture:**
- **Catalog:** follow the sub-project 1 plan (`docs/superpowers/plans/2026-11-12-primitives-075.md`) end to end:
  - contract ids, schema branches and appearance parts;
  - self-contained templates and per-family styles;
  - compiler specimens and install gating;
  - preview and website registration;
  - docs.
- **Self-contained templates:** templates never import other catalog components. The catalog has no component-to-component install mechanism, and Combobox and Calendar already inline Radix Popover. So Color Picker imports the Popover and Slider primitives directly (`@radix-ui/react-popover`, `@radix-ui/react-slider`, or Base UI `Popover` and `Slider`). It draws its text inputs and format select as native elements under its own slots, with each family's Input, Popover, Slider and Badge rules repeated in `color-picker` CSS. This is a ruling against the spec's "Installing it installs those four"; the spec is amended alongside this plan.
- **Colour maths:** pure exported functions inside the Color Picker template file, between `// color-math:start` and `// color-math:end`. The Base template carries the same block, and a unit test keeps the two blocks byte-identical.
- **Website:** `scripts/generate-www-ui.ts` compiles both components into `apps/www/src/generated/ui/` at build time.

**Tech Stack:**
- TypeScript ES modules and React 19.
- Radix Popover and Slider, and Base UI 1.9.0 `Popover` and `Slider`; all are already pinned.
- lucide-react icons: `Minus`, `Plus`, `Pipette`.
- Next.js 16, Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-editor-inputs-075-design.md`

## Global Constraints

- **Toolchain and branch:** Node 24.19.0 and pnpm 11.25.0 (`corepack pnpm …`).
  - Branch `feat/editor-inputs-075`, created from `feat/primitives-075` (PR #115, not yet merged). Open its PR against that branch, or rebase onto `main` once #115 merges.
- **Commits:** Conventional Commits, with no `codex` prefix.
- **Generated files:** edit `schemas/`, never `packages/contracts/src/*schema*.ts`; edit catalog sources, never `generated.ts`; run `corepack pnpm build:packages` after package source changes.
- **No new runtime dependency.**
  - Number Input: `lucide-react`, in both editions.
  - Color Picker, Radix edition: `@radix-ui/react-popover`, `@radix-ui/react-slider`, `lucide-react`.
  - Color Picker, Base edition: `@base-ui/react`, `lucide-react`.
- **Component ids:** `number-input` and `color-picker`. The catalog goes from 50 to 52 components.
- **Family support:** liquid glass is `experimental` for both components (add them to `glassExperimental`); the other four families are `stable`.
- **Default look:** each family follows board `project/<Family>08Components.dc.html`, section 01 (Color Picker, eyedropper included) and section 02 (Number Input), in https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U.
  - Read the board with the Artifact tool's `read` action (`paths`) into the session scratchpad.
  - Compare computed styles, not screenshots alone.
- **Install gate:** add both ids to `catalog075Components` in `apps/www/src/snapshots/install-command.ts` (minimum CLI `0.7.5`).
- **CSS rules:**
  - one `data-slot` or `data-<component>-…` marker per selector;
  - a forced-colours block in every file;
  - interactive targets at least 24 × 24 px;
  - reduced motion removes transitions;
  - liquid glass: focus ring 2px `--foreground` with no offset.
- **Browser spec placement:** the new spec `tests/e2e/editor-inputs-075.spec.ts` goes in `playwright.specimen-audit.config.ts` `testMatch` **and** in `playwright.config.ts` `testIgnore`.
  - Any change in the number of tests in a spec listed in `browserSpecCounts` (`scripts/foundation-evidence.mjs`) updates that count, the total in its comment, `tests/integration/foundation-groups.test.ts` (`expected`, in three places, and the per-spec count) and the README's "The gate expects N browser cases". This broke CI on PR #115.
- **Website scope and size:**
  - The changes touch the editors only; the marketing home is not touched.
  - Record First Load JS of `/editor/*` and `/preset-editor` before and after. If a route grows by more than 10 kB gzipped, stop and report.
- **Running checks:** run only the tests a change affects, and do not re-run checks that already passed on unchanged code (user instruction).
- **Remote actions:** no push, release or deployment without asking.

## Review Focus

- **A controlled Number Input echoing its own half-typed value.** The user types `1.`, and the parent stores `1` and passes `value={1}` back. Expected: the field still shows `1.`, because a focused input whose text parses to the incoming value is not resynced. On blur, an external `value={4}` replaces the text. Task 2 pins this in the browser fixture.
- **Hue at grey, black or white.** At saturation 0 or brightness 0, the colour has no hue. Dragging the area to its bottom edge and back must not reset the hue slider to 0. Expected: the picker keeps its own hue state and derives hue from the value only when the value has chroma. Task 3 pins this in a unit test of `colorStateFromValue(value, previousHue)`; Task 6 pins it in the browser.
- **An external value change while the popover is open.** For example, the editor's Reset button. Expected: the area marker, hue, format value and contrast readout all follow, and the trigger's text input shows the new value. Task 6 pins this with a fixture reset button.
- **An out-of-gamut OKLCH typed into the text input, then the popover opened.** Expected: opening, focusing the area or switching the format never rewrites the typed value. Only an area move, a hue change, a swatch or the eyedropper replaces it. Task 3 pins this in a unit test and Task 6 in the browser.
- **The eyedropper during server render and when the popover closes mid-pick.** Expected:
  - the server HTML has no eyedropper button, so the first client render matches it;
  - closing the popover aborts the pending `open()`, and its late result is ignored.
  Task 4 pins the SSR case; Task 6 pins the abort with a stub that resolves after close.

---

### Task 1: Contracts and size baseline

**Files:**
- Modify:
  - `packages/contracts/src/component-ids.ts`
  - `style-families.ts` (`glassExperimental`)
  - `schemas/component-recipe.schema.json` (two `oneOf` branches)
  - `component-recipe-appearance.ts`
  - `component-recipe.ts` (`validateComposition`)
- Create: `docs/evidence/editor-inputs-075.md`, holding only the size baseline for now.
- Test: `packages/contracts/test/component-recipe.test.ts` and `style-support.test.ts`.

**Interfaces (recipe fields, exact names and defaults):**

| Component | Props | Content |
| --- | --- | --- |
| `number-input` | `min` integer -1000–1000 (default 0); `max` integer -1000–1000 (default 32); `step` number 0.01–100 (default 1); `unit` enum `none\|px\|ms\|%\|deg` (default `px`); `value` number (default 8) | `label` (default `Radius`); `hint` (default `Corner radius of buttons and cards`) |
| `color-picker` | `format` enum `oklch\|hex\|rgb` (default `oklch`); `paired` boolean (default true); `contrast` boolean (default true); `swatches` integer 0–8 (default 6); `eyeDropper` boolean (default true) | `label` (default `Primary`); `value` (default: the board's section 01 light primary); `darkValue` (default: the board's dark primary) |

- **Values from the board:** read `value` and `darkValue` from board section 01 of the Ombelle family. Pin them as literals in the schema defaults and in the test.
- **Appearance parts** (existing helpers):
  - `number-input`: `surface('number-input')`;
  - `color-picker`: `surface('color-picker-trigger')`, `surface('color-picker-content')`, `mark('color-picker-area-thumb')`.
- **`validateComposition` rejects**, each with a message naming the field:
  - `min > max`;
  - a `number-input` `value` outside `min`..`max`;
  - a `color-picker` `value` or `darkValue` that `parseColor` (Task 3) cannot read;
  - a `darkValue` with `paired: false`;
  - an empty `label` on either component.
  The contracts package cannot import the catalog, so it gets a minimal copy of `parseColor` in `packages/contracts/src/color-syntax.ts` (`isParsableColor(text: string): boolean`). It accepts the same forms as Task 3. Task 3 adds a test checking that both agree on a shared list of inputs.

- [ ] **Step 0: Record the size baseline.** Run `cd apps/www && corepack pnpm run build`, or `node scripts/measure-www-first-load.mjs` if it gives the same table. Copy First Load JS for `/editor/*` and `/preset-editor` into the evidence file under "Website size, before", with the commit hash.
- [ ] **Step 1: Write the failing contract tests:**
  - both ids are in `componentRecipeComponents`;
  - glass support is `experimental`, and `stable` elsewhere;
  - both default recipes validate;
  - each rejection above fails;
  - `isParsableColor` accepts `#1d4ed8`, `#abc`, `rgb(29 78 216)`, `rgb(29, 78, 216)`, `oklch(55% 0.22 6)` and `oklch(0.55 0.22 6)`, and rejects `red`, `#12345`, `rgb(1 2)` and `hsl(0 0% 0%)`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/contracts`. Expected: FAIL.
- [ ] **Step 3: Implement** the ids, schema branches, appearance parts, rules and `color-syntax.ts`. Then run `node scripts/sync-schema.mjs`.
- [ ] **Step 4: Run** the contracts tests. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(contracts): add the Number Input and Color Picker ids and recipe schemas"`.

### Task 2: Number Input

**Files:**
- Create:
  - `packages/catalog/src/templates/number-input.tsx`: one template, with no Base file.
  - `styles/number-input/{flat,minimalist,neo-brutalism,ombelle,liquid-glass}.css`.
- Modify:
  - `component-slots.ts`: `'number-input': ['number-input', 'number-input-input', 'number-input-decrement', 'number-input-increment', 'number-input-unit']`.
  - `index.ts` `extraDependencies`: `'number-input': ['lucide-react']`.
  - `expansion-examples.ts`.
- Test: `packages/catalog/test/number-input.test.ts`.

**Interfaces:**
- `NumberInput(props)`, with `'use client'`:
  - Props: `Omit<React.ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'step'>` & `{ value?: number | null; defaultValue?: number | null; onValueChange?(value: number | null, details: { text: string; valid: boolean }): void; min?: number; max?: number; step?: number; largeStep?: number; unit?: string; decrementLabel?: string; incrementLabel?: string }`.
  - `className` goes on the root `div[data-slot="number-input"]`. The other props, including `id` and `aria-*`, go on the input.
- Exported pure helpers, tested directly:
  - `parseNumberText(text: string): number | null` accepts optional sign, digits and an optional fraction; `''`, `'-'`, `'1.'` and `'12a'` give `null`.
  - `stepValue(current: number | null, delta: number, min?: number, max?: number): number` starts from `min ?? 0` when `current` is null, then clamps.
  - `spokenUnit(unit: string): string` maps `px` to `pixels`, `ms` to `milliseconds`, `%` to `percent` and `deg` to `degrees`. Any other unit is returned as written.
- The stepper default names "Decrease <label>" and "Increase <label>" read the input's name. Take `aria-label`, or else the text of the `<label for=id>` found after mount. The name falls back to "Decrease value" and "Increase value".
- The root carries `data-invalid` when the input is `aria-invalid`, so the family CSS draws one error border.

- [ ] **Step 1: Write the failing tests:**
  - the contract: client, part `NumberInput`, the five slots, dependency `lucide-react`, glass `experimental`, and the same template for both editions;
  - the helpers, with the examples above, plus `stepValue(31, 10, 0, 32) === 32` and `stepValue(null, 1, 4) === 5`;
  - SSR of `<NumberInput aria-label="Radius" defaultValue={8} min={0} max={32} unit="px" />` gives:
    - `role="spinbutton"`, `inputmode="decimal"`, `aria-valuenow="8"`, `aria-valuemin="0"`, `aria-valuemax="32"` and `aria-valuetext="8 pixels"`;
    - two `tabindex="-1"` buttons named "Decrease Radius" and "Increase Radius";
    - `aria-hidden` icons.
  - At `defaultValue={32}`, the increment button is `disabled`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/number-input.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the template and the five stylesheets from board section 02:
  - the box follows the family Input;
  - the steppers are ghost icon buttons;
  - the unit uses `--muted-foreground`.
  Keyboard and invalid behaviour follow the spec: `aria-invalid` is set on blur only; text is never clamped or rewritten; the resync rule is in the Review Focus.
- [ ] **Step 4: Run** `corepack pnpm build:packages` and the test. Expected: PASS, and the style lint passes.
- [ ] **Step 5: Commit** `git commit -m "feat(catalog): add Number Input"`.

### Task 3: Colour maths

**Files:**
- Create: the `// color-math:start` … `// color-math:end` block at the top of `packages/catalog/src/templates/color-picker.tsx`. The rest of the file can be a stub exporting only the maths until Task 4.
- Test: `packages/catalog/test/color-math.test.ts`.

**Interfaces (exported from the template):**
- `type Rgb = { r: number; g: number; b: number }`, with channels 0–255 as floats.
- `type Hsv = { h: number; s: number; v: number }`: h 0–360, s and v 0–100.
- `type Oklch = { l: number; c: number; h: number }`: l 0–1.
- `type ColorFormat = 'oklch' | 'hex' | 'rgb'`.
- `parseColor(text: string): { rgb: Rgb; oklch: Oklch; inGamut: boolean } | null` accepts exactly the spec's forms.
- Conversions: `rgbToHsv`, `hsvToRgb`, `rgbToOklch`, `oklchToRgb(o: Oklch): { rgb: Rgb; inGamut: boolean }` (clipped), and `formatColor(rgb: Rgb, format: ColorFormat): string`, following the spec's writing rules.
- `contrastRatio(a: Rgb, b: Rgb): number` (WCAG 2) and `contrastLevel(ratio: number): 'AAA' | 'AA' | 'AA large' | 'Fails'`.
- `colorStateFromValue(value: string, previousHue: number): { hsv: Hsv; rgb: Rgb } | null`. It keeps `previousHue` when the colour's HSV saturation or value is 0 (Review Focus).

- [ ] **Step 1: Write the failing tests:**
  - **Round trips:** hex to RGB to hex is exact for 20 fixed colours. OKLCH to RGB to OKLCH holds within 0.001 L, 0.001 C and 0.1 H for in-gamut values with C > 0.02.
  - **Parsing:** each accepted form parses; `red`, `#12345`, `rgb(1 2)`, `hsl(...)` and `oklch(1 2)` give `null`.
  - **Writing:** `formatColor({r:29,g:78,b:216}, 'hex') === '#1d4ed8'`, `'rgb'` gives `'rgb(29 78 216)'`, and OKLCH output has trimmed trailing zeros.
  - **Contrast:** `contrastRatio(black, white) === 21`, and the board's primary on its foreground rounds to 5.1. Levels sit at the boundaries 7, 4.5 and 3.
  - **Gamut:** `parseColor('oklch(0.7 0.4 150)').inGamut === false`.
  - **Hue memory:** `colorStateFromValue('#000000', 214).hsv.h === 214`.
  - **Contracts agreement:** `parseColor(x) !== null` equals `isParsableColor(x)` (Task 1) for the shared list.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/color-math.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use the published OKLab matrices (Björn Ottosson) and sRGB transfer functions; there is no dependency.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(catalog): add the Color Picker colour maths"`.

### Task 4: Color Picker and Color Picker Pair

**Files:**
- Modify: `templates/color-picker.tsx`.
- Create:
  - `templates/base/color-picker.tsx`, with the identical maths block;
  - `styles/color-picker/{five}.css`.
- Modify:
  - `component-slots.ts`: `'color-picker': ['color-picker', 'color-picker-trigger', 'color-picker-input', 'color-picker-content', 'color-picker-area', 'color-picker-area-thumb', 'color-picker-hue', 'color-picker-hue-thumb', 'color-picker-format', 'color-picker-format-select', 'color-picker-value', 'color-picker-eyedropper', 'color-picker-swatches', 'color-picker-swatch', 'color-picker-contrast', 'color-picker-contrast-level', 'color-picker-pair']`.
  - `index.ts` `extraDependencies`: `'color-picker': ['@radix-ui/react-popover', '@radix-ui/react-slider', 'lucide-react']`.
  - `expansion-examples.ts`.
- Test: `packages/catalog/test/color-picker.test.ts`.

**Interfaces** (props exactly as in the spec's Color Picker section):
- `ColorPicker`, `ColorPickerSwatches(props: { swatches?: { label: string; value: string }[] } & React.ComponentProps<'div'>)` and `ColorPickerPair(props: { label: string } & React.ComponentProps<'div'>)`, all `'use client'`.
- **Context:** `ColorPickerPair` provides `{ label }` through a context. A child with `mode` and no `label` takes "<label> · light" or "· dark". `ColorPickerSwatches` reads the picker's value and setter from a picker context, so it works inside the popover and beside the trigger.
- **Eyedropper:**
  - A `useHasEyeDropper(): boolean` hook starts at `false` and sets `'EyeDropper' in window` in an effect.
  - Pending picks use an `AbortController` held in a ref. It is aborted on popover close and on unmount, and a result that arrives after the abort is discarded.
- **Live region:** a single `aria-live="polite"` span inside `color-picker-contrast` is updated on `pointerup`, `keyup` and `lostpointercapture`, not on move.

- [ ] **Step 1: Write the failing tests:**
  - the contract for both editions: client; parts `ColorPicker`, `ColorPickerSwatches`, `ColorPickerPair`; the slots; the Radix dependencies above and Base `@base-ui/react` + `lucide-react`; glass `experimental`;
  - the maths blocks of the two templates are byte-identical;
  - SSR of `<ColorPicker label="Primary" defaultValue="#1d4ed8" />` in each edition gives:
    - a button named "Open Primary color picker" with `aria-expanded="false"`;
    - an input labelled "Primary" with value `#1d4ed8`;
    - no element named "Pick a color from the screen" (Review Focus).
  - SSR of `<ColorPickerPair label="Primary"><ColorPicker mode="light" …/><ColorPicker mode="dark" …/></ColorPickerPair>` gives `role="group"` named "Primary", two triggers named "Open Primary · light color picker" and "Open Primary · dark color picker", and `data-mode="dark"` on the dark trigger.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/color-picker.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both templates and the five stylesheets from board section 01, following the spec's Styles section:
  - trigger row from the family Input;
  - popover from the family Popover;
  - thumbs from the family Slider;
  - pill from the family Badge;
  - two-ring area marker;
  - forced colours and reduced motion.
- [ ] **Step 4: Run** `corepack pnpm build:packages`, the test and `corepack pnpm exec vitest run packages/catalog`. Expected: PASS, with 52 components in the generated catalog.
- [ ] **Step 5: Commit** `git commit -m "feat(catalog): add Color Picker and Color Picker Pair"`.

### Task 5: Compiler specimens and install gating

**Files:**
- Modify:
  - `packages/compiler/src/recipe-specimen.ts` (two `case`s);
  - `tests/helpers/catalog-recipe-fixtures.ts` (`editedFields`);
  - `apps/www/src/snapshots/install-command.ts`: add both ids to `catalog075Components`;
  - `packages/compiler/test/fixtures/stable-family-hashes.json`: regenerate.
- Test: `packages/compiler/test/editor-inputs-075.test.ts` (new) and `apps/www/src/snapshots/display-install.test.ts`.

**Interfaces (specimens from the Task 1 fields):**
- **`number-input`:** a `label` with `htmlFor`, a `NumberInput { id, min, max, step, unit: unit === 'none' ? undefined : unit, defaultValue: value, 'aria-describedby' }`, and a `p` with the hint.
- **`color-picker`:**
  - Each picker gets `{ defaultFormat: format, eyeDropper, contrastWith, contrastLabel: 'Primary foreground' }`. With `contrast`, `contrastWith` is the board's foreground value; otherwise it is undefined.
  - `swatches` takes the first N entries of a fixed eight-colour list read from board section 01, with the same labels.
  - With `paired`, the specimen renders `ColorPickerPair { label }` with a light picker (`value`) and a dark picker (`darkValue`). Otherwise it renders one `ColorPicker { label, defaultValue: value }`.

- [ ] **Step 1: Write the failing tests:**
  - each default draft compiles in all five families;
  - the emitted part names match, and `findShadowedNames` is `[]`;
  - the output is deterministic;
  - both ids report minimum CLI `0.7.5`, and CLI 0.7.4 is refused with the notice.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/compiler/test/editor-inputs-075.test.ts apps/www/src/snapshots`. Expected: FAIL.
- [ ] **Step 3: Implement**, then regenerate hashes with `corepack pnpm exec tsx scripts/record-stable-hashes.ts`. Only the two new components' entries may change.
- [ ] **Step 4: Run** `corepack pnpm exec vitest run packages/compiler apps/www/src/snapshots`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(compiler): describe and gate the Number Input and Color Picker recipes"`.

### Task 6: Preview, website catalog and browser tests

**Files:**
- Modify:
  - `apps/www/src/site/components/expansion.ts`: two docs entries with `minimumCli: '0.7.5'`.
  - `apps/preview/src/scenes/settings.tsx`: a "Brand color" `ColorPickerPair` with contrast against its foreground, and a Number Input "Session timeout" with `unit="min"`. `min` is not a spoken unit, so it is read as written.
  - `apps/www/src/preset-editor/preview-scenes.ts`: register both ids.
  - `fixtures/shared/preset-gallery.tsx`: two sections.
  - `fixtures/shared/edition-scenario.tsx` and `edition-scenario-base.tsx`: the fixtures below, each with a `data-testid`. The controlled fixtures include a "Reset" button and an echo of the last `onValueChange` arguments in a `data-testid` output.
  - `playwright.specimen-audit.config.ts` (`testMatch`) and `playwright.config.ts` (`testIgnore`): add `editor-inputs-075.spec.ts`.
- Create: `tests/e2e/editor-inputs-075.spec.ts`.
- Test: `apps/www/src/preset-editor/model.test.ts`.

**Browser tests**, each run for `radix` and `base` on `/editions/ombelle/<edition>/?mode=light`:
- **Number Input:**
  - Arrow, Shift + Arrow, Page Up and Down, Home and End change `aria-valuenow` by the spec's amounts and clamp.
  - Typing `1.` keeps `1.` visible while the controlled echo shows `1` and `valid: false`. Blur sets `aria-invalid`. Reset then shows the reset value (Review Focus).
- **Color Picker:**
  - The area moves with the arrow keys, and its `aria-valuetext` changes.
  - The hue Slider changes the value.
  - Switching the format to Hex rewrites the value input to `#rrggbb`.
  - A swatch sets the value and gets `aria-pressed="true"`.
  - The contrast pill shows the expected level text.
  - Brightness to 0, then back, keeps the hue (Review Focus).
  - Reset while the popover is open moves the marker and the value (Review Focus).
  - An out-of-gamut OKLCH typed, then the popover opened and the format focused, keeps the typed text (Review Focus).
- **Eyedropper,** each run with `page.addInitScript` stubbing `window.EyeDropper`:
  - a stub returning `#1d4ed8` sets the OKLCH form of that colour;
  - a stub rejecting `AbortError` leaves the value unchanged;
  - a stub resolving 500 ms later, with the popover closed first, leaves the value unchanged (Review Focus);
  - with no stub, the button is absent.
- **Pair:** a group named by its label holds two named pickers.

- [ ] **Step 1: Run** `corepack pnpm exec vitest run apps/www/src/preset-editor/model.test.ts`. Expected: FAIL, because both ids are missing.
- [ ] **Step 2: Write the spec** with the tests above.
- [ ] **Step 3: Implement** the scenes, gallery, fixtures and site entries.
- [ ] **Step 4: Run** `pnpm generate:preview`, the model test and `corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/editor-inputs-075.spec.ts`. Expected: PASS. When a behaviour test fails, fix the template, not the test.
- [ ] **Step 5: Run** `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/foundation-browser-inventory.test.ts tests/integration/foundation-groups.test.ts`. Expected: PASS, which shows the new spec is not counted by the default config.
- [ ] **Step 6: Commit** `git commit -m "feat(preview): show Number Input and Color Picker in the scenes, gallery and site"`.

### Task 7: Website swaps

**Files:**
- Modify:
  - `scripts/generate-www-ui.ts`: `wwwUiComponents` gains `number-input` and `color-picker`.
  - `apps/www/src/app/globals.css`: only the tokens the new stylesheets read that the site lacks, found by `apps/www/src/generated-ui.test.ts`.
  - `apps/www/src/preset-editor/components/preset-controls.tsx`:
    - each token's `popover="auto"` panel with two native colour inputs becomes `ColorPickerPair label={token label}` with light and dark `ColorPicker`s;
    - `swatches` are the token's scheme dots;
    - `contrastWith` is the token's `-foreground` pair, measured with `preset-editor/contrast.ts`;
    - `onInvalid` feeds the existing `aria-invalid` and `preset-error` path;
    - the reset buttons and measured placeholders stay;
    - `shadowField` X and Y become `NumberInput`.
  - `apps/www/src/editor/components/properties-panel.tsx`: the colour roles become `ColorPicker`, keeping their reset buttons and `colorPlaceholder`; the shadow X and Y fields become `NumberInput`.
  - `apps/www/src/editor/components/catalog-appearance.tsx`: the colour fields become `ColorPicker`.
  - `apps/www/src/editor/components/catalog-properties.tsx`: `type="number"` becomes `NumberInput` with `min`, `max` and `step` from the field.
  - `apps/www/src/editor-shell/inspector.tsx`: the `SliderRow` text field becomes `NumberInput id={`${id}-number`}`. The editor keeps receiving `details.text`.
  - Remove the CSS rules these swaps make unused: the `input[type='color']` rules in `preset-editor.module.css` and `button-editor.module.css`, and the matching `.preset-popover` panel rules.
- Test:
  - `apps/www/src/editor-shell/inspector.test.tsx`, `preset-controls` and `properties-panel` unit tests (where present);
  - `tests/e2e/preset-editor.spec.ts`, `editor.spec.ts` and `catalog-editors.spec.ts` where they fill colour or number inputs.
  - If an e2e file's test count changes, update the counts as described in Global Constraints.

- [ ] **Step 1: Update the unit tests first:**
  - the inspector renders `role="spinbutton"` for the number field;
  - a preset token renders `role="group"` named by the token, holding two "Open … color picker" buttons;
  - an unparsable colour still sets `aria-invalid` and shows the `preset-error` message.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run apps/www/src`. Expected: the updated tests FAIL.
- [ ] **Step 3: Implement** the swaps.
- [ ] **Step 4: Run** the same unit tests, then the three e2e files with the default Playwright config. Expected: PASS, apart from the pre-existing failures recorded in `docs/evidence/primitives-075.md`.
- [ ] **Step 5: Measure the size.** Record the after values in `docs/evidence/editor-inputs-075.md`. More than 10 kB gzipped on any route means stop and report.
- [ ] **Step 6: Commit** `git commit -m "feat(www): use catalog Number Input and Color Picker in the editors"`.

### Task 8: Audit and board comparison

**Files:**
- Modify: the family CSS that the audit or the comparison flags; `packages/catalog/test/specimen-audit-fixes.test.ts` (one pinned declaration per fix); `docs/evidence/editor-inputs-075.md`.
- Create: `docs/evidence/images/editor-inputs-075/board-<family>-<section>.png`.

- [ ] **Step 1: Audit.** Run `pnpm generate:preview`, then `OMBELLE_AUDIT_COMPONENTS=number-input,color-picker pnpm test:specimen-audit`. Expected: no findings in the four stable families. Fix each finding with a test that fails first, and rerun only the configurations a fix affects.
- [ ] **Step 2: Compare with the boards.** For each family, compare computed styles in sections 01 and 02 against the audit specimens, with the popover open: font, colours, padding, borders, radius, shadow and size. Fix the differences with tests, and record the remaining ones in a "Differences that remain" table.
- [ ] **Step 3: Commit** `git commit -m "fix(catalog): match Number Input and Color Picker to the boards"`, or `docs:` when only the evidence changed.

### Task 9: Documentation

**Files:**
- Create: `docs/components/number-input.md` and `color-picker.md`, following `docs/components/meter.md`. `color-picker.md` covers `ColorPickerPair`, the out-of-gamut rule, and the eyedropper support matrix: Chromium only, absent in Firefox and Safari.
- Modify:
  - `docs/accessibility-review.md`: rows for the 2D area, the contrast readout, the steppers and the eyedropper.
  - `docs/03-components-styles-accessibility.md`: a paragraph on both components.
  - `README.md`: the count becomes 52.
  - `CHANGELOG.md` under Unreleased: the two components and the editor swaps. Claim no upgrade route beyond what the CLI does.
  - `tests/integration/liquid-glass-cli.test.ts`: the glass id list and install order gain both ids.
  - The evidence file: commands, environment and results of Tasks 1–8.

- [ ] **Step 1: Write the docs.** Claim only what Tasks 1–8 measured.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/liquid-glass-cli.test.ts tests/integration/www-route.test.ts`. Expected: PASS.
- [ ] **Step 3: Commit** `git commit -m "docs: document Number Input and Color Picker"`.
