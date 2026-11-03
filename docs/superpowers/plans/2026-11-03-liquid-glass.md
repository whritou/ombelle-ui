# Liquid Glass Style Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `liquid-glass` as an experimental fourth style family for Button, Badge, Card, Dialog, Tabs and Tooltip. Contrast is guaranteed by a compile-time worst-case bound, fallbacks are opaque, and the limitations are visible in the CLI, preview, editors and docs.

**Architecture:** `packages/contracts` gains a widened family type and a component × family support table. The existing `supportedStyleFamilies` stays the three stable families. Catalog files add a glass preset and CSS, and the catalog sync tolerates unavailable entries. The compiler emits glass tokens, enforces the contrast bound and refuses unavailable components. The scoped Button path learns two extra at-rules. The CLI, preview, editors, consumers and docs read the table.

**Tech Stack:** TypeScript ES modules, Node 24.19.0, pnpm 11.25.0, vitest 5, Playwright with `@axe-core/playwright`, postcss and `postcss-selector-parser`, React 19, Vite 8 and Next.js consumers.

**Spec:** `docs/superpowers/specs/2026-11-03-liquid-glass-design.md`

## Global Constraints

- Flat, minimalist and neo-brutalism compile artifacts, scoped Button preset artifacts and recipe artifacts stay byte-identical (Task 1 guard).
- Never hand-edit `packages/contracts/src/*-schema.ts` or `packages/catalog/src/generated.ts`. Run `pnpm build:packages` instead.
- Family id `liquid-glass`. Built-in preset id `builtin-liquid-glass`, revision 1. Status vocabulary: `stable | experimental | unavailable`.
- Experimental glass components: `button`, `badge`, `card`, `dialog`, `tabs`, `tooltip`. Unavailable: `input`, `textarea`, `label`, `checkbox`, `switch`, `native-select`.
- Contrast threshold 4.5:1 for every glass text pair in both modes. Opacity search steps 0.01 within the schema's 0.6–1.
- Error code `STYLE_UNAVAILABLE`, path `/componentIds`. Contrast failure is `INVALID_DATA`, path `/design/glassOpacity`.
- `@supports` condition, verbatim: `((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`. Preference query: `(prefers-reduced-transparency: reduce)`.
- Notice copy, verbatim: `liquid-glass is experimental for <comma-separated ids>; see docs/components/liquid-glass.md for limitations`.
- Editor label copy: `Experimental` on the family option; `Unavailable in liquid glass` on refused components.
- Conventional Commits on `feat/liquid-glass-style`, with no attribution lines. Do not edit files owned by the parallel axe (PR #33), shadcn theme-merge and editor-keyboard sessions; rebase on `main` instead.
- Evidence claims name the machine, OS, browser channel and versions that ran them.

## Review Focus

1. **A sparse user preset with `styleFamily: "liquid-glass"` and only colour overrides** must inherit `glassOpacity` from the built-in preset and still be checked. A dark custom palette must fail with the minimum passing opacity in the message (Task 4 test `sparse custom palette is bounded`).
2. **`add input` in a glass project with `--yes`** must still stop before any write, leaving the lockfile and `ombelle.lock` untouched (Task 6 test).
3. **OKLCH colours in a glass preset** must be converted for the bound, not crash or be skipped (Task 3 test `oklch inputs`).
4. **A glass Button nested in a glass Card** must not stack a second backdrop filter (Task 5 browser assertion `nested surfaces drop filter`).
5. **A browser without `backdrop-filter`** must render opaque surfaces at full contrast (Task 9 test with the forced `@supports` override).

---

### Task 1: Byte-identity guard for the stable families

**Files:**
- Create: `scripts/record-stable-hashes.ts`
- Create: `packages/compiler/test/fixtures/stable-family-hashes.json` (generated)
- Create: `packages/compiler/test/stable-families.test.ts`

**Interfaces:**
- Produces: `stableArtifactHashes(): Promise<Record<string, string>>`, exported from the script module. Keys look like `<family>/compile/<logicalPath>`, `<family>/component-preset/<logicalPath>` and `<family>/recipe/<logicalPath>`. Values are artifact `sha256`.

- [ ] **Step 1:** Implement `stableArtifactHashes()`. For each family in `supportedStyleFamilies`, it hashes:
  - `compile` with that family's built-in preset and all `supportedComponentIds`
  - `compileButtonPreset` with the same preset and `darkSelector: '.dark'`
  - `compileRecipe` with each recipe in `fixtures/shared/recipes.ts` for that family

  When run directly, it writes the JSON fixture with sorted keys.
- [ ] **Step 2:** On the untouched branch, run `pnpm build:packages && pnpm exec tsx scripts/record-stable-hashes.ts`. Expected: the fixture is written with non-empty keys for all three families.
- [ ] **Step 3:** Write the test `stable family artifacts are byte-identical`. It asserts `await stableArtifactHashes()` deep-equals the fixture.
- [ ] **Step 4:** Run `pnpm exec vitest run packages/compiler/test/stable-families.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit `test(compiler): pin stable family artifact hashes`.

### Task 2: Family list and compatibility table in contracts

**Files:**
- Modify: `packages/contracts/src/style-families.ts`, `packages/contracts/src/index.ts`, `packages/contracts/src/types.ts` (`InstallPlan`)
- Modify: `packages/compiler/test/minimalist.test.ts:9-11`, which today asserts `liquid-glass` is not a family
- Test: `packages/contracts/test/style-support.test.ts`

**Interfaces:**
- Produces, from `@ombelle/contracts`:
  - `supportedStyleFamilies` is unchanged: `['flat','minimalist','neo-brutalism']`.
  - `styleFamilies = [...supportedStyleFamilies, 'liquid-glass'] as const`
  - `type StyleFamily = typeof styleFamilies[number]`
  - `type StableStyleFamily = typeof supportedStyleFamilies[number]`
  - `isStyleFamily(v): v is StyleFamily`, which accepts all four families
  - `type StyleSupport = 'stable' | 'experimental' | 'unavailable'`
  - `styleSupport(id: ComponentId, family: StyleFamily): StyleSupport`
  - `componentsWithStyleSupport(family: StyleFamily, statuses: readonly StyleSupport[]): ComponentId[]`, in `supportedComponentIds` order
  - `assertStyleAvailable(ids: readonly ComponentId[], family: StyleFamily): void`. It throws `FoundationError('STYLE_UNAVAILABLE', '<Id> is unavailable for liquid-glass. Experimental liquid-glass components: button, badge, card, dialog, tabs, tooltip.', '/componentIds', 'Choose a stable family for this component or remove it.')` for the first unavailable id, in input order.
  - `InstallPlan` gains `notices: string[]`.

- [ ] **Step 1:** Write the failing tests:
  - Table completeness: every `supportedComponentIds` × `styleFamilies` pair returns a status.
  - All three stable families are `stable` for all 12.
  - Glass returns exactly the experimental and unavailable sets from Global Constraints.
  - `isStyleFamily('liquid-glass') === true` and `isStyleFamily('constructor') === false`.
  - `assertStyleAvailable(['card','input'],'liquid-glass')` throws with code `STYLE_UNAVAILABLE` and a message starting `Input is unavailable`.
  - Update `minimalist.test.ts` to expect `supportedStyleFamilies` unchanged and `isStyleFamily('liquid-glass')` true.
- [ ] **Step 2:** Run `pnpm exec vitest run packages/contracts/test/style-support.test.ts`. Expected: FAIL, missing exports.
- [ ] **Step 3:** Implement the exports above. Add `notices: []` to every `InstallPlan` construction site; `tsc` will list them.
- [ ] **Step 4:** Run `pnpm typecheck` and the test file. Expected: PASS. Typecheck now flags every `Record<StyleFamily, …>` built from `supportedStyleFamilies`. Retype those as `Record<StableStyleFamily, …>` where the code genuinely means the stable matrix, which covers tests, scripts and browser specs. Glass-aware sites are handled in later tasks; mark them with `// liquid-glass: Task N` only until that task lands.
- [ ] **Step 5:** Commit `feat(contracts): add liquid-glass family and style support table`.

### Task 3: Glass contrast bound

**Files:**
- Create: `packages/compiler/src/glass-contrast.ts`, exported from `packages/compiler/src/index.ts`
- Test: `packages/compiler/test/glass-contrast.test.ts`

**Interfaces:**
- Produces:
  - `type GlassContrastPair = { mode: 'light'|'dark'; surface: ColorKey; text: ColorKey; ratioOverBlack: number; ratioOverWhite: number; passes: boolean }`
  - `type GlassContrastReport = { opacity: number; transparency: 'auto'|'reduced'; pairs: GlassContrastPair[]; passes: boolean; minimumOpacity: number | null }`. `minimumOpacity` is the smallest 0.01 step in [0.6, 1] at which all pairs pass, or `null` if even 1 fails.
  - `glassContrastReport(data: Preset): GlassContrastReport`. Takes resolved preset data. With `transparency: 'reduced'`, it evaluates at opacity 1.
  - `glassContrastPairs: readonly [surface: ColorKey, text: ColorKey][]`, set exactly to the spec table: card/cardForeground, card/mutedForeground, popover/popoverForeground, popover/mutedForeground, muted/foreground, muted/mutedForeground, secondary/secondaryForeground, background/foreground.

Algorithm (not determined by the signature):

```ts
// srgb channel in 0..1 → composite over backdrop b ∈ {0,1}, matching color-mix(in srgb, s α, transparent) over b
const over = (s: number, a: number, b: 0 | 1) => a * s + (1 - a) * b
// relative luminance: WCAG formula on the composited gamma-encoded channels
// colour input: '#rrggbb', or 'oklch(L C H[ / A])' → OKLab → linear sRGB (Björn Ottosson matrices) → gamma encode → clamp to 0..1
```

- [ ] **Step 1:** Write the failing tests:
  - `hand-computed pair`: surface `#ffffff`, text `#475569`, opacity 0.8. Assert `ratioOverBlack` equals the WCAG value of `#cccccc` vs `#475569` to 2 decimals. Over white the ratio is the white-on-text value.
  - `threshold`: for a fixture palette, `minimumOpacity` is X, the report at X passes, and the report at X − 0.01 fails. Compute X once in the test by brute force over the same pure functions. Do not hard-code it.
  - `reduced transparency`: evaluated at opacity 1, it passes for the built-in flat palette's light and dark modes.
  - `oklch inputs`: `oklch(1 0 0)` behaves like `#ffffff` within 1e-6 luminance.
  - `pair list`: the pair list equals the spec table.
- [ ] **Step 2:** Run `pnpm exec vitest run packages/compiler/test/glass-contrast.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3:** Implement `glass-contrast.ts`.
- [ ] **Step 4:** Rerun. Expected: PASS.
- [ ] **Step 5:** Commit `feat(compiler): compute worst-case glass contrast bound`.

### Task 4: Glass catalog entries and compiler support

**Files:**
- Create: `packages/catalog/src/presets/liquid-glass.json`
- Create: `packages/catalog/src/styles/liquid-glass.css`
- Create: `packages/catalog/src/styles/{badge,card,tabs,tooltip}/liquid-glass.css`
- Modify: `scripts/sync-catalog.mjs`, which iterates `styleFamilies`, reads component CSS only where `styleSupport` is not `unavailable`, and fails if an expected file is missing
- Modify: `packages/catalog/src/index.ts`. `presets` and `styles` are keyed by `StyleFamily`. `ComponentTemplate.styles` becomes `Partial<Record<StyleFamily, string>>`.
- Modify: `packages/compiler/src/compile.ts` and `packages/compiler/src/resolve.ts`
- Test: `packages/compiler/test/liquid-glass.test.ts`; `packages/catalog/test/catalog.test.ts` adds a glass case

**Interfaces:**
- Consumes: `styleSupport`, `assertStyleAvailable` and `componentsWithStyleSupport` (Task 2); `glassContrastReport` (Task 3).
- Produces: `compile()` for `liquid-glass` emits `--glass-blur` and `--glass-opacity` in the `:root` block of `styles/ui-tokens.css`. For `transparency: 'reduced'` the values are `0px` and `1`; otherwise `<glassBlurPx>px` and `<glassOpacity>`. Other families emit no glass tokens. Unavailable ids throw before any artifact is built. A failing bound throws `FoundationError('INVALID_DATA', 'Liquid glass text contrast fails in <mode> for <text> on <surface>: <ratio>:1 over a <black|white> backdrop. Minimum passing glassOpacity is <n>.', '/design/glassOpacity')`. When `minimumOpacity` is null, the message instead says `Raise contrast between <text> and <surface>; no glassOpacity passes.`

CSS authoring rules (from the spec; files follow the existing family CSS idiom):
- Base rules are opaque, using the surface token directly.
- Translucency (`color-mix(in srgb, var(--<surface>) calc(var(--glass-opacity) * 100%), transparent)`) and `backdrop-filter: var(--glass-inner-filter, blur(var(--glass-blur)) saturate(140%))` with its `-webkit-` twin appear only inside the verbatim `@supports` condition.
- Glass surfaces (Card root, Dialog content, Tooltip content, Tabs list) set `--glass-inner-filter: none` on themselves, so nested glass Buttons and Tabs lists inherit "no filter". Use no descendant selectors, which the scoped Button parser rejects.
- `@media (prefers-reduced-transparency: reduce)` resets to opaque and `backdrop-filter: none`. Forced-colors and reduced-motion blocks mirror `minimalist.css`. Blur is never listed in `transition`.
- Identity that survives every fallback: a 1px border `color-mix(in srgb, var(--foreground) 14%, transparent)` and `box-shadow: inset 0 1px 0 color-mix(in srgb, white 35%, transparent)` (dark mode: 12%). The Dialog overlay is `rgb(0 0 0 / 0.45)` with no filter.
- Badge (both variants) and the default and destructive Button stay solid fills with identity only. Secondary, outline and ghost Buttons are translucent on `secondary`, `background` and `background`.
- `liquid-glass.css` keeps opaque Input baseline rules identical in shape to the `minimalist.css` Input rules. They are inert because Input is refused.

Preset values: the palette is in the spec discussion; use the light and dark hex values below. `design` is `{ fontFamilyId: 'system-sans', radiusRem: 0.75, density: 'comfortable', borderWidthPx: 1, shadowOffsetXPx: 0, shadowOffsetYPx: 0, motion: 'full', transparency: 'auto', glassBlurPx: 12, glassOpacity: <minimumOpacity of this palette> }`. `componentDefaults.button` is `default/default`.

| token | light | dark |
| --- | --- | --- |
| background | #EEF2F7 | #0B1120 |
| foreground | #0F172A | #F1F5F9 |
| card | #FFFFFF | #1E293B |
| cardForeground | #0F172A | #F8FAFC |
| popover | #FFFFFF | #1E293B |
| popoverForeground | #0F172A | #F8FAFC |
| primary | #1D4ED8 | #93C5FD |
| primaryForeground | #FFFFFF | #0B1120 |
| secondary | #E2E8F0 | #334155 |
| secondaryForeground | #0F172A | #F8FAFC |
| muted | #E2E8F0 | #334155 |
| mutedForeground | #475569 | #CBD5E1 |
| accent | #DBEAFE | #1E3A8A |
| accentForeground | #0F172A | #F8FAFC |
| destructive | #B91C1C | #FCA5A5 |
| destructiveForeground | #FFFFFF | #0B1120 |
| border | #CBD5E1 | #475569 |
| input | #64748B | #94A3B8 |
| ring | #1D4ED8 | #93C5FD |

- [ ] **Step 1:** Write the failing tests in `liquid-glass.test.ts`:
  - `compiles the six experimental components`: one `style` artifact per CSS-bearing component, and the tokens contain `--glass-blur:12px;` and `--glass-opacity:<n>;`.
  - `deterministic`: two compiles have equal hashes.
  - `refuses each unavailable component`: `it.each` over the six, expecting `STYLE_UNAVAILABLE`.
  - `reduced transparency emits opaque tokens`.
  - `rejects low opacity`: `glassOpacity: 0.6` throws `INVALID_DATA` at `/design/glassOpacity`, and the message contains `Minimum passing glassOpacity is`.
  - `sparse custom palette is bounded`: a preset with only `styleFamily`, release fields and `modes.dark.muted: '#64748B'` throws, naming `dark`.
  - `built-in opacity is minimal`: the built-in `glassOpacity` equals `glassContrastReport(builtin).minimumOpacity`.
  - `css fallbacks`: `ui-style.css` contains the verbatim `@supports` condition and the `prefers-reduced-transparency` query, and has no `backdrop-filter` outside `@supports`. Check this by parsing with postcss and walking declarations whose parent chain lacks `@supports`.

  In `catalog.test.ts`, the glass preset validates, and glass component styles exist exactly for badge, card, tabs and tooltip.
- [ ] **Step 2:** Run `pnpm build:packages && pnpm exec vitest run packages/compiler/test/liquid-glass.test.ts packages/catalog/test/catalog.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Author the preset with a placeholder `glassOpacity: 1`, then the CSS and the sync and catalog changes. In `compile.ts`, after resolve, call `assertStyleAvailable(ids, family)`, then for glass call `glassContrastReport` and throw on failure, then add the tokens. `resolve.ts` already merges `design` from the base preset.
- [ ] **Step 4:** Compute the built-in minimum with `pnpm exec tsx -e "…glassContrastReport(builtin).minimumOpacity"`. Write it into `liquid-glass.json`, then rebuild.
- [ ] **Step 5:** Run the Step 2 command plus `packages/compiler/test/stable-families.test.ts`. Expected: all PASS, with stable hashes unchanged.
- [ ] **Step 6:** Commit `feat(catalog): add experimental liquid-glass preset and styles`.

### Task 5: Scoped Button presets and recipes in glass

**Files:**
- Modify: `packages/compiler/src/recipe-styles.ts`. The at-rule allow-list adds `supports` with exactly the verbatim condition and `media` with `(prefers-reduced-transparency: reduce)`. Selector rewriting walks rules inside both. The token block adds `--glass-blur` and `--glass-opacity` only when `preset.data.styleFamily === 'liquid-glass'`. Scoped glass compiles run `glassContrastReport` and throw like `compile`.
- Modify: `packages/compiler/src/component-preset.ts`, replacing the `isStyleFamily` guard with a `styleSupport('button', family) !== 'unavailable'` check
- Test: `packages/compiler/test/recipe-styles.test.ts` and `packages/compiler/test/component-preset.test.ts` (add glass cases)

**Interfaces:**
- Consumes: Task 4 catalog CSS and tokens.
- Produces: `compileButtonPreset` and `compileRecipe` accept glass presets. Signatures are unchanged.

- [ ] **Step 1:** Write the failing tests:
  - `scopes glass at-rules`: every selector inside `@supports` and `@media (prefers-reduced-transparency: reduce)` in the scoped CSS starts with the scope selector, and no unscoped `[data-slot="button"]` remains.
  - `scoped glass tokens`: the scoped token block contains `--glass-opacity`.
  - `still rejects other at-rules`: an injected `@container` throws `Unsupported recipe style condition`.
  - `builtin-liquid-glass recipe compiles`: `resolveRecipePreset({ id: 'builtin-liquid-glass', revision: 1, … })` works.
- [ ] **Step 2:** Run `pnpm exec vitest run packages/compiler/test/recipe-styles.test.ts packages/compiler/test/component-preset.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Rerun, plus `stable-families.test.ts`. Expected: PASS, with stable hashes unchanged.
- [ ] **Step 5:** Commit `feat(compiler): scope liquid-glass Button presets and recipes`.

### Task 6: CLI notices and refusal

**Files:**
- Modify: `packages/cli/src/main.ts`. After each compile, set `plan.notices` from `componentsWithStyleSupport` intersected with the planned component ids, using the verbatim notice copy. Scoped Button paths always notice `button` for glass.
- Modify: `packages/cli/src/format.ts`. `formatPlan` appends `\nNotice: <text>` per notice, and `planOutput` adds `notices`.
- Modify: the `packages/cli/src/plan/*` builders, which must initialise `notices: []`
- Test: `tests/integration/liquid-glass-cli.test.ts`

**Interfaces:**
- Consumes: `componentsWithStyleSupport` and `assertStyleAvailable` (Task 2); compile changes (Tasks 4–5).
- Produces: `--json` output field `notices: string[]`. Human output prints `Notice:` lines. Notices never make a plan a conflict.

- [ ] **Step 1:** Write the failing integration tests, mirroring `tests/integration/tooltip-cli.test.ts` setup, for pnpm and npm:
  - `init --preset liquid-glass.json` then `add button dialog badge card tabs tooltip --yes` succeeds, and the installed CSS bytes equal the compile artifacts.
  - `--dry-run --json` contains the notice listing those six ids.
  - `add input --yes` exits non-zero with `STYLE_UNAVAILABLE`. A snapshot of every file under the project root, including the lock and lockfile, is unchanged.
  - `theme add liquid-glass.json` on a flat project switches tokens and prints the notice.
  - `add button --preset liquid-glass.json --yes` installs a scoped Button.
  - A preset file with `glassOpacity: 0.6` exits with `INVALID_DATA` and `/design/glassOpacity`.
- [ ] **Step 2:** Run `pnpm build:packages && pnpm exec vitest run --config vitest.integration.config.ts tests/integration/liquid-glass-cli.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Rerun. Expected: PASS. Then run `pnpm test:integration`. Expected: no regressions.
- [ ] **Step 5:** Commit `feat(cli): install liquid-glass components with experimental notices`.

### Task 7: Preview gallery with declared backdrops

**Files:**
- Create: `fixtures/shared/glass-scenario.tsx` with:
  - three backdrop fixtures, `data-backdrop="solid|gradient|pattern"`. The solid one is `var(--background)`. The gradient is `linear-gradient(135deg, #f97316, #0ea5e9 50%, #111827)`. The pattern is a `repeating-conic-gradient` checkerboard of `#000` and `#fff` at 12px.
  - each of the six components, plus a Button inside a Card (`data-testid="nested-glass"`), over every backdrop
  - six placeholders: `<p data-unavailable="<id>">Unavailable in liquid glass</p>`
  - a light/dark toggle matching `scenario.tsx`
- Modify: `scripts/generate-preview.ts`. After the stable loop, compile `liquid-glass` with `componentsWithStyleSupport('liquid-glass', ['experimental'])` into `apps/preview/src/generated/liquid-glass/`, using `glass-scenario.tsx` as `scenario.tsx`, and the same manifest, `preview.css` and `entry.tsx` shape. The stable outputs and `editor-buttons.ts` add a glass Button import.
- Modify: `apps/preview/src/main.tsx` (entries map plus `liquid-glass`) and the "Unknown style family" copy
- Test: `tests/integration/preview-routing.test.ts` adds `/liquid-glass`

- [ ] **Step 1:** Add the routing case: `selectFamily('/liquid-glass') === 'liquid-glass'`, and the glass entry is present in `main.tsx`'s map (assert by reading the file, as the existing routing test does). Run `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/preview-routing.test.ts`. Expected: FAIL on the missing entry.
- [ ] **Step 2:** Implement the fixture, generator and entry.
- [ ] **Step 3:** Run `pnpm build:packages && pnpm generate:preview && pnpm build:preview`. Expected: the build succeeds and `apps/preview/src/generated/liquid-glass/manifest.json` exists. `git diff --stat apps/preview/src/generated/{flat,minimalist,neo-brutalism}` is empty apart from `editor-buttons.ts`.
- [ ] **Step 4:** Commit `feat(preview): render liquid-glass over declared backdrops`.

### Task 8: Editors and snapshot service

**Files:**
- Modify: `apps/www/src/preset-editor/components/preset-editor.tsx`. The family picker iterates `styleFamilies`, and the glass option label is `Liquid glass (Experimental)`. Transparency, blur and opacity controls render only for glass. Add a limitations panel (`aria-labelledby` heading `Liquid glass limitations`) listing the spec's limitations. Add a contrast readout from `glassContrastReport` (a `role="status"` region). JSON/CSS export and publish buttons are `disabled` while `!report.passes`, with `aria-describedby` pointing at the readout.
- Modify: `apps/www/src/preset-editor/model.ts` (draft creation for glass) and `apps/www/src/preset-editor/use-preset-compiler.ts` (compile only experimental ids for glass)
- Modify: `fixtures/shared/preset-gallery.tsx` and `scripts/generate-preset-gallery.ts`. The gallery receives the active family and renders `Unavailable in liquid glass` placeholders with `aria-disabled="true"` for unavailable ids.
- Modify: `apps/www/src/editor/components/properties-panel.tsx` and `apps/www/src/editor/model.ts` (glass option and the notice text near export/CLI), and `apps/www/src/editor/preview-protocol.ts` (`styleSupport('button', family) !== 'unavailable'` instead of the literal list)
- Modify: `apps/www/src/snapshots/server/service.ts:43` to use `isStyleFamily`
- Test: `apps/www/src/preset-editor/model.test.ts` and `apps/www/src/editor/model.test.ts` add glass cases; `tests/e2e/liquid-glass.spec.ts` (Task 9) covers the browser flow

**Interfaces:**
- Consumes: `styleFamilies`, `styleSupport` and `glassContrastReport`.

- [ ] **Step 1:** Write the failing unit tests:
  - a glass preset draft is valid and resolves `builtin-liquid-glass`
  - a draft edit of `/design/glassOpacity` to `0.6` yields a report with `passes: false`
  - the Button editor glass draft validates
- [ ] **Step 2:** Run `pnpm exec vitest run apps/www/src/preset-editor/model.test.ts apps/www/src/editor/model.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Rerun the tests, plus `pnpm typecheck` and `pnpm test:unit`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(www): add experimental liquid-glass to both editors`.

### Task 9: Browser spec

**Files:**
- Create: `tests/e2e/liquid-glass.spec.ts`, following `tests/e2e/tooltip.spec.ts` and `badge.spec.ts` for server, axe and contrast-helper usage

Cases, each in light and dark:
- `axe over <backdrop>`: AxeBuilder with WCAG 2.2 AA tags on the preview `/liquid-glass` for each backdrop section. Expect no violations.
- `bounded contrast`: for each text slot (card title and description, dialog content, tooltip content, tabs triggers, secondary/outline/ghost Button), read the computed text colour. Render the same element over a `#000` and over a `#fff` backdrop via a test-only class toggle on the backdrop container. Sample the surface colour with `getComputedStyle` plus the composited pixel from a 1×1 element screenshot. Assert `contrastRatio ≥ 4.5`.
- `nested surfaces drop filter`: the `nested-glass` Button has computed `backdrop-filter: none`.
- `reduced transparency`: `page.emulateMedia({ reducedTransparency: 'reduce' })` if supported by the pinned Playwright version. Otherwise add a stylesheet that copies the `prefers-reduced-transparency` block's declarations, which records the limitation in evidence. Surfaces must have an opaque computed background and `backdrop-filter: none`.
- `no backdrop-filter support`: use `page.route` on the preview's CSS requests to strip every `@supports ((backdrop-filter…` block before serving, which simulates an engine without support. Assert opaque backgrounds and contrast ≥ 4.5 over the pattern backdrop.
- `forced colors`: `emulateMedia({ forcedColors: 'active' })`, then axe passes and there is no `backdrop-filter`.
- `reduced motion`: transitions are `none` or `0s`, and no `transition-property` includes `backdrop-filter`.
- `focus and targets`: Tab to each interactive glass control. The outline is visible (`outline-style` not `none`), and the bounding box is at least 24×24.
- `unavailable placeholders`: six `[data-unavailable]` elements with the copy.
- `preset editor glass flow` (www server): choose `Liquid glass (Experimental)`. The limitations panel is visible. Setting opacity to 0.6 disables export and publish, and the readout names a failing pair. Restoring re-enables them. Unavailable gallery entries carry `Unavailable in liquid glass`. axe passes on the page.

- [ ] **Step 1:** Write the spec.
- [ ] **Step 2:** Run `pnpm build:packages && pnpm generate:preview && pnpm exec playwright test tests/e2e/liquid-glass.spec.ts`. Expected: initially FAIL wherever CSS or editor gaps remain. Fix in the owning task's files and rerun until PASS. Record the Playwright browser name and version from the output.
- [ ] **Step 3:** Commit `test(e2e): cover liquid-glass contrast, fallbacks and editor flow`.

### Task 10: Glass consumers

**Files:**
- Modify: `scripts/consumer-matrix.ts`. Append `{id:'vite-liquid-glass',family:'liquid-glass',framework:'vite',manager:'pnpm',cliRuntime:'node'}` and the matching `next-liquid-glass` row after the stable rows, so existing ports are unchanged.
- Modify: `scripts/prepare-node-consumer.ts:135-140`. For glass, the add batches are `['add','button','dialog']`, `['add','badge']`, `['add','card']` and `['add','tabs','tooltip']`. Its scenario is `fixtures/shared/glass-scenario.tsx`.
- Modify: `tests/e2e/parity.spec.ts` only if it iterates `consumerCases()` rather than `supportedStyleFamilies`. It must skip glass rows in the stable parity loop. The glass parity check is the axe and contrast cases from Task 9 pointed at the consumer URL (add a `consumer` parameter there).
- Test: `scripts/consumer-matrix` unit test, if present (`grep -rl consumerCases tests packages`), to update the expected count from 34 to 36

- [ ] **Step 1:** Update the count test to 36 and the new ids. Run it. Expected: FAIL.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Run `pnpm prepare:consumers` then `pnpm build:consumers` (background; long). Expected: 36 consumers built, and glass consumers install exactly the six components.
- [ ] **Step 4:** Commit `test(consumers): add pnpm Vite and Next liquid-glass consumers`.

### Task 11: Docs, landing page, evidence

**Files:**
- Create: `docs/components/liquid-glass.md`, covering coverage, declared backdrops, the contrast bound in plain words, fallbacks, the limitations list (verbatim from the spec), and CLI and editor behaviour
- Create: `docs/evidence/liquid-glass.md` and `docs/evidence/liquid-glass-run.json`, recording commands, counts, pass/fail, OS, Node, pnpm, Playwright browser and version, and failed attempts
- Modify:
  - `docs/01-product-requirements.md` (first release scope sentence: implemented, experimental)
  - `docs/03-components-styles-accessibility.md` (matrix column values unchanged; the accessibility status paragraph replaces "Liquid glass remains unavailable")
  - `docs/04-presets-and-contracts.md` (transparency, blur and opacity semantics and the bound)
  - `docs/07-delivery-plan.md` (glass slice paragraph and the consumer count)
  - `docs/web-alpha-readiness.md` (gap 5 resolved as implemented and experimental; PR9 glass row)
  - `docs/foundation-local-usage.md` (CLI notice and refusal)
  - `README.md`
  - `apps/www/src/app/page.tsx:44`, where the sentence becomes "Liquid glass is experimental for Button, Badge, Card, Dialog, Tabs and Tooltip; form controls are not available in glass yet."
- Modify: `CHANGELOG.md` under Unreleased

- [ ] **Step 1:** Run the gates and record outputs: `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, and the Task 9 spec. If the toolchain is available, also run `pnpm check:foundation` in the background. Keep failed attempts in the evidence.
- [ ] **Step 2:** Write the docs from the recorded outputs only.
- [ ] **Step 3:** Run `pnpm exec vitest run apps/www/src` (landing page tests, if any) and the docs link check, if one exists (`grep -l "docs" scripts/check-foundation.mjs`).
- [ ] **Step 4:** Commit `docs(glass): document experimental liquid glass and its evidence`.
- [ ] **Step 5:** Rebase on `main` (`git fetch origin && git rebase origin/main`), rerun Task 1's guard and `pnpm test:unit`, then push and open a PR.
