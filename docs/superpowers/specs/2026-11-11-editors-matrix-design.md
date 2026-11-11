# Editors, batch 7b: measured placeholders, the variant matrix and the diff on Get code

Batch 7b is the last batch of the 0.7.3 work, on branch `feat/editors-matrix-073`. Its PR stacks on #108 (batch 7a). It covers three editor improvements from the 0.7.3 list: "measured placeholders everywhere", "variant matrix view" and "diff on Get code".

## Intent

The website's component and Button editors show one specimen and leave unset fields to the preset. Three gaps follow:

- **Colour fields:** an empty colour field reads "Preset", so the user cannot see what the preset paints. Dimension fields already show the measured value of the rendered specimen.
- **Variants:** the user sees only the selected variant, so an edit cannot be checked across variants and sizes.
- **Get code:** it gives an install command with no view of what the edits change in the generated files.

The design artifact has no board for these; they come from the 0.7.3 list.

Decisions taken in brainstorming (11 November 2026):

- **Placeholders:** every empty field in the component and Button editors shows the value the preview renders: colours in hex, dimensions as today. The preset editor's fields always hold values and are out of scope.
- **Matrix:** a "Matrix" preview layout in the Button editor and every component editor. The current recipe is shown across its variants (rows) and sizes or appearances (columns); the Button adds a row of forced states.
- **Matrix compile:** one compile per cell, so variant-specific CSS and per-variant overrides show truly. A single compile with props swapped would show a false preview.
- **Diff:** against the catalog default, meaning what the CLI would install for the same family and preset with no edits. A small in-house line diff, with no new dependency.

## Measured placeholders

**Measurement:**
- `measurePart` in `apps/www/src/editor/catalog-preview-protocol.ts` gains colour dimensions, read from the rendered element's computed style:
  - `backgroundColor`, `color` and `borderColor`;
  - `outlineColor`, for parts whose recipe exposes it.
- They are returned as uppercase hex. A colour that is not fully opaque is `#RRGGBBAA`.
- The colour keys a part reports are the ones its recipe can override, from `componentRecipeParts` and the appearance fields in `packages/contracts/src/component-recipe-appearance.ts`.

**Protocol:**
- `acceptCatalogMeasure` and `acceptButtonMeasure` accept the new keys only as strings matching `^#[0-9A-F]{6}([0-9A-F]{2})?$`, and still accept old numeric-only messages.

**Fields:**
- In `catalog-appearance.tsx`, an empty colour field shows the measured hex as its placeholder, with "Preset" only until the first measurement.
- In the Button editor's `properties-panel.tsx`, colour fields use the measured value at rest. The forced-state preview does not feed placeholders.
- Placeholders follow the preview's mode and every new render. The measure is reported by the current cell in Matrix.

**Accessibility:** a placeholder is never the label. Every field keeps its accessible name. Placeholder text keeps the editor's existing placeholder colour, which already meets 4.5:1.

## The variant matrix

**The control:**
- "Preview layout: Single / Matrix", a two-option `SegmentedControl` beside "Preview mode" in `button-editor.tsx` and `catalog-component-editor.tsx`.
- It is preview state, never saved, and absent for a component with no enum prop.
- In Matrix, two selects, "Rows" and "Columns", list the component's enum props. Columns also offers "None".

**Axes:** `matrixAxes(component)` in `apps/www/src/editor/matrix.ts` (new) reads `componentRecipeFields(component).props` and keeps the fields with an `enum`.
- **Rows:** `variant`, otherwise the first enum.
- **Columns:** `size`, otherwise `appearance`, otherwise the second enum, otherwise none.
- **The Button** uses its v1 recipe schema: rows `variant` (7 values), columns `size` (4 values), plus one row of forced states (hover, focus, active, disabled, loading) for the current variant and size.

**Cells:**
- `matrixCells(recipe, rows, columns)` builds one recipe per cell. Each is the current recipe, every edit kept, with only the two axis props set.
- Cells are capped at 48. Over the cap, the editor shows "This matrix has N cells; showing the first 48. Choose other axes to see the rest." and renders the first 48 in row order.

**Compile:**
- A `compile-matrix` request to the existing editor worker (`apps/www/src/editor/compile.worker.ts`) carries the cell recipes and returns one compile result per cell, in order.
- It runs after the editor's existing debounce. Only the latest request is accepted, as for single compiles.
- The Button cells go through `compileRecipe`, and catalog cells through `compileComponentRecipe`.

**Preview:**
- New message types: `catalog-matrix-render` and `matrix-render` (Button). Each carries the cells, their axis values, the mode, the viewport and the reduced-transparency flag.
- Validators in the two preview protocols check every cell result as the single-render validators do.
- The preview renders a `<table>`:
  - a caption naming the component and axes;
  - `<th scope="col">` and `<th scope="row">` headers with the axis values;
  - one cell per compile result.
- Each cell renders its specimen with its own scope, CSS and glass filter instance, like `CatalogRecipePreview` today. The work that touches the root (`.dark`, the glass backdrop, the reduced-transparency attribute) runs once for the table.
- The cell that matches the inspector's current values gets `aria-current="true"` and a visible "Current" label. It reports the measurements for the placeholders.
- In the narrow viewport, the table scrolls horizontally inside the preview, with the row header column sticky.

## The diff on Get code

**The reference:** each editor also compiles its catalog default through the same worker.
- Catalog: `{ ...createCatalogDraft(component).recipe, presetRef: recipe.presetRef }`.
- Button: `resetDraftRecipe(draft, start)`.
- Preset editor: the starting preset (`matchingStartingPreset` or the backdrop preset for glass), otherwise the family's base preset.

**Normalization:** `normalizeArtifact(content, result)` replaces, in both versions:
- the result's `scope` with `<scope>`;
- the recipe id with `<recipe>`;
- `r<revision>` with `r<n>`.

Files are paired by `kind` and file name, not by full `logicalPath`.

**The diff:** `lineDiff(before: string, after: string): DiffLine[]` in `apps/www/src/editor/line-diff.ts` (new).
- It is a Myers shortest-edit diff over lines. CRLF is treated as LF.
- `DiffLine` is `{ kind: 'same' | 'add' | 'remove'; text: string; before?: number; after?: number }`.
- `diffSummary(lines)` returns `{ added, removed }`.
- Unchanged runs longer than 6 lines collapse to 3 lines of context on each side and a "N unchanged lines" row.

**ArtifactPanel:**
- The Component, CSS and Recipe tabs gain a "File / Changes" segmented control.
- Changes shows the unified diff in a `<pre>`. Each line starts with "+" or "−" in text as well as colour, under a "+12 −4" count.
- A file equal to its default reads "No change from the catalog default."
- The Usage and Install tabs have no Changes view.

**Get code:**
- `GetCodeDialog` gains an optional `summary` prop, rendered after the description. `RecipeGetCode` and `PresetGetCode` forward it.
- The editors pass:
  - "Changes from the catalog default: 2 files, +12 −4", with a button that opens the panel's Changes view;
  - or "Same as the catalog default."

## Testing

**Unit:**
- `lineDiff`: equal inputs, pure additions, pure removals, a moved line, CRLF inputs, empty inputs, and the collapse rule.
- `normalizeArtifact`: two compiles that differ only by scope give no diff.
- `matrixAxes`: every component id in `componentRecipeComponents`, and the Button.
- `matrixCells`: axis values set, other props and edits kept, and the cap at 48.
- The colour measure validators, and the two matrix render validators.

**End to end:** `tests/e2e/editors-matrix.spec.ts`, under `playwright.editors.config.ts`, also listed in `playwright.config.ts` `testIgnore`.
- A colour field's placeholder equals the preview's computed colour, and changes with dark mode.
- The Button matrix has 7 × 4 cells plus the state row, and a colour edit shows in the cells of the edited variant.
- The Badge and Card matrices change axes. The current cell has `aria-current`, and the table has row and column headers.
- After an edit, Changes shows the edited declaration as "+" and "−" lines, and Get code shows the summary. After a reset, it reads "Same as the catalog default."
- The preset editor's Get code summary.
- Axe passes on the matrix preview and the Changes view.

**Measured:** `docs/evidence/editors-matrix-073.md` records:
- the matrix compile time for Button (28 cells) and the largest catalog matrix, on this machine;
- the editor routes' added JavaScript, measured with `scripts/measure-www-first-load.mjs`.

**Installed output:** unchanged. `git diff --stat feat/editors-glass-073 -- packages/catalog packages/compiler/test/fixtures` must stay empty. No specimen audit is run, since no catalog style or template changes.

## Docs

- `docs/evidence/editors-matrix-073.md` (new).
- The site's editor guide in `apps/www/src/site/docs/guides.tsx`: the placeholders, Matrix, and the Changes view and Get code summary.
- `CHANGELOG.md` under Unreleased.

## Out of scope

- Placeholders in the preset editor.
- A matrix in the preset editor.
- A gallery page of all components.
- A diff against a published revision or a pasted file.
- Word-level diff.
- New dependencies.
- Releases, deployment and pushes without asking.

## Delivery

- Branch `feat/editors-matrix-073`, from `feat/editors-glass-073`. The PR stacks on #108.
- Conventional Commits.
- The execution method is chosen with the plan. A fresh reviewer then checks the whole branch, and its minor findings are fixed before the PR.
- Only the tests of what changed are run.
