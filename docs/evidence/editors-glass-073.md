# Editors and liquid glass, batch 7a, evidence (0.7.3)

The 0.7.3 liquid glass editor work: the contrast-aware backdrop pick, the dark-mode lab ink and the reduced-transparency toggle. Spec: `docs/superpowers/specs/2026-11-11-editors-glass-design.md`.

Environment for every run below:
- Windows 11 Home 10.0.26300, Node 24.19.0, pnpm 11.25.0 through `corepack pnpm`.
- Playwright 1.64.1 with its bundled Chromium 156.0.8078.4.

## Installed output

- None of the three features changes what the CLI installs.
- `git diff --stat feat/variants-more-073 -- packages/catalog packages/compiler/test/fixtures` is empty:
  - no catalog style or template changed;
  - the stable family hashes and the style baseline are identical.
- The compiler gains `glassContrastOnScene`. Its `range` parameter defaults to the full 0 to 1 range, so `glassBackdrop` returns what it did before. A snapshot test, added in the same commit, locks `glassContrastReport` for every built-in glass starting preset from now on.

## The scene table

`tests/e2e/glass-scenes.spec.ts` measures the seven preview scenes:
- It renders each scene alone at `/glass-scene/?scene=…&mode=…`, at 1280 × 800.
- It reads a 32 × 20 grid over the central 80 % of the screenshot.
- For each scene it keeps the darkest and brightest pixel, as the gamma-encoded grey of the same relative luminance.
- `pnpm measure:glass-scenes` writes the table into `apps/www/src/site/glass-backdrops.ts`. The default run fails when a value drifts by more than 0.02.

| Scene | Low | High |
| --- | ---: | ---: |
| Kit | 0.2101 | 0.7590 |
| Brume | 0.7113 | 0.9438 |
| Aube | 0.7010 | 0.9360 |
| Trame | 0.6800 | 0.9600 |
| Pêche | 0.5226 | 0.7032 |
| Prisme | 0.1803 | 0.8572 |
| Nuit | 0.0492 | 0.6430 |

The art does not change with the mode, so both modes measure the same values. The Kit gradient covers the family base's background.

**Two measures were tried first and rejected:**
- **The minimum and maximum of each channel:** one high channel in a saturated dark pixel made every dark scene rate near 1:1.
- **Rating the text over its contrast plate:** the plate is opaque, so every scene rated the same and the choice meant nothing.

The final rating takes the text without its plate. That is the reading the lab ink, which removes the plate, would give.

## Ratios and automatic scene for the built-in presets

`glassSceneRatios` gives the worst ratio of the preset's glass text pairs (`glassContrastPairs`) on each scene, without the plate, at two decimals.

**The pick rule (`pickGlassScene`):**
- The starting preset's own scene stays while the preset's ratio there is at least min(4.5, the unedited preset's ratio there).
- Otherwise, and without a starting preset, the best-rated scene is chosen.

**The lab ink (`labInkFor`):** it lights for an unedited lab preset on its own scene in that mode. "Plate" means the contrast plate stays.

| Preset | Mode | Kit | Brume | Aube | Trame | Pêche | Prisme | Nuit | Scene | Lab ink |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Cristal | light | 1.83 | 6.84 | 6.71 | 6.45 | 4.68 | 1.63 | 1.20 | Brume | light |
| Cristal | dark | 1.47 | 1.14 | 1.14 | 1.14 | 1.63 | 1.23 | 1.81 | Prisme | dark |
| Givré | light | 3.16 | 6.95 | 6.88 | 6.75 | 5.82 | 2.92 | 2.18 | Aube | light |
| Givré | dark | 2.25 | 1.67 | 1.67 | 1.67 | 2.50 | 1.88 | 2.73 | Nuit | dark |
| Fumé | light | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | Prisme | light |
| Fumé | dark | 2.00 | 1.67 | 1.67 | 1.67 | 2.21 | 1.68 | 2.48 | Nuit | dark |
| Relief | light | 1.86 | 5.78 | 5.78 | 5.78 | 4.47 | 1.70 | 1.15 | Pêche | light |
| Relief | dark | 1.98 | 1.30 | 1.32 | 1.27 | 2.24 | 1.57 | 2.57 | Nuit | dark |
| Clear | light | 2.14 | 6.62 | 6.51 | 6.28 | 4.77 | 1.94 | 1.24 | Brume | plate |
| Clear | dark | 1.67 | 1.21 | 1.23 | 1.20 | 1.84 | 1.40 | 2.04 | Prisme | plate |
| Prism | light | 1.70 | 6.27 | 6.14 | 5.87 | 4.12 | 1.52 | 1.00 | Brume | plate |
| Prism | dark | 1.44 | 1.05 | 1.06 | 1.05 | 1.58 | 1.21 | 1.76 | Prisme | plate |
| Liquid | light | 1.48 | 6.18 | 6.03 | 5.74 | 3.87 | 1.33 | 1.00 | Brume | plate |
| Liquid | dark | 1.33 | 1.00 | 1.00 | 1.00 | 1.47 | 1.12 | 1.65 | Prisme | plate |
| Voile | light | 1.87 | 6.91 | 6.78 | 6.52 | 4.77 | 1.67 | 1.13 | Trame | plate |
| Voile | dark | 1.74 | 1.20 | 1.20 | 1.20 | 1.96 | 1.40 | 2.25 | Prisme | plate |
| Liquid glass | light | 6.03 | 8.54 | 8.48 | 8.37 | 7.57 | 5.80 | 4.86 | Kit | plate |
| Liquid glass | dark | 5.13 | 4.64 | 4.66 | 4.60 | 5.29 | 4.86 | 5.47 | Kit | plate |

**What the table shows:**
- Every unedited built-in preset keeps today's scene, in both modes.
- Without its plate, no lab preset's text reaches 4.5:1 on a dark scene. The best is Givré on Nuit, at 2.73:1.
- Fumé rates 1:1 everywhere in light mode. Its text tokens are opaque. The light-mode sheen paints the top of its dark glass brighter than its light text, so some point of the surface matches the text, and the model rates that 1:1. With `glassSheen` at 0, it would rate 2.27:1 on Prisme and 4.11:1 on Nuit. On screen it reads well on Prisme, where its text sits below the sheen.

**The lab ink decision:**
- A first spec lit the lab ink whenever the measured ratio reached 4.5:1. With these numbers it would never light in dark mode, and Fumé and Relief would lose the light ink they have today.
- After comparing plate and ink screenshots for Givré, Fumé and Cristal in dark mode and Fumé and Relief in light mode, the user chose the current rule, extended to dark mode. On those cases the two renderings differ only by a thin outline.
- The ratios drive only the menu and the automatic scene.

## The menu

The preset editor's "Preview backdrop" options read, for example:
- "Brume, 6.8:1 (auto)";
- "Nuit, 1.2:1, below 4.5:1".

The ratio is truncated to one decimal, never rounded up, so Relief on Pêche, at 4.47, reads "Pêche, 4.4:1 (auto), below 4.5:1". The shortfall is in the accessible name, not only in a colour. With "Preview transparency" set to Reduced, every option shows the same opaque ratio. The site's component playground uses the same automatic scene and lab ink, but keeps plain scene names in its one-row toggle.

## The reduced-transparency mirror

**What the "Preview transparency: Auto / Reduced" control does:**
- It sets `data-reduced-transparency` on the preview's `html`.
- It sits in the preset, component and Button editors, in liquid glass only.
- It is preview state, and is never saved.

**How the mirror works (`apps/preview/src/reduced-transparency-mirror.ts`, around the pure `apps/www/src/site/reduced-transparency.ts`):**
- **`(prefers-reduced-transparency: reduce)` rules:** each gets a copy right after it in the same sheet, under `:where(html[data-reduced-transparency])`, which adds no specificity.
- **`not (… reduce)` and `no-preference` rules:** they are gated in place with `:where(html:not([data-reduced-transparency]))`.
- **Nesting:** nested rules are resolved against their parent.

**Parity:** the editors e2e opens the liquid glass audit page twice, in light and in dark mode, once with the mirror on and once under CDP-emulated `prefers-reduced-transparency: reduce`. It compares every `[data-slot]` element's backdrop filter, background colour and background image. The final mirror gates each copy's subject, `sel:where(html[data-reduced-transparency], html[data-reduced-transparency] *)`, so selectors that start from a class on `html` mirror too.

**Browser support:** the editors show the control only when the browser recognises the media feature, that is when `matchMedia('(prefers-reduced-transparency: reduce)')` is not `not all`. Without it the mirror would find no rule to copy. Safari, and Firefox without its preference flag, do not show the control.

| Mirror version | Differing slots |
| --- | ---: |
| A separate sheet in `head`, `html[…]` prefix, no nesting | not counted; accordions, avatars and buttons differed |
| Nesting resolved, `:where()` prefix, still in `head` | 71 |
| Sheet moved last in `body` | 1 (Accordion trigger) |
| Copies inserted next to their originals, `not (reduce)` gated in place | 0, in light and dark mode |

In the sandboxed editor preview, CDP emulation reaches `matchMedia` but not the cascade. There, the test checks that the toggle makes the Card opaque (`backdrop-filter: none`, an opaque background) and restores it.

## Tests

- **Unit, after the final review fixes:** compiler `glass-contrast` and `liquid-glass`, with website `site`, `editor`, `preset-editor` and `editor-shell`, 376 of 376. Typecheck clean.
- **Browser:**
  - `tests/e2e/glass-scenes.spec.ts` under `playwright.specimen-audit.config.ts`: 1 of 1;
  - `tests/e2e/editors-glass.spec.ts` under the new `playwright.editors.config.ts`, which starts the website and the preview only: 11 of 11. In the last full run, one test stopped on a transient `ERR_NETWORK_ACCESS_DENIED` while navigating to the local site; it passed on its own rerun.
- **The editor tests cover:**
  - the ratio labels;
  - the automatic scene after an edit;
  - a manual choice surviving an edit and an undo, and resetting on a new starting preset;
  - the dark lab ink, with an axe colour-contrast check on the Card;
  - the toggle in all three editors;
  - one copy per rule across recompiles;
  - leaving glass removing the attribute;
  - the mirror parity above.
- **Foundation contract:** both specs are listed in `playwright.config.ts` `testIgnore`, and the foundation inventory test passes.

## Specimen audit

The audit was limited to the components whose preview ink or backdrop rules changed: `OMBELLE_AUDIT_COMPONENTS=card,button,badge,input,select,tabs`. It ran in five families, both editions and both modes, and 21 of 21 tests passed in 18.0 minutes.

Liquid glass is experimental and non-blocking:
- **Dark configurations:** no findings, in both editions.
- **Light configurations:** 8 focus-visible findings in each edition, on `card~link`, `card~options`, `input`, `input~sm`, `input~lg`, `select` and `select~multiple`. The same findings were recorded for batches 6a and 6b, so this batch introduced none.
- **Lab ink:** the audit page never sets `data-glass-lab-ink`, so the lab ink rules do not reach it. The dark lab ink is checked in the editors e2e: the Card's text stroke and an axe colour-contrast run.

## Final review fixes

A fresh review of the whole branch found no Critical issue, three Important ones and nine Minor ones. Each fix has a test that failed first, except where noted.

**The three Important findings:**
- **The menu rounded 4.47 up:** Relief on Pêche read "4.5:1 … below 4.5:1". Ratios are now truncated, and a unit test pins Relief at 4.4.
- **The Fumé explanation was wrong:** the evidence blamed translucent text. The cause is the light-mode sheen, as above.
- **The toggle could silently do nothing outside Chromium:** it is now hidden when the browser does not recognise the media feature. A unit test covers the detection; no other engine was run.

**The Minor findings:**
- **Undo cleared a manual backdrop:** undoing an edit matched the starting preset again and cleared the chosen backdrop, a bug already present before this branch. Only a different starting preset clears it now, and the e2e test undoes an edit.
- **Selectors starting from a class on `html`:** they now mirror, because the gate sits on the subject.
- **The boolean form:** `(prefers-reduced-transparency)` now mirrors.
- **Forms the mirror cannot read:** they log a development warning.
- **Wider test coverage:**
  - the parity check now runs in both modes;
  - the Card and Button editor tests check that the attribute leaves the preview;
  - the copy count includes every copy;
  - the preset protocol rejects a lab ink without a backdrop.
- **Text corrections:** a stale comment in the compiler, an orphaned comment in the mirror, the guide and changelog wording, and the snapshot claim are corrected.

**Left as is:** the component editors rate the built-in preset only, and their memo keys on the preset reference. For built-ins, the automatic scene always equals today's table.
