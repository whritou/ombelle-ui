# Liquid Glass Kit Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the installed liquid glass family match the design kit exactly, for all 23 components, with the contrast bound intact, repurposed editor controls and the kit backdrop in every glass preview.

**Architecture:** There are three PRs, each branched off `main` after the previous one merges.
- **PR A (foundation):** extends the compiler's contrast model with tinted surfaces, makes glass CSS read the existing `--border`, `--border-width` and `--shadow-x/y` tokens, restyles Button to one-ink, relabels the controls, and swaps the preview backdrop.
- **PR B and PR C:** add per-component `styles/<id>/liquid-glass.css` files and flip the support table.

**Tech Stack:** TypeScript, React 19, Radix primitives, CSS in `packages/catalog/src/styles`, Vitest, Playwright (screenshots only), Next.js (`apps/www`), Vite (`apps/preview`).

**Spec:** `docs/superpowers/specs/2026-11-05-liquid-glass-kit-parity-design.md`. The visual source is `LiquidGlassKit.dc.html` and `LiquidGlassButtons.dc.html` on https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U. Read them with the Artifact tool, `action: "read"`.

## Global Constraints

- Node 24.19.0, pnpm 11.25.0 through `corepack pnpm`; Windows; push with `git -c http.sslBackend=schannel push`.
- Conventional Commits; branches `feat/glass-foundation`, `feat/glass-form-controls`, `feat/glass-display`, each off `main`.
- Never edit `packages/catalog/src/generated.ts`. Run `corepack pnpm build:packages` after catalog or contracts changes.
- The kit wins: every value below comes from the spec or the kit board; do not invent alternatives.
- The contrast bound must pass for `packages/catalog/src/presets/liquid-glass.json`. When an exact kit style fails, tune the preset, not the component.
- Glass stylesheets:
  - allow at most one `[data-slot=` per selector (`packages/compiler/test/liquid-glass.test.ts`);
  - put glass surfaces inside `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`;
  - provide `prefers-reduced-transparency: reduce` and `forced-colors: active` fallbacks;
  - use logical properties only;
  - animate overlays only on `[data-state='open']`.
- Liquid glass stays experimental. The stable families' bytes must not change: `packages/compiler/test/stable-families.test.ts` must pass untouched.
- The website claims a new glass component only through `glassOnSite()` with `glassMinimumCli: '0.5.0'`.
- Each PR's verification:
  - `corepack pnpm typecheck`;
  - `VITEST_MAX_WORKERS=4 corepack pnpm test:unit`;
  - `corepack pnpm exec vitest run tests/integration/preset-gallery-generation.test.ts tests/integration/preview-routing.test.ts tests/integration/hosted-preview-build.test.ts tests/integration/liquid-glass-cli.test.ts tests/integration/www-route.test.ts`;
  - Playwright screenshots against the www dev server on port 3100 after `node scripts/build-hosted-preview.mjs`;
  - the PR body states that `test:e2e` was not run.

## Review Focus

1. **A custom preset whose `border` is opaque.** Glass edges use the token as is, so they become a solid line. Compile must still succeed and the contrast report must not change (edges carry no text). The test goes in Task A2.
2. **Negative shadow offsets (−16 / −16).** The drop shadow falls toward the start and top; the compiled CSS keeps a valid `box-shadow`. The test goes in Task A2.
3. **A Button recipe with shadow or border overrides in a glass project.** The scoped Button CSS uses the override values for the glass drop shadow and edge. The test goes in Task A3.
4. **Switching a glass draft to flat and back.** The repurposed control values persist, and the labels revert to the stable names. The test goes in Task A4.
5. **`transparency: "reduced"` with tinted pairs.** The report evaluates the tinted surface opaque and passes; the CSS paints the tinted surface without blur. The test goes in Task A1 (report) and Task A3 (CSS).

---

## PR A: glass foundation (`feat/glass-foundation`)

### Task A1: Tinted-surface contrast model

**Files:**
- Modify: `packages/compiler/src/glass-contrast.ts` (pair spec, `resolve`, `GlassContrastPair`)
- Modify: `apps/www/src/preset-editor/components/glass-panel.tsx` (failing-pair line shows the tint)
- Test: `packages/compiler/test/glass-contrast.test.ts` (create if absent; else extend), `apps/www/src/preset-editor/components/glass-panel.test.tsx`

**Interfaces:**
- Produces:
  - `export type GlassTint = { color: ColorKey; light: number; dark: number }`. The amounts are fractions, for example `0.18`.
  - `export type GlassPairSpec = { surface: ColorKey; text: ColorKey; tint?: GlassTint }`.
  - `export const glassContrastPairs: readonly GlassPairSpec[]`. The current eight tuples become objects in the same order.
  - `GlassContrastPair` gains an optional `tint?: { color: ColorKey; amount: number }`, the amount resolved for its mode.
  - `export function glassContrastReportFor(data: Preset, pairs: readonly GlassPairSpec[]): GlassContrastReport`. `glassContrastReport(data)` returns `glassContrastReportFor(data, glassContrastPairs)`.
  - Later tasks add pairs by appending entries to the `glassContrastPairs` literal.

- [ ] **Step 1:** Write the failing test `tinted pair mixes the tint into the surface before compositing`. For the built-in preset with a temporary extra spec `{ surface: 'card', text: 'foreground', tint: { color: 'primary', light: 0.18, dark: 0.22 } }` passed through a new `glassContrastReportFor(data: Preset, pairs: readonly GlassPairSpec[])` export, assert:
  - the light pair has `tint` `{ color: 'primary', amount: 0.18 }`, `passes: true` and `Math.min(ratioOverBlack, ratioOverWhite, ratioOpaque) > 6.3`;
  - the dark pair has amount 0.22 and a minimum ratio above 5.0.
- [ ] **Step 2:** Write the failing test `reduced transparency evaluates tinted surfaces opaque` (Review Focus 5). With `design.transparency: 'reduced'`, every tinted pair passes and `ratioOverBlack === ratioOverWhite === ratioOpaque` within 1e-6.
- [ ] **Step 3:** Run `corepack pnpm exec vitest run packages/compiler/test/glass-contrast.test.ts`. Expect FAIL (`glassContrastReportFor` is not exported).
- [ ] **Step 4:** Implement the change in `glass-contrast.ts`:
  - Convert `glassContrastPairs` to `GlassPairSpec` objects.
  - `resolve` mixes `tint.color` into `surface` per mode, as `color-mix(in srgb, tint amount, surface)` does: a linear mix of gamma-encoded channels, alpha mixed the same way.
  - `glassContrastReport(data)` becomes `glassContrastReportFor(data, glassContrastPairs)`.
  - The existing exports and outputs stay identical for untinted pairs.
- [ ] **Step 5:** Run the glass contrast tests and `packages/compiler/test/liquid-glass.test.ts`. Expect PASS. The built-in readout stays "passes at glass opacity 0.5 … Lowest passing opacity: 0.5 light, 0.28 dark".
- [ ] **Step 6:** In `glass-panel.tsx`, a failing tinted pair renders as `{mode}: {text} on {surface} + {tint.color} {Math.round(amount*100)}%, {ratio}:1 {where}`. Add the test `lists the tint in a failing tinted pair`: a draft at opacity 0.25 with the temporary tinted spec shows `foreground on card + primary 18%`.
- [ ] **Step 7:** Commit with `feat(compiler): evaluate tinted glass surfaces in the contrast bound`.

### Task A2: Glass reads edge, edge-width and shadow tokens; built-in preset values

**Files:**
- Modify: `packages/catalog/src/styles/liquid-glass.css` and every `packages/catalog/src/styles/*/liquid-glass.css` (badge, card, tabs, tooltip, alert, dropdown-menu, popover)
- Modify: `packages/catalog/src/presets/liquid-glass.json`
- Test: `packages/compiler/test/liquid-glass.test.ts`

**Interfaces:**
- Produces two CSS rules every later glass stylesheet uses:
  - Edge: `border: var(--border-width) solid var(--border)`.
  - Floating drop shadow: `var(--shadow-x) var(--shadow-y) calc(var(--shadow-y) * 2.667) calc(var(--shadow-y) * -1) rgb(0 0 0 / 0.35)`.
  - Dialog drop shadow: `calc(var(--shadow-x) * 2) calc(var(--shadow-y) * 2) calc(var(--shadow-y) * 4) calc(var(--shadow-y) * -1.333) rgb(0 0 0 / 0.35)`.
  - At Y = 12px these reproduce today's `0 .75rem 2rem -.75rem` and `0 1.5rem 3rem -1rem`.

- [ ] **Step 1:** Write the failing test `glass edges and drop shadows read the preset tokens`. Compile the built-in glass preset with all experimental ids and assert, after `squash`:
  - no stylesheet contains `color-mix(insrgb,var(--foreground)14%,transparent)`;
  - card, dialog-content, popover-content and tooltip-content rules contain `var(--border-width)solidvar(--border)`;
  - their shadow contains `var(--shadow-x)var(--shadow-y)`.
- [ ] **Step 2:** Write the failing test `built-in glass preset reproduces the kit edge and shadow`. Assert:
  - `design.shadowOffsetXPx === 0`, `design.shadowOffsetYPx === 12`, `design.borderWidthPx === 1`;
  - `modes.light.border === 'oklch(20.8% 0.040 265.8 / 14%)'` and `modes.dark.border === 'oklch(96.8% 0.007 247.9 / 14%)'`;
  - `glassContrastReport(preset).passes === true`.
- [ ] **Step 3:** Write the failing test `opaque border and negative offsets still compile` (Review Focus 1 and 2). With `border: '#CBD5E1'` and offsets −16/−16:
  - compile succeeds;
  - the card rule contains `var(--shadow-x)var(--shadow-y)`;
  - the tokens have `--shadow-x:-16px`;
  - the contrast report is deep-equal to the built-in one except `opacity`-independent fields (no change in `pairs`).
- [ ] **Step 4:** Run `corepack pnpm exec vitest run packages/compiler/test/liquid-glass.test.ts`. Expect FAIL.
- [ ] **Step 5:** Replace every `color-mix(in srgb, var(--foreground) 14%, transparent)` edge with the edge rule. Replace every floating drop shadow with the shadow rule; inset rim highlights stay. Set the preset values from Step 2.
- [ ] **Step 6:** Run `corepack pnpm build:packages`, then the liquid-glass and stable-families tests. Expect PASS, with stable families untouched.
- [ ] **Step 7:** Commit with `feat(catalog): let glass edges and shadows follow the preset tokens`.

### Task A3: One-ink glass Button

**Files:**
- Modify: `packages/catalog/src/styles/liquid-glass.css` (button rules)
- Modify: `packages/compiler/src/recipe-styles.ts` (glass scoped Button and recipe CSS)
- Modify: `packages/compiler/src/glass-contrast.ts` (append the Button pairs)
- Test: `packages/compiler/test/liquid-glass.test.ts`, `packages/compiler/test/recipe-styles.test.ts`

**Interfaces:**
- Consumes `GlassPairSpec` (A1) and the edge and shadow rules (A2).
- Produces the CSS custom properties `--glass-tint` and `--glass-tint-amount`, set on `[data-slot="button"]` and reused by PR B selection states.

- [ ] **Step 1:** Write the failing test `glass Button is one ink`. In the compiled `styles/ui-style.css`:
  - no Button rule sets `color: var(--primary-foreground)` or `var(--destructive-foreground)`;
  - `[data-slot="button"]` has `color:var(--foreground)` and `font-weight:600`;
  - the default variant sets `--glass-tint:var(--primary)` with `--glass-tint-amount:18%`;
  - `.dark` sets 22%;
  - destructive sets `var(--destructive)` at 16% and 20%;
  - hover adds 8 points;
  - forced colours give the default `border-width:3px`.
- [ ] **Step 2:** Write the failing test `glass Button pairs are declared and pass`. `glassContrastPairs` contains these specs, and the built-in report passes all of them:
  - `foreground` on `card` with tints `primary` 0.18/0.22, `primary` 0.26/0.30, `destructive` 0.16/0.20 and `destructive` 0.24/0.28.
- [ ] **Step 3:** Write the failing test `reduced transparency paints the tinted Button opaque` (Review Focus 5). The compiled CSS has, inside `@media (prefers-reduced-transparency: reduce)`, a default Button rule with `backdrop-filter:none` and a background without the glass opacity mix.
- [ ] **Step 4:** Write the failing test `glass recipe Button uses its shadow and border overrides` (Review Focus 3). A glass recipe with `overrides.shadowOffsetYPx: 4` and `borderWidthPx: 2` emits scoped CSS whose button rule has `--shadow-y:4px` and `--border-width:2px`.
- [ ] **Step 5:** Run the tests. Expect FAIL.
- [ ] **Step 6:** Write the Button rules from the kit's spec table (spec § One-ink Button) into `liquid-glass.css`. Append the four pair specs. Make `recipe-styles.ts` emit the same rules for glass.
- [ ] **Step 7:** Run `corepack pnpm build:packages` and the liquid-glass, recipe-styles and `packages/catalog/test/catalog.test.ts` tests. Expect PASS. Update existing assertions that expected the solid default Button.
- [ ] **Step 8:** Commit with `feat(catalog): restyle glass Button to one ink`.

### Task A4: Glass labels for repurposed controls

**Files:**
- Modify: `apps/www/src/preset-editor/model.ts`, `apps/www/src/preset-editor/components/preset-controls.tsx`
- Modify: `apps/www/src/editor/components/properties-panel.tsx`
- Test: `apps/www/src/preset-editor/components/preset-controls.test.tsx`, `apps/www/src/editor/components/properties-panel.test.tsx` (extend or create)

**Interfaces:**
- Produces `export function designControlLabel(key: keyof typeof designControls | 'border', family: StyleFamily): string` in `apps/www/src/preset-editor/model.ts`:
  - liquid glass: `'Glass shadow X'`, `'Glass shadow Y'`, `'Glass edge width'`, `'Glass edge colour'`;
  - otherwise the existing label (`'Border'` for the colour).
- Produces `export const glassControlHints: Record<'shadowOffsetXPx' | 'shadowOffsetYPx' | 'borderWidthPx' | 'border', string>` with the copy:
  - `'Offsets the soft shadow under floating glass.'`;
  - `'Offsets the soft shadow under floating glass.'`;
  - `'Thickness of every glass edge.'`;
  - `'Colour and strength of every glass edge; may include transparency.'`.

- [ ] **Step 1:** Write the failing test `glass drafts relabel the repurposed controls`. Rendering design and colour controls for a liquid glass draft shows the four glass labels and hints. A flat draft shows `Shadow X offset`, `Border width` and the `Border` colour.
- [ ] **Step 2:** Write the failing test `repurposed values survive a family round trip` (Review Focus 4). A glass draft with `/design/shadowOffsetYPx` 20 switched to flat and back keeps 20, and the labels follow the family.
- [ ] **Step 3:** Write the failing test `Button editor relabels shadow and border overrides for glass`.
- [ ] **Step 4:** Run the tests. Expect FAIL.
- [ ] **Step 5:** Implement `designControlLabel` and `glassControlHints`, then use them in `preset-controls.tsx` and `properties-panel.tsx`.
- [ ] **Step 6:** Run the tests. Expect PASS.
- [ ] **Step 7:** Commit with `feat(www): relabel the controls liquid glass repurposes`.

### Task A5: Kit backdrop in every glass preview

**Files:**
- Create: `apps/preview/src/glass-backdrop.css`
- Modify: `apps/preview/src/preset-preview.css`, `apps/preview/src/preset-preview.tsx`, `apps/preview/src/editor-preview.tsx`, `apps/preview/src/editor-preview.css`
- Delete: `apps/www/public/glass-backdrop.webp`, only if Step 5's search finds no other reference
- Test: `tests/integration/hosted-preview-build.test.ts` (extend), `apps/preview` unit test if one exists for the preset preview dataset

**Interfaces:**
- Produces the document attribute `html[data-backdrop='glass']`, which replaces `'photo'`, and one rule in `glass-backdrop.css` holding the kit gradient. Copy it exactly from the kit's `.bd` rule:
  - `radial-gradient(circle at 16% 28%, #7C5CD6 0 14%, transparent 34%)`;
  - `radial-gradient(circle at 72% 18%, #F2B84B 0 7%, transparent 26%)`;
  - `radial-gradient(circle at 86% 78%, #2F7D5B 0 18%, transparent 42%)`;
  - `radial-gradient(circle at 38% 88%, #3B5BDB 0 12%, transparent 36%)`;
  - `repeating-linear-gradient(96deg, transparent 0 120px, rgb(40 30 20 / 35%) 120px 150px, transparent 150px 260px)`;
  - `linear-gradient(165deg, #24402F, #4B3F8F 55%, #6B8F4E)`;
  - fixed attachment.

- [ ] **Step 1:** Write the failing test `hosted preview ships the kit backdrop and no photo`. The built preview CSS contains `#7C5CD6` and `[data-backdrop=glass]`, and does not contain `glass-backdrop.webp`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Move the backdrop to `glass-backdrop.css` and import it from both preview entry styles. Have `preset-preview.tsx` set `dataset.backdrop = 'glass'`, and `editor-preview.tsx` set the same when its compiled preset's family is `liquid-glass`. Keep the forms-on-card rule (rename its selector to `'glass'`).
- [ ] **Step 4:** Run the test and `tests/integration/preview-routing.test.ts`. Expect PASS.
- [ ] **Step 5:** Search the repo for `glass-backdrop.webp` (excluding `dist` and `generated`). Delete the file only if nothing else references it; otherwise leave it and note why in the PR.
- [ ] **Step 6:** Commit with `feat(preview): use the kit backdrop behind every glass preview`.

### Task A6: PR A docs, evidence and PR

**Files:** `docs/components/liquid-glass.md` (control mapping table, tinted pairs, Button), `docs/components/button.md` if present (note "restyled in 0.5.0" for glass), `CHANGELOG.md` (preset value changes: shadow 0/12, border oklch values), `docs/evidence/glass-foundation.md`, `docs/evidence/images/glass-foundation/`, `apps/www/src/site/components/catalog.ts` (Button doc note).

- [ ] **Step 1:** Add the docs above. The Button page usage note reads "Liquid glass Buttons were restyled to one ink in 0.5.0."
- [ ] **Step 2:** Run the Global Constraints verification. Rebuild the hosted preview and capture with Playwright, in light and dark:
  - the Button variants and states;
  - Card, Dialog, Popover, Dropdown Menu, Tooltip, Tabs, Badge and Alert on the kit backdrop;
  - the Button editor preview with a glass recipe.

  Compare each against the kit board and fix differences.
- [ ] **Step 3:** Commit, push, and open PR A. The body lists the checks run and states `test:e2e` was not run.

---

## PR B: form controls (`feat/glass-form-controls`)

### Task B1: Field surface and placeholder pair

**Files:** `packages/catalog/src/styles/liquid-glass.css` (input rules), `packages/compiler/src/glass-contrast.ts`, `packages/catalog/src/presets/liquid-glass.json`, test `packages/compiler/test/liquid-glass.test.ts`

**Interfaces:**
- Produces the field surface: `color-mix(in srgb, var(--background) calc(var(--glass-inner-opacity, var(--glass-opacity)) * 55%), transparent)` under the sheen at 60%, with the `input` border. Textarea, Native Select and the Select trigger reuse it.

- [ ] **Step 1:** Write the failing test `fields are background glass with a declared placeholder pair`. Assert:
  - the Input rule uses `var(--background)` and `*55%`;
  - `glassContrastPairs` contains `{ surface: 'background', text: 'mutedForeground' }`;
  - the built-in report passes.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Move Input to the field surface and append the pair.
- [ ] **Step 4:** Run it. It fails on the bound, light 4.449:1. Tune the preset: set `design.glassOpacity` to 0.51. If the report still fails, set light `mutedForeground` to the darkest Slate step that passes. Record the chosen value in the test as an exact expectation.
- [ ] **Step 5:** Run it. Expect PASS. Update the readout expectations that quoted opacity 0.5 (glass-panel, www tests, `docs/components/liquid-glass.md`).
- [ ] **Step 6:** Commit with `feat(catalog): draw glass fields on the kit's background surface`.

### Task B2: Label, Textarea and Native Select in glass

**Files:**
- Create: `packages/catalog/src/styles/{label,textarea,native-select}/liquid-glass.css`
- Modify: `packages/contracts/src/style-families.ts`
- Test: `packages/compiler/test/{label,textarea,native-select}.test.ts`, `packages/catalog/test/catalog.test.ts`

- [ ] **Step 1:** Write the failing tests. Each id compiles in liquid glass with its CSS containing:
  - `@media (forced-colors: active)`;
  - `prefers-reduced-transparency`;
  - for Textarea and Native Select, the field surface from B1.

  Label is 14px, weight 500, `var(--foreground)`. The Native Select icon is `var(--muted-foreground)`.
- [ ] **Step 2:** Run them. Expect FAIL with STYLE_UNAVAILABLE.
- [ ] **Step 3:** Write the three stylesheets from the kit's Input · Label · Textarea and Native Select tiles, and add the ids to `glassExperimental`.
- [ ] **Step 4:** Run `corepack pnpm build:packages` and the tests. Expect PASS.
- [ ] **Step 5:** Commit with `feat(catalog): add Label, Textarea and Native Select to liquid glass`.

### Task B3: Checkbox, Switch and Radio Group in glass

**Files:** create `packages/catalog/src/styles/{checkbox,switch,radio-group}/liquid-glass.css`; modify `style-families.ts` and `glass-contrast.ts`; test the three compiler tests and `catalog.test.ts`.

**Interfaces:**
- Consumes `--glass-tint` and `--glass-tint-amount` (A3) for checked and on states: `primary` at the resting amount + 8 points (26% light, 30% dark), a `primary` rim at 60% and a glow.

- [ ] **Step 1:** Write the failing tests. Assert:
  - the checked checkbox, checked radio and on switch use the tint, and the indicator stays `var(--foreground)`;
  - the switch thumb is `#fff` with a shadow;
  - the radio option row uses `:has([data-state='checked'])` (one data-slot per selector);
  - the disabled state is dashed;
  - pairs `{ surface: 'card', text: 'foreground', tint: { color: 'primary', light: 0.26, dark: 0.30 } }` and the option-row tint `0.18/0.22` exist and pass.
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3:** Write the stylesheets from the kit tiles, then append the pairs and the ids.
- [ ] **Step 4:** Run the tests. If a pair fails, tune the preset per Global Constraints and pin the value. Expect PASS.
- [ ] **Step 5:** Commit with `feat(catalog): add Checkbox, Switch and Radio Group to liquid glass`.

### Task B4: Select in glass

**Files:** create `packages/catalog/src/styles/select/liquid-glass.css`; modify `style-families.ts`; test `packages/compiler/test/select.test.ts`.

- [ ] **Step 1:** Write the failing test. Assert:
  - the trigger uses the B1 field surface;
  - the content uses the Dropdown Menu glass surface, animated only on `[data-state='open']`;
  - the highlighted option uses the `primary` tint 18%/22%;
  - the selected option is weight 600 with the check;
  - the disabled option is `var(--muted-foreground)`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Write the stylesheet from the kit tile and add the id.
- [ ] **Step 4:** Run it. Expect PASS.
- [ ] **Step 5:** Commit with `feat(catalog): add Select to liquid glass`.

### Task B5: PR B gating, tests, docs and PR

**Files:**
- `apps/www/src/site/components/catalog.ts`: `glassMinimumCli: '0.5.0'` on label, textarea, native-select, checkbox, switch, radio-group and select.
- `apps/www/src/preset-editor/components/glass-panel.tsx`: remove the limitation "form controls other than Input are unavailable".
- Hard-coded glass lists in:
  - `packages/contracts/test/style-support.test.ts`;
  - `packages/compiler/test/liquid-glass.test.ts`;
  - `apps/www/src/preset-editor/model.test.ts`;
  - `apps/www/src/snapshots/preview-session.test.ts`;
  - `tests/integration/liquid-glass-cli.test.ts`, which adds the seven ids to `installOrder` and uses `avatar` as the refused example.
- Docs and evidence: `docs/components/liquid-glass.md`, each component doc, `docs/03-components-styles-accessibility.md`, `CHANGELOG.md`, and `docs/evidence/glass-form-controls.md` with images.

- [ ] **Step 1:** Update the lists and gating. Add the test `form controls are claimed on the site only from 0.5.0`: `glassOnSite` is false for all seven while `publishedInstaller.version` is `0.4.1`.
- [ ] **Step 2:** Run the Global Constraints verification and capture every form control in light and dark on the kit backdrop. Compare against the kit tiles and fix differences.
- [ ] **Step 3:** Commit, push, and open PR B.

---

## PR C: display components (`feat/glass-display`)

### Task C1: Avatar and Separator in glass

**Files:** create `packages/catalog/src/styles/{avatar,separator}/liquid-glass.css`; modify `style-families.ts` and `glass-contrast.ts`; test the two compiler tests.

- [ ] **Step 1:** Write the failing tests. Assert:
  - Avatar uses foreground initials, a `rgb(255 255 255 / 55%)` rim and the primary variant tint 18%/22%;
  - the status dot is `#16A34A` with a white ring, and forced colours fill or hollow it;
  - group overlap uses a white rim instead of an opaque ring;
  - Separator is `var(--border-width) solid var(--border)` plus the rim highlight, and the label is `var(--muted-foreground)`;
  - pairs exist and pass: `{ surface: 'card', text: 'foreground', tint: { color: 'primary', light: 0.18, dark: 0.22 } }` for initials, and `mutedForeground` on `card` for the separator label (already declared).
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3:** Implement the stylesheets from the kit tiles and add the ids.
- [ ] **Step 4:** Run them. Expect PASS.
- [ ] **Step 5:** Commit with `feat(catalog): add Avatar and Separator to liquid glass`.

### Task C2: Table and Accordion in glass

**Files:** create `packages/catalog/src/styles/{table,accordion}/liquid-glass.css`; modify `style-families.ts` and `glass-contrast.ts`; test the two compiler tests.

- [ ] **Step 1:** Write the failing tests. Assert:
  - the Table container uses the edge, the drop shadow and `calc(var(--radius) + 4px)`;
  - the header is `var(--muted)` glass with `var(--muted-foreground)` labels;
  - the selected row is `primary` 12% with foreground text;
  - the open Accordion trigger is `primary` 12%;
  - the Accordion height animation runs only on `[data-state='open']`;
  - pairs exist and pass: `mutedForeground` on `muted` (already declared), and `{ surface: 'card', text: 'foreground', tint: { color: 'primary', light: 0.12, dark: 0.12 } }`.
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3:** Implement the stylesheets and add the ids.
- [ ] **Step 4:** Run them. Expect PASS.
- [ ] **Step 5:** Commit with `feat(catalog): add Table and Accordion to liquid glass`.

### Task C3: Progress and Skeleton in glass

**Files:** create `packages/catalog/src/styles/{progress,skeleton}/liquid-glass.css`; modify `style-families.ts`; test the two compiler tests.

- [ ] **Step 1:** Write the failing tests. Assert:
  - the Progress track is glass with a solid `var(--primary)` fill and glow, and complete is `#16A34A`;
  - indeterminate rests as a faded full fill;
  - the Skeleton film is `color-mix(in srgb, var(--foreground) 10%, transparent)` with a white sheen;
  - both loops last `calc(var(--motion-duration) * 10)`.
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3:** Implement the stylesheets and add the ids.
- [ ] **Step 4:** Run them. Expect PASS.
- [ ] **Step 5:** Commit with `feat(catalog): add Progress and Skeleton to liquid glass`.

### Task C4: PR C completion, gating, docs and PR

**Files:** `catalog.ts` gating (`glassMinimumCli: '0.5.0'` on the six), the hard-coded lists as in B5, docs and changelog, and `docs/evidence/glass-display.md` with images.

- [ ] **Step 1:** Write the failing test `every component is at least experimental in liquid glass`: `componentsWithStyleSupport('liquid-glass', ['unavailable'])` is `[]`.
- [ ] **Step 1b:** With no refused glass component left, update the tests that need one:
  - In `tests/integration/liquid-glass-cli.test.ts`, delete the three refusal cases ("refuses unavailable", "mixed add", "theme add into glass while unavailable components are installed").
  - Add the case `add unknown-component in a glass project fails before any write`, asserting a non-zero exit and an unchanged tree.
  - In `packages/compiler/test/liquid-glass.test.ts`, delete `it.each(unavailable)`.
  - Keep `assertStyleAvailable` covered by `packages/contracts/test/style-support.test.ts`, which calls it with a synthetic family where support is unavailable. If no such family exists, assert it does not throw for every id in liquid glass.
- [ ] **Step 2:** Make it pass by adding the six ids, then update the lists and gating.
- [ ] **Step 3:** Run the Global Constraints verification and capture all six components in light and dark. Compare against the kit tiles and fix differences.
- [ ] **Step 4:** Commit, push, and open PR C.
