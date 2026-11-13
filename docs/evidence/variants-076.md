# 0.7.6 variants evidence

Sections 01 to 06 of the 0.7.6 variant boards: Sheet `snapPoints`, `CardAction`, `SliderValue`, Progress and Meter `shape="circle"`, Code Block `diff` and `TooltipShortcut`, and section 07, the image Carousel (at the end of this file), in all five style families and both editions. Spec: `docs/superpowers/specs/2026-11-13-variants-076-design.md`. Plan: `docs/superpowers/plans/2026-11-13-variants-076.md`. Branch `feat/variants-076`, commits `db22321b` to the Task 9 commits.

Run on 2026-11-13 by agents on Windows 11 Home 10.0.26300 with Node 24.19.0, pnpm 11.25.0 (through corepack), Playwright 1.64.1 and its bundled Chromium 156.0.8078.4, headless, reduced motion on. Local runs, not CI runs or a human review.

## Not run

| What | Why |
| --- | --- |
| Website First Load JS | The plan swaps nothing into the website; it changes only `install-command.ts` (the 0.7.6 gate) and the docs entries. The catalog chunk the editor routes ship grows with the new templates and styles; that growth was not measured |
| Foundation gate (`pnpm check:foundation`) | Not part of this plan; it needs registry access and the npm, Yarn and Bun consumer toolchain |
| Section 07 (Carousel `variant="image"`, `CarouselThumbnails`) | Done after the rebase onto track 1; see [Section 07](#section-07-image-carousel) |
| Human screen-reader review | The 0.7.6 rows in `docs/accessibility-review.md` are open |

## Checks

| Check | Command | Result |
| --- | --- | --- |
| Default specimens | `vitest run packages/compiler/test/variants-076.test.ts` | Task 1 recorded every default recipe specimen of the seven components in all five families (35 entries, `variants-076-default-specimens.json`) before any schema change. The test compared them after every task and passed each time; the Task 8 run gave 69 of 69 |
| Default HTML | `{sheet,card,slider,progress,code-block,tooltip}-variants.test.ts`, `meter.test.ts`, `code-block.test.ts` | Without the new prop or part, the SSR HTML of each component equals the HTML at `db22321b`, the Task 1 commit, in both editions |
| Stable hashes | `tsx scripts/record-stable-hashes.ts`, then `vitest run packages/compiler/test/stable-families.test.ts` | Re-recorded after each change. Only `sheet`, `card`, `slider`, `progress`, `meter`, `code-block` and `tooltip` entries moved; Task 9 moved the `card`, `slider`, `progress` and `meter` CSS entries (16) |
| Contracts and gate (Task 1) | `vitest run packages/contracts/test/component-recipe.test.ts apps/www/src/snapshots/install-compatibility.test.tsx packages/compiler/test/variants-076.test.ts` | 303 passed; 24 contract and gate cases failed before the schema, rules and gate existed |
| Sheet (Task 2) | `vitest run packages/catalog/test/sheet-variants.test.ts packages/catalog/test/sheet.test.ts` | 28 passed; 12 failed first |
| CardAction (Task 3) | `vitest run packages/catalog/test/card-variants.test.ts packages/catalog/test/catalog.test.ts` | 46 passed; 6 failed first |
| SliderValue (Task 4) | `vitest run packages/catalog/test/slider-variants.test.ts packages/catalog/test/slider.test.ts packages/catalog/test/catalog.test.ts` | 61 passed; 21 failed first. The review fix (a track press while the field has focus) failed first in the Base UI browser test |
| Rings (Task 5) | `vitest run packages/catalog/test/progress-variants.test.ts packages/catalog/test/meter.test.ts packages/catalog/test/progress.test.ts` | 58 passed; 22 failed first |
| Code Block diff (Task 6) | `vitest run packages/catalog/test/code-block.test.ts packages/catalog/test/code-block-contrast.test.ts` | 68 passed; 18 failed first. The contrast test failed on a comment token on the bands (3.51 and 3.72:1) before the override |
| TooltipShortcut (Task 7) | `vitest run packages/catalog/test/tooltip-variants.test.ts` | 27 passed; 24 failed first |
| Specimens, scenes and gallery (Task 8) | `vitest run packages/compiler/test/variants-076.test.ts`; `vitest --config vitest.integration.config.ts tests/integration/preset-gallery-generation.test.ts` | 69 passed (7 failed first), including a typecheck of all 12 variant recipes as compiled; 13 passed |
| Task 9 fixes | `vitest run packages/catalog/test/specimen-audit-fixes.test.ts packages/catalog/test/{progress,card,slider}-variants.test.ts packages/catalog/test/meter.test.ts` | 24 new cases failed first, then 319 passed; the neo-brutalism focus case failed first, then passed. Final run with `stable-families.test.ts` and `variants-076.test.ts`: 7 files, 411 passed |
| Build | `corepack pnpm build:packages`, then `corepack pnpm generate:preview` | Passed after every task; the catalog style lint passed |
| Types | `corepack pnpm typecheck` | Passed |
| Foundation inventory | `vitest run --config vitest.integration.config.ts tests/integration/foundation-groups.test.ts tests/integration/foundation-browser-inventory.test.ts` | 2 files, 50 passed |
| Variant browser tests, both editions | `playwright test -c playwright.specimen-audit.config.ts tests/e2e/variants-076.spec.ts` | 32 passed (1.3 min), after the Task 9 fixes: on the Task 9 working tree that was committed as `c90fc2a4`, so before `09f28cc8` (Card action rules written once, computed styles unchanged) and before the final review fixes. Each component task ran its own cases first (Task 7: 4 TooltipShortcut cases on a temporary config, port 4302). The final review re-ran the Sheet, Slider and Code Block cases (below) |

### Variant browser tests

`tests/e2e/variants-076.spec.ts` runs on the edition pages (`VariantsScenario076`, Ombelle family) in both editions. It is in the specimen-audit config's `testMatch` and in `playwright.config.ts` `testIgnore`, so `browserSpecCounts` does not change. What it pins:

- Sheet: opens at 50 % (±1 %); Arrow Up gives `Full height` and 90 %, and stays there; Home and End; Arrow Down on 50 % closes and returns focus to the trigger; a drag from 50 % to 72 % settles at 90 %, from 90 % to 60 % at 50 %, and a release at 20 % closes; after End and Escape, and after a drag-close, the sheet reopens at 50 % with `Half height`.
- CardAction: title plus 12px plus action equals the header width with a 34px and a 120px action; the title's start and top stay put; the action's top equals the title's (±1px); a click on the action of a link card runs the action, not the link.
- SliderValue: Arrow Right changes the readout to `13 px` and the thumb's value text with it; the output's `for` is the thumb's id; the field is 76 × 34; `0.33` and Enter gives 0.35 and keeps focus; `abc` and an empty field restore; `5` and blur gives 1; Escape restores without moving the thumb; a drag updates the field; a track press while the field has focus keeps the pressed value.
- Rings: the `lg` ring is named "Uploading preset", has the value text `64%` and no number in the accessibility tree, and is 96 × 96 with a 16px number; the Meter ring is 72 × 72; the button ring is 18 × 18 with no number; the indeterminate ring does not spin under reduced motion and spins (`progress-ring-spin`, 1s) without it.
- Code Block diff: Copy writes exactly the new version; the region text holds `Removed:` and `Added:` and the count text; markers are `aria-hidden`; changed lines are tinted at the default block's line pitch.
- TooltipShortcut: on hover and on focus, the key caps `Ctrl` and `Z` show in one row, 11px mono with a 1px border, `aria-hidden`; the trigger has `aria-keyshortcuts="Control+Z"`; the tooltip's accessible text is `Undo` alone (the browser's own computation: `toHaveAccessibleDescription` in Radix, an aria snapshot of the open tooltip in Base UI).

## Specimen audit

`OMBELLE_AUDIT_COMPONENTS=sheet,card,slider,progress,meter,code-block,tooltip corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/specimen-audit.spec.ts`, after `build:packages` and `generate:preview`. The 0.7.6 audit sections are `sheet~snap`, `card~action`, `card~action-dense`, `slider~readout`, `slider~editable`, `progress~circle`, `progress~circle-sm`, `meter~circle`, `code-block~diff` and `tooltip~shortcut`, next to each component's default specimen.

| Run | Result |
| --- | --- |
| Task 5, `OMBELLE_AUDIT_COMPONENTS=progress,meter` | Before any specimen drew a ring (no ring was audited). An earlier run, concurrent with another session's Playwright and Task 5's own vitest runs, had 4 failures (Ombelle Radix light and dark, liquid glass Radix dark, the glass backdrop check) that passed when re-run; Task 5 attributed them to load. The final run was stopped after test 18 of 21, and the remaining three (liquid glass Base light and dark, the glass backdrop check) were run separately: 3 passed. Every configuration that ran was listed as passing |
| Task 9, first run | Stopped after 7 configurations, all failed with the same five findings in each (flat, both editions and modes, and minimalist Radix light and dark and Base light): "overflow: text extends past its box" on the `⋯` of `card~action` and `card~action-dense`, the `64%` of `meter~circle` and the `25%` of `progress~circle` |
| Task 9, second run, after the line-height and board fixes (27.5 min; CSS before the neo-brutalism focus fix) | 19 passed, 2 failed: neo-brutalism dark, both editions, "focus-visible: 0 focus pixels at 3:1" on the bare action button of `card~action` and `card~action-dense`. The other 18 configurations and the glass backdrop check passed at that CSS |
| After the neo-brutalism fix (`c90fc2a4`), `OMBELLE_AUDIT_COMPONENTS=card`, `-g "neo-brutalism/"` | 4 passed: the four neo-brutalism configurations, Card only |
| **Final run**, all seven components, at `09f28cc8` (the Card action rules written once; computed styles unchanged) | 21 passed (18.3 min): all 20 family, edition and mode configurations and the glass backdrop check, with no blocking finding. This is the audit of the current CSS |

Fixed (the current CSS is audited by the final run above):

- The ring numbers and the Card action button had `line-height: 1`, so the glyphs were taller than their boxes. They take `line-height: normal`. Pinned in `specimen-audit-fixes.test.ts`, "the 0.7.6 variants pass the specimen audit and match their boards".
- The neo-brutalism card header is filled with `--secondary`, where the action button's `--ring` outline, drawn 4px outside it, fell under 3:1 in dark mode (as the 0.7.5 checked Checkbox Option did). The ring is now a 3px solid line 5px inside the button in its own text colour, and the button's text is `--card-foreground` on its card fill. Pinned in "the 0.7.6 Card action in neo brutalism".

Liquid glass is experimental: the audit writes its findings to `.artifacts/specimen-audit/partial/liquid-glass-<edition>-<mode>.findings.json` and attaches them to the test as an "experimental findings" annotation; only page errors fail a liquid glass configuration. In the second run and again in the final run, in light mode, both editions, the new sections add focus-visible findings on `slider~readout` and `slider~editable` (the thumb, as on the default `slider` specimen, and the editable field), `tooltip~shortcut` (as on the default `tooltip` in the Radix edition), `code-block~diff` (Radix, as on the default `code-block`), and forced-colours "backdrop-filter remains" on the slider sections (as on the default `slider`). In the final run the dark-mode findings files of both editions are empty (`[]`); the light-mode files hold 22 findings (Radix) and 17 (Base UI), including the default specimens' findings listed above.

The `sm` ring inside a disabled "Saving" button (the edition fixture `rg-rings`, the same markup as the gallery's `progress~circle-sm` and the Projects scene upload rows): axe on `[data-testid="rg-rings"]` found no violation in all five families and both editions (a probe with `@axe-core/playwright` 4.14.0 on the edition pages). The audit's own `progress~circle-sm` section is the bare ring.

## Board comparison

Two probes in the session workspace read computed styles: `t9-board.mjs` on board sections 01 to 06 of `<Family>076Variants.dc.html`, rendered from `file://` at 1440px (whether the boards' Google Fonts loaded was not checked, so the comparison uses computed sizes, weights and colours, not text widths), and `t9-spec.mjs` and `t9-tip.mjs` on the audit specimens (`/audit/<family>/radix/?mode=light`, 1100px; the tooltip opened by focus, the sheet by its trigger). Board screenshots: `docs/evidence/images/variants-076/board-<family>-<section>.png` (sections 01 to 06, five families).

These match the boards in every family: the snap sheet opens at 50 % with a 48 × 24 handle reading `Half height`; the Card action is 34 × 34 at the end of a `minmax(0, 1fr) auto` header with a 12px column gap; the readout is 13px mono at weight 600; the editable field is 76 × 34 with centred mono text; the rings are 96, 72 and 18px with 6px strokes (8px for `sm`), the 16px and 14px numbers, round ends (square in neo brutalism) and a `--muted` track; the diff markers sit in a 28px column, the count is 12px mono at weight 500 and 75 % of the code colour, and the bands are the board's 24 % green and 26 % red; the key caps are 11px mono at weight 500 with a 1px border at 45 % of the tooltip text, a 4px radius (0 in neo brutalism), 1px 6px padding and a 3px gap, 10px after the text.

Fixed:

| Part | Board | Before | Test |
| --- | --- | --- | --- |
| Bare Card action button | The small outline icon button: Ombelle a card fill, the line border and a 2px offset shadow; flat a 2px inset `--primary` ring and primary icon; minimalist a 1px border in the strong line (`#8C8C86`); neo brutalism a border in the ink and a 2px offset shadow | A transparent ghost in every family; in flat the border width is 0, so the button had no edge at all, and in minimalist its 1px edge was the faint `--border` (`#E5E5E1`) | `specimen-audit-fixes.test.ts` "draws the bare Card action as the board's small outline icon button" (four families). Measured after: flat inset `rgb(29, 78, 216)` ring, minimalist `1px solid rgb(140, 140, 134)`, neo brutalism `2px` ink and `2px 2px 0` shadow, Ombelle `1px` line and `2px 2px 0` shadow, all on the card fill |
| Card action hover | The board draws no hover | No hover style (review finding) | A `currentColor` 8 % tint laid over the button as a background image, so the fill underneath stays; pinned in all five families |
| Editable Slider field weight | 500 (`.in`) | 600 | Pinned at 500 in all five families |
| Indeterminate ring speed | About 1s | A fixed 1s, so a preset with reduced motion (`--motion-duration: 0ms`) still spun it (review finding) | `calc(var(--motion-duration, 150ms) * 20 / 3)`: 1s at the default 150ms (measured by the browser test); at 0ms the duration is 0, so the ring does not spin (derived from the CSS, not measured), as the bar's sweep follows the preset. `progress-variants.test.ts` and `specimen-audit-fixes.test.ts`; the browser test still reads `1s` |

Differences that remain:

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Card `size="sm"` | A `size="sm"` card: 12px padding, a 2px gap and a 22px number (weight 800, 400 in minimalist) | `density="dense"`, the 0.7.2 density: 16px padding and a 16px gap; the stat number is the family's Card title | The spec adds `CardAction` and no `size` prop; dense is the existing tight card. A board-sized stat card would be a new prop |
| Liquid glass Card action | The glass outline button: a card fill with the glass edge light | A transparent button with the family border | A glass fill on the button would be a surface the contrast lint cannot pair; liquid glass is experimental |
| Card title | 16px at 800 (900 upper case in neo brutalism, 600 in minimalist) | Each family's Card title | Every existing default stays |
| Meter ring colour | `--ok` (success green) | `--primary` (neo brutalism `--foreground`) | The Meter bar and its lit cells are `--primary`; the ring draws the same value in the same colour |
| Ring number weight in neo brutalism | 800 | 900, the family's display weight | The Global Constraints set the family display weight |
| Editable field box | The board's generic field (flat: a muted fill with a 2px underline; Ombelle: 12px radius, inset shadow; 14px side padding) | Each family's Number Input box (flat: a 1px border with a 10px radius), with 4px side padding | The field is the family's Number Input, so a form that mixes them matches; the narrower padding keeps longer values inside 76px |
| Slider label | 14px at 700, the board's field label | A plain `span` in the recipe specimen; the consumer's own label in use | Templates and specimens import no other catalog component (the Label) |
| Tooltip surface | The ink surface with the page colour as text, in every family | Each family's Tooltip (Ombelle primary fill, minimalist white popover with a border, neo brutalism yellow with the ink border, liquid glass the glass popover) | Every existing default stays; the key caps take `currentColor`, so their border is 45 % of each family's tooltip text |
| Key cap weight | 500 | 500, as the board; the family `Kbd` part uses its own weight | The key caps are drawn in the Tooltip stylesheet (no template imports another), and the board sets 500 |
| Code Block comments on diff lines | The comment colour | The punctuation colour (`--code-block-punct`) on added and removed lines | The comment colour measured 3.51 and 3.72:1 on the bands, under 4.5:1; the punctuation colour passes on both (`code-block-contrast.test.ts`) |
| Code Block line height | 13px at 1.7 (22.1px lines) | The 0.7.5 Code Block line pitch (20.8px) | The diff lines keep the block's existing pitch, as the browser test checks |
| Board snap guides | Dashed lines at 0.9, 0.5 and 0.25 with labels | None | They are the board's annotation, not part of the sheet |
| Fonts | Hanken Grotesk, Archivo, JetBrains Mono | The preset's `--font-family` and `--font-mono` | The catalog ships no web fonts |

## Final review fixes

The whole-branch review (`59ce79f3..812a8962`) asked for the fixes below. Commits `95fc4620` to `3b793977`; the generated catalog and stable hashes are in `ae348c32`.

| Fix | Change | Test |
| --- | --- | --- |
| Code Block diff context lines (`95fc4620`) | The unified-diff rule: in `diff` mode a leading space marks an unchanged line and is dropped from the shown text and from the copied new version, like `+` and `-`; a line with none of the three stays as written; CRLF is kept. `diffLines`, `diffNewVersion` and `diffCounts` share one `withoutMarker` helper, identical in both editions. The four copies of the board diff (`apps/preview/src/scenes/projects.tsx`, `fixtures/shared/preset-gallery.tsx`, `scripts/generate-audit.ts`, `packages/compiler/test/variants-076.test.ts`) are now the same text: ` :root {\n-  --radius: 0.5rem;\n+  --radius: 0.75rem;\n+  --shadow-offset: 3px;\n }\n`. `docs/components/code-block.md` states the rule (to keep a line that starts with `-` unchanged, prefix it with a space), and the CHANGELOG says Code Block `diff` reads a unified diff | `code-block.test.ts` "strips the space marker of a context line, as in a unified diff" (` :root {` gives `:root {`; the space-prefixed board diff copies `:root {\n  --radius: 0.75rem;\n  --shadow-offset: 3px;\n}\n`; an unprefixed context line stays; CRLF stays) and the updated column-0 case (` --radius: 4px` is unchanged `--radius: 4px`): failed first, then passed |
| Code Block minors (`95fc4620`) | `CodeBlockCode` reads the diff under one condition, `diff === true && children === undefined`, for `data-diff` and for the lines (before, `children={null}` rendered markers without `data-diff`). The hidden `Added: ` and `Removed: ` spans add `user-select: none` | "reads the diff only when children is undefined, for the pre and for the lines alike" and "keeps the hidden Added and Removed prefixes out of a text selection", both editions: failed first, then passed |
| Slider comma decimals (`b9693fe3`) | The editable value reads `,` as `.` before parsing, in the code both editions share; one line in `docs/components/slider.md` | `variants-076.spec.ts` "an editable value commits on Enter and blur…": `0,35` and Enter gives 0.35. Failed first in both editions (the thumb stayed at 1), then passed |
| Sheet minors (`cbb6f79c`) | `nearestSnapPoint([])` returns `undefined` (typed `number \| undefined`; the callers pass a non-empty list and assert it); `sheetSnapPoints` drops non-finite points, and a list with none left has no snap points. The size hook block stays byte-identical between editions | `sheet-variants.test.ts` "finds no nearest point among none, without throwing" and "drops snap points that are not finite numbers" (`[NaN, Infinity, 0.5]` opens at 50vh; `[NaN]` renders as a sheet without snap points), both editions: failed first (`Reduce of empty array with no initial value`; no 50vh), then passed |
| Tooltip contract test (`3b793977`) | The full unit suite found `catalog.test.ts` still listing the Tooltip slots before TooltipShortcut (`4d7c8319` added `tooltip-shortcut` and `tooltip-shortcut-key`). The test lists them | `vitest run packages/catalog/test/catalog.test.ts`: 28 passed |

| Check | Command | Result |
| --- | --- | --- |
| RED | `vitest run packages/catalog/test/code-block.test.ts packages/catalog/test/sheet-variants.test.ts` | 10 failed, 69 passed |
| Build | `corepack pnpm build:packages`, `corepack pnpm generate:preview`, `corepack pnpm typecheck` | Passed. No CSS changed, so the style generator was not run |
| Stable hashes | `tsx scripts/record-stable-hashes.ts` | 12 entries moved: `code-block.tsx`, `sheet.tsx` and `slider.tsx` in the four stable families; nothing else |
| Focused unit tests | `vitest run` on `code-block`, `code-block-contrast`, `sheet-variants`, `sheet`, `slider-variants`, `slider` (catalog) and `variants-076`, `stable-families` (compiler) | 8 files, 229 passed |
| Browser tests | `playwright test tests/e2e/variants-076.spec.ts -g "Sheet snap points\|SliderValue\|Code Block"`, on a temporary copy of the specimen-audit config on port 4198 (deleted after) | 16 passed (52 s): Sheet 4, SliderValue 6, Code Block diff 6, both editions |
| Full unit suite | `corepack pnpm test:unit` at `ae348c32` | 3 failed, 3691 passed (234 files). `catalog.test.ts` (Tooltip slots) came from this branch and is fixed in `3b793977`. `packages/cli/test/snapshot-cache.test.ts` "bounds valid entries to 100 and 16 MiB during writes" and `packages/compiler/test/generated-types.test.ts` timed out at 60 s under the parallel run; run alone at the same head both files passed (30 passed) |
| Full integration suite | `corepack pnpm test:integration` at `ae348c32` | 38 failed, 589 passed, 13 skipped (73 files, 33.6 min). None traced to this branch: 26 need Bun ("Cannot resolve a supported native bun executable"; Bun is not installed on this machine), including `manager-runtime.test.ts`, `bun-consumers`, `bun-manager`, `bun-cross-runner`, the Bun cases of `packed-cli`, `component-preset-cli` and `recipe-cli`; `packed-cli` "packs only standalone installer files…" failed in `tar` ("Cannot connect to D: resolve failed": the Windows path read as a remote host); the rest were `EBUSY` on temporary directory removal, 60 s timeouts, or "snapshot cache was not saved … ENOENT" in the shared user cache under parallel load (`component-preset-cli`, `component-preset-preservation`, `component-recipe-cli` card, progress and separator, `form-controls-cli` label, `snapshot-journey`, `upstream`). Re-run alone at `3b793977`: the `component-recipe-cli` card, progress and separator cases and the `form-controls-cli` label case, 4 passed. The others were not re-run on `59ce79f3`, so whether they also fail there was not confirmed |

## Merge with track 1

Done: on 13 November 2026 `feat/variants-076` was rebased onto `origin/feat/components-076` at `a9c00e4e` (track 1, with Carousel), and the two `variantRecipeFields076` maps were merged into one map with one `usesVariants076` (`7da68d89` gates both tracks' fields). The plan below was the instruction for that merge.

`variantRecipeFields076` and `usesVariants076` in `apps/www/src/snapshots/install-command.ts` exist on both this branch and track 1. The merge must fold this branch's seven entries into one map and keep one function:

```ts
sheet: ['snapPoints'], card: ['action'], slider: ['valueDisplay'], progress: ['shape'], meter: ['shape'], 'code-block': ['diff'], tooltip: ['shortcut']
```

## Defects found while testing

| Defect | Found by | Fix and test |
| --- | --- | --- |
| Base UI: a press on the track while the editable field had focus snapped the thumb back to the field's stale draft | The Task 4 review | The draft exists only once the text is edited, and a blur with no edit commits nothing. Browser test "a press on the track while the field has focus keeps the pressed value" failed in Base UI, then passed in both editions (`d57df1c8`) |
| The announced-once check stripped `aria-hidden` parts in page script, so it could not fail | The Task 7 review | The check uses the browser's accessible description (Radix) or an aria snapshot of the open tooltip (Base UI), on hover and on focus (`64feeffc`) |
| A diff selector named two slots in one descendant selector, which the liquid glass compiler test forbids | `packages/compiler/test/liquid-glass.test.ts` | The selectors use `[data-diff] [data-slot='code-block-line']` (Task 6) |
| Ring numbers and the Card action glyph spilled out of their boxes | The specimen audit | `line-height: normal` (above) |
| The bare Card action had no edge in flat | The board comparison | The board's outline button (above) |

## Deferred

Minor findings carried from the task reviews, not fixed in this plan: snap points changed after mount are not re-seeded; the Base UI Sheet SSR test imports a file `@base-ui/react` does not export; the Base Slider sets its input id through the thumb's `render` clone, which overrides a Base UI Field's control id; the indeterminate ring renders an empty number span; the compiler and the Tooltip template each hold a copy of the key-name mapping, with no test that compares them; `generated-types.test.ts` can time out at 60 s under a parallel run (it passes alone).

## Section 07: image Carousel

Board section 07 of `<Family>076Variants.dc.html`: `<Carousel variant="image" ratio="16 / 9">` with `CarouselImage` and `CarouselThumbnails`. Task 10 built the template, styles, recipe fields and the edition fixture `ic-carousel` (`315fa8e5`, `3960c090`); Task 11 adds the recipe specimens, the audit sections, the gallery and scene, the board fixes and the docs. Same machine, Node, pnpm, Playwright and Chromium as above; local runs, not CI.

| Check | Command | Result |
| --- | --- | --- |
| Default specimen | `carousel` added to `variants-076-defaults.ts` and its default specimen recorded into `variants-076-default-specimens.json` (40 entries) at `3960c090`, before `recipe-specimen.ts` changed | The test passes after the change: the default carousel specimen is unchanged in all five families |
| RED | `vitest run packages/compiler/test/variants-076.test.ts` | "draws an image carousel with one data-URI image per slide, named by the slide text" failed (`expected { 'aria-label': 'UI kits', …(1) } to match object { variant: 'image', ratio: '16 / 9' }`) |
| Specimens | same | 80 passed. `variant: 'image'` passes `variant` and `ratio: '16 / 9'` and draws each slide as `CarouselImage` with a 16:9 SVG data URI (one hue per slide index, under 400 characters) and the slide text as `alt`; `thumbnails: true` adds `CarouselThumbnails`; `default` or absent gives the old specimen. Both image recipes compile deterministically in all five families with `findShadowedNames` `[]`, and all 14 variant recipes typecheck as compiled |
| Board fixes RED | `vitest run packages/catalog/test/specimen-audit-fixes.test.ts -t "image Carousel"` | 2 failed (flat edge `var(--border-width)`; minimalist `--border` and the large radius), then the flat focus case failed (offset `2px`) |
| Focused tests | `vitest run` on `variants-076`, `stable-families`, `generated-types` (compiler), `carousel`, `carousel-variants`, `specimen-audit-fixes`, `catalog` (catalog), `component-recipe` (contracts) | 8 files, 636 passed. A full `vitest run packages/compiler` during the audit had one timeout in `generated-types.test.ts` (60 s, under load); it passed in the focused run |
| Stable hashes | `tsx scripts/record-stable-hashes.ts` | 2 entries moved: `flat/compile/components/ui/carousel.css` and `minimalist/compile/components/ui/carousel.css` (the board fixes). No template changed |
| Gallery | `vitest run --config vitest.integration.config.ts tests/integration/preset-gallery-generation.test.ts` | 13 passed |
| Browser tests | `playwright test -c playwright.specimen-audit.config.ts tests/e2e/variants-076.spec.ts -g "image Carousel"`, then `-g "flat: a focused thumbnail"` after flat was added to the 375px outline case | 14 passed (46 s), then 2 passed: Task 10's cases pass with the fixed CSS, and flat's moved focus ring stays inside the scrolling row at 375px |
| Types | `corepack pnpm typecheck` | Passed |

### Section 07 audit

`OMBELLE_AUDIT_COMPONENTS=carousel corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/specimen-audit.spec.ts`, after `build:packages` and `generate:preview`. New sections: `carousel~image` and `carousel~image-thumbnails`, beside the default `carousel`.

| Run | Result |
| --- | --- |
| First run (8.4 min) | 17 passed, 4 failed. Flat Radix light and dark: "focus-visible: 0 focus pixels at 3:1 (0 changed), 236 needed" on the current thumbnail ("Ombelle") of `carousel~image-thumbnails`. Flat Base light and dark failed at `page.goto` with `net::ERR_NETWORK_ACCESS_DENIED` (no finding; re-run below) |
| After the fixes, `-g "flat/\|minimalist/"` (2.5 min) | 8 passed: flat and minimalist, both editions and modes, the two families whose CSS changed. The other 12 configurations and the glass backdrop check passed in the first run, on CSS that has not changed since |

Fixed: in flat the focus ring (2px `--ring` at 2px) and the current outline (2px `--primary` at 2px) are the same colour in the same place, so focusing the current thumbnail drew nothing new. Flat's thumbnail focus ring now sits at 4px, outside the current outline; the phone row's 8px padding still holds it (the 375px browser case now includes flat). Pinned in `specimen-audit-fixes.test.ts`, "the 0.7.6 image Carousel matches board section 07".

Liquid glass (experimental, non-blocking): the dark-mode findings files of both editions are empty. In light mode each edition records 23 carousel findings, all focus-visible: the viewport, Next and the dots in all three sections (the default `carousel` as well as the image sections, so they come from the plain carousel's glass rules), and the "Neo brutalism" and "Liquid glass" thumbnails of `carousel~image-thumbnails`.

### Section 07 board comparison

`t11-board.mjs` in the session workspace screenshots board section 07 of each family (`file://`, 1440px) and reads computed styles from the board's `.ivp`, `.ph` and `.thumbs button` and from the audit's `carousel~image-thumbnails` (`/audit/<family>/<edition>/?mode=light`, 1100px, both editions). Screenshots: `docs/evidence/images/variants-076/board-<family>-07.png`.

These match the board in flat, minimalist, neo brutalism and Ombelle, both editions (after the fixes below): each slide is 88 % of the viewport, so the next one peeks, with a 12px gap; the frame is 16:9 (1.778) with the family edge and large radius; thumbnails are 84 × 47.3 at the same ratio, 10px apart, at opacity 0.6 with the family edge and radius; the current one is at opacity 1 with a 2px `--primary` outline at 2px (neo brutalism 3px ink). The thumbnails are named by the slide text (`Ombelle`, `Flat`, …); images 3 to 5 have `loading="lazy"`, images 1 and 2 none. The lazy-image browser case proves the `loading` attribute and that each image eventually loads; it does not prove loading was deferred, because the fixtures are data URIs.

Fixed:

| Part | Board | Before | After and test |
| --- | --- | --- | --- |
| Flat frame and thumbnail edge | 1px solid line | `var(--border-width)` (0 in flat), so no edge | `max(1px, var(--border-width)) solid var(--border)`, as track 1's flat frames. Measured 1px `rgb(226, 230, 238)` |
| Flat thumbnail radius | 10px (`--r`) | 8px (`--radius`) | 10px, as flat's boxed fields. Measured 10px |
| Minimalist frame and thumbnail edge | 1px in the strong line (`#8C8C86`) | `--border` (`#E5E5E1`) | `1px solid var(--input)`. Measured `rgb(140, 140, 134)` |
| Minimalist frame radius | 4px (its `--r-lg`) | 8px (`calc(var(--radius) + 4px)`) | `var(--radius)`. Measured 4px |
| Flat thumbnail focus | Not drawn | Hidden under the current outline (audit) | Ring at 4px (above) |

All five are pinned in `specimen-audit-fixes.test.ts`, "the 0.7.6 image Carousel matches board section 07".

Differences that remain:

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Liquid glass radii | 24px frame, 18px thumbnails | 16px and 12px (`--radius` + 4px and `--radius`) | The family radius tokens; liquid glass is experimental |
| Liquid glass colours | Drawn on the dark glass page: white 28 % edges, a light blue current outline | Measured in light mode: the glass line and `--primary` | The board shows one mode; the specimen follows the preset in each mode |
| Caption row | `.icap`: a title, a hint and the counter under the image | `CarouselCounter` only, in the dots row | The board caption is page content, not a part |
| Dots with thumbnails | No dots | The recipe keeps `dots` (on by default), so the thumbnails specimen shows both | The brief adds `CarouselThumbnails` to the specimen; `dots: false` gives the board's look |
| "Hidden below 640px" marker | An annotation | None | Board annotation. Below 640px every Carousel hides its arrows (track 1's rule); the image block repeats it for carousels with thumbnails |
| Aspect Ratio | The note says the frame uses Aspect Ratio | the stylesheet sets `aspect-ratio` from the `--carousel-ratio` custom property that `carousel.tsx` sets (no Aspect Ratio import) | Templates import no other catalog component |

### Section 07 not run

- The preview's Projects scene and the preset gallery in a browser: they render only inside the preset preview frame, driven by the website editor's messages. Both are typechecked (`apps/preview/src/generated/preset-gallery/gallery.tsx` is generated from `fixtures/shared/preset-gallery.tsx`) and the gallery generation test passes; the same parts run in the edition fixture `ic-carousel` and the audit sections.
- The full unit and integration suites, the foundation gate and a human screen-reader review (the Carousel rows in `docs/accessibility-review.md` are open).
