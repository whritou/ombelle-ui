# Papier Style Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `papier` as a stable style family in 0.8.0: all 57 catalog components styled in light and dark, selectable everywhere the other stable families are.

**Architecture:** Same shape as the Ombelle commit (`git show --stat 4d38fc51` is the checklist of sibling locations): one `styles/papier.css` family base, one `styles/<component>/papier.css` per component, `presets/papier.json`, a `styleFamily` enum entry, then editor, preview, fixture, matrix and test wiring. Styles are written for all 57 components first and audited once (the user's chosen approach); the family is registered only in the commit that completes the 57th file, so every commit passes `pnpm test:unit`.

**Tech Stack:** TypeScript/ESM, pnpm 11.25.0, Node 24.19.0, Vitest, Playwright (specimen audit), plain CSS keyed on `data-slot` and markers, React 19.

**Spec:** `docs/superpowers/specs/2026-11-15-papier-family-design.md`. Reference stylesheet: `docs/superpowers/specs/assets/papier-080-board.css` (its `.light` and `.dark` blocks are the token source; its component rules are the look).

## Global Constraints

- Branch `feat/style-papier`; Conventional Commits `type(scope): description`; no `codex` prefix.
- Edit `schemas/` (then regenerate), never `packages/contracts/src/preset-schema.ts` or `packages/catalog/src/generated.ts` by hand; catalog inputs live in `packages/catalog/src/styles/`, `presets/`, `templates/`.
- Relative TS imports keep the `.js` specifier. Compiler output stays deterministic.
- `pnpm build:packages` fails on a style rule that names no slot or marker; every rule targets `[data-slot="…"]` or a documented marker.
- Papier tokens: radius `0.125rem` (2px), border `1px`, shadow offset `0` by `2px`, display font `fraunces`, body font `instrument-sans`, mono font `ibm-plex-mono`; text pairs reach 4.5:1 (3:1 at large size).
- Contrast and the specimen audit win over the design; deviate minimally and record each deviation in `docs/decisions/0006-papier-family.md`.
- No Papier palettes in the editor (`getPalettes` already returns `[]` for an unknown family). No version bump, publish, tag or PR. No new fonts, components or variants. Do not change other families' output bytes.
- Rerun only tests and audits for what changed; do not rerun passing, unchanged ones.
- Catalog stays 57 components (the `templates/*.tsx` files other than `utils.ts`, `liquid-glass-filter.tsx` and `base/`).

## Review Focus

- A component with variants the design shows but the CSS misses (e.g. `badge` `appearance`, `tabs` `appearance`, `toast` `variant`): Task 1's coverage test also asserts each component's papier file mentions every `data-variant`/`data-size`/`data-appearance` value its template declares.
- Dark mode text on tinted surfaces (soft badges, alerts, toasts, selected rows): Task 14 adds Papier token pairs to the contrast test for both modes.
- Forced colors: borders, focus rings, double rules and the stamp shadow must not be the only signal; the specimen audit covers it, and Task 15 reads its forced-colors rows for Papier.
- Reduced motion: spinner, skeleton shimmer, OTP caret and indeterminate progress stop or slow; Task 2 puts one `@media(prefers-reduced-motion:reduce)` block in the family base and the coverage test asserts it.
- A restored draft using `papier` before the installer gate opens must stay selectable (as Ombelle's did): Task 13 tests `offeredStyleFamilies`.

---

### Task 1: Coverage test that defines "done" for the 57 style files

**Files:**
- Create: `packages/catalog/test/papier-styles.test.ts`
- Read: `packages/catalog/src/templates/*.tsx`, `packages/catalog/test/catalog.test.ts` (for how it lists components and reads style files)

**Interfaces:**
- Consumes: the `styles/<component>/` directories and `templates/<component>.tsx` files on disk.
- Produces: `const papierComponents: readonly string[]` (the 57 slugs, derived from `templates/` minus `utils`, `liquid-glass-filter`, `base`); a Vitest `it.each` per component named `papier styles: <slug>`.

- [ ] **Step 1: Write the test.** For each slug: `styles/<slug>/papier.css` exists, is non-empty, every selector names `data-slot` (reuse the rule `scripts/catalog-style-lint.ts` applies), and for each of `data-variant`, `data-size`, `data-appearance` values that appear as string literals in the template's `variants`/union types, the CSS mentions that value. A separate test asserts `styles/papier.css` exists and contains `prefers-reduced-motion`.
- [ ] **Step 2: Run it and confirm it fails for all 57 plus the base.** Run: `pnpm exec vitest run packages/catalog/test/papier-styles.test.ts`. Expected: 58 failures.
- [ ] **Step 3: Commit.** `test(catalog): add Papier style coverage for all 57 components`. This commit fails its own test on purpose only on a branch; to keep `pnpm test:unit` green per the constraints, mark the file's `describe` with `describe.skip` until Task 11 flips it on, and note that in a comment.

### Task 2: Family base stylesheet

**Files:**
- Create: `packages/catalog/src/styles/papier.css`
- Reference: `packages/catalog/src/styles/ombelle.css` (structure), the reference stylesheet's `.pane`, `.btn`, `.inp`, `.crd`, `.pop`, focus and press rules.

**Interfaces:**
- Produces: shared rules every component file may rely on: focus ring (`2px solid var(--ring)`, offset 2px), press translate, double-rule top utility keyed on slots (`card`, `popover`, `dialog-content`, `command`, `hover-card`), dotted divider, forced-colors fallbacks, one `prefers-reduced-motion` block.

- [ ] **Step 1: Write `styles/papier.css`** from the reference rules, using only preset tokens (`--background`, `--card`, `--border`, `--ring`, `--primary`, `--radius`, `--border-width`, `--shadow-y`) and `color-mix()` for tints.
- [ ] **Step 2: Run `pnpm build:packages`.** Expected: succeeds (generator and style lint accept the file).
- [ ] **Step 3: Run `pnpm exec vitest run packages/catalog/test/papier-styles.test.ts`.** Expected: the base-file test passes (unskip locally to check, re-skip before commit).
- [ ] **Step 4: Commit.** `feat(catalog): add the Papier family base styles`.

### Tasks 3 to 10: Component style files, in the order of the design boards

Each task has the same shape. Files: `packages/catalog/src/styles/<component>/papier.css` for each slug listed. Reference for every rule: the matching section of the reference stylesheet and the design page "0.8.0 Papier" board of the same name. Sibling structure: the same component's `ombelle.css`. Interfaces: consume `styles/papier.css` (Task 2); produce nothing later tasks call.

For each task:
- [ ] **Step 1:** Write every listed file. Cover every variant, size, appearance, state (rest, hover, pressed, focus-visible, disabled, `aria-invalid`, selected/checked/open) and dark mode through tokens only. Add a `@media(forced-colors:active)` rule wherever colour alone carries meaning (invalid, selected, destructive, status).
- [ ] **Step 2:** Run `pnpm build:packages` (style lint + regeneration). Expected: succeeds with no "names no slot or marker" error.
- [ ] **Step 3:** Run the coverage test, unskipped locally, filtered to the group: `pnpm exec vitest run packages/catalog/test/papier-styles.test.ts -t "<slug>"`. Expected: PASS for each listed slug.
- [ ] **Step 4:** Commit. `feat(catalog): add Papier styles for <group>`.

| Task | Group (design board) | Components |
|---|---|---|
| 3 | Actions | button, button-group, toggle, toggle-group, toolbar, chip, badge, kbd, spinner |
| 4 | Text fields | label, input, textarea, field, input-group, number-input, password-field, input-otp, tag-input |
| 5 | Choice controls | native-select, select, combobox, checkbox, radio-group, switch, slider, color-picker, calendar |
| 6 | Content | card, item, avatar, separator, aspect-ratio, empty, skeleton |
| 7 | Status | alert, toast, progress, meter, stepper |
| 8 | Navigation | tabs, accordion, collapsible, breadcrumb, pagination, dropdown-menu, context-menu |
| 9 | Overlays | command, dialog, alert-dialog, sheet, popover, hover-card, tooltip |
| 10 | Data and content | table, code-block, carousel, scroll-area |

### Task 11: Preset, contract and registration

**Files:**
- Create: `packages/catalog/src/presets/papier.json`
- Modify: `schemas/preset.schema.json` (add `"papier"` to the `styleFamily` enum, before `"liquid-glass"`), `packages/contracts/src/style-families.ts` (append to `supportedStyleFamilies`; `styleFamilies` appends `liquid-glass` last as today), `packages/catalog/test/catalog.test.ts`, `packages/contracts/test/validate.test.ts`, `packages/contracts/test/style-support.test.ts`
- Regenerated: `packages/contracts/src/preset-schema.ts`, `packages/catalog/src/generated.ts`
- Modify: `packages/catalog/test/papier-styles.test.ts` (remove the `describe.skip`)

**Interfaces:**
- Produces: `supportedStyleFamilies` now `['flat','minimalist','neo-brutalism','ombelle','papier'] as const`; preset id `builtin-papier`, `styleFamily: "papier"`, `design: { fontFamilyId: 'instrument-sans', headingFontFamilyId: 'fraunces', monoFontFamilyId: 'ibm-plex-mono', radiusRem: 0.125, density: 'comfortable', borderWidthPx: 1, shadowOffsetXPx: 0, shadowOffsetYPx: 2, motion: 'full', transparency: 'reduced' }`, light and dark `modes` taken from the reference stylesheet (`--bg`→`background`, `--card`→`card`/`popover`, `--fg`→`foreground`, `--pri`→`primary`, `--prif`→`primaryForeground`, `--sec`→`secondary`, `--mfg`→`mutedForeground`, `--dst`→`destructive`, `--bd`→`border`, `--ring`→`ring`, plus the semantic status colours exactly as the existing presets carry them).

- [ ] **Step 1: Write failing tests:** in `style-support.test.ts` assert `styleSupport` reports `stable` for every component in `papier`; in `validate.test.ts` assert a `papier` preset validates; in `catalog.test.ts` add `'papier'` to the family lists the Ombelle commit extended.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/contracts/test packages/catalog/test/catalog.test.ts`. Expected: FAIL (`papier` unknown).
- [ ] **Step 3: Implement** the enum, regenerate with `pnpm build:packages`, add `papier.json`, register in `style-families.ts`.
- [ ] **Step 4: Run** `pnpm build:packages && pnpm typecheck && pnpm test:unit`. Expected: PASS. Fix every count or list that now includes Papier (compare with what `git show 4d38fc51 -- packages/*/test` changed).
- [ ] **Step 5: Commit.** `feat(catalog): add papier as a stable style family`.

### Task 12: Compiler tests, baselines and hashes

**Files:**
- Modify: `packages/compiler/test/stable-families.test.ts`, `compile.test.ts`, `card.test.ts`, `packages/compiler/src/recipe-styles.ts:254` (the Ombelle-only `radiusRem` special case: read it; give Papier the same treatment only if a scoped recipe could otherwise lose Papier's 2px radius)
- Regenerate: `packages/compiler/test/fixtures/style-baseline.json`, `stable-family-hashes.json` via `scripts/record-stable-hashes.ts`

**Interfaces:**
- Consumes: Task 11's registered family.
- Produces: recorded hashes for `papier` across every stable artifact; existing families' hashes unchanged.

- [ ] **Step 1: Write the failing test:** in `stable-families.test.ts` add a Papier case mirroring Ombelle's (deterministic compile twice, equal bytes, expected slot coverage) and assert the three older families' recorded hashes are unchanged.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/compiler/test/stable-families.test.ts`. Expected: FAIL (no recorded hashes).
- [ ] **Step 3: Record hashes** with the script named at `scripts/record-stable-hashes.ts` (read its header for the invocation), then diff the JSON: only `papier` entries are added.
- [ ] **Step 4: Run** `pnpm exec vitest run packages/compiler`. Expected: PASS.
- [ ] **Step 5: Commit.** `test(compiler): record Papier hashes and baseline`.

### Task 13: Editors, gate, preview, fixtures

**Files:**
- Modify: `apps/www/src/editor/components/family-chip.tsx`, `apps/www/src/preset-editor/components/preset-controls.tsx` (add `papier: 'Papier'` next to `ombelle: 'Ombelle'`), `apps/www/src/snapshots/install-command.ts` (add `export const papierMinimumCli = '0.8.0'` and extend `offeredStyleFamilies` so `papier` is offered only when the installer is at least that, while a draft already using it stays selectable), `apps/www/src/editor/components/family-picker.test.tsx`, `apps/www/src/preset-editor/components/preset-controls.test.tsx`, `apps/www/src/snapshots/install-command.test.ts`, `apps/www/src/site/home/showcase.tsx`, `tests/helpers/button-editor-ui.ts`, `tests/helpers/scoped-button-focus-contract.ts`
- Modify: `apps/preview/src/main.tsx` (add `papier: () => import('./generated/papier/entry')` and the unknown-family message), `scripts/generate-preview.ts` (follows `supportedStyleFamilies`; confirm), `fixtures/shared/edition-scenario*.tsx`, `fixtures/shared/preset-gallery.tsx`, `fixtures/shared/preset-gallery.css`, `fixtures/shared/recipes.ts` (derives `rc_papier_button`), `scripts/foundation-evidence.mjs` (`auditFamilies`), `scripts/recipe-evidence.ts` (counts follow the family list), `scripts/consumer-matrix.ts`, `tests/integration/consumer-matrix.test.ts`
- Check: `apps/www/src/snapshots/server/postgres-migrations.ts` and `postgres-store.ts` for a stored family enum; add a migration only if one exists.

**Interfaces:**
- Produces: `papierMinimumCli: '0.8.0'`; matrix rows `vite-papier`, `next-papier`, `npm-vite-papier`, `npm-next-papier` (pnpm and npm, Node CLI runtime only; no Yarn or Bun), taking 40 rows to 44; `/papier/` preview route.

- [ ] **Step 1: Write the failing tests** first: `install-command.test.ts` (Papier offered at installer 0.8.0, hidden below, kept for a draft using it), `family-picker.test.tsx` (order and labels include Papier once offered), `consumer-matrix.test.ts` (44 rows, four Papier rows, pnpm/npm only).
- [ ] **Step 2: Run** `pnpm exec vitest run apps/www/src/snapshots/install-command.test.ts apps/www/src/editor/components/family-picker.test.tsx tests/integration/consumer-matrix.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** each file above following its `ombelle` sibling line.
- [ ] **Step 4: Run** `pnpm generate:preview && pnpm typecheck` then `pnpm exec vitest run` on the same files plus `apps/www/src/preset-editor`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(www): offer Papier in the editors, preview and consumer matrix`.

### Task 14: Contrast and token tests

**Files:**
- Modify: `tests/integration/contrast.test.ts`, `tests/helpers/oklch.ts` only if a helper is missing

**Interfaces:**
- Consumes: `presets/papier.json`.
- Produces: automated pairs for both modes: foreground on background, card, popover, secondary, muted; primaryForeground on primary; destructiveForeground on destructive; mutedForeground on background and card; each status text on its soft tint (badge, alert, toast); border and ring against background at 3:1.

- [ ] **Step 1: Write the pair test** (named `papier token contrast`) with the 4.5:1 and 3:1 thresholds the Ombelle block uses.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/integration/contrast.test.ts`. Expected: failures name each failing pair.
- [ ] **Step 3: Adjust tokens** in `presets/papier.json` (tone or lightness first, never the structure of the look); record every change for decision record 0006.
- [ ] **Step 4: Run again.** Expected: PASS. Rerun `pnpm exec vitest run packages/compiler/test/stable-families.test.ts` and re-record the Papier hashes if tokens moved.
- [ ] **Step 5: Commit.** `test: add Papier contrast pairs and tune tokens`.

### Task 15: Build, audit once, repair

**Files:**
- Modify: whichever `styles/**/papier.css` files the audit names; no other families' files.

- [ ] **Step 1: Run** `pnpm build:packages && pnpm generate:preview && pnpm typecheck && pnpm test:unit`. Expected: PASS.
- [ ] **Step 2: Run** `pnpm test:specimen-audit` (it covers every family; read only the Papier rows). Expected: list of findings for Papier across focus, clipping, overflow, label spacing, target size, forced colors, axe.
- [ ] **Step 3: Repair** each finding in the named component file (smallest change that fixes it), noting deviations from the design.
- [ ] **Step 4: Rerun the audit only for the components changed** (use the audit's component filter; read `scripts/` or the audit test header for the flag). Expected: no Papier findings.
- [ ] **Step 5: Run** `pnpm exec vitest run tests/integration/cli.test.ts tests/integration/foundation-groups.test.ts tests/integration/consumer-matrix.test.ts tests/integration/contrast.test.ts` (the focused integration tests the Ombelle record names). Expected: PASS.
- [ ] **Step 6: Commit.** `fix(catalog): resolve Papier specimen audit findings`.

### Task 16: Decision record and docs

**Files:**
- Create: `docs/decisions/0006-papier-family.md` (model: `0004-ombelle-family.md`: Look, Contract changes, Where it is offered, Existing projects, Verification status)
- Modify: `docs/03-components-styles-accessibility.md` and `docs/components/*.md` where families are listed, `docs/fonts.md` if it names family defaults, `docs/cli-release.md` (the 0.8.0 gate note; no version bump)

- [ ] **Step 1: Write 0006** with the exact deviations from Task 14 and 15, the date, machine, Node 24.19.0 and pnpm 11.25.0, what was run (list the commands) and what was not (`pnpm check:foundation`, Yarn and Bun rows, parity browser spec, human keyboard and screen reader review, real-browser forced colors).
- [ ] **Step 2: Update docs** by `grep -rn "ombelle" docs/*.md docs/components` and adding Papier beside it where families are listed.
- [ ] **Step 3: Run** `pnpm exec vitest run` on any docs-consistency tests (names containing `docs` or `version-alignment`). Expected: PASS.
- [ ] **Step 4: Commit.** `docs: record the Papier style family decision`.

---

## Self-review

- Spec coverage: preset and contract (11), styles for 57 (3 to 10), wiring (13), tests and hashes (12, 14), verification (15), docs (16), non-goals respected (no palettes, version, publish).
- Order guarantees "registered only with the 57th file": Task 1's test is skipped until Task 11, registration is Task 11, after all styles.
- Names: `papierMinimumCli`, `papierComponents`, `offeredStyleFamilies`, `supportedStyleFamilies` are used consistently.
