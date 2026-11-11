# Editors, batch 7b, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the component and Button editors, empty fields show the rendered value, a Matrix layout shows the recipe across its variants, and Get code shows what the edits change against the catalog default.

**Architecture:**
- One worker batch request compiles several recipes at once. It serves the matrix cells and the catalog default used as the diff reference.
- A pure line diff with scope normalization feeds the artifact panel and a Get code summary.
- The preview gains a matrix renderer and colour measurements in the existing measure protocol.

**Tech Stack:** TypeScript, React 19, Next.js (apps/www), Vite (apps/preview), Vitest, Playwright with bundled Chromium.

**Spec:** `docs/superpowers/specs/2026-11-11-editors-matrix-design.md`

## Global Constraints

- **Branch and Git:** `feat/editors-matrix-073`, stacked on `feat/editors-glass-073` (PR #108). Conventional Commits. No push, release or deploy without asking.
- **Installed output does not change:** `git diff --stat feat/editors-glass-073 -- packages/catalog packages/compiler/test/fixtures` stays empty.
- **No new dependency.** The line diff is written in-house.
- **Preview state is never saved:** the Matrix layout, the axes, and File or Changes are not stored in a draft, `EditorView`, storage or history.
- **Every new Playwright spec** goes in `playwright.config.ts` `testIgnore` and runs under `playwright.editors.config.ts`. The foundation inventory test must still pass.
- **Accessibility:**
  - Diff lines carry "+" or "−" in text, not only colour.
  - The matrix is a `<table>` with a caption, `<th scope>` headers and `aria-current` on the current cell.
  - Placeholders never replace labels.
- **Testing and language:** run only the tests of what changed. Docs are in English; answer the user in French.

## Review Focus

1. **Enum props with no default:** for example Badge `size` and `appearance`. The current matrix cell and the axis values must treat an absent prop as `field.default ?? field.enum[0]`, which is what the inspector shows. Pinned in Task 6.
2. **Different id or revision:** a recipe whose id or revision differs from the default's must still pair its files by kind and file name. Its diff must not show every line changed. Pinned in Task 2.
3. **Rapid edits while a batch compiles:** a stale batch response must never replace a newer one, whether for the matrix or the reference. Pinned in Task 3.
4. **Colour fields in the other mode:** the inspector colour mode can differ from the preview mode. The placeholder then stays "Preset" or "Family" and does not show the other mode's measured colour. Pinned in Task 5.
5. **Matrix in liquid glass with "Preview transparency: Reduced":** every cell must turn opaque, since the mirror sees each cell's style element. Pinned in Task 9.

---

### Task 1: The line diff

**Files:**
- Create: `apps/www/src/editor/line-diff.ts`
- Test: `apps/www/src/editor/line-diff.test.ts`

**Interfaces:**
- Produces:
  - `export type DiffLine = { kind: 'same' | 'add' | 'remove'; text: string; before?: number; after?: number }`, with 1-based line numbers.
  - `export function lineDiff(before: string, after: string): DiffLine[]`
  - `export function diffSummary(lines: DiffLine[]): { added: number; removed: number }`
  - `export type DiffRow = DiffLine | { kind: 'skip'; count: number }`
  - `export function collapseUnchanged(lines: DiffLine[], context = 3, threshold = 6): DiffRow[]`

- [ ] **Step 1: Write the failing tests:**
  - **`equal inputs give only same lines`:** `lineDiff('a\nb', 'a\nb')` is two `same` lines.
  - **`an added line`:** `'a\nc'` to `'a\nb\nc'` gives exactly one `add` with text `b` and `after: 2`.
  - **`a removed line`:** the reverse gives one `remove` with `before: 2`.
  - **`a moved line`:** `'a\nb\nc'` to `'b\nc\na'` gives a summary of `{ added: 1, removed: 1 }`.
  - **`CRLF equals LF`:** `lineDiff('a\r\nb', 'a\nb')` has no add or remove.
  - **`empty inputs`:** `lineDiff('', '')` is `[]`, and `lineDiff('', 'x')` is one `add`.
  - **`collapse keeps 3 lines of context`:** 20 unchanged lines then 1 added line gives `{ kind: 'skip', count: 17 }` followed by 3 `same` lines and the `add`. A run of 6 or fewer is never collapsed.
- [ ] **Step 2: Run them.**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor/line-diff.test.ts`
  - Expected: FAIL, because the module is missing.
- [ ] **Step 3: Implement it.** Use Myers' O(ND) greedy algorithm over line arrays, with a trace for backtracking, after splitting on `/\r?\n/`. An empty string is zero lines.
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit.**
  - `git commit -m "feat(www): add a line diff for generated files"`

### Task 2: Diff a compile result against the default

**Files:**
- Create: `apps/www/src/editor/artifact-diff.ts`
- Test: `apps/www/src/editor/artifact-diff.test.ts`

**Interfaces:**
- Consumes `lineDiff`, `diffSummary` and `DiffLine` (Task 1).
- Produces:
  - `export function normalizeArtifact(content: string, result: InstallableRecipeCompileResult): string`
    - Replaces every `result.scope` with `<scope>` and the recipe id with `<recipe>`.
    - Replaces `r${revision}` path segments and identifiers with `r<n>`.
  - `export type FileChange = { kind: Artifact['kind'] | 'recipe'; name: string; lines: DiffLine[]; added: number; removed: number }`
  - `export function artifactChanges(result: InstallableRecipeCompileResult, reference: InstallableRecipeCompileResult): FileChange[]`
    - Pairs by `kind` and the last path segment.
    - Adds a `recipe` entry that diffs the two `JSON.stringify(recipe.data, null, 2)`, after normalizing id and revision.
    - Skips `usage` and `utility` artifacts.
  - `export function changesSummary(changes: FileChange[]): string`
    - Gives `'Same as the catalog default.'` when every file is unchanged.
    - Otherwise gives `` `Changes from the catalog default: ${n} ${n === 1 ? 'file' : 'files'}, +${added} −${removed}` ``, where `n` counts the changed files and the minus sign is U+2212.

- [ ] **Step 1: Write the failing tests, compiling real recipes with `compileComponentRecipe`:**
  - **`same recipe, other scope, no changes`:** compile the Badge default twice, the second time with `id: 'catalog_badge_copy'` and `revision: 3`. The summary is `'Same as the catalog default.'`.
  - **`an override shows in CSS`:** a Badge with a background colour override. The `style` change has `added >= 1` and an `add` line containing the colour. The summary starts with `'Changes from the catalog default: '`.
  - **`a content change shows in the recipe`:** changing the Badge label gives `added === 1` and `removed === 1` in the `recipe` entry.
  - **`the Button pairs too`:** `compileRecipe` on the default Button and on a `variant: 'outline'` Button. Their `component` and `style` files pair, and the summary counts 2 or 3 files.
- [ ] **Step 2: Run them.**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor/artifact-diff.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement the three functions.**
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit.**
  - `git commit -m "feat(www): diff compiled recipes against the catalog default"`

### Task 3: Batch compiles in the editor worker

**Files:**
- Modify:
  - `apps/www/src/editor/compile-protocol.ts`: add the batch handler.
  - `apps/www/src/editor/compile.worker.ts`: route `compile-batch`.
- Create: `apps/www/src/editor/use-recipe-batch.ts`
- Test: `apps/www/src/editor/compile-protocol.test.ts`

**Interfaces:**
- Produces:
  - `export type BatchRequest = { type: 'compile-batch'; requestId: number; kind: 'button' | 'catalog'; recipes: unknown[] }`
  - `export type BatchResponse = { type: 'compiled-batch'; requestId: number; results: InstallableRecipeCompileResult[] } | { type: 'invalid-batch'; requestId: number; index: number; message: string }`
  - `export async function handleBatchMessage(input: unknown): Promise<BatchResponse>`
    - It compiles in order: `compileEditorRecipe` for `button`, `compileComponentRecipe` for `catalog`.
    - It rejects a non-array, or more than 48 recipes, as `invalid-batch` with `index: -1`.
  - `export function useRecipeBatch(kind: 'button' | 'catalog', recipes: readonly unknown[] | null): { results: InstallableRecipeCompileResult[] | null; pending: boolean; error: string | null }`
    - It uses its own worker, a 150 ms debounce and an increasing request id. A response whose id is not the latest is dropped.
    - `recipes === null` means idle: no worker message, and `results` is null.
    - Each catalog result is checked with `verifyCatalogCompileResult`, and each Button result with `verifyPreviewCompileResult`, before it is accepted.

- [ ] **Step 1: Write the failing tests:**
  - **`compiles a catalog batch in order`:** two Badge recipes with different labels give `results[1].recipe.data.content` equal to the second label.
  - **`reports the failing index`:** the second recipe is invalid, so the response is `invalid-batch` with `index: 1`.
  - **`refuses 49 recipes`.**
  - **`compiles a Button batch`:** two variants.
- [ ] **Step 2: Run them.**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor/compile-protocol.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement the handler, the worker route and the hook.** The hook's stale-drop rule is the one in `use-catalog-compiler.ts`.
- [ ] **Step 4: Run them, and typecheck.**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor && corepack pnpm typecheck`
  - Expected: PASS.
- [ ] **Step 5: Commit.**
  - `git commit -m "feat(www): compile recipe batches in the editor worker"`

### Task 4: Changes view and Get code summary

**Files:**
- Modify:
  - `apps/www/src/editor/components/artifact-panel.tsx`: new prop `reference?: InstallableRecipeCompileResult | null`, and a "File / Changes" `SegmentedControl` on the Component, CSS and Recipe tabs.
  - `apps/www/src/snapshots/components/get-code-dialog.tsx`: new prop `summary?: ReactNode`, rendered after the description `<p>`.
  - `apps/www/src/recipe-snapshots/components/recipe-get-code.tsx` and `apps/www/src/snapshots/components/preset-get-code.tsx`: forward `summary`.
  - `button-editor.tsx`, `catalog-component-editor.tsx` and `preset-editor.tsx`:
    - compile the default with `useRecipeBatch`, or a second `usePresetCompiler` for the preset;
    - pass `reference` to the panel and the summary to Get code.
- Create: `apps/www/src/editor/components/diff-view.tsx`, which renders `DiffRow[]`.
- Test: `apps/www/src/editor/components/diff-view.test.tsx`

**Interfaces:**
- Consumes `artifactChanges`, `changesSummary`, `collapseUnchanged` (Tasks 1 and 2) and `useRecipeBatch` (Task 3).
- **The references:**
  - **Catalog:** `{ ...createCatalogDraft(component).recipe, presetRef: recipe.presetRef }`.
  - **Button:** `resetDraftRecipe(draft, start).recipe`.
  - **Preset:** `applyStartingPreset(createPresetDraft(family), startingId)` when `matchingStartingPreset` or the glass backdrop preset applies, otherwise `createPresetDraft(family)`. The diff compares that compile's `styles/ui-style.css` and theme artifacts, by file name.
- **The preset summary:** it uses `changesSummary` over those files. The preset editor gets the Get code summary only, with no Changes view, because its export panel has no file tabs.

- [ ] **Step 1: Write the failing test.**
  - `renders + and − in text, and the skip row`.
  - It renders `<DiffView rows={…} />` with `renderToStaticMarkup`, and expects the markup to contain:
    - the text `'+ added'` and the text `'− removed'`, with the sign as readable text and no `aria-hidden` on it;
    - `'17 unchanged lines'`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement `DiffView`, then wire the panel, the dialog and the three editors.**
  - **"Changes" view:** a `<pre>` whose lines are prefixed "+ ", "− " or "  ". The count is "+12 −4", and an unchanged file reads "No change from the catalog default."
  - **Get code summary:** a `<p>` plus a button "Show changes". It switches the panel to the Changes view of the first changed file and moves focus there.
- [ ] **Step 4: Run the tests and typecheck.**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor apps/www/src/snapshots apps/www/src/recipe-snapshots apps/www/src/preset-editor && corepack pnpm typecheck`
  - Expected: PASS.
- [ ] **Step 5: Commit.**
  - `git commit -m "feat(www): show what the edits change against the catalog default"`

### Task 5: Measured colour placeholders

**Files:**
- Modify:
  - `apps/www/src/editor/catalog-preview-protocol.ts`:
    - `MeasuredParts` values become `Partial<Record<PartDimension, number>> & Partial<Record<ColorDimension, string>>`;
    - `measurePart` adds the colours;
    - the two validators accept the colour keys.
  - `apps/www/src/editor/components/catalog-appearance.tsx` and `apps/www/src/editor/components/properties-panel.tsx`: colour placeholders.
  - `apps/www/src/editor/components/catalog-component-editor.tsx` and `button-editor.tsx`: pass the preview mode to the inspectors.
- Create: `apps/www/src/editor/measured-color.ts`
- Test: `apps/www/src/editor/measured-color.test.ts` and `apps/www/src/editor/catalog-preview-protocol.test.ts`

**Interfaces:**
- Produces:
  - `export type ColorDimension = 'backgroundColor' | 'color' | 'borderColor'`
  - `export const colorDimensionFor: Record<RecipeColorRole, ColorDimension>`, which maps background, foreground and border.
  - `export function hexFromComputedColor(value: string): string | null`, in `measured-color.ts`.
    - It parses `rgb()`, `rgba()` and `color(srgb …)`, and returns uppercase `#RRGGBB`, or `#RRGGBBAA` when alpha is below 1.
    - It returns `null` for other syntaxes. `measurePart` then falls back to drawing the colour on a 1 × 1 canvas and reading the pixel.
  - `export function colorPlaceholder(measured: string | undefined, fieldMode: 'light' | 'dark', previewMode: 'light' | 'dark', fallback: string): string`
    - It returns `measured` when the modes match and a value was measured, and `fallback` otherwise.

- [ ] **Step 1: Write the failing tests:**
  - **`hex from rgb`:**
    - `'rgb(29, 78, 216)'` gives `'#1D4ED8'`.
    - `'rgba(0, 0, 0, 0.5)'` gives `'#00000080'`.
    - `'color(srgb 1 1 1 / 0.57)'` gives `'#FFFFFF91'`.
    - `'oklch(0.5 0.1 200)'` gives `null`.
  - **`placeholder only in the preview's mode`:**
    - `colorPlaceholder('#1D4ED8', 'dark', 'light', 'Preset')` gives `'Preset'`.
    - With `'light', 'light'` it gives `'#1D4ED8'`.
    - `undefined` gives `'Preset'`.
  - **`the catalog measure accepts colours`:** `{ badge: { paddingXPx: 8, backgroundColor: '#1D4ED8' } }` is accepted. `backgroundColor: 'red'` and `backgroundColor: 1` are rejected. Old numeric-only parts are still accepted.
  - **`the Button measure accepts colours`:** the same rules for `parts.button`.
- [ ] **Step 2: Run them.**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor/measured-color.test.ts apps/www/src/editor/catalog-preview-protocol.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - `measurePart` reads `backgroundColor`, `color` and `borderTopColor`, and stores the last as `borderColor`.
  - In `catalog-appearance.tsx`, the colour `placeholder` becomes `colorPlaceholder(rendered[colorDimensionFor[role]], mode, previewMode, 'Preset')`.
  - In `properties-panel.tsx`, it becomes `colorPlaceholder(measured?.[…], mode, previewMode, fallback)`. The Button measure is taken at rest only: `editor-preview.tsx` already measures with no forced state.
- [ ] **Step 4: Run them and typecheck.**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor && corepack pnpm typecheck`
  - Expected: PASS.
- [ ] **Step 5: Commit.**
  - `git commit -m "feat(www): show the rendered colour in empty colour fields"`

### Task 6: Matrix axes and cells

**Files:**
- Create: `apps/www/src/editor/matrix.ts`
- Test: `apps/www/src/editor/matrix.test.ts`

**Interfaces:**
- Produces:
  - `export type MatrixAxis = { prop: string; values: readonly (string | number)[] }`
  - `export function matrixEnums(component: ComponentRecipe['component'] | 'button'): MatrixAxis[]`
    - It returns every enum prop.
    - For the Button, it returns `variant` and `size` from `recipeSchema`, the v1 schema in `packages/contracts/src/recipe-schema.ts`.
  - `export function matrixAxes(component): { rows: MatrixAxis; columns: MatrixAxis | null } | null`
    - `null` when the component has no enum.
    - Rows are `variant`, else the first enum. Columns are `size`, else `appearance`, else the second enum, else `null`.
  - `export const matrixCellLimit = 48`
  - `export function propValue(recipe, prop: string): string | number`: the recipe's prop, else `field.default ?? field.enum[0]`.
  - `export type MatrixCell<R> = { row: string | number; column: string | number | null; recipe: R; current: boolean }`
  - `export function matrixCells<R extends { props: Record<string, unknown> }>(recipe: R, rows: MatrixAxis, columns: MatrixAxis | null): { cells: MatrixCell<R>[]; total: number }`
    - It goes in row order, sets only the two props, keeps every edit, and stops at 48 cells.
    - `current` is true where both values equal `propValue(recipe, …)`.
  - `export const buttonStateRow = ['hover', 'focus', 'active', 'disabled', 'loading'] as const`

- [ ] **Step 1: Write the failing tests:**
  - **`every component gets axes or none`:** for each id in `componentRecipeComponents`, `matrixAxes` is `null` exactly when `matrixEnums` is empty. When `variant` exists, it is the rows axis.
  - **`Button axes`:** 7 variants as rows and 4 sizes as columns.
  - **`Badge uses size for columns and still offers appearance`:** rows `variant`, columns `size`, and `appearance` is in `matrixEnums('badge')`.
  - **`cells keep edits`:** a Badge with content `'Beta'` and a colour override. Every cell keeps both, and cell `[1]` has the second variant.
  - **`the current cell treats absent props as their default`:** a Badge recipe with no `size` prop has its current cell at size `'default'`, the enum's first value.
  - **`the cap`:** axes of 8 and 7 values give `cells.length === 48` and `total === 56`.
- [ ] **Step 2: Run them.**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor/matrix.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit.**
  - `git commit -m "feat(www): derive the variant matrix axes and cells from the recipe schemas"`

### Task 7: Matrix render protocols

**Files:**
- Modify:
  - `apps/www/src/editor/catalog-preview-protocol.ts`: `CatalogMatrixRender` and its verifier.
  - `apps/www/src/editor/preview-protocol.ts`: `ButtonMatrixRender` and its verifier.
- Test: the two protocol test files.

**Interfaces:**
- Produces:
  - `export type CatalogMatrixRender = { type: 'catalog-matrix-render'; component; requestId: number; rows: string; columns: string | null; cells: { row: string | number; column: string | number | null; current: boolean; result: ComponentRecipeCompileResult }[]; mode; viewport; reducedTransparency?: true }`
  - `export async function verifyCatalogMatrixRender(input: unknown, activeComponent, previousRequestId: number): Promise<CatalogMatrixRender | null>`
    - The key set is exact.
    - It holds 1 to 48 cells, with exactly one `current`.
    - Each cell's `result` passes `verifyCatalogCompileResult`.
  - `export type ButtonMatrixRender = { type: 'matrix-render'; requestId: number; rows: 'variant'; columns: 'size'; cells: { row; column; current; scope: string; css: string; recipe: Recipe }[]; states: boolean; mode; viewport; reducedTransparency?: true }`
  - `export async function verifyButtonMatrixRender(input: unknown, previousRequestId: number): Promise<ButtonMatrixRender | null>`
    - Each cell is checked as `acceptPreviewRender` checks a state.

- [ ] **Step 1: Write the failing tests.** For each protocol:
  - it accepts a valid two-cell matrix;
  - it rejects zero cells, 49 cells, two current cells, an unknown key and a tampered result;
  - it accepts `reducedTransparency: true` only.
- [ ] **Step 2: Run them.**
  - Run: `corepack pnpm exec vitest run apps/www/src/editor/catalog-preview-protocol.test.ts apps/www/src/editor/preview-protocol.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit.**
  - `git commit -m "feat(www): add matrix render messages to the editor preview protocols"`

### Task 8: The matrix in the editors and the preview

**Files:**
- Create: `apps/preview/src/matrix-preview.tsx`, with `CatalogMatrixPreview` and `ButtonMatrixPreview`.
- Modify:
  - `apps/preview/src/catalog-recipe-preview.tsx`:
    - extract `CatalogSpecimenCell({ component, result, instanceKey })`, which renders one scoped specimen, its CSS and its glass filter;
    - `CatalogRecipePreview` keeps the root effects (`.dark`, the glass backdrop) and renders one cell.
  - `apps/preview/src/editor-preview.tsx`: route `catalog-matrix-render` and `matrix-render`, verify them, and set the root attributes once.
  - `apps/www/src/editor/components/preview-frame.tsx`: new prop `matrix?: { rows, columns, cells, states? } | null`. When it is set, it sends the matrix message instead of the single render.
  - `button-editor.tsx` and `catalog-component-editor.tsx`:
    - local state `layout: 'single' | 'matrix'` and `axes`;
    - the controls "Preview layout" (Single, Matrix), "Rows" and "Columns" (with "None");
    - `useRecipeBatch` over `matrixCells(...).cells.map(c => c.recipe)` while in Matrix;
    - the cap message when `total > 48`;
    - no Matrix control at all when `matrixAxes(component)` is `null`.
  - `apps/www/src/editor-shell/view-options.tsx`: `previewLayoutOptions`.

**Interfaces:**
- Consumes Tasks 3, 6 and 7.
- The preview reports measurements from the `current` cell only, through the existing measure messages.

- [ ] **Step 1: Implement the preview table.**
  - `<table data-testid="variant-matrix">` with `<caption>` text `` `${componentName} variants by ${rows}${columns ? ` and ${columns}` : ''}` ``.
  - `<th scope="col">` for each column value and `<th scope="row">` for each row value.
  - The current cell is `<td aria-current="true">`, with a visible "Current" label.
  - In the narrow viewport, the table sits in a horizontally scrolling `div`, and the row headers are `position: sticky; inset-inline-start: 0`.
- [ ] **Step 2: For the Button, add the state row.** It renders the current variant and size once per `buttonStateRow` value with `data-forced-state`, reusing `mirrorForcedStates` on the current cell's sheet.
- [ ] **Step 3: Wire the editors, then typecheck and run the unit tests.**
  - Run: `corepack pnpm typecheck && corepack pnpm exec vitest run apps/www/src/editor`
  - Expected: PASS.
- [ ] **Step 4: Commit.**
  - `git commit -m "feat(www): show the recipe across its variants in a Matrix preview layout"`

### Task 9: Browser tests

**Files:**
- Create: `tests/e2e/editors-matrix.spec.ts`
- Modify:
  - `playwright.editors.config.ts`: `testMatch` gains `'editors-matrix.spec.ts'`.
  - `playwright.config.ts`: `testIgnore` gains the same file.

- [ ] **Step 1: Write the tests.** Run each once against a deliberately broken assertion to see it fail, then restore it.
  - **`colour placeholders show the rendered colour`:** on `/editor/component/badge`, the empty Background field's placeholder equals the hex of the preview badge's computed `background-color`. After Preview mode Dark, with the inspector colour mode on Dark, it equals the dark value.
  - **`the Button matrix`:** Preview layout Matrix gives 7 row headers and 4 column headers, plus 5 state cells. After a colour override on the `default` variant, the `default` row cells' button background is the override, and the `outline` row's is not.
  - **`Badge and Card axes`:** changing Columns to `appearance` gives 3 columns. The cell with `aria-current="true"` matches the inspector's variant. Axe passes on the frame.
  - **`the cap message`:** this test runs only if some component has more than 48 cells. Otherwise `test.skip` explains why, and the cap is pinned by the Task 6 unit test.
  - **`Changes and Get code summary`:**
    - On the Card editor, a background override makes the CSS tab's Changes view show at least one line starting "+ " that holds the colour. The Get code dialog shows `/^Changes from the catalog default: \d+ files?, \+\d+ −\d+$/`.
    - After Reset recipe, it shows "Same as the catalog default."
    - Axe passes on the dialog.
  - **`preset editor summary`:** after a radius edit, the preset Get code dialog shows the changes summary.
  - **`matrix with reduced transparency`:** in liquid glass on `/editor/component/card`, Matrix plus "Preview transparency: Reduced" gives every cell's card `backdrop-filter: none`.
- [ ] **Step 2: Run them.**
  - Run: `corepack pnpm build:packages && corepack pnpm generate:preview && corepack pnpm exec playwright test -c playwright.editors.config.ts`
  - Expected: PASS, the 11 existing editor tests plus the new ones.
  - Run: `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/foundation-browser-inventory.test.ts`
  - Expected: PASS.
- [ ] **Step 3: Commit.**
  - `git commit -m "test(e2e): cover measured placeholders, the variant matrix and the changes view"`

### Task 10: Evidence and docs

**Files:**
- Create: `docs/evidence/editors-matrix-073.md`
- Modify: `apps/www/src/site/docs/guides.tsx` (the component editor guide) and `CHANGELOG.md`.

- [ ] **Step 1: Measure the matrix.**
  - Record the time from the last edit to a Matrix preview reading current, for the Button (28 cells plus states) and for the largest catalog matrix, through `performance.now()` in a Playwright probe.
  - Then run `corepack pnpm build:www && node scripts/measure-www-first-load.mjs`.
- [ ] **Step 2: Write the evidence, with:**
  - the environment;
  - the unit and e2e counts;
  - the matrix timings;
  - the route sizes against batch 7a;
  - the installed-output check;
  - the rulings.
- [ ] **Step 3: Update the guide and the changelog.**
- [ ] **Step 4: Commit.**
  - `git commit -m "docs(evidence): record the batch 7b placeholders, matrix and changes view"`
