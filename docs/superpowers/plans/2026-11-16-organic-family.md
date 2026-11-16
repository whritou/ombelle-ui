# Organic Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `organic` as a stable style family in 0.8.1: all 57 components in light and dark, seven editor palettes, fonts Young Serif, Nunito and DM Mono.

**Architecture:** Same shape as Papier (decision 0006). A preset and schema value, a base stylesheet plus one stylesheet per component built from the canvas CSS, then registration, wiring, palettes, fixtures, one audit pass and docs. Component styles are written and linted while `organic` is unregistered; the registration commit comes after the last style file.

**Tech Stack:** TypeScript and ES modules, CSS in `packages/catalog/src/styles/`, Vitest, Playwright specimen audit, pnpm 11.25.0, Node 24.19.0.

**Spec:** `docs/superpowers/specs/2026-11-16-organic-family-design.md`. Reference CSS: `docs/superpowers/specs/assets/organic-081-board.css`. Precedent to copy structure from: `docs/superpowers/specs/2026-11-15-papier-family-design.md`, `docs/decisions/0006-papier-family.md`, `git show 530cabc9 c3df7fe7 566a8b24 8e09e6ea 46a275cc 2ae426c4`.

## Global Constraints

- Branch `feat/style-organic` in worktree `.claude/worktrees/style-organic`, cut from `origin/main` `6b8bd045`. Conventional Commits `type(scope): description`. No `codex` prefix.
- Edit schemas in `schemas/`, never `packages/contracts/src/preset-schema.ts`; edit catalog inputs in `templates/`, `styles/`, `presets/`, never `packages/catalog/src/generated.ts`. `pnpm build:packages` regenerates both; commit the regenerated files with their sources.
- Relative TypeScript imports keep the `.js` specifiers. Compiler output stays deterministic.
- `pnpm build:packages` fails on a style rule that names no slot or marker. Keyframe names stay `ombelle-*`.
- Dependency installs use `--ignore-scripts`. Pins are exact (`5.3.0` for Fontsource).
- Young Serif is single-weight: every Organic heading rule uses weight 400 and `var(--font-heading, ui-serif, Georgia, serif)`. The built-in preset uses `system-sans` (built-in presets cannot name fonts).
- Fonts are exactly the design's: `young-serif` (display), `nunito` (body), `dm-mono` (mono).
- Text pairs 4.5:1 (3:1 large). Contrast and the audit win over the canvas; record each deviation for decision 0007.
- Shapes are fixed values in CSS, never the preset `radius`. Every outline drawn as an inset `box-shadow` needs a `@media (forced-colors: active)` border fallback (precedent: `styles/card/flat.css`, test in `packages/compiler/test/stable-families.test.ts`). Motion is covered by the base `prefers-reduced-motion` rule.
- Other families' output bytes must not change: only `organic/*` lines may change in `stable-family-hashes.json`.
- Rerun only what changed; do not rerun passing, unchanged audits. No version bump, publish, tag or PR. Do not regenerate measured evidence files without the full gate; say so in 0007.

## Review Focus

- A component has an Organic file but one of its variants, sizes or appearances is unstyled (the variant coverage test catches names, not looks). Each task tests its own variants.
- An outline that only exists as `box-shadow` vanishes in forced colors (outline button, toggle, chip, badge, kbd, input group, item, card). Task 2 and each board task add the fallback; Task 14 asserts it.
- Focus rings clipped by `overflow: hidden` on card, accordion, table, dialog, scroll area (the audit's clipping check).
- Disabled, invalid, read-only and loading states that the canvas draws only once (checkbox invalid, input read-only, button busy).
- Dark mode pairs: soft tints on `--card` and `--background` (alert, toast, badge soft, selected card).

---

## File Structure

- Create `packages/catalog/src/presets/organic.json`: tokens and design.
- Create `packages/catalog/src/styles/organic.css`: family base (shared custom properties, Button, Input, Dialog, reduced motion).
- Create `packages/catalog/src/styles/<component>/organic.css`: 54 files, one per component except `button`, `input`, `dialog`.
- Create `packages/catalog/test/organic-styles.test.ts`: coverage, lint and variant tests (copy of `papier-styles.test.ts` with `papier` replaced by `organic`).
- Modify (registration and wiring) the files Papier touched; the list is in Tasks 11 to 13.
- Create `docs/decisions/0007-organic-family.md`.

## Task 0: Register DM Mono

**Files:**
- Modify: `packages/catalog/src/fonts.ts` (after `ibm-plex-mono`), `packages/catalog/package.json`, `apps/preview/package.json`, `apps/preview/src/preset-fonts.ts`, `docs/fonts.md`, `schemas/preset.schema.json:32`, `pnpm-lock.yaml`
- Test: `packages/catalog/test/fonts.test.ts`

**Interfaces:**
- Produces: font id `dm-mono` (roles `['mono']`, static weights 400 and 500, package `@fontsource/dm-mono` 5.3.0). Task 11 consumes it in `styleFamilyFonts.organic`.

- [ ] **Step 1: Failing test.** In `fonts.test.ts` add `it('registers dm-mono as a static mono font')`: `fontById('dm-mono')` equals an entry with `label 'DM Mono'`, `roles ['mono']`, `weights [400, 500]`, `fontsource.imports ['@fontsource/dm-mono/400.css', '@fontsource/dm-mono/500.css']`, `stack "'DM Mono', ui-monospace, monospace"`; and the schema's `monoFontFamilyId` enum contains `dm-mono`.
- [ ] **Step 2:** `pnpm exec vitest run packages/catalog/test/fonts.test.ts` fails (entry missing).
- [ ] **Step 3:** Add `fixed('dm-mono', 'DM Mono', ['mono'], mono, [400, 500])`; add `"@fontsource/dm-mono": "5.3.0"` next to `share-tech-mono` in both `package.json` files; add `'dm-mono': async () => { await import('@fontsource/dm-mono/400.css'); await import('@fontsource/dm-mono/500.css') }` (match the shape of the existing multi-weight entry, e.g. `ibm-plex-mono`) to `preset-fonts.ts`; add `dm-mono` to the schema enum; add the docs row (`| dm-mono | DM Mono | mono | OFL-1.1 | @fontsource/dm-mono | 5.3.0 |`). Run `pnpm install --ignore-scripts` to update the lockfile, then `pnpm build:packages`.
- [ ] **Step 4:** Run the fonts test and `pnpm exec vitest run packages/contracts packages/catalog/test/fonts.test.ts`; all pass.
- [ ] **Step 5: Commit** `feat(catalog): add DM Mono to the font registry`.

## Task 1: Organic preset, schema value and the style test

**Files:**
- Create: `packages/catalog/src/presets/organic.json`, `packages/catalog/test/organic-styles.test.ts`
- Modify: `schemas/preset.schema.json` (`styleFamily` enum: insert `"organic"` after `"papier"`), regenerated `packages/contracts/src/preset-schema.ts`
- Test: `packages/contracts/test/validate.test.ts`

**Interfaces:**
- Produces: `organic.json` with `id "builtin-organic"`, `name "Organic"`, 26 tokens per mode. Values (from the canvas; tune only for contrast):
  - light: background `#EEEBDC`, foreground `#26301F`, card and popover `#F8F6EA`, primary `#3F6B3A` / `#FFFFFF`, secondary `#DCE3C4` / `#26301F`, muted `#E6EAD2` / mutedForeground `#55604A`, accent `#DCE3C4` / `#26301F`, destructive `#A5432B` / `#FFFFFF`, success `#D5E9DD` / `#1F5C41`, warning `#F4E5B8` / `#6B4A00`, info `#D6E7EC` / `#2C5C6B`, border and input `#6F7F5E`, ring `#3F6B3A`, shadowColor `#344628`.
  - dark: background `#1B2118`, foreground `#E9EBD8`, card and popover `#232B1F`, primary `#9FCB8A` / `#14200F`, secondary `#33402C` / `#E9EBD8`, muted `#2B3626` / `#A8B397`, accent `#33402C` / `#E9EBD8`, destructive `#F0A58C` / `#2A120A`, success `#1E3027` / `#A5DFBF`, warning `#38301A` / `#EDCB7E`, info `#1E3039` / `#A9D6E3`, border and input `#7F9170`, ring `#9FCB8A`, shadowColor `#000000`.
  - design: `fontFamilyId "system-sans"`, `radiusRem 1.25` (nominal), `density "comfortable"`, `borderWidthPx 2`, `shadowOffsetXPx 0`, `shadowOffsetYPx 8`, `motion "full"`, `transparency "reduced"`; `componentDefaults.button` default/default.
- Organic stays unregistered: not in `supportedStyleFamilies` yet.

- [ ] **Step 1: Failing tests.** Create `organic-styles.test.ts` as a copy of `papier-styles.test.ts` with every `papier` replaced by `organic` (it expects `styles/organic.css`, three base components, and 54 component files). In `validate.test.ts` add `accepts a preset whose styleFamily is organic` (validate the parsed `organic.json`).
- [ ] **Step 2:** `pnpm exec vitest run packages/catalog/test/organic-styles.test.ts packages/contracts/test/validate.test.ts` fails (no files, enum value rejected).
- [ ] **Step 3:** Add the enum value in the schema, run `pnpm build:packages` (regenerates `preset-schema.ts`), write `organic.json` with the values above.
- [ ] **Step 4:** Run `validate.test.ts` (passes). The style test still fails until Tasks 2 to 10; that is expected.
- [ ] **Step 5: Commit** `feat(catalog): add the Organic preset and schema value`.

## Task 2: Family base stylesheet (checkpoint foundation)

**Files:**
- Create: `packages/catalog/src/styles/organic.css`
- Test: `packages/catalog/test/organic-styles.test.ts` (the two base tests)

**Interfaces:**
- Produces, as custom properties declared once on the same root selector `papier.css` uses for its own, consumed by every later task: `--o-r1` (12px 10px 13px 9px/10px 13px 9px 12px), `--o-r2` (18px 14px 20px 14px/14px 20px 14px 18px), `--o-r3` (26px 22px 28px 20px/22px 28px 20px 26px), `--o-r3h` (22px 28px 20px 26px/28px 22px 26px 22px), `--o-r4` (36px 28px 40px 30px/30px 40px 28px 36px), `--o-rr` (48% 52% 46% 54%/54% 46% 52% 48%), `--o-line` (`color-mix(in oklab, var(--border) 42%, transparent)`), `--o-e1`, `--o-e2`, `--o-e3` (the three shadows from the canvas `.pane` block, using `var(--shadow-color)`; read how `papier.css` and the compiler name the shadow variable).
- Styles `[data-slot="button"]` (all 7 variants, sizes sm/default/lg/icon/icon-sm, rest/hover/pressed/focus/disabled/busy), `[data-slot="input"]` (3 sizes, hover, focus, invalid, disabled, read-only) and `[data-slot="dialog-content"]` exactly as the canvas `.btn`, `.inp`, `.dlg` rules; contains the `prefers-reduced-motion` rule from `papier.css:27` and a forced-colors fallback for the outline button, input and dialog.

- [ ] **Step 1:** The two base tests already exist from Task 1 (`has a family base file with reduced motion and the three base components`, `base file lints cleanly against every catalog slot`). Run them: fail.
- [ ] **Step 2:** Write `organic.css`. Start from `styles/ombelle.css` for slot, state and forced-colors structure, then apply the canvas rules (`.btn*`, `.inp`, `.dlg*`, shape and shadow variables). Heading and link fonts use the `var(--font-heading, ui-serif, Georgia, serif)` fallback; links use the wavy underline.
- [ ] **Step 3:** Run the two base tests: pass.
- [ ] **Step 4: Commit** `feat(catalog): add the Organic family base styles`.

## Tasks 3 to 10: Component stylesheets by board

Each task creates the listed `styles/<id>/organic.css` files, one per id. Method for every file: copy the component's `ombelle.css` for slots, states and forced-colors structure, add a layer after the marker comment `/* organic layer */` from the matching canvas rules in `organic-081-board.css` (class names in the canvas map to the component's `data-slot`, `data-variant`, `data-size`, `data-appearance` attributes in `packages/catalog/src/templates/<id>.tsx`), use the Task 2 `--o-*` properties instead of literal radii, and add the forced-colors fallback for every inset-ring outline.

Each task's test cycle: **(a)** run `pnpm exec vitest run packages/catalog/test/organic-styles.test.ts -t "(<ids joined by |>) has"` and see it fail for missing files; **(b)** write the files; **(c)** rerun, passing (lint plus variant coverage for those ids); **(d)** run `pnpm build:packages` only after Task 10, not per task (the family is unregistered); **(e)** commit `feat(catalog): add Organic styles for <board>`.

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

(The base file already styles button, input and dialog. That leaves 8 + 8 + 9 + 7 + 5 + 7 + 6 + 4 = 54 files with the three base components, as `organic-styles.test.ts` expects.)

Task-specific checks, each as an added assertion in `organic-styles.test.ts` or a focused test file next to it:
- Task 3: `badge` css contains the destructive solid inner ring and a `forced-colors` block naming `[data-slot='badge']`; `kbd` base uses a thicker bottom edge.
- Task 4: `input-otp` slots are separate rounded cells (no joined borders); `password-field` strength bars are pills.
- Task 5: `checkbox` styles the `invalid` marker and card appearance checked ring; `switch` thumb moves 20px (default) and 16px (small); `calendar` range ends are rounded and the middle is square.
- Task 6: `card` has the header blob for default and dense, none visible for `subtle`; every card appearance, density, orientation and selected state has a rule.
- Task 7: `alert` compact layout is a pill; `toast` keeps the countdown bar rounded at its end; `stepper` connectors use the pale colour when ahead.
- Task 8: `tabs` has contained, underline and pills with the selected rule for each.
- Task 9: `sheet` panels round only the inner corners per side; `tooltip` arrow stays a triangle.
- Task 10: `table` striped, compact, selected and total row; `code-block` diff lines keep the 4px inset marker.

**Checkpoint after Task 4:** with Tasks 2 to 4 committed, review the look before continuing. Create empty stub `organic.css` files (`/* organic X */` only) for the remaining ids, add a local, uncommitted registration (Task 11 steps 1 and 3 only), run `pnpm build:packages`, `pnpm generate:preview`, `pnpm dev:preview`, open `/organic/` in the browser pane, compare Button, Badge, Chip, Toggle, Input family against the canvas boards in both modes, then `git restore` and delete the stubs. Fix the shared base (Task 2) if the shapes, shadows or ring widths are off, and commit that as `fix(catalog): ...` before Task 5. Never commit the stubs or the local registration.

## Task 11: Registration

**Files:**
- Modify: `packages/contracts/src/style-families.ts`, `packages/catalog/src/fonts.ts` (`styleFamilyFonts`), `packages/catalog/test/catalog.test.ts`, `packages/catalog/test/organic-styles.test.ts` (comment), `packages/contracts/test/style-support.test.ts`
- Test: same files, plus `packages/catalog/test/fonts.test.ts:122` (family font table)

**Interfaces:**
- Consumes: Task 0 font id `dm-mono`, Task 1 preset, Tasks 2 to 10 styles.
- Produces: `supportedStyleFamilies = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic']` and `styleFamilies = [...supportedStyleFamilies, 'liquid-glass']`; `styleFamilyFonts.organic = { body: 'nunito', display: 'young-serif', mono: 'dm-mono' }`.

- [ ] **Step 1: Failing tests.** `style-support.test.ts`: `lists organic as the sixth stable family and widens styleFamilies` and `marks organic stable for all fifty-seven components` (every `supportedComponentIds` returns `'stable'` for `organic`). `catalog.test.ts`: add `'organic'` to every family list and the token-count case (`organic` has 26 tokens, like `papier`). `fonts.test.ts`: `organic: { body: 'nunito', display: 'young-serif', mono: 'dm-mono' }`.
- [ ] **Step 2:** Run those three test files: fail.
- [ ] **Step 3:** Make the edits; run `pnpm build:packages` (this reads all 54 files and lints them; fix any rule naming no slot), commit the regenerated `generated.ts`.
- [ ] **Step 4:** Run `pnpm exec vitest run packages/catalog packages/contracts`: pass, including `organic-styles.test.ts`.
- [ ] **Step 5: Commit** `feat(catalog): add organic as a stable style family`.

## Task 12: Wiring (editors, preview, site, consumers, gate)

**Files:** the ones changed by `git show c3df7fe7 --stat`, with `organic` in place of `papier`: `apps/preview/src/main.tsx` (route `organic: () => import('./generated/organic/entry')`, message text), `apps/www/src/site/families.ts` (both name maps: `'Organic'`), `apps/www/src/editor/components/family-picker.tsx`, `apps/www/src/preset-editor/components/preset-controls.tsx`, `apps/www/src/site/components/playground.tsx`, `apps/www/src/editor/components/button-editor.module.css` (the `.be-family-sample` rule for `data-family="organic"`: a moss pill, no border, soft shadow), `apps/www/src/app/globals.css` (`[data-style="organic"]` block), `apps/www/src/site/home/showcase.tsx`, `style-morph.tsx`, `fixtures/shared/preset-gallery.tsx` and `.css`, `scripts/foundation-evidence.mjs` (`auditFamilies`), `tests/helpers/button-editor-ui.ts`, `tests/integration/consumer-matrix.test.ts`, `tests/integration/foundation-groups.test.ts`, `tests/e2e/checkbox.spec.ts`; plus `apps/www/src/snapshots/install-command.ts` and its test.
- Test: `apps/www/src/snapshots/install-command.test.ts`, `apps/www/src/preset-editor/components/preset-controls.test.tsx`, `tests/integration/consumer-matrix.test.ts`

**Interfaces:**
- Produces: `export const organicMinimumCli = '0.8.1'` in `install-command.ts`; `offeredStyleFamilies()` includes `organic` only when `publishedInstaller.version >= organicMinimumCli` (published is `0.8.0`, so it is hidden), and keeps it selectable for a restored draft that already uses it; consumer matrix rows `vite-organic`, `next-organic`, `npm-vite-organic`, `npm-next-organic` (44 to 48 rows, 46 stable, two experimental glass).

- [ ] **Step 1: Failing tests.** `install-command.test.ts`: `hides organic until the published installer is 0.8.1` (installer `0.8.0` excludes it, `0.8.1` includes it, a restored draft keeps it) following the `papier` case. `consumer-matrix.test.ts`: row count 48 and the four `organic` rows. `preset-controls.test.tsx`: the family picker lists Organic when offered.
- [ ] **Step 2:** Run those three test files: fail.
- [ ] **Step 3:** Implement the edits listed in Files, following `git show c3df7fe7` line by line.
- [ ] **Step 4:** Run the three test files, then `pnpm typecheck` and `pnpm exec vitest run apps/www/src`: pass.
- [ ] **Step 5: Commit** `feat(www): offer Organic in the editors, preview and consumer matrix`.

## Task 13: Organic palettes

**Files:**
- Modify: `apps/www/src/preset-editor/schemes.ts` (an `organic: [...]` block after `papier`, via `palette('organic', id, label, light, dark)`), `apps/www/src/preset-editor/schemes.test.ts`

**Interfaces:**
- Produces: seven palettes for `'organic'`, ids `fern`, `terracotta`, `lichen`, `heather`, `seaglass`, `marigold`, `bark` (labels capitalised). Each is a full light and dark set with the same keys as the `papier` ones. `fern` equals the built-in preset values; the others keep the Organic shapes and replace primary, ring and the tinted surfaces with their own hue.

- [ ] **Step 1: Failing test.** In `schemes.test.ts`, extend the existing per-family contrast test to `organic`: every palette passes every foreground/surface pair in both modes, and `paletteSchemes('organic')` has length 7 with ids as above.
- [ ] **Step 2:** `pnpm exec vitest run apps/www/src/preset-editor/schemes.test.ts`: fail.
- [ ] **Step 3:** Add the seven palettes, tuning until the contrast test passes.
- [ ] **Step 4:** Rerun the test: pass.
- [ ] **Step 5: Commit** `feat(www): add Organic palettes to the preset editor`.

## Task 14: Fixtures, hashes, contrast and evidence counts

**Files:**
- Modify: `packages/compiler/test/fixtures/stable-family-hashes.json`, `components-076-default-specimens.json`, `variants-075-default-specimens.json`, `variants-076-default-specimens.json` (all via `pnpm exec tsx scripts/record-stable-hashes.ts` and the existing specimen recorders), `packages/compiler/test/stable-families.test.ts`, `packages/compiler/test/minimalist.test.ts`, `tests/integration/contrast.test.ts`, `tests/integration/component-preset-evidence.test.ts`, `consumer-evidence.test.ts`, `recipe-evidence.test.ts`, `tests/helpers/scoped-button-focus-contract.ts`, `scripts/recipe-evidence.ts`, `apps/www/src/editor/catalog-draft.test.ts`, `apps/www/src/editor/model.test.ts`
- Test: those files

**Interfaces:** Consumes Tasks 11 and 12.

- [ ] **Step 1: Failing tests.** `contrast.test.ts`: add Organic token pairs for both modes (foreground/background, card, popover, primary, secondary, muted, accent, destructive, success, warning, info, ring against background at 3:1). `stable-families.test.ts`: a forced-colors test for Organic asserting a `border: ... solid CanvasText` fallback in the card, badge, chip, toggle, kbd, input-group, item and outline-button blocks. Update the family and row counts the existing evidence tests assert (5 to 6 families, 44 to 48 rows). `catalog-draft.test.ts`: the Organic Button recipe starts with `fontFamilyId 'nunito'`, `headingFontFamilyId 'young-serif'`, `monoFontFamilyId 'dm-mono'`.
- [ ] **Step 2:** Run the changed files: they fail (hashes missing, counts old, fallbacks missing).
- [ ] **Step 3:** Add any missing forced-colors blocks to the Organic styles (fix, not test edits). Re-record hashes and specimen fixtures; `git diff` of `stable-family-hashes.json` must show only added `organic/*` lines.
- [ ] **Step 4:** `pnpm exec vitest run packages tests/integration/contrast.test.ts apps/www/src` then `pnpm test:integration` for the count tests that need no registry; pass (registry or Bun dependent suites may fail as for Papier; record which).
- [ ] **Step 5: Commit** `test: record Organic hashes, contrast pairs and evidence counts`.

## Task 15: Verification and repair

**Files:** none new; fixes land in the Organic style files.

- [ ] **Step 1:** `pnpm build:packages`, `pnpm generate:preview`, `pnpm typecheck`, `pnpm test:unit`. Expected: all pass (the three load-sensitive tests named in 0006 may time out only under full-suite load; each must pass alone).
- [ ] **Step 2:** `OMBELLE_AUDIT_FAMILIES=organic pnpm test:specimen-audit --timeout=1800000` (radix and base editions, light and dark). Expected: no findings. Group findings by component.
- [ ] **Step 3:** Repair pass: for each finding add a failing regression test in `packages/catalog/test/organic-review-fixes.test.ts` (or the owning test file), then fix the CSS. Likely areas: focus rings clipped by `overflow: hidden`, target size for the 38px small controls, forced-colors outlines, soft tints in dark.
- [ ] **Step 4:** Rerun the audit only for the components that changed. Rerun only the unit tests of changed files plus `organic-styles.test.ts`.
- [ ] **Step 5: Commit** `fix(catalog): resolve Organic specimen audit findings` (one commit per area if they are separate).

## Task 16: Documentation

**Files:**
- Create: `docs/decisions/0007-organic-family.md`
- Modify: `docs/cli-release.md` (0.8.1 notes and the `organicMinimumCli` gate paragraph, as for `papierMinimumCli`), `docs/03-components-styles-accessibility.md:135` (family list), `docs/fonts.md` (style fonts table: add an Organic row, Nunito / Young Serif / DM Mono), the component docs that list families (`git show 46a275cc --stat` for the list), `CHANGELOG.md`

- [ ] **Step 1:** Write 0007 like 0006: the look, contract changes, fonts (including the registry addition of DM Mono), deviations from the canvas with reasons, where Organic is offered (gate 0.8.1), existing projects, and a verification status listing exactly what ran and what did not (consumer apps, `check:foundation`, Yarn and Bun, real-browser forced colors, human review, canvas never rendered before this work).
- [ ] **Step 2:** Update the other docs listed.
- [ ] **Step 3:** `pnpm exec vitest run packages apps/www/src -t docs` if a docs test exists; otherwise `git diff --check`.
- [ ] **Step 4: Commit** `docs: record the Organic family`.

## Self-Review

- Spec coverage: intent, goals, anti-goals, constraints, order of work (preset, styles, registration, palettes, tests, verification, docs), calls made (DM Mono, weight 400, seven palettes, nominal radius, hit areas, evidence) all map to Tasks 0 to 16. Checkpoint is inside Tasks 2 to 4.
- Note against the spec: the spec's order lists palettes before tests; the plan keeps that, with fixtures last so the hashes are recorded once.
- Types and names: `--o-*` properties (Task 2) are the only cross-task interface for styles; `dm-mono` (Task 0) feeds Task 11 and Task 14; `organicMinimumCli` (Task 12) feeds Task 16.
