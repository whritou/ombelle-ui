# Liquid glass display components

5 November 2026. This records PR C of [liquid glass kit parity](../superpowers/specs/2026-11-05-liquid-glass-kit-parity-design.md): Avatar, Separator, Table, Accordion, Progress and Skeleton join as experimental in liquid glass, so all twenty-three components are experimental and none is unavailable. Liquid glass stays experimental. This record does not run the full foundation gate, the browser e2e suite or the consumer matrix, and it is not a human visual or accessibility review.

## Source and environment

Branch `feat/glass-display`. Windows 11, Node v24.19.0, pnpm 11.25.0 (through corepack). The browser checks used Playwright 1.64.1 driving Microsoft Edge 156.0.4314.58 (Chromium) against the www dev server on port 3100, after `node scripts/build-hosted-preview.mjs`. The visual source is the "Proposed for glass" tiles of the kit board `LiquidGlassKit.dc.html` (Avatar, Table, Separator, Accordion, Progress, Skeleton), rendered locally from `file://` in the same browser, in light and with the board's `.dark` class.

## What ran

| Check | Result |
| --- | --- |
| `corepack pnpm build:packages` | passed |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm test:unit` (`VITEST_MAX_WORKERS=4`) | 119 files, 1118 tests passed, including `packages/cli/test/transaction.test.ts` and the untouched `packages/compiler/test/stable-families.test.ts` |
| `tests/integration/preset-gallery-generation`, `preview-routing`, `hosted-preview-build`, `liquid-glass-cli`, `www-route` | 5 files, 35 tests passed |
| `node scripts/build-hosted-preview.mjs` | passed |
| Playwright screenshots, light and dark, on the kit backdrop | 15 captures, reviewed against the kit tiles; one difference fixed (below) |

No test is skipped: the refusal cases that needed an unavailable glass component were rewritten (see below). Earlier task runs on this branch saw `packages/cli/test/transaction.test.ts` fail with "Cannot locate a pnpm JavaScript entry", an environmental locator error unrelated to these changes; in this run it passed.

Not run: `pnpm check:foundation`, the rest of `test:integration` (CI runs it), and the browser e2e suite (`test:e2e`), which does not run in CI or on this machine. `tests/e2e/liquid-glass.spec.ts` and the glass sign-in case in `tests/e2e/preset-editor.spec.ts` were updated to expect no unavailable placeholders but were not executed; the harness confirmed in the browser that the glass sign-in scene renders its Separator and no placeholder. No consumer-matrix row installs the display components in glass.

## Contrast bound, built-in preset

`glassContrastReport` for `packages/catalog/src/presets/liquid-glass.json` passes, and the built-in preset does not change in this PR. The minimum opacity is 0.57, the lowest passing opacity is 0.57 in light and 0.57 in dark, and `--glass-nested-opacity` is 0.69 in light and 0.92 in dark.

Two pairs are new; the others are reused because the CSS paints exactly their surface, tint and coverage. Ratios are over the darkest filtered backdrop, the brightest, and the opaque fallback, at the top-level opacity:

| Pair | Used by | Light | Dark |
| --- | --- | --- | --- |
| `foreground` on `card` + `primary` 12% (new) | Selected Table row, open Accordion trigger | 8.18 / 16.51 / 14.81 | 11.45 / 6.12 / 8.49 |
| `foreground` on `popover` (new) | Plain Select option, parked from PR B | 9.36 / 17.85 / 17.85 | 13.27 / 7.12 / 11.06 |
| `foreground` on `card` | Neutral Avatar initials, Table body, Accordion triggers | 9.36 / 17.85 / 17.85 | 13.27 / 7.12 / 11.06 |
| `foreground` on `card` + `primary` 18% / 22% | Primary Avatar initials (the resting Button pair) | 7.63 / 15.86 / 13.43 | 10.05 / 5.41 / 6.78 |
| `mutedForeground` on `card` | Table caption, Accordion content, Separator label inside a Card | 7.67 / 14.63 / 14.63 | 11.79 / 6.33 / 9.83 |
| `mutedForeground` on `muted` | Table header | 7.18 / 14.07 / 13.35 | 10.82 / 5.78 / 8.40 |
| `foreground` on `muted` | Table footer | 8.76 / 17.18 / 16.30 | 12.17 / 6.50 / 9.46 |

The Table header, a selected row and an open Accordion trigger sit inside their container's glass. Their CSS paints them at the full nested opacity, and the compiler bounds them there over any pixel from black to white, as for every nested surface. Progress and Skeleton carry no text and declare no pair.

## What changed

- **Stylesheets** `packages/catalog/src/styles/{avatar,separator,table,accordion,progress,skeleton}/liquid-glass.css`. One `[data-slot=` per selector, logical properties, glass inside the `@supports` query, with reduced-transparency and forced-colours fallbacks.
- **Support table** `packages/contracts/src/style-families.ts`: all twenty-three components experimental in glass. `componentsWithStyleSupport('liquid-glass', ['unavailable'])` is empty; the status and the refusal stay for future families.
- **Contrast pairs** in `packages/compiler/src/glass-contrast.ts`: the 12% selection tint and `foreground` on `popover`.
- **Website gating**: `glassMinimumCli: '0.5.0'` on the six components, so the site claims them only once the published installer is 0.5.0. The editor glass panel lists the glass components without "the other components are unavailable".
- **Glass scenario and e2e**: the scenario renders no "Not yet available" section when nothing is unavailable, and the e2e expectations derive the placeholder counts from the support table (the preset-editor sign-in case now expects none). The gallery's placeholders were already per component, so it renders none.
- **Fixes in this task**: a glass Avatar group layers its white rim over each avatar's own highlight and drop shadow instead of replacing them; the open Accordion trigger's forced-colours bar takes its width out of the start padding, so the title stays at 16px (measured in the browser with forced colours emulated: 12px padding plus the 4px bar); numeric Table headers use the kit's 13px monospace figures.

## Tint inheritance

A selected row and an open trigger set `--glass-tint` and `--glass-tint-amount`, which inherit. Every glass rule that reads the tint is on an element that sets it itself, in the same selector or in its bare `data-slot` rule (Button, Avatar and Switch set it at rest; Checkbox, Radio Group, Select items, Table cells and Accordion triggers read it only in the states that set it). So nothing nested picks up the 12% tint. `packages/compiler/test/liquid-glass.test.ts` ("never reads an inherited glass tint") checks this across every compiled glass sheet. In the browser, the small Avatar inside the selected gallery row computes an untinted `card` background (`rgb(255 255 255 / 0.69)` light).

## Tests added or rewritten on this branch

- `packages/compiler/test/{avatar,separator,table,accordion,progress,skeleton}.test.ts`: each compiles in glass with its surface, states and fallbacks. This task adds the group rim layering (Avatar), the forced-colours padding (Accordion) and the numeric header figures (Table).
- `packages/compiler/test/liquid-glass.test.ts`: no component left to refuse, and the inherited-tint guard.
- `packages/contracts/test/style-support.test.ts`: every component is accepted in glass; `assertStyleAvailable` keeps its refusal coverage through a synthetic family that marks Progress and Skeleton unavailable (first unavailable id in input order, `STYLE_UNAVAILABLE`, path and next action).
- `tests/integration/liquid-glass-cli.test.ts`: installs all twenty-three glass components (pnpm and npm). The skipped mixed-add and theme-add refusal cases are removed; `add button unknown-component` in a glass project fails with exit code 2 and `STYLE_UNAVAILABLE` before any write, leaving the tree unchanged.
- `apps/www/src/preset-editor/components/glass-panel.test.tsx` and `compile-protocol.test.ts`: the panel names no unavailable component, and a glass draft compiles every component.
- `packages/compiler/test/stable-families.test.ts` passes unchanged, so the stable families' bytes did not move.

## Visual review against the kit

| Surface | Kit tile | Finding | Action |
| --- | --- | --- | --- |
| Avatar sizes, variants, status | Avatar | Disc, rim, initials, sizes (56 / 40 / 32px) and the green dot match; the primary tint follows the preset's blue `primary`, not the kit's violet | None |
| Avatar group | Avatar | Overlap and white rim match; each disc keeps its highlight and drop shadow under the rim | Fixed in this task (C1 follow-up) |
| Separator in a Card | Separator | Hairline, highlight, "or" label and vertical rules match | None |
| Separator on the bare backdrop | (none) | The label has no surface, as in the kit; it reads on the gallery backdrop, but its contrast there is not bounded | None (ruling C-4) |
| Table | Table | Container, header, hairlines, selected row and numeric alignment match. Numeric headers were sans 12px; the kit sets them in 13px monospace | Fixed: `fix(catalog): set numeric glass table headers in monospace figures, as the kit does` |
| Accordion | Accordion | Container, hairlines, 15px / 600 triggers at 44px, open tint and turned chevron match | None |
| Progress | Progress | Track, glossy fill, glow and green complete fill match | None |
| Skeleton | Skeleton | Frosted film, sheen and rim; text, circle and block shapes match | None |

Differences judged acceptable, each from a recorded ruling or an earlier PR:

- **The Table header is denser than the kit** (ruling C-6): it paints `muted` glass at the nested opacity (0.69 light, 0.92 dark) where the kit overlays `muted` at 55%, so the declared pair describes it. The selected row and open trigger likewise mix the 12% tint into the card and then apply the nested coverage (ruling C-3), which reads paler than the kit's overlay in light mode.
- **The Separator label has no surface** (ruling C-4), as in the kit: inside a Card the `mutedForeground` on `card` pair bounds it; on a bare backdrop it is not bounded.
- **Separator highlights are logical borders** (ruling C-5), 1px larger in layout than the kit's `box-shadow`, so vertical separators are right-to-left correct.
- **Indeterminate Progress sweeps** while motion is allowed and rests as the kit's faded full fill only under reduced motion, as the spec and the stable families do; the kit tile is a still.
- **Glass is a little denser and `primary` is blue**, from the built-in preset (opacity 0.57, tuned in PR B) rather than the kit's demo values.
- **The gallery shows Progress, Skeleton and the bare Separator on the backdrop**, not inside a glass card as in the kit tiles, so they show their top-level coverage.
- **The selection tint is a literal 12%** in two stylesheets, not a token, so `ui-tokens.css` does not change; the compiler tests pin both the CSS value and `glassTints.selection`.

## Screenshots

Images are in [images/glass-display](images/glass-display/), each in `-light` and `-dark`:

- `avatar`: large primary with status, default, small secondary, and the group of four;
- `separator-card`: the labelled, horizontal and vertical separators inside a glass Card;
- `separator-backdrop`: the same separators on the bare backdrop;
- `table`: header, rows with avatars and badges, the selected row, numeric columns and the caption;
- `accordion`: the open first item and two closed items;
- `progress`: 64%, complete and indeterminate;
- `skeleton`: circle, text and block shapes;

and `accordion-forced.png`: the accordion with forced colours emulated, the open trigger's bar beside an unshifted title.

The Card that holds the separators is added by the harness from the gallery's own markup. The harness and the kit captures are agent-run scripts outside the repository.

## Limits

Agent-operated screenshot review is not a human accessibility or screen-reader audit. Reduced transparency and missing backdrop filters were checked by compiler tests, not in the browser; forced colours only for the Accordion title position. Other browsers, mid-range mobile scrolling and consuming applications need their own checks. The published installer (0.4.1) refuses these components in glass; installing them needs `@ombelle-ui/cli` 0.5.0.
