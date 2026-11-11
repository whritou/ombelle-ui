# Editors and liquid glass, batch 7a, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The glass editors choose and show a preview backdrop from measured contrast, light the lab ink in both modes when the contrast allows, and simulate `prefers-reduced-transparency` with a preview toggle.

**Architecture:**
- A measured, test-checked table of each scene's channel range feeds a new compiler function that rates a preset's glass text on one scene.
- Site helpers turn those ratings into the automatic scene, the menu labels and the lab ink.
- The previews receive the ink and a reduced-transparency flag through their existing message protocols. A preview-side mirror copies the `prefers-reduced-transparency` rules under an attribute.

**Tech Stack:** TypeScript, React 19, Next.js (apps/www), Vite (apps/preview), Vitest, Playwright with bundled Chromium.

**Spec:** `docs/superpowers/specs/2026-11-11-editors-glass-design.md`

## Global Constraints

- Branch `feat/editors-glass-073`, stacked on `feat/variants-more-073` (PR #107). Conventional Commits. No push, release or deploy without asking.
- Installed output does not change:
  - no catalog style edits;
  - no compiler CSS changes;
  - `stable-family-hashes.json` and `style-baseline.json` stay identical;
  - `glassContrastReport` output stays identical.
- The WCAG 2 ratio only, with a 4.5:1 threshold. No APCA.
- Liquid glass is experimental and non-blocking. The glass focus ring is a 2px `--foreground` ring with no gap.
- New Playwright specs must be added to `playwright.config.ts` `testIgnore`. Otherwise the foundation inventory test (`tests/integration/foundation-browser-inventory.test.ts`) fails, as it did on #103 and #104.
- Run only the tests of what changed. The specimen audit covers only Card, Button, Badge, Input, Select and Tabs, in the liquid glass configurations.
- Docs are in English. The user is answered in French.

## Review Focus

1. **Translucent text:** a preset whose glass text colour has alpha below 1 must rate 1:1 on every scene, never a passing ratio. This mirrors `opaqueText` in the report. Pinned in Task 1.
2. **Custom draft with no matching starting preset:** `pickGlassScene` without `startingPresetId` must still return a scene, with ties broken by `glassBackdropOptions` order. Pinned in Task 3.
3. **Repeated recompiles while the toggle is on:** the mirror must rebuild one `<style data-reduced-transparency-mirror>`. It must neither append nor loop on its own mutation. Pinned in Tasks 6 and 8.
4. **Manual backdrop choice:** a choice must survive edits to the preset, and reset only when the starting preset changes. Pinned in Task 5.
5. **Family change with the toggle on:** leaving liquid glass must remove `data-reduced-transparency` from the preview, even though the hidden toggle keeps its state. Pinned in Task 8.

---

### Task 1: Rate a preset's glass text on one scene

**Files:**
- Modify: `packages/compiler/src/glass-contrast.ts` (`glassBackdrop` near line 239, `resolve` near line 381; new export after `glassContrastReportFor`).
- Test: `packages/compiler/test/glass-contrast.test.ts`

**Interfaces:**
- Produces:
  - `export type GlassSceneRange = { low: number; high: number }`.
  - `export function glassContrastOnScene(data: Preset, mode: 'light' | 'dark', range: GlassSceneRange): number`.
- `glassBackdrop(design, mode, range?: GlassSceneRange)`: its `low` and `high` become `transfer(range.low)` and `transfer(range.high)`. With no range, it is unchanged.

- [ ] **Step 1: Write the failing tests** in `glass-contrast.test.ts`, under `describe('glassContrastOnScene')`:
  - `full range equals the worst filtered pair of the report`: for `builtin-liquid-glass-cristal` in light mode, `glassContrastOnScene(p, 'light', { low: 0, high: 1 })` equals the minimum of `Math.min(pair.ratioOverBlack, pair.ratioOverWhite)` over that mode's pairs in `glassContrastReport(p)`.
  - `a narrower range never rates lower`: for each built-in glass starting preset and mode, `onScene({ low: 0.6, high: 0.9 }) >= onScene({ low: 0, high: 1 })`.
  - `reduced transparency ignores the range`: with `design.transparency: 'reduced'`, the results for `{0.1, 0.2}` and `{0.8, 0.9}` are equal.
  - `text inside the surface range rates 1`: a pair whose text luminance lies between the painted darkest and brightest rates 1.
  - `translucent text rates 1`: `foreground` is set to `rgb(0 0 0 / 0.6)`.
  - `the report is unchanged`: a snapshot of `glassContrastReport` for every built-in glass starting preset equals the value computed before the change. Record it first with the unmodified code.

- [ ] **Step 2: Run them**
  - Run: `corepack pnpm exec vitest run packages/compiler/test/glass-contrast.test.ts`
  - Expected: FAIL, because `glassContrastOnScene` is not exported. The snapshot test passes.

- [ ] **Step 3: Implement**
  - `resolve(data, specs, range?)` passes `range` to `glassBackdrop`.
  - `glassContrastOnScene` resolves `glassContrastPairs` for one mode with the range, and applies `filtered(r, opacity)`. Opacity is 1 under reduced transparency, otherwise `glassOpacity`.
  - Each pair rates `!opaqueText(r) || inside ? 1 : Math.min(overDarkest, overBrightest)`, where `inside` is the `textLum > darkest && textLum < brightest` case that `bound` already computes. Have `bound` return `inside`.
  - The function returns the minimum over the pairs, rounded to 4 decimals.

- [ ] **Step 4: Run them**
  - Run: `corepack pnpm exec vitest run packages/compiler/test/glass-contrast.test.ts packages/compiler/test/liquid-glass.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - `git commit -m "feat(compiler): rate a glass preset's text on one backdrop scene"`

### Task 2: Measure the scenes

**Files:**
- Create:
  - `apps/preview/src/glass-scene-page.tsx`: route `/glass-scene/?scene=<backdrop>&mode=<light|dark>`. It renders only `GlassBackdropArt` and the backdrop CSS, through `setGlassBackdrop`. `scene=kit` shows the stylesheet gradient.
  - `tests/e2e/glass-scenes.spec.ts`, under `playwright.specimen-audit.config.ts`.
  - `apps/www/src/site/glass-backdrops.ts`, with only `glassSceneRanges` in this task.
- Modify:
  - `apps/preview/src/main.tsx`: add the route.
  - `playwright.specimen-audit.config.ts` `testMatch` and `playwright.config.ts` `testIgnore`: add `glass-scenes.spec.ts`.
  - `package.json`: add `"measure:glass-scenes": "cross-env OMBELLE_WRITE_GLASS_SCENES=1 playwright test tests/e2e/glass-scenes.spec.ts -c playwright.specimen-audit.config.ts"`. If `cross-env` is not a dependency, use a `node -e` wrapper; do not add a dependency.

**Interfaces:**
- Produces `export const glassSceneRanges: Record<PresetBackdrop, Record<'light' | 'dark', GlassSceneRange>>` from `apps/www/src/site/glass-backdrops.ts`.

**Ruling against the spec (recorded in the ledger):** the spec names `scripts/measure-glass-scenes.ts`. The measurement needs the preview server and a browser, which the specimen-audit config already starts. So it is one Playwright spec, which checks by default and writes the table when `OMBELLE_WRITE_GLASS_SCENES=1`, plus the package script. Cost if wrong: one wrapper script.

- [ ] **Step 1: Write the failing spec**
  - For each backdrop in `presetBackdrops` and each mode, at a 1280 × 800 viewport, open `/glass-scene/?scene=…&mode=…`.
  - Take `page.screenshot()` and decode it in the page through a canvas, as `recipeScreenshotEvidence` does in `tests/helpers/recipe-measurements.ts`.
  - Sample a 32 × 20 grid over x from 10 % to 90 % and y from 10 % to 90 %.
  - Compute the minimum and maximum of the R, G and B channels over every sample, divided by 255.
  - Without the write flag: `expect(Math.abs(measured.low - glassSceneRanges[scene][mode].low)).toBeLessThanOrEqual(0.02)`, and the same for `high`.
  - With the flag: write `glass-backdrops.ts`, rounded to 4 decimals, keeping the file's header comment.

- [ ] **Step 2: Run it**
  - Run: `corepack pnpm generate:preview && corepack pnpm exec playwright test tests/e2e/glass-scenes.spec.ts -c playwright.specimen-audit.config.ts`
  - Expected: FAIL, because `glass-backdrops.ts` does not exist.

- [ ] **Step 3: Generate the table**
  - Create `glass-backdrops.ts` with a placeholder export, then run `corepack pnpm measure:glass-scenes`.
  - Read the values: dark scenes (Nuit, Prisme) should have a lower `high` than light ones (Brume, Aube). If not, the page is wrong; debug it, do not edit the numbers.

- [ ] **Step 4: Run the check**
  - Run the command from Step 2.
  - Expected: PASS, 14 cases.
  - Also run: `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/foundation-browser-inventory.test.ts`
  - Expected: PASS, so the new spec does not enter the main inventory.

- [ ] **Step 5: Commit**
  - `git commit -m "feat(preview): measure the channel range of each glass backdrop scene"`

### Task 3: Pick a scene and decide the lab ink

**Files:**
- Modify: `apps/www/src/site/glass-backdrops.ts`
- Modify: `apps/preview/src/glass-backdrop-art.tsx`. Remove `hasLabPreviewInk` and move the lab preset list to `glass-backdrops.ts` as `labStartingPresets`.
- Test: `apps/www/src/site/glass-backdrops.test.ts` (new).

**Interfaces:**
- Consumes `glassContrastOnScene` and `GlassSceneRange` (Task 1), and `glassSceneRanges` (Task 2).
- Produces:
  - `export function glassSceneRatios(data: Preset, mode: GlassPreviewMode): Record<PresetBackdrop, number>`, rounded to 2 decimals.
  - `export function pickGlassScene(data: Preset, mode: GlassPreviewMode, startingPresetId?: StartingPresetId): PresetBackdrop`
  - `export type LabInk = 'light' | 'dark'`
  - `export function labInkFor(data: Preset, mode: GlassPreviewMode, scene: PresetBackdrop): LabInk | null`. Revised by the user's decision in the ledger: an unedited lab preset over its own scene for the mode, no measurement.
  - `export const labStartingPresets: readonly StartingPresetId[]`, which are `defaultGlassPresetId`, `builtin-liquid-glass-givre`, `-fume` and `-relief`.

- [ ] **Step 1: Write the failing tests**
  - `built-in presets keep their scene`: for every id in `presetBackdropsByMode`, which needs exporting as `glassPresetBackdrops` or reading through `glassPresetBackdrop`, and each mode, `pickGlassScene(startingPreset(id), mode, id) === glassPresetBackdrop(id, mode)`.
  - `dark text moves to a light scene`: Cristal with light-mode `foreground` set to `#0b0b0b` and `card` to `#f5f5f5` picks one of `mist`, `dawn` or `grid` in light mode.
  - `ties follow the menu order without a starting preset`: under reduced transparency, every ratio is equal, and `pickGlassScene(p, 'light')` returns `'kit'`, the first entry of `glassBackdropOptions`.
  - `lab ink`:
    - Givré on `dawn` in light returns `'light'`.
    - A lab preset on a dark scene rated 4.5 or more in dark returns `'dark'`. Pick the scene by reading `glassSceneRatios`; the test asserts the rule, not a fixed scene.
    - Any scene rated below 4.5 returns `null`.
    - `builtin-liquid-glass-voile` returns `null` everywhere.
    - `transparency: 'reduced'` returns `null`.

- [ ] **Step 2: Run them**
  - Run: `corepack pnpm exec vitest run apps/www/src/site/glass-backdrops.test.ts`
  - Expected: FAIL, because the exports are missing.

- [ ] **Step 3: Implement**
  - `pickGlassScene` takes the highest 2-decimal ratio. On a tie, `glassPresetBackdrop(startingPresetId, mode)` wins when it is among the tied scenes, then `glassBackdropOptions` order.
  - `labInkFor` returns `mode` when the starting preset is in `labStartingPresets`, the transparency is not `reduced`, and `glassSceneRatios(data, mode)[scene] >= 4.5`.

- [ ] **Step 4: Run them, and rule on any mismatch**
  - Run the Step 2 command.
  - If `built-in presets keep their scene` fails, the measurement disagrees with the hand-tuned table. Do not change the table to fit, and do not drop the test.
  - Write a ledger ruling: `Task 3: Ruling: <preset/mode> measures best on <scene> but keeps <table scene>`.
  - Make the tie rule a margin: the table scene wins when its ratio is within 0.5 of the best. State that in the evidence. Cost if wrong: one built-in shows a slightly lower-rated scene by default.
  - Expected after that: PASS.

- [ ] **Step 5: Commit**
  - `git commit -m "feat(www): pick the glass preview scene and lab ink from measured contrast"`

### Task 4: Lab ink in both modes in the previews

**Files:**
- Modify:
  - `apps/preview/src/glass-backdrop-art.tsx`: `setGlassBackdrop(root, scene, labInk: LabInk | null = null)` sets `data-glass-lab-ink` to the value, or removes it.
  - `apps/preview/src/glass-backdrop.css`: the `html[data-glass-lab-ink]:not(.dark)` blocks at lines 49 to 66 become `[data-glass-lab-ink='light']`, plus new `html.dark[data-glass-lab-ink='dark']` blocks with the same slots.
  - `apps/preview/src/editor-preview.tsx`: drop `state.mode === 'light'` at line 94.
    - The scene is `pickGlassScene(resolveRecipePreset(presetRef), mode, glassPreset)`.
    - The ink is `labInkFor(...)` while no override key is `colors` or starts with `glass`; keep that guard.
  - `apps/preview/src/catalog-recipe-preview.tsx`: the scene is `pickGlassScene` on the recipe's preset, with no lab ink, as today.
  - `apps/preview/src/preset-preview.tsx` line 134: use `current.message.view.labInk ?? null`.
  - `apps/www/src/preset-editor/preview-protocol.ts`:
    - `PresetView` gains `labInk?: LabInk`.
    - `sentPresetView` keeps it beside `backdrop`.
    - The validator filters it out like `backdrop`, and rejects any value other than `'light'` or `'dark'`.
- Test: `apps/www/src/preset-editor/preview-protocol.test.ts`.

**Interfaces:**
- Consumes `pickGlassScene`, `labInkFor` and `LabInk` (Task 3).
- Produces `PresetView.labInk`, used by Task 5.

- [ ] **Step 1: Write the failing protocol tests**
  - `accepts a lab ink with a backdrop`.
  - `rejects lab ink "dim"`.
  - `sentPresetView keeps labInk`.
- [ ] **Step 2: Run them**
  - Run: `corepack pnpm exec vitest run apps/www/src/preset-editor/preview-protocol.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement the protocol, the previews and the CSS as listed under Files.**
  - The dark text-shadow is `0 0 2px color-mix(in srgb, var(--glass-lab-veil, var(--card)) 12%, transparent)` under `.dark`.
  - The dark link and ghost buttons use `--glass-preview-ink`.
  - Wrap both blocks in `@media (forced-colors: none) and (prefers-reduced-transparency: no-preference)`. Task 6's mirror inverts `no-preference`, so the toggle switches them off too.
- [ ] **Step 4: Run them**
  - Run: `corepack pnpm exec vitest run apps/www/src/preset-editor/preview-protocol.test.ts apps/www/src/site && corepack pnpm typecheck`
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - `git commit -m "feat(preview): light the lab ink in dark mode when the scene's contrast allows"`

### Task 5: The automatic backdrop and its ratios in the preset editor and playground

**Files:**
- Modify:
  - `apps/www/src/site/glass-backdrops.ts`: add the menu helper.
  - `apps/www/src/preset-editor/components/preset-editor.tsx` (lines 95 to 104, 200 to 210, 456 to 461 and 476 to 484).
  - `apps/www/src/site/components/playground.tsx` (lines 52 to 57 and 96).
- Test: `apps/www/src/site/glass-backdrops.test.ts`.

**Interfaces:**
- Produces `export function glassBackdropMenu(data: Preset, mode: GlassPreviewMode, auto: PresetBackdrop, reduced: boolean): { value: PresetBackdrop; label: string }[]`.
  - Labels are formatted `${name}, ${ratio.toFixed(1)}:1`, with ` (auto)` appended when `value === auto` and `, below 4.5:1` appended when the ratio is below 4.5.
  - When `reduced` is true, every label shows the same opaque ratio, from `glassContrastOnScene` with any range.

- [ ] **Step 1: Write the failing tests**
  - `labels carry the ratio and auto`: Cristal in light, with `auto = 'mist'`. The label of `mist` matches `/^Brume, \d+\.\d:1 \(auto\)$/`.
  - `a failing scene says so in words`: a preset with a scene below 4.5. Its label contains `below 4.5:1`.
  - `reduced shows one ratio`: every label has the same number.
- [ ] **Step 2: Run them**
  - Expected: FAIL.
- [ ] **Step 3: Implement the helper and wire the components**
  - In the preset editor:
    - `const auto = pickGlassScene(draftPreset, mode, backdropPreset)`. `draftPreset` is the `Preset` that `presetGlassReport(draft)` already builds from the draft. Extract that builder if it is inline, so both use one value.
    - `backdrop = backdropOverride ?? auto`.
    - `backdropOptions = glassBackdropMenu(…)`.
    - The view sends `labInk: labInkFor(draftPreset, mode, backdrop, backdropPreset) ?? undefined`.
    - The `startingPreset` effect that clears the override stays as it is.
  - The playground does the same with its `draft`.
- [ ] **Step 4: Run them**
  - Run: `corepack pnpm exec vitest run apps/www/src/site apps/www/src/preset-editor && corepack pnpm typecheck`
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - `git commit -m "feat(www): choose the glass preview backdrop by contrast and show each scene's ratio"`

### Task 6: The reduced-transparency mirror

**Files:**
- Create:
  - `apps/www/src/site/reduced-transparency.ts`: the pure transform, testable under Vitest's node environment.
  - `apps/preview/src/reduced-transparency-mirror.ts`: the DOM adapter.
- Test: `apps/www/src/site/reduced-transparency.test.ts`.

**Interfaces:**
- Produces:
  - `export type MirrorRule = { kind: 'style'; selector: string; body: string } | { kind: 'media' | 'supports' | 'layer'; condition: string; rules: MirrorRule[] }`
  - `export function mirrorReducedTransparency(rules: MirrorRule[]): string`, which returns the mirror stylesheet text.
  - `export function startReducedTransparencyMirror(doc: Document): () => void`, in the preview adapter. It builds the rule tree from `doc.styleSheets`, skipping sheets that throw on `cssRules` and its own element. It writes the result into one `<style data-reduced-transparency-mirror>` in `doc.head`, and reruns from a `MutationObserver` on `head` and `body` (`childList`, `subtree`, `characterData`). Mutations inside its own element are ignored, and runs are batched with `queueMicrotask`. It returns the disconnect.

**Ruling against the spec (recorded in the ledger):** the pure core lives in `apps/www/src/site`, because Vitest does not include `apps/preview`. The preview already imports from there. Cost if wrong: one moved file.

- [ ] **Step 1: Write the failing tests**
  - `copies a reduce rule under the attribute`: the input is `media '(prefers-reduced-transparency: reduce)'`, `[data-slot='card'] { background: red }`. The output contains `html[data-reduced-transparency] [data-slot='card']` and `background: red`, with no `@media`.
  - `maps :root and html`: a `:root` selector becomes `html[data-reduced-transparency]`, and so does `html.dark x`, which becomes `html[data-reduced-transparency].dark x`.
  - `inverts not-reduce`: `media 'not (prefers-reduced-transparency: reduce)'`, `media '(prefers-reduced-transparency: no-preference)'` or `supports 'not (prefers-reduced-transparency: reduce)'` gives `html:not([data-reduced-transparency]) …`. Other conditions in the same query are kept, for example `(forced-colors: none)`.
  - `keeps nesting`: `supports '(backdrop-filter: blur(1px))'` › `media reduce` › rule gives `@supports (backdrop-filter: blur(1px)) { html[data-reduced-transparency] … }`.
  - `combined media keeps the rest`: `media '(prefers-reduced-transparency: reduce) and (min-width: 40rem)'` gives `@media (min-width: 40rem) { html[data-reduced-transparency] … }`.
  - `selector lists`: `a, b` gives both prefixed.
  - `ignores unrelated media`: `(prefers-color-scheme: dark)` with no reduce inside gives an empty string.
- [ ] **Step 2: Run them**
  - Run: `corepack pnpm exec vitest run apps/www/src/site/reduced-transparency.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement both files.** The adapter maps `CSSStyleRule`, `CSSMediaRule`, `CSSSupportsRule` and `CSSLayerBlockRule`, and skips every other rule type.
- [ ] **Step 4: Run them**
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - `git commit -m "feat(preview): mirror the reduced-transparency rules under a preview attribute"`

### Task 7: The toggle in the three editors

**Files:**
- Modify the protocols:
  - `apps/www/src/preset-editor/preview-protocol.ts`: `PresetView.reducedTransparency?: true`, handled like `labInk`.
  - `apps/www/src/editor/preview-protocol.ts`: `PreviewFrameState.reducedTransparency?: true`. `acceptPreviewRender` accepts the existing key set, plus this optional key when it is exactly `true`.
  - `apps/www/src/editor/catalog-preview-protocol.ts`: `CatalogPreviewRender.reducedTransparency?: true`. The key count is 6, or 7 with the flag.
- Modify the editors, each with local state `const [transparency, setTransparency] = useState<'auto' | 'reduced'>('auto')`. It is not stored in `EditorView`, storage or history.
  - `preset-editor.tsx`: beside "Preview mode".
  - `button-editor.tsx`: line 239.
  - `catalog-component-editor.tsx`: line 135.
  - The control is `<SegmentedControl label="Preview transparency" options={[{ value: 'auto', label: 'Auto' }, { value: 'reduced', label: 'Reduced' }]} …>`, rendered only when the family is `liquid-glass`.
  - The flag is sent only while glass and reduced.
- Modify the previews. In `preset-preview.tsx`, `editor-preview.tsx` and `catalog-recipe-preview.tsx`, start the mirror once on mount with `startReducedTransparencyMirror(document)`, and toggle `data-reduced-transparency` on `document.documentElement` from the received flag. Remove the attribute when the flag is absent.
- Tests: the three protocol test files.

**Ruling against the spec (recorded in the ledger):** the spec names a Switch, but the site ships no Switch component, while the editor toolbars use `SegmentedControl` for every preview option. The toggle is a two-option `SegmentedControl`, "Preview transparency: Auto / Reduced". Cost if wrong: swapping one control.

- [ ] **Step 1: Write the failing protocol tests**, one per protocol:
  - accepts `reducedTransparency: true`;
  - rejects `false` and `'yes'`;
  - old messages without the key still pass.
- [ ] **Step 2: Run them**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor apps/www/src/preset-editor/preview-protocol.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement the protocols, controls and previews.**
- [ ] **Step 4: Run them**
  - Run the Step 2 command, then `corepack pnpm typecheck`.
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - `git commit -m "feat(www): add the preview transparency toggle to the glass editors"`

### Task 8: Browser tests for the editors

**Files:**
- Create:
  - `playwright.editors.config.ts`: the two `webServer` entries of `playwright.config.ts` (`serve-snapshot-www` on 3000 and `dev:preview` on 4173), with no consumers, `testMatch: ['editors-glass.spec.ts']`, bundled Chromium, 1100 × 800, `reducedMotion: 'reduce'`.
  - `tests/e2e/editors-glass.spec.ts`
- Modify: `playwright.config.ts` `testIgnore`, to add `editors-glass.spec.ts`.

**Interfaces:** consumes everything above, through the UI only.

- [ ] **Step 1: Write the tests** (the features exist, so these are regression tests; watch each fail by breaking its assertion once, then restore it):
  - `backdrop menu names each scene with its ratio`, on `/editor/preset` in glass: every option of "Preview backdrop" matches `/, \d+\.\d:1/`, and exactly one ends with `(auto)`.
  - `auto follows a darkening edit`: after setting the light `foreground` to `#0b0b0b` in the inspector, the `(auto)` option is one of Brume, Aube or Trame.
  - `a manual choice survives an edit and resets on a new starting preset`: choose Nuit, edit a colour, and Nuit is still pressed. Choose another starting preset, and the pressed option is the `(auto)` one.
  - `dark lab ink`, on Givré in dark mode: in the preview frame, `html` has `data-glass-lab-ink="dark"` on a scene rated 4.5:1 or more, and none on a scene below that. Run `AxeBuilder` with the `color-contrast` rule on the frame: no violation on the card.
  - `toggle parity`:
    - With the toggle on, read the computed `backdrop-filter` and `background-color` of the first `[data-slot='card']` in the frame.
    - Open a second page on the same preview URL with CDP `Emulation.setEmulatedMedia({ features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })`, and read the same values. They are equal.
    - With the toggle off, the values equal the unemulated ones.
  - `one mirror after recompiles`: toggle on, change three colours, wait for `preset-preview-status` to read `current`. The frame has exactly one `style[data-reduced-transparency-mirror]`.
  - `leaving glass removes the attribute`: toggle on, switch the family to Flat. The frame's `html` has no `data-reduced-transparency`, and the toggle is absent.
  - `toggle in every glass editor`: `/editor/component/button` and `/editor/component/card` with a glass family show "Preview transparency". With Flat, they do not.
- [ ] **Step 2: Run them**
  - Run: `corepack pnpm build:packages && corepack pnpm generate:preview && corepack pnpm exec playwright test -c playwright.editors.config.ts`
  - Expected: PASS, every test.
  - Run: `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/foundation-browser-inventory.test.ts`
  - Expected: PASS.
- [ ] **Step 3: Commit**
  - `git commit -m "test(e2e): cover the glass backdrop pick, dark lab ink and transparency toggle"`

### Task 9: Audit, evidence and docs

**Files:**
- Create: `docs/evidence/editors-glass-073.md`
- Modify:
  - the liquid glass component doc in `docs/components/`, or the family doc that describes glass previews; find it with `grep -ril "backdrop" docs/components`;
  - `apps/www/src/site/docs/`, in the guide that mentions the glass preview backdrop;
  - `CHANGELOG.md`, under Unreleased.

- [ ] **Step 1: Run the audit**
  - Run: `OMBELLE_AUDIT_COMPONENTS=card,button,badge,input,select,tabs corepack pnpm exec playwright test tests/e2e/specimen-audit.spec.ts -c playwright.specimen-audit.config.ts --workers=1`, with the pnpm shim on `PATH`.
  - Expected: the 16 stable configurations pass. Record the glass findings from `.artifacts/specimen-audit/partial/liquid-glass-*.findings.json`, and compare them with the batch 6 evidence. Glass is non-blocking.
- [ ] **Step 2: Write the evidence**, with:
  - the measured `glassSceneRanges` table and the method (grid, viewport, browser version);
  - each built-in preset's ratio per scene and its pick, with any Task 3 margin ruling;
  - the dark lab ink cases, and the parity result of the toggle against CDP emulation;
  - the e2e and unit counts, and the audit counts;
  - "installed output unchanged", backed by `git diff --stat feat/variants-more-073 -- packages/catalog packages/compiler/test/fixtures` showing no catalog or fixture change.
- [ ] **Step 3: Update the docs and changelog**
  - the automatic backdrop;
  - the ratios in the menu;
  - the dark lab ink;
  - the toggle, which simulates the preference in the preview only.
- [ ] **Step 4: Commit**
  - `git commit -m "docs(evidence): record the batch 7a backdrop measurements, lab ink and transparency toggle"`
