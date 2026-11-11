# Editors, batch 7b, evidence (0.7.3)

The 0.7.3 editor work: measured placeholders, the variant matrix and the diff on Get code. Spec: `docs/superpowers/specs/2026-11-11-editors-matrix-design.md`.

Environment for every run below:
- Windows 11 Home 10.0.26300, Node 24.19.0, pnpm 11.25.0 through `corepack pnpm`.
- Playwright 1.64.1 with its bundled Chromium 156.0.8078.4.
- The website and the preview ran as development servers (`serve-snapshot-www` and `pnpm dev:preview`).

## Installed output

`git diff --stat feat/editors-glass-073 -- packages/catalog packages/compiler/test/fixtures` is empty. No catalog style, template, compiler output, stable hash or style baseline changed. No specimen audit was run, since nothing it measures changed.

## Measured placeholders

- **What is measured:** the preview measures each part's computed `background-color`, `color` and `border-top-color` next to its dimensions, and reports them in uppercase hex, with alpha when not opaque.
- **OKLCH and other syntaxes:** colours outside sRGB syntax, such as the OKLCH of the Ombelle preset, are read through a 1 × 1 canvas.
- **Protocol:** the measure message accepts these keys only as `#RRGGBB` or `#RRGGBBAA`, and still accepts old numeric-only messages.
- **Which fields:** an empty colour field shows the measured value when it edits the mode the preview shows. Otherwise, and before the first measurement, it keeps "Preset" (or "Family" for the Button's state colours).
- **The Button:** its colours are measured at rest only. While a forced state is shown, the preview drops the colour measurements rather than report hover or pressed colours.

## The variant matrix

- **The control:** "Preview layout: Single / Matrix" in the Button editor and every component editor that has an enum prop.
- **Components with no enum prop:** Progress, Label, Switch, Dialog, Dropdown Menu, Alert Dialog, Breadcrumb, Kbd, Tag Input, Input OTP and Context Menu show no Matrix control.
- **The axes** come from the component recipe schema: rows `variant`, columns `size`, else `appearance`, else the second enum. The "Rows" and "Columns" selects change them.
- **Largest default matrices:**

| Editor | Axes | Cells |
| --- | --- | ---: |
| Button | variant × size | 28, plus 5 forced states |
| Badge | variant × size | 16 |
| Toast | variant × mode | 15 |
| Popover | side × align | 12 |
| Sheet | side × size | 12 |

- **The cap:** no component reaches the 48-cell cap with its default axes. `matrix.test.ts` pins the cap.
- **The cells:**
  - Each cell is the current recipe with every edit kept and only its two axis props set, compiled on its own.
  - A Button colour override therefore applies to each cell's own variant, which is what installing the recipe with that variant gives.
- **The preview:**
  - It renders a `<table>` with a caption, `<th scope>` headers and `aria-current="true"` plus a visible "Current" label on the current cell.
  - The current cell reports the placeholder measurements.
  - Root effects (dark mode, glass backdrop, reduced transparency) are set once for the table.

**Time from choosing Matrix to the current cell drawn,** three runs each on the development servers:

| Editor | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Button (28 cells and the state row) | 8.8 s | 7.2 s | 7.1 s |
| Badge (16 cells) | 10.3 s | 10.3 s | 11.9 s |

- **Why it is slow:** each cell compiles three times:
  - in the editor worker;
  - again in the page, which verifies the worker's result as the single-specimen editor already does;
  - again in the sandboxed preview, which verifies what it renders.
- **Why the checks stay:** the preview's check is its security boundary.
- **While it waits:** the editor shows "Compiling the matrix…" as a status until every cell verified, and the single specimen stays in view.
- **Not measured:** a production build. These are development-server timings.

## The diff on Get code

**How the reference is built:**
- **The comparison:** each editor compiles its catalog default for the same family and preset, through the same worker. That default is the catalog recipe with the current `presetRef`, the Button reset to its starting recipe, or the preset editor's starting or base preset.
- **Normalisation:** before a line diff (Myers), the 64-character scope, the recipe id and the revision are replaced by fixed tokens. A probe of the Badge and Button outputs found only the scope inside the CSS and component files. The id and revision appear only in the usage file's import path, which is not diffed.

**How the diff is shown:**
- **Generated output:** the Component, CSS and Recipe tabs gain "File / Changes".
  - Changes prints each line with "+", "−" or a space in its text, under a "+N −N" count.
  - Unchanged runs over 6 lines fold to 3 lines of context.
  - A file equal to its default reads "No change from the catalog default."
- **Get code:** the dialog shows "Changes from the catalog default: N files, +N −N", or "Same as the catalog default.".
  - In the component and Button editors, its "Show changes" button closes the dialog and focuses the first changed file's Changes view.
  - The preset editor shows the summary only. Its export panel has no file tabs.

## Tests

**Unit:**
- **The new 7b suites,** `line-diff`, `artifact-diff`, `compile-protocol` (batch), `measured-color`, the catalog and Button preview protocols, `matrix` and `diff-view`, all pass.
- **A combined run** of the website's editor, editor-shell, snapshots, recipe-snapshots, preset-editor and site folders passes 550 tests.
  - Its exception is `preset-editor/preview-protocol.test.ts`, whose setup hook exceeds its 10-second timeout under that parallel load: 22 tests skipped.
  - Run on its own, it passes 22 of 22. This branch does not change it.
- **Typecheck:** clean.

**Browser:** under `playwright.editors.config.ts`, 17 tests pass and 1 is skipped, across the 7a glass spec and the new `tests/e2e/editors-matrix.spec.ts`. The new spec covers:
- the colour placeholder against the preview's computed colour, in light and dark;
- the Button matrix: 4 size columns, 7 variant rows plus the state row, 5 forced states, one current cell, the colour edit in the default row, and the pending status;
- the Badge matrix changing columns to `appearance`, the current cell's row, an axe run on the matrix, and the Card matrix;
- the Changes view and the Get code summary after an override, focus moving to Changes, an axe run on the dialog, and "Same as the catalog default." after Reset recipe;
- the preset editor's summary after a radius edit;
- every Card in a liquid glass matrix opaque with "Preview transparency: Reduced".

The cap test is skipped with its reason. The foundation inventory test passes, since both editor specs are in `playwright.config.ts` `testIgnore`.

## Website size

Measured with `node scripts/measure-www-first-load.mjs` (gzip) after a fresh `pnpm build:www`. Batch 7a was not measured on its own, so the growth below covers 7a and 7b together, against batch 6c:

| Route | After batch 6c | Now | Growth |
| --- | ---: | ---: | ---: |
| `/editor/preset` | 813.6 kB | 818.3 kB | +4.7 kB |
| `/editor/component` | 239.4 kB | 239.4 kB | 0 kB |
| `/editor/component/button` | 817.9 kB | 824.3 kB | +6.4 kB |
