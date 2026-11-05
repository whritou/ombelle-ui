# Liquid glass form controls

5 November 2026. This records PR B of [liquid glass kit parity](../superpowers/specs/2026-11-05-liquid-glass-kit-parity-design.md): Label, Textarea, Native Select, Checkbox, Switch, Radio Group and Select join Input as experimental in liquid glass, on the kit's field and selection surfaces, and the built-in preset is tuned so their text pairs pass the contrast bound. Liquid glass stays experimental. This record does not run the full foundation gate, the browser e2e suite or the consumer matrix, and it is not a human visual or accessibility review.

## Source and environment

Branch `feat/glass-form-controls`. Windows 11, Node v24.19.0, pnpm 11.25.0 (through corepack). The browser checks used Playwright 1.64.1 driving Microsoft Edge 156.0.4314.58 (Chromium) against the www dev server on port 3100, after `node scripts/build-hosted-preview.mjs`. The visual source is the "Proposed for glass" tiles of the kit board `LiquidGlassKit.dc.html` (Input · Label · Textarea, Native Select · Select, Checkbox · Switch, Radio Group), rendered locally from `file://` in the same browser, in light and with the board's `.dark` class.

## What ran

| Check | Result |
| --- | --- |
| `corepack pnpm build:packages` | passed |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm test:unit` (`VITEST_MAX_WORKERS=4`) | 119 files, 1117 tests passed, including `packages/cli/test/transaction.test.ts` and the untouched `packages/compiler/test/stable-families.test.ts` |
| `tests/integration/preset-gallery-generation`, `preview-routing`, `hosted-preview-build`, `liquid-glass-cli`, `www-route` | 5 files, 37 tests passed |
| `node scripts/build-hosted-preview.mjs` | passed |
| Playwright screenshots, light and dark, on the kit backdrop | 26 captures, reviewed against the kit tiles; two differences fixed (below) |

The checks above ran after the last code change on the branch. Earlier task runs on this branch saw `packages/cli/test/transaction.test.ts` fail with "Cannot locate a pnpm JavaScript entry", an environmental locator error unrelated to these changes; in this run it passed.

Not run: `pnpm check:foundation`, the rest of `test:integration` (CI runs it), and the browser e2e suite (`test:e2e`), which does not run in CI or on this machine. No consumer-matrix row installs the glass form controls.

## Contrast bound, built-in preset

`glassContrastReport` for `packages/catalog/src/presets/liquid-glass.json` passes. The minimum opacity is 0.57, the lowest passing opacity is 0.57 in light and 0.57 in dark, and `--glass-nested-opacity` is 0.69 in light and 0.92 in dark.

The preset was tuned in this PR because the kit's field and error-message styles failed with the PR A palette: the placeholder at 55% coverage reached 2.98:1 over the darkest light backdrop and needed opacity 0.93, and `destructive` on `card` needed 0.75 in light. The built-in values moved: `glassOpacity` 0.5 → 0.57, light `mutedForeground` `#334155` → `#1E293B`, `destructive` light `#B91C1C` → `#7F1D1D` and dark `#FCA5A5` → `#FECACA`. A further darkening of `mutedForeground` that the Radio Group rows would have needed was rejected, because it made muted text indistinguishable from `foreground`; unchecked option rows use the field surface (55%) instead of the kit's 40%, and checked rows 78% instead of 70%.

The smallest ratio of each new pair, over the darkest filtered backdrop, the brightest, and the opaque fallback:

| Pair | Light | Dark |
| --- | --- | --- |
| `foreground` on `background` at 55% (field value, unchecked row label) | 5.53 | 6.08 |
| `mutedForeground` on `background` at 55% (placeholder, unchecked row description) | 4.53 | 5.40 |
| `foreground` on `background` at 60% (outline Button) | 5.83 | 6.32 |
| `foreground` on `background` + `foreground` 6% at 60% (outline hover) | 5.50 | 5.91 |
| `destructive` on `card` (error messages) | 5.25 | 5.39 |
| `foreground` on `card` + `primary` 26% / 30% at 80% (check mark, radio dot) | 5.94 | 4.72 |
| `foreground` on `card` + `primary` 18% / 22% at 78% (checked row label) | 6.32 | 5.07 |
| `mutedForeground` on `card` + `primary` 18% / 22% at 78% (checked row description) | 5.18 | 4.50 |
| `foreground` on `popover` + `primary` 18% / 22% (highlighted Select option) | 7.63 | 5.41 |
| `mutedForeground` on `popover` + `primary` 18% / 22% (its item hint) | 6.26 | 4.81 |

The dark checked-row description passes at exactly 4.50:1 (4.5014), so it is the first pair a custom preset fails. With `transparency: "reduced"` every pair passes on its opaque surface.

## What changed

- **Stylesheets** `packages/catalog/src/styles/{label,textarea,native-select,checkbox,switch,radio-group,select}/liquid-glass.css`, and the Input field surface in `packages/catalog/src/styles/liquid-glass.css`. One `[data-slot=` per selector, logical properties, glass inside the `@supports` query, with reduced-transparency and forced-colours fallbacks.
- **Coverage model** in `packages/compiler/src/glass-contrast.ts`: pairs carry an optional coverage, the fraction of the glass opacity a surface paints at top level; nested glass is bounded at the full nested opacity.
- **Support table** `packages/contracts/src/style-families.ts`: seventeen components experimental in glass, six unavailable.
- **Website gating**: `glassMinimumCli: '0.5.0'` on the seven components, so the site claims them only once the published installer is 0.5.0. The editor glass panel drops "form controls other than Input are unavailable".
- **Button recipes**: a glass outline or ghost `background` override replaces the colour of the glass instead of painting an opaque token over it (`packages/compiler/src/recipe-styles.ts`).

## Tests added or extended on this branch

- `packages/compiler/test/{label,textarea,native-select,checkbox,switch,radio-group,select}.test.ts`: each compiles in glass with its surface, states and fallbacks. Radio Group checks that a radio inside an option row drops its own filter; Select checks the item hint is the kit's caption.
- `packages/compiler/test/glass-contrast.test.ts` and `liquid-glass.test.ts`: the coverage model, the declared pairs (including the Select hint on a highlighted option), the pinned preset values and minimum opacities.
- `packages/compiler/test/recipe-styles.test.ts`: glass outline and ghost background overrides keep the glass, with opaque fallbacks.
- `tests/integration/liquid-glass-cli.test.ts`: installs all seventeen glass components, including the seven form controls, and refuses Avatar.
- `tests/integration/www-route.test.ts`: the seven form controls are not claimed in glass on the site while the published installer is 0.4.1.
- `packages/compiler/test/stable-families.test.ts` passes unchanged, so the stable families' bytes did not move.

## Visual review against the kit

| Surface | Kit tile | Finding | Action |
| --- | --- | --- | --- |
| Input, Textarea, Native Select, Select trigger | Input · Label · Textarea; Native Select · Select | Field surface, `input` border, focus ring with ring border, 2px destructive invalid border, dashed 50% disabled and chevron match. Input, Native Select and the Select trigger compute 40px tall with `padding-block: 0`, Textarea 88px with 10px block padding, as the kit draws them | None |
| Radio Group | Radio Group | The unchecked radio inside an option row drew as a grey disc in light mode: both the row and the radio applied the backdrop filter, so the radio refiltered the row's translucent surface | Fixed: `fix(catalog): keep glass radios inside option rows from refiltering the row` |
| Select item hint | Native Select · Select (`.cap`) | The hint was 12px sentence case; the kit draws an 11px, weight 600, uppercase, letter-spaced caption | Fixed: `fix(catalog): draw the glass Select item hint as the kit's caption` |
| Checkbox, Switch | Checkbox · Switch | Box, mark, tint, rim, thumb and states match | None |
| Label | Input · Label · Textarea | 14px / 500 `foreground` matches | None |
| Field nested in a Popover | (Dialog content in the kit) | The nested Input drops its own blur and paints at the nested opacity | None |
| Button variants | Buttons board | Unchanged apart from the 0.57 opacity | None |

Differences judged acceptable or out of scope, each from a recorded ruling:

- **Placeholder and muted text are close to `foreground` in light mode.** The kit's muted colour is lighter; the built-in preset uses `#1E293B` so the 55% placeholder passes. Disabled Select options and descriptions therefore read darker than in the kit.
- **Radio option rows are denser than the kit**: unchecked rows at 55% instead of 40%, checked rows at 78% instead of 70%, so their text passes without darkening `mutedForeground` further.
- **The Switch on state** uses the resting tint + 8 points (26% / 30%) instead of the kit's 34%, and the radio and switch get the glow the kit draws only on the checkbox; the spec's selection rule is binding over the tile.
- **Disabled Switch is dashed**, as the spec's disabled rule says; the kit only fades it.
- **Textarea keeps `resize: vertical`**; the kit draws no handle.
- **The Select chevron does not turn** when open; the kit chevron is static.
- **Fields nested in glass** paint at the full nested opacity (0.69 light, 0.92 dark), heavier than the kit's lighter glass inside a card.
- **The gallery form sits on the backdrop**, not inside a glass card as in the kit tiles, so the controls show their top-level coverage.
- **The Native Select option list** is drawn by the browser and is not glass.

## Screenshots

Images are in [images/glass-form-controls](images/glass-form-controls/), each in `-light` and `-dark`:

- `input`: the gallery form's labels and Input, focused, invalid with its error message, placeholder and disabled;
- `textarea`: focused, placeholder, disabled and invalid;
- `native-select`: rest, disabled and invalid;
- `checkbox`: the gallery checkbox, then unchecked, checked, indeterminate, unchecked disabled and checked disabled;
- `switch`: the gallery switch, then off, on, off disabled and on disabled;
- `radio-group`: unchecked, checked (keyboard focus on its radio) and disabled option rows;
- `select-closed` and `select-open` (first option selected with the check, the next one highlighted, a disabled option with its hint);
- `popover-field`: an Input nested in the open Popover;
- `button-variants` and `button-hover-default`, `button-hover-outline`, `button-hover-ghost`: the Button recaptured at the tuned opacity.

The extra state rows are added to the page by the harness from the gallery's own markup. The harness and the kit captures are agent-run scripts outside the repository.

## Limits

Agent-operated screenshot review is not a human accessibility or screen-reader audit. Forced colours, reduced transparency and missing backdrop filters were checked by compiler tests, not in the browser. Other browsers, mid-range mobile scrolling and consuming applications need their own checks. The published installer (0.4.1) refuses these components in glass; installing them needs `@ombelle-ui/cli` 0.5.0.
