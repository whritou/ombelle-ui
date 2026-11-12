# Evidence: Number Input and Color Picker (0.7.5)

Sub-project 2 of the 0.7.5 work. Spec: `docs/superpowers/specs/2026-11-12-editor-inputs-075-design.md`. Plan: `docs/superpowers/plans/2026-11-12-editor-inputs-075.md`.

## Website size, before

The baseline is the last measurement of sub-project 1, "after fixes" in `docs/evidence/primitives-075.md`, taken on `feat/primitives-075`. This branch starts from that branch and changed no website code before the swaps, so the build was not repeated. Method: `corepack pnpm run build` in `apps/www`, then `node scripts/measure-www-first-load.mjs` (gzip level 9 of every script a route's prerendered HTML loads). The limit is 10 kB gzip of growth per route.

| Route | Scripts | First Load JS, gzip |
| --- | --- | --- |
| `/editor/preset` | 17 | 829.7 kB |
| `/editor/component` | 10 | 240.4 kB |
| `/editor/component/button` | 18 | 835.0 kB |
| `/docs` | 11 | 241.4 kB |
| `/docs/getting-started` | 12 | 248.5 kB |
| `/components` | 14 | 415.8 kB |
| `/components/accordion` | 16 | 813.1 kB |

## Website size, after the editor swaps

Measured at `894a0e4` on 2026-11-12 with the same method: `corepack pnpm run build` in `apps/www` (exit 0, about 10 minutes on this machine), then `node scripts/measure-www-first-load.mjs`. The limit is 10 kB gzip of growth per route.

| Route | Scripts before / after | First Load JS before | After | Change | Within 10 kB |
| --- | --- | --- | --- | --- | --- |
| `/editor/preset` | 17 / 18 | 829.7 kB | 871.8 kB | +42.1 kB | no |
| `/editor/component` | 10 / 10 | 240.4 kB | 241.1 kB | +0.7 kB | yes |
| `/editor/component/button` | 18 / 18 | 835.0 kB | 864.9 kB | +29.9 kB | no |
| `/docs` | 11 / 11 | 241.4 kB | 242.1 kB | +0.7 kB | yes |
| `/docs/getting-started` | 12 / 12 | 248.5 kB | 249.2 kB | +0.7 kB | yes |
| `/components` | 14 / 14 | 415.8 kB | 440.5 kB | +24.7 kB | no |
| `/components/accordion` | 16 / 15 | 813.1 kB | 837.3 kB | +24.2 kB | no |

Four routes exceed the limit. `/components` grows by about 25 kB without rendering either component, which points at the catalog source text those routes ship (two templates in two editions and five stylesheets each); the editor routes add the pickers' code on top. The split was not measured. Work stopped here for review, as the plan requires.

## Specimen audit

`OMBELLE_AUDIT_COMPONENTS=number-input,color-picker corepack pnpm test:specimen-audit` after `pnpm build:packages` and `pnpm generate:preview` (Chromium, Windows 11, Node 24.19.0): 182 passed, 3 failed (11.7 min). The three failures passed when rerun alone on a warm server:

- `specimen-audit.spec.ts` flat/radix/light: the first configuration of the run timed out waiting for the cold preview server's page; rerun: passed (10.1 s).
- `glass-scenes.spec.ts` luminance range and `overlays-search.spec.ts` Radix Hover Card: not Number Input or Color Picker specimens; rerun: passed.

No audit finding in any family for Number Input or Color Picker, so no style fix was needed.

## Board comparison

A probe read computed styles from the board files (`<Family>08Components.dc.html`, section 01 Color Picker and section 02 Number Input, rendered from `file://` with the web fonts blocked) and from the components on the edition parity pages (`/editions/<family>/radix/?mode=light`, "Editor inputs" section, with the Accent picker's popover open). It covered the trigger row, swatch, text field, popover, area and marker, hue track and thumb, format select and value, eyedropper, contrast readout and level, and the Number Input box, stepper, text and unit. The board sections are in `docs/evidence/images/editor-inputs-075/board-<family>-<section>.png`.

Fixed, each pinned in `packages/catalog/test/specimen-audit-fixes.test.ts` ("editor inputs board comparison"):

| What | Family | Board | Before the fix |
| --- | --- | --- | --- |
| Popover padding | all | 14px | 18px, from the family Popover |
| Format value field | all | weight 500, 14px sides | weight 400, 8px sides |
| Hue track corners | minimalist, neo-brutalism | 4px, square | pill |
| Picker edges (swatch, area, hue, select, value, swatches, pill, eyedropper) | flat | 1px | none: flat's `--border-width` is 0 |
| Trigger row and Number Input box | flat | 1px border, 10px corners | flat Input's underline on a muted fill |

After the fixes, the probe reads 14px popover padding, weight-500 format values with 14px sides and the board's hue corners in every family, and 1px boxed fields with 10px corners in flat.

### Differences that remain

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Text size inside the parts | 16px page text | 14px | The board page's base size; the parts set their own sizes where the board does |
| Control height | 42px | 40px (`--control-height`) | The family token; every other control uses it |
| Ombelle and neo-brutalism trigger and Number Input shadow | None | The family Input's inset line (ombelle) or offset shadow and weight 600 (neo-brutalism) | The spec draws the trigger row and the box from the family Input, so they match the other fields in a form |
| Popover shadow and corners | Ombelle 5px offset; glass 24px corners | Family Popover: ombelle 4px offset, glass 18px | Taken from the family Popover, as the spec says |
| Area marker ring | One ring in the family line colour | White ring plus a dark ring | The spec asks for a light and a dark ring so the marker shows over any colour |
| Hue thumb | Small per-board differences in border and shadow | The family Slider thumb | Taken from the family Slider, as the spec says |
| Neo-brutalism border width | 2.5px | 2px (`--border-width`) | The family token |
| Liquid glass trigger, field and popover sheen | Board's glass insets | Family glass Input and Popover | Glass is experimental; recorded, not blocking |

The probe covered the Radix edition in light mode; the Base UI edition and dark mode are covered by the specimen audit and the browser tests (22 passed after the fixes).

## Verification

Windows 11, Node 24.19.0, pnpm 11.25.0 through corepack, bundled Chromium. Each command ran on the commit named in its row or later, on branch `feat/editor-inputs-075`.

| Check | Command | Result |
| --- | --- | --- |
| Contracts | `corepack pnpm exec vitest run packages/contracts` | 306 passed |
| Catalog, colour maths included | `corepack pnpm exec vitest run packages/catalog` | All passed after the board fixes; colour maths 34 of 34 (round trips, parsing, writing, WCAG 2 ratios, gamut, hue memory, agreement with the contracts parser) |
| Compiler | `corepack pnpm exec vitest run packages/compiler` | All passed; under the parallel run two `generated-types.test.ts` cases hit their 60 s limit and passed alone (3 of 3) |
| Website units | `corepack pnpm exec vitest run apps/www/src` | All passed with the editor swaps (1496 with the catalog) |
| Typecheck | `corepack pnpm typecheck` | Exit 0 |
| Integration | `vitest.integration.config.ts`: foundation inventory and groups, liquid glass CLI, www route | 50 and 26 passed |
| Browser, both editions | `playwright -c playwright.specimen-audit.config.ts tests/e2e/editor-inputs-075.spec.ts` | 22 passed: keys and clamping, the half-typed value, area, hue, format, swatches, contrast levels, hue memory at black, a value set while open, the out-of-gamut value, the eyedropper resolved, cancelled and closed mid-pick, no eyedropper without the API, and the pair |
| Editors end to end | `preset-editor.spec.ts`, `editor.spec.ts`, `catalog-editors.spec.ts`, with the website and preview servers only (as in [primitives evidence](primitives-075.md)) | The tests the swaps touch pass. What still fails is the recorded baseline: consumer apps not served, dashboard axe contrast, the 0.5 corner radius, and the 320 pixel reflow test's axe step on the gallery Date Picker trigger and Projects table. The reflow test needs 1.4 min now and was given 2 min |
| Specimen audit | `OMBELLE_AUDIT_COMPONENTS=number-input,color-picker pnpm test:specimen-audit` | No findings (see above) |

The "restores raw draft" editor test showed that a remounted Number Input lost a stored half-typed value such as `-`. The `text` prop fixes it; the test now reaches its baseline failure (the 0.5 radius) after `-` comes back on reload, undo and redo.

## Final review fixes

A whole-branch review found one critical issue and six important ones. Each fix has a test that fails without it:

| Finding | Fix | Test |
| --- | --- | --- |
| In the preset editor, the picker's popover opened under the token panel, which is a native `popover="auto"` in the top layer, and a click on it dismissed the panel | The popover is portalled into the nearest native popover or open dialog around the picker; `container` overrides this | `preset-editor.spec.ts`, "edits a token with its Color Picker inside the token panel, without closing the panel" |
| Liquid glass edge tokens (`oklch(… / 14%)`) read as invalid and lost their alpha on edit | `parseColor` reads an OKLCH or RGB alpha, edits keep it, and the swatch shows it | `color-math.test.ts` alpha cases; `color-picker.test.ts` glass edge |
| The editors offered RGB, which presets and recipes cannot store | A `formats` prop; the three editors pass `['oklch', 'hex']` | The preset-editor test checks the format options |
| The recipe's "Light and dark pair" option could not be switched off | An unpaired recipe ignores its dark value | `component-recipe.test.ts` |
| In Hex or RGB, the hue drifted at the dark and pale edges | The picker keeps its own HSV while the value is the one it wrote | `editor-inputs-075.spec.ts`, "keeps its hue in Hex format at the dark and pale edges" |
| The live region announced the previous colour after a swatch, a pick or a keyboard hue step | The announcement is taken after the change renders | "announces the new contrast after a swatch" |
| A parent storing `parseFloat` turned `1.` into `1` | A focused field keeps its text when the incoming value equals its loose parse | "keeps a trailing decimal point when its parent stores its own parse" |

Four of the review's minor findings were also fixed:

- `maxLength` reaches the text field.
- The format field follows a value set from outside.
- The printed contrast ratio is rounded down, so it never shows a level the colour misses.
- The site's API line lists `text`.

Results after the fixes:

| Check | Result |
| --- | --- |
| `editor-inputs-075.spec.ts`, both editions | 28 passed |
| Preset-editor tests that the fixes touch | Pass, apart from the two recorded baseline failures: the 0.5 radius, and the axe step of the 320 pixel reflow test |
| Contracts, catalog, compiler and website unit tests | Pass. `preview-protocol.test.ts` timed out in its setup under the combined run and passed when run alone |
| Foundation inventory and groups | 50 passed; the browser case total is now 685 |
