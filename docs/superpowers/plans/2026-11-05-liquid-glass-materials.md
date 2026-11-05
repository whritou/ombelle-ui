# Liquid Glass Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give liquid glass the lab's material: relief, a pointer halo, rim refraction, dispersion and motion, with a dark mode that keeps the glass. Ship eight pickable starting presets (Cristal as the default) and editor controls for every setting, while keeping every existing control.

**Architecture:** Three PRs, each branched off `main` after the previous one merges.
- **PR 1:** adds six optional preset settings, the compiler tokens for them, one shared material in `liquid-glass.css` applied as three recipes across the glass sheets, and pointer tracking plus a rim map in `LiquidGlassFilter`.
- **PR 2:** makes Cristal the base preset and adds seven starting-point preset files. Tints, accents and the dark-mode wash are plain colour tokens.
- **PR 3:** adds the starting-point picker, sliders, tint chips, preview backdrops and Button editor overrides.

**Tech Stack:** TypeScript, React 19, Radix, CSS in `packages/catalog/src/styles`, postcss-based compiler tests, Vitest, Next.js (`apps/www`), Vite (`apps/preview`), Playwright for screenshots only.

**Spec:** `docs/superpowers/specs/2026-11-05-liquid-glass-materials-design.md`. The visual references are the canvas boards `LiquidGlassKit.dc.html` and `LiquidGlassButtons.dc.html` on https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, which hold the exact material CSS and preset values. Read them with the Artifact tool, `action: "read"`, `path: "project/LiquidGlassKit.dc.html"`. The lab is at `C:/Users/whrit/.codex/visualizations/2026/11/05/01a1acdb-e08b-7071-9d75-9dd8ddd020bc/liquid-glass-lab/` (`main.tsx`, `style.css`, `refraction.ts`).

## Global Constraints

- Node 24.19.0 and pnpm 11.25.0, through `corepack pnpm`, on Windows. Push with `git -c http.sslBackend=schannel push`.
- Conventional Commits. Branches are `feat/glass-material`, `feat/glass-presets` and `feat/glass-editor`, each off `main`.
- Edit `schemas/*.json`, never `packages/contracts/src/*-schema.ts`. Never edit `packages/catalog/src/generated.ts`. Run `corepack pnpm build:packages` after schema or catalog changes and commit the regenerated output. Never commit `*.tsbuildinfo`.
- Glass stylesheets:
  - at most one `[data-slot=` per complex selector (selector lists are split by postcss, so `a, b` is fine);
  - no descendant selectors (the existing test in `packages/compiler/test/liquid-glass.test.ts`);
  - a rule that reads `--glass-tint` must set it (the inherited-tint test);
  - glass surfaces inside `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`;
  - logical properties only;
  - overlay animations only on `[data-state='open']`.
- The stable families' bytes must not change: `packages/compiler/test/stable-families.test.ts` must pass untouched.
- A preset that leaves the new settings out must compile to byte-identical `ui-tokens.css`.
- The contrast bound must pass for every built-in and starting preset. If one fails, tune that preset, not the component.
- Fallbacks follow the spec's table: not Chromium, filter not mounted, reduced motion, reduced transparency, forced colours.
- The website claims new glass looks only through `glassOnSite()` and `glassMinimumCli: '0.5.0'`.
- Each PR's verification:
  - `corepack pnpm typecheck`;
  - `VITEST_MAX_WORKERS=4 corepack pnpm test:unit`;
  - `corepack pnpm exec vitest run tests/integration/preset-gallery-generation.test.ts tests/integration/preview-routing.test.ts tests/integration/hosted-preview-build.test.ts tests/integration/liquid-glass-cli.test.ts tests/integration/www-route.test.ts`;
  - light and dark Playwright screenshots on the www dev server (port 3100) after `node scripts/build-hosted-preview.mjs`;
  - a PR body stating that `test:e2e` was not run.

## Rulings made while planning

1. **Byte-identity covers tokens, not the stylesheet.** The spec says absent settings "compile byte for byte as before". `ui-style.css` must gain the new material rules whatever the preset, so the guarantee covers `ui-tokens.css`. Every new stylesheet layer multiplies by a token whose fallback is 0 (`var(--glass-depth, 0)`), so with the tokens absent it renders as today. Task M3 tests that.
2. **New tokens are emitted only when the field is set.** This is how a preset without the fields keeps byte-identical tokens.
3. **`glassSheen` widens to 0–1.** The lab's Shine reaches 76 and the field caps at 0.5. Presets store `shine / 100`.
4. **The dark-mode wash is a colour token.** Presets express it as a dark `card` and `popover` of `oklch(94.2% 0.025 264 / 38%)` (≈ `rgb(226 236 255 / 38%)`), with `cardForeground` and `popoverForeground` `#F0F7FF`. Glass opacity × 38% is then the wash, and the existing contrast model already handles alpha tokens. Fumé keeps an opaque dark veil. "Liquid glass (0.5)" keeps today's dark card, because it is today's look.
5. **No presets index page exists on the website.** The spec's "presets list" is the editor's starting-point picker. PR 3 adds no new page.
6. **Halo targets.** `LiquidGlassFilter` finds a surface with `closest()` over `glassHaloSelector`, exported from `@ombelle/catalog` (built from the Surface and Control slot lists). No new data attribute is added to templates.

## Review Focus

1. **A 0.5 project's saved preset without the new fields.** Its tokens are unchanged and it renders as before. Test in Task M2.
2. **A preset at the extremes** (contrast 1.6, refraction width 0.3, every new field at 1). It compiles; the bound evaluates and reports. Test in Task M2.
3. **The pointer leaves the window, a touch is cancelled, or a surface unmounts while hovered.** The halo attributes are cleared and nothing throws. Test in Task M5.
4. **`prefers-reduced-motion`.** No light travel, no lift, halo fixed at the top. Test in Task M3 (CSS) and Task M5 (the listener writes no pointer position).
5. **Picking a starting point after editing colours by hand.** All values, colours included, are replaced, and the picker then shows that preset. The next edit shows "Custom". Test in Task E1.

---

## PR 1: material (`feat/glass-material`)

### Task M1: Optional glass settings in the schema

**Files:**
- Modify: `schemas/preset.schema.json` (design properties)
- Modify: `packages/compiler/src/glass-contrast.ts` (`glassDesignDefaults`)
- Test: `packages/contracts/test/preset.test.ts` (or the existing preset-schema test), `packages/compiler/test/liquid-glass.test.ts`

**Interfaces:**
- Produces design fields:
  - `glassRefraction` 0–1;
  - `glassRefractionWidth` 0–0.3;
  - `glassHalo` 0–1;
  - `glassDepth` 0–1;
  - `glassMotion` 0–1;
  - `glassDispersion` 0–1.
  All are optional, with no schema default.
- Widens `glassBackdropContrast` to a maximum of 1.6 and `glassSheen` to a maximum of 1 (minimums unchanged).
- `glassDesignDefaults` gains the six fields at 0.

- [ ] **Step 1:** Write the failing test `accepts the material settings and rejects out-of-range values`. It checks:
  - a preset with all six at their maxima validates;
  - `glassRefractionWidth: 0.31`, `glassBackdropContrast: 1.61` and `glassSheen: 1.01` each fail on their path;
  - `glassBackdropContrast: 1.25` and `glassSheen: 0.76` validate.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Edit the schema and `glassDesignDefaults`, then run `corepack pnpm build:packages`.
- [ ] **Step 4:** Run the test and `packages/compiler/test/stable-families.test.ts`. Expect PASS.
- [ ] **Step 5:** Commit with `feat(contracts): add optional liquid glass material settings`.

### Task M2: Compiler tokens

**Files:**
- Modify: `packages/compiler/src/glass.ts` (`glassTokens`)
- Test: `packages/compiler/test/liquid-glass.test.ts`

**Interfaces:**
- Consumes M1's fields.
- Produces mode-independent tokens, each emitted only when its field is defined:

  | Token | Value |
  | --- | --- |
  | `--glass-refraction-strength` | `glassRefraction / 6.9` |
  | `--glass-refraction-width` | `glassRefractionWidth` |
  | `--glass-halo` | `glassHalo` |
  | `--glass-depth` | `glassDepth` |
  | `--glass-motion` | `glassMotion` |
  | `--glass-dispersion` | `glassDispersion` |

- Also produces `--glass-drop`, `max(0, (glassBackdropContrast - 1) * 0.545)`, emitted only when that value is above 0.
- Under `transparency: "reduced"`:
  - `--glass-halo`, `--glass-refraction-strength` and `--glass-dispersion` are `0`;
  - `--glass-motion` and `--glass-depth` keep their values.

- [ ] **Step 1:** Write the failing test `a preset without material settings keeps byte-identical tokens` (Review Focus 1). Compiling the current built-in `liquid-glass.json` gives `ui-tokens.css` identical to the output recorded before this PR. Record it inline as a string snapshot, taken first on `main`.
- [ ] **Step 2:** Write the failing test `material settings become tokens`. With all six at 0.5 and contrast 1.25:
  - `--glass-halo:0.5`;
  - `--glass-refraction-strength:0.0725`;
  - `--glass-drop:0.136`;
  - the same in `.dark`;
  - under `transparency: "reduced"`, `--glass-halo:0` and `--glass-refraction-strength:0`.
- [ ] **Step 3:** Write the failing test `extremes compile and the bound reports` (Review Focus 2). A preset at contrast 1.6, refraction width 0.3 and every new field at 1:
  - compiles, or throws only `INVALID_DATA` from the contrast bound;
  - `glassContrastReport` returns finite ratios for every pair.
- [ ] **Step 4:** Implement in `glassTokens`. Round to at most 4 decimals, as the existing tokens do.
- [ ] **Step 5:** Run the tests. Expect PASS. Then commit with `feat(compiler): emit liquid glass material tokens`.

### Task M3: The shared material and its three recipes

**Files:**
- Modify: `packages/catalog/src/styles/liquid-glass.css`, and every `packages/catalog/src/styles/*/liquid-glass.css` that paints a glass surface
- Test: `packages/compiler/test/liquid-glass.test.ts`, the per-component compiler tests

**Interfaces:**
- Consumes M2's tokens.
- Produces the recipe slot lists, exported from `packages/catalog/src/glass-recipes.ts` (new file, re-exported from the catalog index):
  - `glassSurfaceSlots`: `card`, `dialog-content`, `popover-content`, `dropdown-menu-content`, `dropdown-menu-sub-content`, `select-content`, `tooltip-content`, `alert`, `table-container`, `accordion`;
  - `glassControlSlots`: `button`, `badge`, `tabs-list`, `input`, `textarea`, `native-select`, `select-trigger`;
  - `glassMarkSlots`: `checkbox`, `switch`, `radio-group-item`, `avatar`, `progress`, `skeleton`;
  - `glassHaloSelector: string`, the `[data-slot="…"]` list of Surface and Control slots.

  Confirm each slot name against its template and use the template's actual name.
- Layers, exactly as on the kit board's `.g` rule:
  - **Relief:** inset bevel and bounce light, scaled by `var(--glass-depth, 0)`.
  - **Dispersion:** inset fringes in `rgb(255 80 170)`, `rgb(60 200 255)` and `rgb(255 214 110)`, scaled by `var(--glass-dispersion, 0)`.
  - **Drop shadow:** `0 16px 38px rgb(0 10 37 / var(--glass-drop, 0))`, added to PR A's drop shadow.
  - **Shine on `::before`:** a radial highlight at `calc(23% + (var(--pointer-x, 23%) - 23%) * var(--glass-motion, 0))`, `calc(var(--pointer-y, 0%) * var(--glass-motion, 0))`. It sits over today's sheen gradient, with opacity `var(--glass-sheen)`.
  - **Halo on `::after`:** only under `[data-halo-active]`. A ring masked to the border with `mask-composite: exclude`, opacity `var(--glass-halo, 0)`. Surface radius 120px, Control radius 44px.
  - **Motion (Surface only):** hover lift `translate: 0 calc(-9px * var(--glass-motion, 0))`. Press, on Surface and Control: `scale: calc(1 - .06 * var(--glass-motion, 0))`.
- Mark gets veil and rim only.

- [ ] **Step 1:** Write the failing test `every material layer is scaled by a token that falls back to 0`. In the compiled glass `ui-style.css`:
  - every declaration that reads `--glass-depth`, `--glass-dispersion`, `--glass-halo`, `--glass-motion` or `--glass-drop` reads it as `var(--glass-…, 0)`;
  - the halo `::after` rule's selectors all include `[data-halo-active]`.
- [ ] **Step 2:** Write the failing test `recipes reach their slots`:
  - each Surface slot has a hover-lift rule;
  - each Control slot has a press rule and no hover lift;
  - no Mark slot has `::after` halo rules;
  - under `@media (prefers-reduced-motion: reduce)` there are no `translate` or `scale` declarations, and the shine position does not read `--pointer-x` (Review Focus 4);
  - under `@media (forced-colors: active)` `::before` and `::after` have `content: none`.
- [ ] **Step 3:** Run the tests. Expect FAIL.
- [ ] **Step 4:** Write the material and recipes:
  - Move the radio-group and separator sheets' existing `::before`/`::after` content to a child or a background layer, so `::before` holds the shine and `::after` the halo everywhere.
  - Keep every existing sheet's reduced-transparency and forced-colours blocks.
- [ ] **Step 5:** Run `corepack pnpm build:packages` and the compiler and catalog tests, including stable families. Expect PASS. Then commit with `feat(catalog): share one liquid glass material across the glass sheets`.

### Task M4: Pointer tracking and the rim map in LiquidGlassFilter

**Files:**
- Modify: `packages/catalog/src/templates/liquid-glass-filter.tsx`
- Create: `packages/catalog/src/templates/glass-rim-map.ts` (pure function, emitted with the filter)
- Test: `packages/catalog/test/liquid-glass-filter.test.tsx`, `packages/catalog/test/glass-rim-map.test.ts`

**Interfaces:**
- Consumes `glassHaloSelector` (M3) and the tokens `--glass-refraction-strength` and `--glass-refraction-width` (M2), read with `getComputedStyle(document.documentElement)`.
- Produces `export function glassRimMapPixels(size: number, radius: number, widthFraction: number): Uint8ClampedArray`, the lab's `createRimMap` math as RGBA data.
- Produces `LiquidGlassFilter`, whose behaviour becomes:
  - one `pointermove`, `pointerdown`, `pointerup`, `pointercancel` and `pointerleave` listener set on `document`;
  - on move, `closest(glassHaloSelector)` gets `--pointer-x` and `--pointer-y` as percentages and the attribute `data-halo-active`;
  - the previous surface is cleared;
  - non-mouse pointers clear on `pointerup`;
  - under `prefers-reduced-motion: reduce`, it sets only `data-halo-active`, with no pointer position;
  - refraction: a single displacement filter whose `feImage` is the rim map (canvas `toDataURL`) and whose scale is `--glass-refraction-strength`;
  - the existing per-channel prism is replaced, because dispersion is CSS now;
  - the filter is regenerated when the width token changes (read on mount and on a `MutationObserver` of the root's `style` and `class`);
  - Chromium gating is unchanged.

- [ ] **Step 1:** Write the failing test `rim map is neutral inside and displaced at the rim`. For `glassRimMapPixels(192, 23, 0.13)`:
  - the centre pixel's R and G are 128;
  - the left edge's middle pixel has R above 200;
  - with width 0, every pixel's R and G are 128.
- [ ] **Step 2:** Write the failing test `tracks the pointer on glass surfaces and clears it` (Review Focus 3). In jsdom, with a `[data-slot="card"]` of 200×100 at 0,0:
  - `pointermove` at 50,25 sets `--pointer-x: 25%`, `--pointer-y: 25%` and `data-halo-active`;
  - moving to `document.body` clears all three;
  - `pointercancel` clears them;
  - unmounting the card while active doesn't throw;
  - with `matchMedia('(prefers-reduced-motion: reduce)')` true, only `data-halo-active` is set.
- [ ] **Step 3:** Run the tests. Expect FAIL.
- [ ] **Step 4:** Implement it. Keep the component's existing mount-once usage note and update its comment.
- [ ] **Step 5:** Run `corepack pnpm build:packages`, the tests, and `tests/integration/liquid-glass-cli.test.ts`, which must still install the filter. Expect PASS. Then commit with `feat(catalog): track the pointer and refract the rim in LiquidGlassFilter`.

### Task M5: PR 1 docs, evidence and PR

**Files:**
- `docs/components/liquid-glass.md`: the settings table, the three recipes, the fallback table, the halo needing `LiquidGlassFilter`
- `CHANGELOG.md`
- `docs/evidence/glass-material.md`, with images

- [ ] **Step 1:** Write the docs.
- [ ] **Step 2:** Run the Global Constraints verification. Capture light and dark screenshots with a draft that sets every new field to 0.6 on Card, Dialog, Button, Badge, Input and Checkbox, then with the built-in unchanged. The built-in must look as before.
- [ ] **Step 3:** Commit, push and open PR 1. The body lists the rulings above that apply.

---

## PR 2: presets (`feat/glass-presets`)

### Task P1: Cristal becomes the base, plus the starting-point files

**Files:**
- Modify: `packages/catalog/src/presets/liquid-glass.json` (Cristal)
- Create: `packages/catalog/src/presets/liquid-glass-givre.json`, `-fume.json`, `-relief.json`, `-clear.json`, `-prism.json`, `-liquid.json`, `-classic.json`
- Modify: `scripts/sync-catalog*` (whichever reads `presets/`) and `packages/catalog/src/index.ts`
- Test: `packages/catalog/test/catalog.test.ts`, `packages/compiler/test/liquid-glass.test.ts`

**Interfaces:**
- Produces `catalog.startingPresets: Record<StartingPresetId, Preset>`, with ids:
  - `builtin-liquid-glass` (Cristal);
  - `builtin-liquid-glass-givre`, `-fume`, `-relief`, `-clear`, `-prism`, `-liquid`, `-classic`.
- Produces `startingPresetOrder` (Cristal first) and display names:
  - "Cristal", "Givré", "Fumé", "Relief", "Clear", "Prism", "Liquid", "Liquid glass (0.5)".
- `catalog.presets['liquid-glass']` stays the Cristal file, so the compiler and CLI don't change.
- Field values come from the spec's Presets table:
  - opacity / 100;
  - blur as is;
  - `glassBackdropContrast` = 1 + contrast / 180, rounded to 3 decimals;
  - `glassSheen` = shine / 100;
  - `glassRefraction`, `glassHalo`, `glassDepth` (from Relief), `glassMotion` and `glassDispersion` = value / 100;
  - `glassRefractionWidth` = width / 100;
  - `glassRim` = rim / 100;
  - `glassSaturation` 1 and `glassBackdropTone` 0, because the lab applies neither.
  "Liquid glass (0.5)" copies today's built-in values unchanged.
- Colours come from the spec's tint and accent tables:
  - **Light:** `card` and `popover` = veil as hex; `cardForeground`, `popoverForeground` and `foreground` = ink; `primary` and `ring` = the accent; `primaryForeground` = ink.
  - **Dark:** Ruling 4's wash, or Fumée's opaque veil.

- [ ] **Step 1:** Write the failing test `starting presets load and validate`:
  - eight ids in `startingPresetOrder`, Cristal first;
  - each validates;
  - Relief's light `card` is `#F4A5B3`;
  - Cristal's light `primary` is `#0B6AA8`;
  - Fumé's light `cardForeground` is `#F0F7FF`.
- [ ] **Step 2:** Write the failing test `every starting preset passes the contrast bound`: `glassContrastReport(preset).passes` is true for each one, and the test records each preset's `minimumOpacity` as an exact expectation.
- [ ] **Step 3:** Run them. Expect FAIL.
- [ ] **Step 4:** Add the files and the loader. Run the bound. For each failing preset, tune per Global Constraints:
  - first its accent or ink shade;
  - then opacity in 0.01 steps;
  - never the component;
  - record each tuned value in the test and the PR.
- [ ] **Step 5:** Run `corepack pnpm build:packages` and the catalog, compiler and `liquid-glass-cli` tests. Expect PASS. Then commit with `feat(catalog): add Cristal and the liquid glass starting presets`.

### Task P2: PR 2 docs, upgrade note, evidence and PR

**Files:** `docs/components/liquid-glass.md` (the presets table, each preset's minimum opacity, the upgrade note), `CHANGELOG.md`, `docs/evidence/glass-presets.md` with images.

- [ ] **Step 1:** Write the upgrade note. 0.4.x and 0.5.0 projects keep their saved preset. To adopt Cristal, re-init from the built-in or copy its values. List the values.
- [ ] **Step 2:** Run the Global Constraints verification. Capture each of the eight presets in light and dark (Relief on Pêche, once PR 3 adds it; on the kit backdrop until then) on Card, Button variants, Input, Select open and Table.
- [ ] **Step 3:** Commit, push and open PR 2.

---

## PR 3: editors (`feat/glass-editor`)

### Task E1: Starting point picker

**Files:**
- Modify: `apps/www/src/preset-editor/model.ts`, `apps/www/src/preset-editor/components/glass-panel.tsx`
- Test: `apps/www/src/preset-editor/model.test.ts`, `apps/www/src/preset-editor/components/glass-panel.test.tsx`

**Interfaces:**
- Consumes `startingPresets` and `startingPresetOrder` (P1).
- Produces:
  - `export function applyStartingPreset(draft: PresetDraft, id: StartingPresetId): PresetDraft`, which replaces design and both colour modes;
  - `export function matchingStartingPreset(draft: PresetDraft): StartingPresetId | null`, which deep-compares design and colours.

- [ ] **Step 1:** Write the failing test `picking a starting point replaces every value` (Review Focus 5). On a glass draft with a hand-edited `primary`, applying `builtin-liquid-glass-relief`:
  - gives Relief's colours and design;
  - `matchingStartingPreset` returns that id;
  - changing `glassHalo` makes it return `null`.
- [ ] **Step 2:** Write the failing test `the glass panel shows the starting points`:
  - eight buttons in order;
  - Cristal labelled "Cristal (default)";
  - the pressed one follows `matchingStartingPreset`;
  - "Custom" shows when it is `null`.
- [ ] **Step 3:** Run them. Expect FAIL. Then implement them, run them (expect PASS), and commit with `feat(www): pick a liquid glass starting preset`.

### Task E2: Material sliders and tint chips

**Files:**
- Modify: `apps/www/src/preset-editor/model.ts` (the glass controls), `apps/www/src/preset-editor/components/glass-panel.tsx`, `preset-controls.tsx` if the sliders live there
- Test: `glass-panel.test.tsx`, `preset-controls.test.tsx`

**Interfaces:**
- Adds the six fields to the glass controls, in the lab's order:

  | Control | Range | Step |
  | --- | --- | --- |
  | Opacity | existing | — |
  | Backdrop blur | existing | — |
  | Contrast | 0.3–1.6 | 0.01 |
  | Shine | 0–1 | 0.01 |
  | Refraction | 0–1 | 0.01 |
  | Refraction width | 0–0.3 | 0.01 |
  | Rim | existing | — |
  | Pointer halo | 0–1 | 0.01 |
  | Relief | 0–1 | 0.01 |
  | Motion | 0–1 | 0.01 |
  | Dispersion | 0–1 | 0.01 |

- Each slider has a one-line hint, taken from the kit board's settings table.
- Produces `export function applyGlassTint(draft: PresetDraft, tint: 'clear' | 'rose' | 'smoke' | 'white'): PresetDraft`, which writes the spec's veil, ink and accent values into both modes. For a draft whose preset is Relief, it uses Relief's warmer Rosée.
- Existing controls are unchanged: radius, font, density, colours, border, shadow, motion and transparency.

- [ ] **Step 1:** Write the failing tests:
  - `glass drafts show the material sliders in the lab's order`;
  - `refraction sliders say Chromium only outside Chromium but stay editable`;
  - `tint chips write veil, ink and accent for both modes`. Rosée sets light `card` `#FFD7EB` and `primary` `#A3245A`, and dark `primary` `#F9A8D4`.
  - `existing controls are still present for a glass draft`: Radius, Font family, Density and the Primary colour field.
- [ ] **Step 2:** Run them. Expect FAIL. Then implement them, run them (expect PASS), and commit with `feat(www): tune the liquid glass material in the preset editor`.

### Task E3: Preview backdrops and live halo

**Files:**
- Modify: `apps/preview/src/glass-backdrop.css` (add `data-backdrop` values `prism`, `grid`, `night`, `peach`; the kit gradient stays the default), `apps/preview/src/preset-preview.tsx`, `apps/preview/src/editor-preview.tsx` (mount `LiquidGlassFilter` for glass)
- Modify: the preset editor preview toolbar: a backdrop picker with Prisme, Trame, Nuit and Pêche
- Test: `tests/integration/hosted-preview-build.test.ts`, and the preview protocol test for the new backdrop message field

**Interfaces:**
- The preview message gains `backdrop?: 'kit' | 'prism' | 'grid' | 'night' | 'peach'`.
- Applying Relief sets `peach` (preview state only, never saved).

- [ ] **Step 1:** Write the failing tests:
  - the built preview CSS contains the four `[data-backdrop=…]` rules;
  - the editor preview mounts the filter for a glass recipe;
  - applying Relief in the editor sends `backdrop: 'peach'`.
- [ ] **Step 2:** Run them. Expect FAIL. Then implement them, run them (expect PASS), and commit with `feat(preview): material backdrops and live halo in glass previews`.

### Task E4: Button editor glass overrides

**Files:**
- Modify: `schemas/recipe.schema.json` (`overrides` gains optional `glassOpacity`, `glassBlurPx`, `glassBackdropContrast`, `glassSheen`, `glassRim`, `glassHalo`, `glassDepth`, `glassMotion`, `glassDispersion`, with the preset schema's ranges)
- Modify: `packages/compiler/src/recipe-styles.ts` (scoped glass tokens from overrides), `apps/www/src/editor/components/properties-panel.tsx`
- Test: `packages/compiler/test/recipe-styles.test.ts`, `apps/www/src/editor/components/properties-panel.test.tsx`

- [ ] **Step 1:** Write the failing test `glass recipe overrides become scoped material tokens`. A glass recipe with `overrides.glassHalo: 0.9` and `glassDepth: 0.4`:
  - emits `--glass-halo:0.9` and `--glass-depth:0.4` on the scoped Button;
  - a flat recipe with the same overrides is rejected or ignored, as the existing glass-only overrides behave.
- [ ] **Step 2:** Write the failing test `the Button editor shows material sliders for glass recipes only`.
- [ ] **Step 3:** Run them. Expect FAIL. Then implement them, run `corepack pnpm build:packages` and the tests (expect PASS), and commit with `feat(www): override the glass material per Button recipe`.

### Task E5: PR 3 docs, evidence and PR

**Files:** `docs/components/liquid-glass.md` (the editor section), `CHANGELOG.md`, `docs/evidence/glass-editor.md` with images.

- [ ] **Step 1:** Write the docs.
- [ ] **Step 2:** Run the Global Constraints verification. Capture the editor with each starting point, a tint change, the backdrop picker, the halo under the pointer, and the Button editor with glass overrides, in light and dark.
- [ ] **Step 3:** Commit, push and open PR 3.
