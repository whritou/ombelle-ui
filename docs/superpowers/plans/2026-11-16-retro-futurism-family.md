# Retro Futurism Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `retro-futurism` as a stable style family in 0.8.2: all 57 components in light and dark, seven editor palettes, fonts Michroma, Exo 2 and Space Mono.

**Architecture:** The Organic route (decision 0007, commit `8dac8920`). A preset and schema value, a base stylesheet plus one stylesheet per component built from the component's `papier.css` with a mechanical pass and a layer after `/* retro-futurism layer */`, then registration, wiring, palettes, fixtures, one audit pass and docs. Component styles are written and linted while `retro-futurism` is unregistered; registration comes after the last style file.

**Tech Stack:** TypeScript and ES modules, CSS in `packages/catalog/src/styles/`, Vitest, Playwright specimen audit, pnpm 11.25.0, Node 24.19.0.

**Spec:** `docs/superpowers/specs/2026-11-16-retro-futurism-family-design.md`. Reference CSS: `docs/superpowers/specs/assets/retro-futurism-082-board.css`. Precedent: `docs/superpowers/plans/2026-11-16-organic-family.md`, `docs/decisions/0007-organic-family.md`, `git show 8dac8920`.

## Global Constraints

- Branch `feat/style-retro-futurism` in worktree `.claude/worktrees/style-retro-futurism`, cut from `origin/main` `043d65f8`. Conventional Commits `type(scope): description`, no `codex` prefix.
- Edit schemas in `schemas/`, never `packages/contracts/src/preset-schema.ts`; edit catalog inputs in `templates/`, `styles/`, `presets/`, never `generated.ts`. `pnpm build:packages` regenerates both; commit regenerated files with their sources.
- Relative TypeScript imports keep `.js` specifiers. Compiler output stays deterministic. Keyframe names stay `ombelle-*`. Every style rule names a slot or marker.
- Family id `retro-futurism`, display name `Retro futurism`, preset id `builtin-retro-futurism`, marker comment `/* retro-futurism layer */`, shared custom properties prefixed `--rf-`.
- Fonts: `styleFamilyFonts['retro-futurism'] = { body: 'exo-2', display: 'michroma', mono: 'space-mono' }`, all already registered (no font task, no font gate). The built-in preset uses `system-sans`; headings use `var(--font-heading, system-ui, sans-serif)` at weight 400. Michroma is never a body or control font.
- Heading sizes: card title 16px (dense 14px), dialog title 18px, accordion trigger 14px, labelled separator label 13px.
- Text pairs 4.5:1 (3:1 large). Contrast and the audit win over the canvas; record each deviation for decision 0008.
- **Secondary is a saturated teal fill.** `var(--secondary)` may only appear as a background in a rule that also sets `var(--secondary-foreground)` (a filled secondary control). Every surface, well, track or hover use that Papier draws with `--secondary` becomes `var(--muted)` (wells, tracks, skeletons) or `var(--accent)` (hover, highlighted rows), with the matching foreground.
- Signature colours are derived from tokens in `retro-futurism.css`, never hard-coded in component files.
- Every outline drawn as an inset `box-shadow` and every band drawn as a background (gradient header, stripes, scanlines) needs a `@media (forced-colors: active)` fallback: a `CanvasText` border, text in `CanvasText`.
- Gate: `retroFuturismMinimumCli = '0.8.2'`; the published installer is 0.8.1, so the site hides the family until 0.8.2 ships.
- Other families' output bytes must not change: only `retro-futurism/*` lines may change in `stable-family-hashes.json`.
- Rerun only what changed; do not rerun passing, unchanged audits. No version bump, publish, tag or PR. Do not regenerate measured evidence files without the full gate; say so in 0008.

## Review Focus

- **Teal leaking into surfaces:** a menu row hover, a table stripe or a slider track painted in saturated teal because a Papier rule used `--secondary`. Expected: soft lilac (`--muted`/`--accent`). Pinned by the `secondary is a fill` lint in Task 1's test, run by every style task.
- **Gradient band text in palettes:** header text uses `--primary-foreground` over a gradient from `--primary` to `--destructive`; a palette whose destructive end is too close to that foreground makes the right half unreadable. Expected: 4.5:1 at both ends in every palette and both modes. Pinned in Task 13 and Task 14 (`primaryForeground` against `destructive`).
- **Key-shadow margin in tight places:** the 4px block-end margin that makes room for the button's key shadow misaligns buttons inside an input-group addon, a button group, a card action or a dialog close. Expected: margin 0 and no key shadow there. Pinned in Task 2 and Task 3.
- **Focus ring inside clipped containers:** the button group clips its children (`overflow: hidden`) for the pill ends, which hides a normal outer focus ring. Expected: a visible ring (inset offset). Pinned in Task 3.
- **Bands in forced colors:** the gradient card and table headers and the dialog stripes are backgrounds and vanish, leaving header text with authored colours. Expected: `CanvasText` text and a `CanvasText` bottom border. Pinned in Task 14's forced-colors test.

---

## File Structure

- Create `packages/catalog/src/presets/retro-futurism.json`: tokens and design.
- Create `packages/catalog/src/styles/retro-futurism.css`: shared `--rf-*` properties, Button, Input, Dialog, reduced motion.
- Create `packages/catalog/src/styles/<component>/retro-futurism.css`: 54 files.
- Create `packages/catalog/test/retro-futurism-styles.test.ts`: coverage, lint, variant and family-rule tests.
- Create `packages/catalog/test/retro-futurism-review-fixes.test.ts`: regression tests carried over from Organic's findings and any found here.
- Modify the registration and wiring sites `git show 8dac8920 --stat` lists (Tasks 11 to 14).
- Create `docs/decisions/0008-retro-futurism-family.md`.

## Task 1: Preset, schema value and the style test

**Files:**
- Create: `packages/catalog/src/presets/retro-futurism.json`, `packages/catalog/test/retro-futurism-styles.test.ts`
- Modify: `schemas/preset.schema.json` (`styleFamily` enum: insert `"retro-futurism"` after `"organic"`), regenerated `packages/contracts/src/preset-schema.ts`
- Test: `packages/contracts/test/validate.test.ts`

**Interfaces:**
- Produces `retro-futurism.json`: `id "builtin-retro-futurism"`, `name "Retro futurism"`, 26 tokens per mode:
  - light: background `#F6EFE3`, foreground `#2A1B4D`, card and popover `#FFFAF0` / `#2A1B4D`, primary `#C23B1B` / `#FFFFFF`, secondary `#0F7C7A` / `#FFFFFF`, muted `#ECDFF0` / mutedForeground `#5A4B7A`, accent `#ECDFF0` / `#2A1B4D`, destructive `#8C1D5B` / `#FFFFFF`, success `#D8EDDB` / `#1F5E30`, warning `#FBE9C2` / `#7A4E00`, info `#DCE3F6` / `#24418C`, border and input `#2A1B4D`, ring `#2A1B4D`, shadowColor `#2A1B4D`.
  - dark: background `#150B2E`, foreground `#FFF1F8`, card and popover `#22123F` / `#FFF1F8`, primary `#FF8A4C` / `#1A0B2E`, secondary `#3DE6E0` / `#1A0B2E`, muted `#35205A` / `#BFA9E0`, accent `#35205A` / `#FFF1F8`, destructive `#FF6FB1` / `#1A0B2E`, success `#16332A` / `#9BEDB7`, warning `#3A2C14` / `#FFDE8F`, info `#1E2650` / `#AFC2FF`, border and input `#C9B5EA`, ring `#3DE6E0`, shadowColor `#C9B5EA`.
  - design: `fontFamilyId "system-sans"`, `radiusRem 0.875` (nominal), `density "comfortable"`, `borderWidthPx 2`, `shadowOffsetXPx 0`, `shadowOffsetYPx 4`, `motion "full"`, `transparency "reduced"`; `componentDefaults.button` default/default.
- Produces the test file every style task runs. It is `organic-styles.test.ts` with `organic` replaced by `retro-futurism`, plus one family rule:
  - `it.each(allFiles)('%s uses --secondary only as a filled control')`: split the file into declaration blocks; any block whose `background` names `var(--secondary)` must also contain `var(--secondary-foreground)`.

- [ ] **Step 1: Failing tests.** Create `retro-futurism-styles.test.ts` as above. In `validate.test.ts` add `accepts a preset whose styleFamily is retro-futurism` (validate the parsed preset).
- [ ] **Step 2:** `pnpm exec vitest run packages/catalog/test/retro-futurism-styles.test.ts packages/contracts/test/validate.test.ts` fails (missing files, enum value rejected).
- [ ] **Step 3:** Add the enum value, run `pnpm build:packages`, write the preset with the values above.
- [ ] **Step 4:** `validate.test.ts` passes. The style test still fails until Task 10; that is expected.
- [ ] **Step 5: Commit** `feat(catalog): add the Retro futurism preset and schema value`.

## Task 2: Family base stylesheet

**Files:**
- Create: `packages/catalog/src/styles/retro-futurism.css`
- Test: `retro-futurism-styles.test.ts` (base tests), plus added assertions below

**Interfaces:**
- Produces, on `[data-slot]` (as `organic.css:131` declares `--o-*`), consumed by every later task:
  - `--rf-key: var(--shadow-color, var(--border))`; radii `--rf-r1: 8px`, `--rf-r2: 14px`, `--rf-r3: 22px`, `--rf-r4: 28px`, `--rf-pill: 999px`.
  - Elevations: `--rf-e1: 0 4px 0 var(--rf-key)`; `--rf-e2: 0 0 0 2px var(--rf-key), 0 6px 0 2px var(--rf-key)`; `--rf-e3: 0 0 0 2px var(--rf-key), 0 8px 0 2px var(--rf-key), 0 26px 44px -18px color-mix(in oklab, var(--rf-key) 35%, transparent)`.
  - Second tones: `--rf-pri2`, `--rf-sec2`, `--rf-dst2` = `color-mix(in oklab, <fill> 84%, #000)`.
  - `--rf-sun: color-mix(in oklab, var(--warning-foreground) 22%, #FFD36B)`.
  - `--rf-band: linear-gradient(90deg, var(--primary), var(--destructive))`, text `var(--primary-foreground)`.
  - `--rf-stripes: linear-gradient(180deg, var(--primary) 0 4px, transparent 4px 7px, var(--rf-sun) 7px 11px, transparent 11px 14px, var(--secondary) 14px 18px)` (18px tall).
  - `--rf-scan: repeating-linear-gradient(180deg, transparent 0 2px, rgb(0 0 0 / 0.14) 2px 3px)`.
  - `--rf-sun-mask`: the canvas `.ch::after` mask gradient.
- Styles `[data-slot="button"]` exactly as the canvas `.btn` rules: pill, 2px border, `--rf-e1`, `margin-block-end: 4px`, two-tone fill (`fill 0 52%, second tone 52%`) with `--rf-scan` over the lower 48%, all 7 variants (secondary uses `--secondary` and `--rf-sec2` with `--secondary-foreground`), sizes 36 / 46 / 56px and icon 46 / 36, hover (brightness 1.08, lift 1px, 5px shadow), pressed (`translateY(4px)`, shadow 0), focus (3px ring, 4px offset), disabled (45%, already dropped). `[data-slot="input"]`: 14px radius, 2px `--input` border, inner line `inset 0 3px 0` in border at 18%, primary border on hover, ring on focus, dashed read-only, three sizes. `[data-slot="dialog-content"]`: 28px radius, `--rf-e3`, the `--rf-stripes` band as an 18px top edge inside the box (`::before`, not outside), close button clear of the band. `prefers-reduced-motion` rule from `organic.css`.

- [ ] **Step 1: Failing assertions.** Add to the test: `base declares every --rf property once`; `button key-shadow margin is removed inside card actions and the dialog close` (`margin-block-end: 0` and `box-shadow: none` for `[data-slot="card-action"] [data-slot="button"]` and `[data-slot="dialog-close"]`); `dialog band is drawn inside the box` (`::before` has no negative inset). Run the base tests: fail.
- [ ] **Step 2:** Write `retro-futurism.css` from `papier.css` structure plus the canvas rules above.
- [ ] **Step 3:** Run the base tests: pass.
- [ ] **Step 4: Commit** `feat(catalog): add the Retro futurism family base styles`.

## Tasks 3 to 10: Component stylesheets by board

Each task creates the listed `styles/<id>/retro-futurism.css` files. Method for every file: copy the component's `papier.css` (slots, states, forced-colors structure); mechanical pass (1px borders to `2px solid var(--border)`, Papier offset shadows to `--rf-e1`/`--rf-e2`/`--rf-e3`, Papier radii to `--rf-*`, `--secondary` surfaces to `--muted`/`--accent` per Global Constraints); then the layer after `/* retro-futurism layer */` from the matching canvas rules in `retro-futurism-082-board.css` (canvas classes map to the `data-slot`, `data-variant`, `data-size`, `data-appearance` attributes in `packages/catalog/src/templates/<id>.tsx`). The board stylesheet wins over the spec's summary where they disagree.

Each task's cycle: **(a)** `pnpm exec vitest run packages/catalog/test/retro-futurism-styles.test.ts -t "(<ids joined by |>)"` fails; **(b)** write the files; **(c)** rerun, passing (lint, variant coverage, secondary rule, task assertions); **(d)** no `pnpm build:packages` until Task 11; **(e)** commit `feat(catalog): add Retro futurism styles for <board>`.

| Task | Board | Ids |
|---|---|---|
| 3 | actions | button-group, toggle, toggle-group, toolbar, chip, badge, kbd, spinner |
| 4 | text fields | label, textarea, field, input-group, number-input, password-field, input-otp, tag-input |
| 5 | choice controls | native-select, select, combobox, checkbox, radio-group, switch, slider, color-picker, calendar |
| 6 | content | card, item, avatar, separator, aspect-ratio, empty, skeleton |
| 7 | status | alert, toast, progress, meter, stepper |
| 8 | navigation | tabs, accordion, collapsible, breadcrumb, pagination, dropdown-menu, context-menu |
| 9 | overlays | command, alert-dialog, sheet, popover, hover-card, tooltip |
| 10 | data | table, code-block, carousel, scroll-area |

(8 + 8 + 9 + 7 + 5 + 7 + 6 + 4 = 54, plus button, input and dialog in the base.)

Task assertions, added to `retro-futurism-styles.test.ts`:
- Task 3: `button-group` draws one outline and `--rf-e1` on the group, 2px seams, pill ends, vertical radius 24px, and its buttons' focus ring uses a negative `outline-offset`; `toggle` pressed has an outline and no key shadow; `toggle-group` segmented selected has an outline and no key shadow, toolbar-style selected has `--rf-e1`; `badge` is a pill and destructive solid keeps an inner ring; `kbd` has a 2px outline and a 3px key base.
- Task 4: `input-otp` slots are separate 12px cells; `password-field` strength bars are pills; `[data-slot="input-group-button"]` has no key shadow and no block-end margin.
- Task 5: `checkbox` box radius 6px, invalid marker and card-appearance checked rule present; `switch` track is a pill, checked thumb uses `--rf-sun`; `slider` fill uses a striped gradient and the thumb is a `--rf-sun` disc with a 2px outline and a border width that leaves room for the Base UI hidden input (as Organic's 3px fix); `calendar` selected day is a disc, range ends round, middle square.
- Task 6: `card` has `--rf-band` header with a 2px bottom border and the sun `::after` inside the header, hidden by `:has()` when the header holds `card-action`, a badge, an avatar or `card-option-check`; outlined and subtle drop the band and keep the sun; dense, horizontal, selected and linked rules present; card title `overflow-wrap: anywhere`; `separator` is a 2px rule and the labelled label uses the heading font at 13px; no striped separator rule.
- Task 7: `alert` compact layout is a pill and every variant draws `inset 0 0 0 2px` plus a 4px key in its tone; `toast` countdown bar is striped and its shadow stays inside the 8px viewport padding; `progress` and `meter` tracks have a 2px border and striped fills per tone; `stepper` current step ring uses the primary.
- Task 8: `tabs` contained (pill track, selected outline without key shadow), underline (6px primary bar) and pills (selected outline plus 3px key); `pagination` current page outline plus 3px key; menu rows highlighted with `--accent` and a 2px inset ring (Organic focus fix).
- Task 9: `alert-dialog` keeps the stripes band and its fixed position and scrolling (Organic fix); `sheet` panels have a 2px outline and no stripes; `tooltip` is a pill with a `0 3px 0` primary key and its arrow stays a triangle.
- Task 10: `table` header row uses `--rf-band` on the row, with `--primary-foreground` header text, and a wide table scrolls inside its container (Organic fix); striped, compact, selected and total rows use `--muted` / primary soft tint; `code-block` header has a 2px bottom border and diff lines keep the inset marker; `carousel` current dot is a pill with an outline.

**Checkpoint after Task 4:** with Tasks 2 to 4 committed, create stub `retro-futurism.css` files (`/* retro-futurism X */`) for the remaining ids, add a local uncommitted registration (Task 11 Step 3 edits to `style-families.ts` and `fonts.ts`), run `pnpm build:packages`, `pnpm generate:preview`, `pnpm dev:preview`, open `/retro-futurism/` in the browser pane and compare Button, Button Group, Toggle, Toggle Group, Toolbar, Chip, Badge, Kbd and the Input family with the canvas boards in both modes. Then `git restore` and delete the stubs. Fix the base if pills, key shadows, scanlines or rings are off, committed as `fix(catalog): ...` before Task 5. Never commit stubs or the local registration.

## Task 11: Registration

**Files:**
- Modify: `packages/contracts/src/style-families.ts`, `packages/catalog/src/fonts.ts` (`styleFamilyFonts`), `packages/catalog/test/catalog.test.ts`, `packages/catalog/test/fonts.test.ts`, `packages/contracts/test/style-support.test.ts`, regenerated `packages/catalog/src/generated.ts`

**Interfaces:**
- Consumes Tasks 1 to 10.
- Produces `supportedStyleFamilies = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism']`, `styleFamilies` appends `'liquid-glass'`, and `styleFamilyFonts['retro-futurism']` per Global Constraints.

- [ ] **Step 1: Failing tests.** `style-support.test.ts`: `lists retro-futurism as the seventh stable family` and `marks retro-futurism stable for all fifty-seven components`. `catalog.test.ts`: add the family to every family list and the token-count case (26 tokens). `fonts.test.ts`: the family font row.
- [ ] **Step 2:** Run those files: fail.
- [ ] **Step 3:** Make the edits; `pnpm build:packages` (lints all 54 files); commit `generated.ts` with them.
- [ ] **Step 4:** `pnpm exec vitest run packages/catalog packages/contracts`: pass.
- [ ] **Step 5: Commit** `feat(catalog): add retro-futurism as a stable style family`.

## Task 12: Wiring (editors, preview, site, consumers, gate)

**Files:** the sites Organic changed in `git show 8dac8920`, with `retro-futurism` added beside `organic`: `apps/preview/src/main.tsx` (route `'retro-futurism': () => import('./generated/retro-futurism/entry')`), `apps/www/src/site/families.ts` (`'Retro futurism'`), `apps/www/src/editor/components/family-picker.tsx`, `apps/www/src/preset-editor/components/preset-controls.tsx`, `apps/www/src/preset-editor/model.ts`, `apps/www/src/site/components/playground.tsx`, `apps/www/src/editor/components/button-editor.module.css` (`.be-family-sample[data-family="retro-futurism"]`: an orange two-tone pill, 2px indigo border, 3px key shadow), `apps/www/src/app/globals.css` (`[data-style="retro-futurism"]` block), `apps/www/src/site/home/showcase.tsx`, `style-morph.tsx`, `fixtures/shared/preset-gallery.tsx` and `.css`, `scripts/foundation-evidence.mjs`, `tests/helpers/button-editor-ui.ts`, `tests/integration/consumer-matrix.test.ts`, `foundation-groups.test.ts`, `preset-gallery-generation.test.ts`, `tests/e2e/checkbox.spec.ts`, `apps/www/src/snapshots/install-command.ts` and its test.

**Interfaces:**
- Produces `export const retroFuturismMinimumCli = '0.8.2'` in `install-command.ts`; the family filter offers `retro-futurism` only when `compareVersions(installer.version, retroFuturismMinimumCli) >= 0`, and keeps it for a restored draft that uses it. Consumer rows `vite-retro-futurism`, `next-retro-futurism`, `npm-vite-retro-futurism`, `npm-next-retro-futurism`: 50 to 54 rows (52 stable, two experimental glass).

- [ ] **Step 1: Failing tests.** `install-command.test.ts`: `hides retro-futurism until the published installer is 0.8.2` (0.8.1 excludes, 0.8.2 includes, restored draft keeps), modelled on the organic case. `consumer-matrix.test.ts`: 54 rows and the four new rows. `preset-controls.test.tsx`: the picker lists Retro futurism when offered.
- [ ] **Step 2:** Run those files: fail.
- [ ] **Step 3:** Make the edits, following the organic lines of `git show 8dac8920` for each file.
- [ ] **Step 4:** Rerun them, then `pnpm typecheck` and `pnpm exec vitest run apps/www/src`: pass.
- [ ] **Step 5: Commit** `feat(www): offer Retro futurism in the editors, preview and consumer matrix`.

## Task 13: Palettes

**Files:**
- Modify: `apps/www/src/preset-editor/schemes.ts` (a `'retro-futurism'` block after `organic`), `apps/www/src/preset-editor/schemes.test.ts`

**Interfaces:**
- Produces seven palettes for `'retro-futurism'`, ids `sunset`, `orbit`, `neon`, `lunar`, `atomic`, `aurora`, `cosmos` (labels capitalised), full light and dark sets with the same keys as the organic ones. None equals the built-in preset (the reset model treats that as no palette). Each keeps a saturated secondary fill distinct from its lilac-like muted surface.

- [ ] **Step 1: Failing test.** Extend the per-family contrast test to `retro-futurism`: every palette passes every pair in both modes, plus the band pair `primaryForeground` on `destructive` at 4.5:1; `paletteSchemes('retro-futurism')` has the seven ids.
- [ ] **Step 2:** `pnpm exec vitest run apps/www/src/preset-editor/schemes.test.ts`: fail.
- [ ] **Step 3:** Add the palettes, tuning until the test passes.
- [ ] **Step 4:** Rerun: pass.
- [ ] **Step 5: Commit** `feat(www): add Retro futurism palettes to the preset editor`.

## Task 14: Fixtures, hashes, contrast and evidence counts

**Files:**
- Modify: `packages/compiler/test/fixtures/stable-family-hashes.json` and the three default-specimen fixtures (via the existing recorders), `packages/compiler/test/stable-families.test.ts`, `minimalist.test.ts`, `tests/integration/contrast.test.ts`, `component-preset-evidence.test.ts`, `consumer-evidence.test.ts`, `recipe-evidence.test.ts`, `tests/helpers/scoped-button-focus-contract.ts`, `scripts/recipe-evidence.ts`, `apps/www/src/editor/catalog-draft.test.ts`, `model.test.ts`, `apps/www/src/preset-editor/model.test.ts`; and the catalog test files whose family lists are meant to be complete but list `papier` without `organic` (find them with `rg -l "'papier'" packages/catalog/test` and read each list).
- Test: those files

**Interfaces:** Consumes Tasks 11 and 12.

- [ ] **Step 1: Failing tests.** `contrast.test.ts`: Retro futurism pairs in both modes (foreground on background, card, popover; primary, secondary, destructive with their foregrounds; muted, accent; success, warning, info; ring on background at 3:1; `primaryForeground` on `destructive` for the band). `stable-families.test.ts`: `retro-futurism keeps boundaries in forced colors`, asserting a `CanvasText` border fallback in the card, card header, table header, dialog, alert dialog, badge, chip, toggle, kbd, input-group, item, button-group and outline-button blocks, and `CanvasText` text for the card and table headers. Update family and row counts (6 to 7 families, 50 to 54 rows). `catalog-draft.test.ts`: the family's Button recipe starts with `exo-2`, `michroma`, `space-mono`. Add both `organic` and `retro-futurism` to the complete family lists found above.
- [ ] **Step 2:** Run the changed files: fail.
- [ ] **Step 3:** Add missing forced-colors blocks to the style files (fix the CSS, not the test). Re-record hashes and specimens; `git diff` of `stable-family-hashes.json` shows only added `retro-futurism/*` lines.
- [ ] **Step 4:** `pnpm exec vitest run packages tests/integration/contrast.test.ts apps/www/src`, then the count tests in `pnpm test:integration` that need no registry: pass (record any registry or Bun dependent failures, as Organic did).
- [ ] **Step 5: Commit** `test: record Retro futurism hashes, contrast pairs and evidence counts`.

## Task 15: Verification, review and repair

**Files:** fixes land in the style files; tests in `packages/catalog/test/retro-futurism-review-fixes.test.ts`.

- [ ] **Step 1:** `pnpm build:packages`, `pnpm generate:preview`, `pnpm typecheck`, `pnpm test:unit`: pass.
- [ ] **Step 2:** `OMBELLE_AUDIT_FAMILIES=retro-futurism pnpm test:specimen-audit --timeout=1800000` (add `OMBELLE_BROWSER_CHANNEL=msedge` if bundled Chromium is missing), radix and base, light and dark. Group findings by component.
- [ ] **Step 3:** For each finding, a failing test in `retro-futurism-review-fixes.test.ts`, then the CSS fix. Likely: Michroma titles overflowing narrow containers, the 36px small target size, rings clipped by `overflow: hidden`, key shadows clipped by toast and menu viewports, bands in forced colors.
- [ ] **Step 4:** Dispatch a fresh whole-branch reviewer for cascade bugs the audit cannot see (Organic's list in 0007 is the checklist); fix each finding test-first.
- [ ] **Step 5:** Rerun the audit only for changed components, and only the unit tests of changed files plus `retro-futurism-styles.test.ts`.
- [ ] **Step 6: Commit** `fix(catalog): resolve Retro futurism audit and review findings` (one commit per area if separate).

## Task 16: Documentation

**Files:**
- Create: `docs/decisions/0008-retro-futurism-family.md`
- Modify: `docs/cli-release.md` (0.8.2 notes and the `retroFuturismMinimumCli` gate paragraph), `docs/03-components-styles-accessibility.md` (family list), `docs/fonts.md` (style fonts table row: Exo 2 / Michroma / Space Mono), the component docs that list families (the `docs/components/*.md` files in `git show 8dac8920 --stat`), `README.md` consumer list (also the four Organic consumers it omits), `CHANGELOG.md` (Unreleased entry)

- [ ] **Step 1:** Write 0008 like 0007: look, contract changes, fonts (no registry change), deviations (no striped separator; secondary as teal and lilac as muted/accent; derived sun; anything the audit forced), where it is offered (gate 0.8.2), existing projects, and verification status listing exactly what ran and what did not.
- [ ] **Step 2:** Update the other docs.
- [ ] **Step 3:** `git diff --check`.
- [ ] **Step 4: Commit** `docs: record the Retro futurism family`.

## Self-Review

- Spec coverage: preset and token mapping (Task 1), derived signature colours and base (Task 2), 54 files in board order with the signature rules and the reviewer's three settlements (Tasks 3 to 10), checkpoint (after Task 4), registration and fonts (Task 11), wiring and the 0.8.2 gate (Task 12), seven palettes (Task 13), tests, hashes, forced colors and the stale family lists (Task 14), audit, whole-branch review and repair (Task 15), decision record and docs (Task 16).
- Types and names: `--rf-*` (Task 2) is the only cross-task style interface; `retroFuturismMinimumCli` (Task 12) feeds Task 16; the family id and preset id are fixed in Global Constraints.
- Not in the plan, by the spec: no font registration, no version bump, publish or tag.
