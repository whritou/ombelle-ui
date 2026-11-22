# 09 — Liquid glass: readiness for stable

21 November 2026, commit `7045d93d` (branch `docs/1-0-audits-wave-1`, version 0.9.1).

**Covered:** the stable bar in `docs/03-components-styles-accessibility.md:209-215`; `docs/components/liquid-glass.md`; the glass evidence files; `packages/compiler/src/glass.ts` and `glass-contrast.ts`; the family sheets `packages/catalog/src/styles/liquid-glass.css` and `liquid-glass-lab.css` and the 60 component sheets `styles/<id>/liquid-glass.css`; the support table; the CLI notice and `STYLE_UNAVAILABLE` paths; the glass handling in both editors and the site; the glass tests. Browser checks ran against the preview at `http://localhost:5183` with Playwright 1.65 and Edge (`channel: 'msedge'`, headless; the bundled Chromium build the installed Playwright expects is not on this machine), at 1100 × 800 and device scale factor 1.

**How the browser checks were done.** Scripts are in the session scratchpad (`audit-09/`), not in the repository.

- *Worst-case contrast, all 63 components:* `/audit/liquid-glass/radix/?mode=…&only=…` in chunks of seven components (a full page is taller than Chromium's 16,384 px capture limit). The page backdrop is replaced by solid black, then solid white; all text is made transparent; each text node's box is sampled from the screenshot; the lowest ratio between the text's computed colour and any sampled pixel is kept. This measures what the compile-time bound claims: the surface as painted (filter, sheen and nesting included) over the two extreme backdrops. 349 active text nodes per mode. Disabled text and visually hidden text were excluded; text clipped by a scroll container was excluded by hand.
- *Declared backdrops:* `/liquid-glass/?mode=…` (solid, gradient, pattern; six components), same sampling over the real backdrops, then with the solid and gradient sections forced to black and white. Starting presets other than the family base were applied by injecting the CSS the built compiler emits for them (`compile()` from `packages/compiler/dist`, six components). That is the installed CSS over the preview's markup, not a real install.
- *Fallbacks:* the same audit pages with `prefers-reduced-transparency: reduce` (CDP `Emulation.setEmulatedMedia`, confirmed with `matchMedia`), with every `@supports (backdrop-filter…)` rule deleted from the page's style sheets, with `forcedColors: 'active'`, and with print media.
- *Performance:* `requestAnimationFrame` intervals during a six-second scripted scroll of the audit page, glass against flat in the same run.

**Not covered, and why:** Safari, Firefox and any real mobile device (none available: see Unverified); a human visual, keyboard or screen-reader pass; the Base UI edition in the browser (the 39 Base templates share the same style sheets; only the Radix pages were measured); open overlays (Dialog, Sheet, Popover, menus were measured closed, as the audit page renders them, except where a specimen renders its content inline); hover, pressed and focus states in the browser (read in the CSS and the pair table only); the hosted editors in a browser (their code was read; `apps/www` was not served); the full specimen audit and `liquid-glass.spec.ts` were not rerun (common rules). The prompt's paths all still exist; nothing has moved.

Severity is judged for 1.0 shipping with glass **as it is today, experimental**. Each finding also says whether it blocks **promotion to stable**.

## Summary

Glass is not ready for stable, in whole or in part. The contrast guarantee the documentation states holds for one preset, the family base `builtin-liquid-glass`, and for the 23 components it was written for. It does not hold for the eight material presets, which include Cristal, the default the editors offer: their bound passes only because the model treats a 0.25px text outline as an opaque background, and measured contrast on Cristal falls to 1.0–2.6:1 over a black or white backdrop. It also does not hold for 26 of the 40 components added since (GLS-02, GLS-03): they paint a translucent surface behind a filter that lacks the contrast compression the bound assumes, or behind no filter, and where measured they give 1.9–3.8:1 in dark mode on the base preset. Six surfaces stay translucent in every fallback, and forced colours leave 33 backdrop filters running. No performance budget or reference device exists, and on a desktop RTX 2070 a glass page scrolled at about four times the frame time of the flat one. One item blocks 1.0 as shipped: the documentation and the CLI say every starting preset passes the bound, which is false in any ordinary sense for the default preset. The rest is shippable under the experimental label. Recommendation: keep glass experimental at 1.0 (option 3), with the plan at the end.

## Deliverable 1 — The stable bar

The bar is `docs/03-components-styles-accessibility.md:211-215`. `docs/components/liquid-glass.md:5` adds what is "still owed": mid-range mobile scrolling, human review, the broader browser range.

### What an agent can verify

| # | Requirement (source) | Mark | Evidence |
| --- | --- | --- | --- |
| 1 | Translucency tested against declared background fixtures (03:211) | Partly met | Three declared backdrops exist (`fixtures/shared/glass-scenario.tsx`, rendered at `/liquid-glass/`). `tests/e2e/liquid-glass.spec.ts:380-386` runs them for six components (Button, Badge, Card, Dialog, Tabs, Tooltip) with the base preset. The other 57 components are rendered only over the kit backdrop on the audit page, where glass findings do not fail the test (`tests/e2e/specimen-audit.spec.ts:172-174`). GLS-06 |
| 2 | Text-bearing surfaces sufficiently opaque, or text on an opaque inner surface (03:211) | Not met | Base preset, original 23 components: met (measured, all bounded pairs ≥ 4.5:1 over black and white). Material presets: not met (GLS-01). 26 newer components (24 in GLS-02, plus Aspect Ratio and Context Menu in GLS-03): not met |
| 3 | "The stable default must remain readable without blur" (03:211) | Partly met | The family base passes its opaque-surface check (`glass-contrast.ts:496`, `ratioOpaque`). Six surfaces have no opaque base at all (GLS-03). Which preset is "the stable default" is undefined: the family base (0.57) or Cristal, which the editors select (`docs/components/liquid-glass.md:78`) |
| 4 | Contrast on declared backgrounds meets the release budget (03:215) | Not met | No release budget is written down anywhere for glass (searched `docs/`). Taking 4.5:1: base preset passes on the six measured components; Cristal fails on the declared gradient in dark mode (secondary Button 3.99, Card description 4.30, outline Button 2.52) and on the pattern (outline Button 3.61). GLS-01 |
| 5 | `@supports` enhancement with an opaque fallback (03:213) | Partly met | 57 of 60 component sheets gate translucency inside `@supports`. With the `@supports` rules removed, no backdrop filter remains (measured), but aspect-ratio, field-set, form error summary, toolbar, data-table buttons and the context-menu trigger stay translucent. GLS-03 |
| 6 | Reduced-motion rules (03:213) | Met | `liquid-glass.css:100` removes every transition and animation under `[data-slot]`; the lab layer drops hover lift and press scale (`liquid-glass-lab.css:192-196`). No `transition` names `backdrop-filter`, `filter` or `all` in any glass sheet (grep) |
| 7 | Forced-colours handling (03:213) | Partly met | Every glass sheet has a `forced-colors` block. Under emulation 33 elements across 16 components keep a backdrop filter and 11 text-bearing slots keep a translucent background. GLS-04 |
| 8 | An explicit reduced-transparency option (03:213) | Partly met | `design.transparency: "reduced"` exists and sets opacity 1 and `--glass-inner-filter: none` (`glass.ts:111-126`). The 24 sheets with hard-coded filters ignore `--glass-inner-filter`, and the surfaces with literal percentages (GLS-03) ignore `--glass-opacity`. Read end to end; not rendered |
| 9 | Progressive use of the platform preference (03:213) | Partly met | `prefers-reduced-transparency` is handled in 56 sheets. Under emulation two filters remain (form error summary, toolbar) and the GLS-03 surfaces stay translucent. Only Chromium ships this media feature (see Unverified) |
| 10 | Avoid continuous blur animation (03:213) | Met, with a note | Blur is never animated. Skeleton pulses its opacity forever on an element that carries a backdrop filter (`skeleton/liquid-glass.css:15`), which re-composites a filtered layer each frame; reduced motion stops it |
| 11 | Avoid nested large-area filters (03:213) | Partly met | The family's own nesting works (`--glass-inner-filter`, checked by `liquid-glass.spec.ts:389`). Measured exceptions: Table head inside its container (`table/liquid-glass.css:185`, `data-table/liquid-glass.css:176`, `blur(12px)`), the Item action inside Item. The 24 hard-coded sheets never drop their filter when nested (GLS-02) |
| 12 | Keyboard focus meets the budget (03:215) | Partly met | Not rerun. Recorded: `docs/evidence/specimen-audit.md:82-87`, seven light-mode focus-visibility findings per edition at 75–99% of 3:1 (Input, Input Group, Native Select, Select trigger, Textarea, Toast, Tooltip trigger), accepted because glass is experimental. That run covered 28 recipes; no recorded run covers the current 63 |
| 13 | Fallback rendering meets the budget (03:215) | Not met | Rows 5, 7, 8, 9 |

### What needs a human or a device

| # | Requirement | Mark | Evidence |
| --- | --- | --- | --- |
| 14 | Scrolling on an agreed mid-range mobile device meets the release budget (03:215) | Not met | No device is agreed and no budget is stated. No measurement exists (`docs/evidence/liquid-glass.md:133`). Desktop indication only: GLS-07 |
| 15 | Human visual, keyboard and screen-reader review (`liquid-glass.md:278`) | Not met | `docs/accessibility-review.md` results are empty for every family (`docs/web-alpha-readiness.md:27`); none for glass |
| 16 | Browsers beyond one Chromium build (`liquid-glass.md:280`) | Not met | Every glass measurement on record, and in this audit, is Chromium on Windows. Safari and Firefox notes are under Unverified |
| 17 | Visual snapshots reviewed (03:227, component definition of done) | Not met | No reviewed glass snapshot set is recorded for the 40 newer components |

## Deliverable 2 — Coverage

From `packages/contracts/src/style-families.ts:14-83`: the catalog has 63 components (`component-ids.ts`), and all 63 are `experimental` in liquid glass. None is `unavailable`, none is `stable`, and `styleSupport` cannot return `stable` for glass (line 81-82). All 63 are `stable` in the seven other families, so every component is in the "stable elsewhere, experimental in glass" set.

Every component has glass rules (60 own sheets; Button, Dialog and Input live in the family sheet), specimens on both audit pages (118 specimens per edition) and a non-blocking specimen-audit case. Six have a blocking contrast case on the declared backdrops. Nothing is untested in the sense of "not rendered"; 57 are untested in the sense of "no check that can fail".

The last column is this audit's measurement on the base preset over black and white. "Uncompressed filter" is GLS-02. "Bare text" means at least one text node in the specimen has no surface under it (labels beside controls, captions, ghost or link variants): by design outside the bound (`liquid-glass.md:185`), so its contrast is whatever the page backdrop gives.

| Component | Glass status | Glass rules | Specimens (Radix / Base) | Declared-backdrop contrast case | Measured on the kit specimen page (base preset) |
| --- | --- | --- | --- | --- | --- |
| alert | experimental | own sheet | 3 / 3 | no | — |
| accordion | experimental | own sheet | 3 / 3 | no | bare text |
| button | experimental | family sheet | 3 / 3 | yes | — |
| badge | experimental | own sheet | 7 / 7 | yes | bare text |
| avatar | experimental | own sheet | 3 / 3 | no | — |
| card | experimental | own sheet | 6 / 6 | yes | — |
| checkbox | experimental | own sheet | 4 / 4 | no | bare text |
| dialog | experimental | family sheet | 3 / 3 | yes | bare text |
| dropdown-menu | experimental | own sheet | 1 / 1 | no | bare text |
| input | experimental | family sheet | 3 / 3 | no | bare text |
| label | experimental | own sheet | 1 / 1 | no | bare text |
| popover | experimental | own sheet | 2 / 2 | no | bare text |
| progress | experimental | own sheet | 5 / 5 | no | bare text |
| native-select | experimental | own sheet | 1 / 1 | no | bare text |
| radio-group | experimental | own sheet | 1 / 1 | no | bare text |
| select | experimental | own sheet | 2 / 2 | no | bare text |
| switch | experimental | own sheet | 2 / 2 | no | bare text |
| separator | experimental | own sheet | 1 / 1 | no | — |
| skeleton | experimental | own sheet | 1 / 1 | no | — |
| tabs | experimental | own sheet | 2 / 2 | yes | bare text |
| table | experimental | own sheet | 3 / 3 | no | 1 uncompressed filter rule (GLS-02) |
| textarea | experimental | own sheet | 2 / 2 | no | bare text |
| tooltip | experimental | own sheet | 2 / 2 | yes | bare text |
| input-group | experimental | own sheet | 2 / 2 | no | bare text |
| sheet | experimental | own sheet | 4 / 4 | no | bare text |
| alert-dialog | experimental | own sheet | 3 / 3 | no | bare text |
| breadcrumb | experimental | own sheet | 2 / 2 | no | — |
| pagination | experimental | own sheet | 2 / 2 | no | bare text |
| toast | experimental | own sheet | 3 / 3 | no | — |
| spinner | experimental | own sheet | 1 / 1 | no | — |
| kbd | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 3.39:1 worst (dark) |
| empty | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 2.75:1 worst (dark) |
| field | experimental | own sheet | 2 / 2 | no | 1 uncompressed filter rule (GLS-02); measured 1.04:1 worst (dark); bare text |
| meter | experimental | own sheet | 2 / 2 | no | 1 uncompressed filter rule (GLS-02); bare text |
| stepper | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 3.39:1 worst (dark); bare text |
| slider | experimental | own sheet | 3 / 3 | no | 2 uncompressed filter rules (GLS-02); bare text |
| toggle-group | experimental | own sheet | 1 / 1 | no | 2 uncompressed filter rules (GLS-02); measured 3.10:1 worst (dark) |
| chip | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 3.39:1 worst (dark) |
| tag-input | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 3.01:1 worst (dark); bare text |
| input-otp | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02) |
| combobox | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); bare text |
| command | experimental | own sheet | 1 / 1 | no | — |
| hover-card | experimental | own sheet | 1 / 1 | no | bare text |
| context-menu | experimental | own sheet | 1 / 1 | no | measured 1.07:1 worst (light) |
| calendar | experimental | own sheet | 1 / 1 | no | — |
| toggle | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02) |
| collapsible | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 3.39:1 worst (dark) |
| scroll-area | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02) |
| button-group | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02) |
| item | experimental | own sheet | 1 / 1 | no | 2 uncompressed filter rules (GLS-02) |
| number-input | experimental | own sheet | 1 / 1 | no | bare text |
| color-picker | experimental | own sheet | 1 / 1 | no | 2 uncompressed filter rules (GLS-02) |
| code-block | experimental | own sheet | 2 / 2 | no | — |
| password-field | experimental | own sheet | 1 / 1 | no | bare text |
| carousel | experimental | own sheet | 3 / 3 | no | bare text |
| aspect-ratio | experimental | own sheet | 1 / 1 | no | measured 2.47:1 worst (dark) |
| toolbar | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 3.81:1 worst (dark) |
| prose | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 3.39:1 worst (dark); bare text |
| navigation-menu | experimental | own sheet | 1 / 1 | no | measured 3.10:1 worst (dark) |
| sidebar | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 3.01:1 worst (dark) |
| resizable | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); bare text |
| menubar | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 3.10:1 worst (dark) |
| data-table | experimental | own sheet | 1 / 1 | no | 1 uncompressed filter rule (GLS-02); measured 1.89:1 worst (dark); bare text |

Counts: 24 component sheets carry an uncompressed filter rule; 16 components measured below 4.5:1 on a surface of their own; 33 have some text on the bare backdrop.

## Findings

### GLS-01 The contrast bound is vacuous for every material preset, including the default Cristal

- Severity: blocker (false public claim). Blocks promotion: yes.
- Where: `packages/compiler/src/glass-contrast.ts:284-306` (`bound`, the `plate` mix), `:373` (`glassTextPlate = 1`), `:405` (plate on whenever the material is on), `:424`, `:432`; `packages/catalog/src/styles/liquid-glass.css:182` (`-webkit-text-stroke: calc(var(--glass-material, 0) * 0.25px) var(--glass-plate)`); `packages/catalog/src/styles/liquid-glass-lab.css` (Badge stroke `0.25px`); `packages/catalog/src/presets/liquid-glass-{cristal,givre,fume,relief,voile,clear,prism,liquid}.json:66` (`glassBackdropContrast` 1.1–1.378); `docs/components/liquid-glass.md:104` ("Every starting preset passes the contrast bound"), `:139` ("Together these keep 4.5:1 over any backdrop"), `:141` ("a 1px `-webkit-text-stroke`"); `apps/preview/src/glass-backdrop.css` (`html[data-glass-lab-ink]` rules set `-webkit-text-stroke-width: 0`).
- What happens: when any material field is above 0, the model mixes the painted surface with the opaque surface colour at `plate = 1`, so the "glass" ratio it reports is the ratio on the opaque token, whatever the opacity or backdrop. The justification is the text outline, which the CSS draws at 0.25px (the doc says 1px) under the fill. WCAG treats a narrow outline as part of the letter, not as its background, and a quarter-pixel stroke is not visible. The same eight presets set backdrop contrast above 1, which widens the backdrop range instead of compressing it, so nothing else bounds them. Result: all eight report "passes, minimum opacity 0.25"; with the plate removed from the model, 36 to 52 of 52 pairs fail in each, the worst at 1.01–1.78:1, and no opacity passes. Nested glass inherits the same opacity (0.25–0.76) over a raw backdrop. The CLI therefore prints no contrast notice for these presets and the editor readout shows a pass. The hosted preview also removes the stroke for an unedited lab preset over its own scene, so what the editor shows is not what is installed.
- Measured (Cristal CSS from the built compiler on `/liquid-glass/`): over a black backdrop in light mode, default Button 2.60:1, secondary 1.52, Card content 2.60, Card description 2.72, inactive Tabs trigger 2.65, outline Button 1.00; over white in dark mode, default Button 2.08, secondary 1.52, Card title 2.01, Card description 1.84, outline 1.10. On the declared gradient in dark mode: secondary 3.99, Card description 4.30, outline 2.52. Relief and Givré fail the same way (Relief light over black: 1.2–1.9 everywhere). The base preset passes every bounded pair in the same test.
- How verified: read end to end; reproduced with `glassContrastReport` from `packages/compiler/dist` on the nine preset files (with and without the six material fields), and with a Playwright pixel measurement; screenshot read.
- Suggested change: remove the plate term from the model (or give it a share that a measured stroke justifies, which at 0.25px is 0), then make the material presets pass honestly: compress the backdrop (contrast below 1 with tone, as the base does) or raise opacity. Until then, change the doc and readout to say the material presets are checked on their own scenes only (`glassContrastOnScene` already exists) and have the CLI say so.
- Effort: M for the model and the wording; L if the lab look has to be retuned to pass.

### GLS-02 Twenty-five components paint glass outside the bound's filter model

- Severity: should-fix. Blocks promotion: yes.
- Where: hard-coded `backdrop-filter` with no `contrast()`/`brightness()` and no `--glass-inner-filter`: `button-group/liquid-glass.css:150`, `chip:75`, `collapsible:79`, `color-picker:197,241`, `combobox:90`, `data-table:176`, `empty:59`, `input-otp:73`, `item:158,162`, `kbd:26`, `meter:102`, `scroll-area:77`, `slider:89,94`, `stepper:99`, `table:185`, `tag-input:102`, `toggle-group:82,87`, `toggle:58` (all `blur(12–16px)` with or without `saturate(1.4–1.5)`); token blur and saturation but no compression: `field:176`, `menubar:21`, `prose:97`, `resizable:96`, `sidebar:385`, `toolbar:89`; glass opacity with no filter at all: `navigation-menu/liquid-glass.css:138-140` (list), `data-table/liquid-glass.css:366` (toolbar buttons, 0.55 × opacity).
- What happens: the bound is only valid because `contrast()` and `brightness()` squeeze the backdrop into `[low, high]` before the surface is mixed in (`glass-contrast.ts:229-266`). These surfaces use `--glass-opacity` (0.57 in the base preset) over an unsqueezed backdrop. In dark mode over a white backdrop, text measures: Chip, Kbd, Collapsible content, Stepper indicator, Prose blockquote 3.39:1; Menubar, Navigation Menu, Toggle Group 3.10; Sidebar labels and buttons 3.01–3.55; Tag Input placeholder 3.01; Empty description 2.75 (4.32 in light over black); Toolbar 3.81; Data Table toolbar buttons 1.89 (2.07 in light). Side effects of the literals: `glassBlurPx` and `glassSaturation` do nothing on these components; they keep blurring inside a glass Card (no nested drop); and `transparency: "reduced"` leaves their filter running.
- How verified: reproduced (pixel measurement on `/audit/liquid-glass/radix/`, both modes, black and white backdrops; computed `backdrop-filter` read for Chip, Stepper, Sidebar, Menubar, Navigation Menu, Data Table); file list by grep, each line opened.
- Suggested change: use the family filter expression (`var(--glass-inner-filter, … contrast(var(--glass-contrast)) brightness(var(--glass-brightness)))`) on every glass surface, or paint these surfaces opaque. Add a style lint to `pnpm build:packages`: a glass rule that mixes a token with `transparent` must carry the full filter in the same block.
- Effort: M.

### GLS-03 Six surfaces have no opaque base and stay translucent in every fallback

- Severity: should-fix. Blocks promotion: yes.
- Where: `aspect-ratio/liquid-glass.css:14` (`background` 45%), `field/liquid-glass.css:103` (field set, `background` 55%), `field/liquid-glass.css:133` (form error summary, `destructive` 14% over nothing) with its filter at `:174-177`, `toolbar/liquid-glass.css:11` (`background` 55%) with `:89` and the reduced-transparency block at `:205-211` that covers only the overflow menu, `data-table/liquid-glass.css:366`, `context-menu/liquid-glass.css:185` (white 6%).
- What happens: these backgrounds are literals outside `@supports`, so fallback rule 1 (`liquid-glass.md:228`, "opaque outside any feature query") does not apply to them. With `@supports` rules removed, and separately under `prefers-reduced-transparency`, text on them still measures: field error text 2.71:1 (light, black backdrop) and 2.88 (dark, white); error-summary title 1.13 and 1.04, its list 2.01 and 1.37; aspect-ratio caption 2.82 and 2.47; toolbar buttons 3.81 (dark). Under reduced transparency the error summary and the toolbar also keep their backdrop filter. `field/liquid-glass.css` has no `prefers-reduced-transparency` block at all.
- How verified: reproduced (same measurement with `@supports` rules deleted, and with the media feature emulated; leftover filters listed from computed style).
- Suggested change: give each an opaque token base and move the translucent version inside `@supports`, with the usual reduced-transparency and forced-colours resets.
- Effort: S.

### GLS-04 Forced colours leave backdrop filters and translucent surfaces on 16 components

- Severity: should-fix. Blocks promotion: yes.
- Where: the `@media (forced-colors: active)` blocks of `chip`, `combobox`, `empty`, `field`, `input-otp`, `item`, `kbd`, `menubar`, `meter`, `prose`, `slider`, `stepper`, `tag-input`, `toggle`, `toggle-group`, `toolbar` (`packages/catalog/src/styles/<id>/liquid-glass.css`), which do not reset `backdrop-filter`; and `aspect-ratio`, `data-table` (button), `field` (field set), `sidebar` (menu button), which keep an alpha background.
- What happens: with `forcedColors: 'active'`, 33 elements on the audit page still compute a `backdrop-filter`, and 11 text-bearing slots compute a system colour at the author's alpha (for example `rgba(255, 255, 255, 0.57)` on Chip, Menubar, Stepper, Toggle Group). The doc says forced colours use "system colours with no filter and no translucency" (`liquid-glass.md:231`). Over a page whose backdrop is an image, the system-colour pair no longer holds.
- How verified: reproduced (computed styles under Playwright forced-colours emulation, light and dark).
- Suggested change: one family-level rule under `forced-colors: active` that sets `backdrop-filter: none` on every glass slot, and opaque `Canvas`/`ButtonFace` backgrounds in the listed sheets.
- Effort: S.

### GLS-05 The pair table still describes 23 components; nothing ties the CSS to it

- Severity: should-fix. Blocks promotion: yes.
- Where: `packages/compiler/src/glass-contrast.ts:130-170` (`glassContrastPairs`); undeclared surfaces in use: `accent` at glass opacity with `accentForeground` (`chip/liquid-glass.css:73`, `combobox:93`, `empty:62`, `tag-input:105`), `destructive` 14% (`field:133`), `primary` 8% over nothing (`data-table:664`), `background` 45% and 55% in oklab (`aspect-ratio:14`, `field:103`, `toolbar:11`), 0.55 × opacity without a filter (`data-table:366`).
- What happens: the compile-time worst case is the worst case of a hand-kept list. The list covers the original components and their hover, checked and selected states. No pair names `accent`, `primary` as a solid fill with `primaryForeground`, the Sidebar, Menubar, Navigation Menu, Toolbar, Data Table, Chip, Kbd or Stepper surfaces, or any of their hover and highlighted states. A custom preset that passes the report can still be unreadable on those components, and the report cannot say so. Focus rings are not in the model at all (they are drawn in `foreground` against whatever is behind the control; see the recorded focus findings). Placeholder text is covered for Input (55% coverage pair) but Tag Input's placeholder sits on an uncompressed surface (GLS-02).
- How verified: read end to end; the undeclared surfaces by grep with each line opened; several confirmed by measurement (GLS-02, GLS-03).
- Suggested change: after GLS-02 and GLS-03 most new surfaces reduce to pairs that already exist (`card`, `muted`, `popover`, `background` at a coverage). Declare the rest, and add a test that every `color-mix(… transparent)` surface in a glass sheet maps to a declared pair.
- Effort: M.

### GLS-06 The declared backdrops gate six components; glass specimen findings cannot fail

- Severity: should-fix. Blocks promotion: yes.
- Where: `fixtures/shared/glass-scenario.tsx` (six components), `tests/e2e/liquid-glass.spec.ts:380-386`, `tests/e2e/specimen-audit.spec.ts:172-178` (`blocking = experimental ? [] : findings`), `scripts/generate-audit.ts:117-118` (audit page uses `builtin-liquid-glass` and the kit backdrop only), `playwright.config.ts` (`glass-scenes.spec.ts` and `editors-glass.spec.ts` are in `testIgnore`).
- What happens: the only test that can fail on glass contrast runs the base preset on six components. The other 57 components, and every starting preset other than the base, have no failing check; GLS-01 to GLS-04 all sit in that gap. The stable bar's "tested against declared background fixtures" is met for a tenth of the catalog.
- How verified: read end to end.
- Suggested change: a glass audit page per offered starting preset over black, white and the pattern, with the contrast probe of this audit as a blocking check, before the specimen audit's experimental exemption is removed.
- Effort: M.

### GLS-07 No performance budget or reference device; desktop scrolling is already several times slower

- Severity: should-fix. Blocks promotion: yes (needs a device).
- Where: `docs/03-components-styles-accessibility.md:215` ("an agreed mid-range mobile device … the release budget"), `docs/evidence/liquid-glass.md:133`; filter radii in the starting presets (`glassBlurPx` 3 to 26); hard-coded `blur(12–16px)` in 21 component rules (GLS-02).
- What happens: neither the device nor the budget is named anywhere, so the gate cannot pass or fail. Indication from this machine (AMD Ryzen 7 2700X, 32 GB, NVIDIA RTX 2070 through ANGLE/D3D11, Windows 11, headless Edge, a shared dev server): scrolling the audit page for six seconds gave a median frame of 6.9 ms for flat and 21.0 ms for glass (p95 7.1 ms against 69.4 ms; 99 backdrop-filter layers covering 2.9 megapixels; blur radii 3px × 66, 12px × 2, 14px × 10, 16px × 21). A nine-component page with 20 layers (Sidebar, Data Table, Card, Menubar, Navigation Menu, Input, Button, Tabs, Table) gave 6.9 ms against 27.7 ms (p95 48.8 ms). Main-thread time was the same or lower for glass, so the cost is raster and compositing. Removing the SVG refraction filter, or the fixed backdrop, did not change it. With 4× CPU throttling: 7.0 ms against 27.7 ms. These numbers say nothing about a mid-range phone, and a headless compositor may not match a visible window; they do say the cost is real on desktop hardware well above mid-range.
- How verified: reproduced (scripted scroll with `requestAnimationFrame` timing and CDP `Performance.getMetrics`, two runs per configuration).
- Suggested change: name the device and the budget (for example a three-year-old mid-range Android phone, 90% of frames under 16.7 ms on a stated demo page), measure it by hand, and cap what a stable glass page may do: maximum layers in view and maximum blur radius.
- Effort: M (plus a device).

### GLS-08 Flipping the status silently drops CLI notices and breaks site copy

- Severity: nice-to-have today; must be fixed in the same change as any promotion.
- Where: `packages/cli/src/main.ts:56-67` (`glassNotices` returns `[]` at line 59 when no listed id is experimental, before the `LiquidGlassFilter` mount notice and the contrast notice are added); `packages/contracts/src/style-support.ts:16-19` and `packages/cli/src/plan/theme.ts:65-67` (messages list only experimental ids); `apps/www/src/site/components/catalog.ts:610-611` (`glassOnSite` is false for a stable id), `:627-633`; `apps/www/src/app/components/[id]/page.tsx:76-78` (a stable id would read "refused with STYLE_UNAVAILABLE") and `:99` (would read "Liquid glass: not available"); `apps/www/src/site/components/directory.tsx:24`, `playground.tsx:97`; `apps/www/src/preset-editor/components/glass-panel.tsx:95` (would render "Liquid glass is experimental.  support it."); `scripts/generate-preview.ts:29-31` (the glass preview compiles only experimental ids).
- What happens: a dozen call sites use `componentsWithStyleSupport('liquid-glass', ['experimental'])` to mean "every glass component". After a promotion that list is empty, or misses the promoted ids. The worst case is the CLI: a stable glass project would lose the contrast warning for a failing custom preset and the instruction to mount the filter.
- How verified: read end to end (each line opened).
- Suggested change: introduce one helper for "available in this family" (`['stable', 'experimental']`, as `preview-styles.ts:155` already does) and use it at these sites; build the experimental sentence only when its list is non-empty.
- Effort: S.

### GLS-09 The support table cannot express a stable glass component, and the family is labelled experimental in six fixed places

- Severity: nice-to-have today; required for a subset promotion.
- Where: `packages/contracts/src/style-families.ts:80-83`; `packages/catalog/test/new-component-contract.ts` (glass status typed as experimental or unavailable); family-level labels: `apps/www/src/editor/components/family-picker.tsx:39` ("Experimental"), `apps/www/src/preset-editor/components/preset-controls.tsx:137` ("Beta"), `apps/www/src/site/home/style-tiles.tsx:131`, `apps/www/src/site/components/playground.tsx:126-128`, `apps/www/src/site/docs/guides.tsx:79-81`, `apps/www/src/preset-editor/components/glass-panel.tsx:5-12,95`; `tests/e2e/specimen-audit.spec.ts:173`; `packages/contracts/src/style-families.ts:4` (`supportedStyleFamilies` excludes glass and drives the consumer matrix and evidence scripts).
- What happens: `styleSupport` returns `experimental` or `unavailable` for glass and nothing else, so promotion is a code change, not a data change. A subset promotion also needs every family-level label and the specimen-audit exemption to become per component. The two editors already disagree on the word (Experimental against Beta).
- How verified: read end to end.
- Suggested change: replace the set with a per-component map for glass; derive labels from it ("Experimental" when any offered component is).
- Effort: S for the table, M with the labels and tests.

### GLS-10 Glass documentation contradicts the code in ways a reader will rely on

- Severity: should-fix. Blocks promotion: yes (the public matrix and docs are part of the promotion).
- Where: `docs/components/liquid-glass.md:3` (four stable families, twenty-three components; the code has seven and 63), `:9-33` (23-row coverage table), `:35` ("23 components × 5 families"), `:141` (1px stroke; the code draws 0.25px), `:254` (twenty components block a switch out of glass; in the code it is 60, every one with a glass sheet), `:264` (picker says "Experimental"; the preset editor says "Beta"); `docs/web-alpha-readiness.md:48` (the readout "blocks export and publication below the bound"); `CHANGELOG.md:243` ("installers and publication still enforce the bound") and `:260`; `docs/evidence/liquid-glass.md:111-112`; `docs/03-components-styles-accessibility.md:184`; `docs/evidence/specimen-audit.md:29` (28 recipes; the page now has 118 specimens of 63 components).
- What happens: a failing contrast report blocks nothing. Every installer and web path compiles with `glassContrast: 'report'` (`packages/cli/src/main.ts:248,276`, `packages/compiler/src/compile.ts:107-108` is the only enforcing branch and only build scripts reach it), export and publish ignore it, and `tests/e2e/liquid-glass.spec.ts:665-692` asserts that. `liquid-glass.md:269` says so correctly; the readiness doc and the changelog say the opposite.
- How verified: read end to end.
- Suggested change: regenerate the coverage section of `liquid-glass.md` from the support table, and correct the stroke width, the out-of-glass list, and the two "blocks/enforces" statements.
- Effort: S.

### GLS-11 Print has no rules

- Severity: nice-to-have. Blocks promotion: no.
- Where: no `@media print` in any sheet under `packages/catalog/src/styles` (all families).
- What happens: in print media every glass surface keeps its computed backdrop filter and translucent background (99 layers on the audit page). Browsers drop backgrounds when printing by default, so dark-mode glass prints light text on white paper. The same is true of the dark mode of every family; glass adds the filters.
- How verified: computed styles under print emulation; the printed result itself was not inspected.
- Suggested change: a print block in the family sheet: opaque token surfaces, no filter, no sheen.
- Effort: S.

## Deliverable 4 — What changes at promotion

Verified by reading each location. "Derived" means it follows the support table with no edit.

| Area | Today | Change at promotion |
| --- | --- | --- |
| Support table | `style-families.ts:14-83`: a set of experimental ids; no stable branch | Logic: add stable to the glass branch (GLS-09) |
| Compiler | `assertStyleAvailable` (`style-support.ts:12-23`) refuses only `unavailable`; `compile.ts:107-108` enforces contrast unless `glassContrast: 'report'` | Message text. Decide whether a stable family may install below the bound: today it may, with a notice (GLS-10) |
| CLI notice | `main.ts:50-68`: "liquid-glass is experimental for …; see docs/components/liquid-glass.md for limitations", then the filter mount notice (`add` only), then the contrast warning. Emitted through `plan.notices`: `notices` in JSON (`format.ts:28`), `Notice:` lines in text | Logic (GLS-08): keep the filter and contrast notices, drop or shorten the experimental line. `notices` stays an array; for a stable glass project it would no longer be non-empty by default, which `tests/integration/liquid-glass-cli.test.ts` asserts in about twelve places |
| `STYLE_UNAVAILABLE` | Into glass (`plan/theme.ts:60-72`): only for `unavailable` ids, unreachable today. Out of glass (`:73-87`): any installed component with a glass sheet. Stable to stable (`:50-59`): any installed component whose CSS differs between the two families | Into glass: message text. Out of glass: no change, it does not read the status |
| Button editor | `experimentalNotice` (`apps/www/src/editor/model.ts:176-181`), derived per component; contrast warning beside the export (`artifact-panel.tsx:86-96`); export never blocked | Derived. The catalog component editor shows no notice for any component today (`catalog-component-editor.tsx`) |
| Preset editor | "Beta" tag (`preset-controls.tsx:137`); limitations panel and "Liquid glass is experimental" sentence (`glass-panel.tsx:5-12,95`); readout says "You can still export or publish this preset" (`glass-panel.tsx:29`); export and Get code are not gated on contrast | Text. Decide whether publishing a failing preset stays allowed for a stable family |
| Public support matrix | `support-matrix.tsx:18` derives each cell from `styleSupport` | Derived. The surrounding copy is not (GLS-08): component page lines 76-78 and 99, directory badge, playground hint, home style tile, docs guide, `app/docs/page.tsx:13` |
| Preview and evidence | `generate-preview.ts:31`; `specimen-audit.spec.ts:172-178` exempts glass; `scripts/foundation-evidence.mjs:131` requires zero failures; the consumer matrix treats glass rows as experimental (`scripts/consumer-matrix.ts`) | Logic. Once the exemption goes, the seven recorded light-mode focus findings per edition fail the foundation gate until fixed |
| Docs | `docs/components/liquid-glass.md` throughout; `docs/03` lines 184, 215, 227; `docs/05-cli-specification.md`; `docs/foundation-local-usage.md`; `docs/07-delivery-plan.md:61`; `README.md`; the "Liquid glass is experimental" line in about 60 `docs/components/*.md`; `CHANGELOG.md` | Text, after GLS-10 |
| Tests that assert "experimental" | `packages/catalog/test/*.test.ts` (45 files pass `glass: 'experimental'` to the contract helper), `packages/compiler/test/liquid-glass.test.ts`, `packages/contracts/test/style-support.test.ts`, seven files under `apps/www/src` (`glass-notice.test.tsx`, `family-picker.test.tsx`, `model.test.ts`, `glass-panel.test.tsx`, `preset-controls.test.tsx`, `preview-protocol.test.ts`, `support-matrix.test.tsx`), `tests/integration/liquid-glass-cli.test.ts`, `tests/integration/www-route.test.ts`, `tests/e2e/specimen-audit.spec.ts` | About 60 files. The count comes from a subagent's grep and was spot-checked, not recounted |
| CSS comments | "(experimental)" in the header comment of 35 glass sheets and `liquid-glass.css:1` | Optional. They are embedded in compiled artifacts, so editing them changes artifact hashes |

**The theme-switch limitation.** A project with any of 60 glass components installed cannot run `theme add` or `init` to another family: `STYLE_UNAVAILABLE` at `/styleFamily`, remove the components, switch, add them again (`plan/theme.ts:73-87`). A stable family can ship with this. The stable families already do: the same refusal applies between any two stable families whenever an installed component's sheet differs (`plan/theme.ts:50-59`), which is nearly always. The glass branch is stricter in one respect only: it refuses on the presence of a glass sheet without comparing it to the target's. It protects against a real failure (glass CSS reading `--glass-*` tokens that the new theme no longer bounds), and it fails before any write. Two things should change before the family is called stable: the error code reads as "this style does not exist" when the cause is "installed CSS belongs to another family", so the message should lead with the remedy; and the leftover `--glass-*` declarations after an allowed switch out of glass should be cleaned up (already reported as a wave 1 CLI finding in `02-cli-installer.md`; not repeated here).

## Unverified

- **Safari.** (a) `prefers-reduced-transparency` is, to my knowledge, shipped only in Chromium. If so, macOS and iOS users with "Reduce transparency" on get full glass in Safari, and the platform-preference fallback exists on paper only where it is most used. (b) Safari does not implement the backdrop-root rule: a nested element's `backdrop-filter` samples the whole page there, and only the parent's content in Chromium and Firefox, so nested cases such as the Table head (`blur(12px)` inside the container) will look different. (c) Safari has a history of `backdrop-filter` not being clipped by `border-radius` with `overflow`, and of flicker on `position: sticky` elements with a filter (sticky Table head, Sidebar panel). (d) `paint-order: stroke fill` with a 0.25px `-webkit-text-stroke` rasterises differently per engine. (e) On wide-gamut displays filter arithmetic may not run in sRGB, which would move the compressed range the bound depends on. Settled by: the declared-backdrop page and the audit page on Safari 17 and 18, macOS and iOS, with the contrast probe.
- **Firefox.** `backdrop-filter` is supported since 103; large blurs are slow under software WebRender. The refraction filter is gated to Chromium by `navigator.userAgentData`, so Firefox and Safari get plain blur by design; nobody has looked at it. Settled by: the same two pages on current Firefox.
- **Mid-range mobile scrolling.** Not measurable here. Settled by GLS-07's plan.
- **Open overlays and portals.** Dialog, Sheet, Alert Dialog, Popover, Hover Card, menus, Select and Combobox lists, Toast and Tooltip were measured closed. Nested-glass rules select by DOM ancestry (`[data-slot="card"] [data-slot=…]`), so content portalled out of a glass Dialog (a Select list or Popover opened from inside it) is not "nested" for CSS and keeps its own filter; that is correct for contrast (it filters the page plus the dialog) but adds a large filtered layer over another one. Not rendered. Settled by: a specimen with a Select inside a Dialog inside a Card, measured over black and white.
- **Hover, pressed, highlighted and focus states of the 40 newer components.** Read only. The pair table has no entries for them (GLS-05). Settled by: forcing each state on the audit page and running the contrast probe.
- **Focus visibility on the current 63 components.** The recorded seven light-mode findings date from a 28-recipe page. Settled by: one `pnpm test:specimen-audit` run restricted to glass, reading `experimentalFindings`.
- **Base UI edition.** Same sheets, different markup for 39 components; not measured. Settled by: the contrast probe on `/audit/liquid-glass/base/`.
- **Material presets on the 57 other components.** Cristal and the others were measured on six components only; the recipe specimens on the audit page pin the base preset. GLS-01 is a property of the model, so it applies to all of them, but no pixel was measured.
- **Headless frame timing.** Whether a visible Edge window on the same GPU shows the same glass-to-flat ratio. Settled by: the same script headed, or a DevTools performance trace by hand.

## Looked at and found sound

- **The base preset on the original components.** Over pure black and pure white, every bounded pair on Button, Badge, Card, Tabs and Tooltip measured at or above 4.5:1 in both modes, and on the audit page no component from the original 23 measured below 4.5:1 on its own surface (Table head and Scroll Area hits were text clipped by a scroller). The filter model in `glassBackdrop` (per-channel affine transfer, clamped, monotonic) is right for `contrast()` then `brightness()`, and the V-shape check (`inside`) is the correct extra condition.
- **Tinted and covered pairs.** `mixTint` matches `color-mix(in srgb, …)` with premultiplied alpha; coverage multiplies opacity as the CSS does; a translucent surface token stacks correctly (`glass-contrast.ts:413-425`). Translucent text is refused outright.
- **Nested glass in the family's own components.** Nested surfaces drop their filter and use `--glass-nested-opacity` (0.69 light, 0.92 dark in the base preset), computed against raw black and white.
- **No blur animation.** No transition or animation touches `backdrop-filter`; reduced motion removes all transitions and animations on slots.
- **Missing `backdrop-filter` support.** With the `@supports` rules removed, no element kept a filter, and all surfaces except those in GLS-03 were opaque.
- **Reduced transparency for the original components.** Under the emulated preference only the form error summary and the toolbar kept a filter; everything from the original 23 was opaque.
- **Refraction and the bound.** The SVG displacement runs before the compression in the same filter list and is gated to Chromium, so a browser that rejected `url()` in `backdrop-filter` would not lose the compression.
- **The out-of-glass refusal.** Fails before any write, names the components and their CSS files, and does not depend on the experimental status.
- **The public support matrix cell values** derive from `styleSupport` and need no edit.

## Recommendation

**Option 3: keep liquid glass experimental at 1.0, with a dated plan.** The main reason: the property that defines the family, readable text over any backdrop, is established for one non-default preset on 23 components, and is measurably false for the default preset (GLS-01) and for 26 of the newer components (GLS-02, GLS-03). The remaining bar items (device, human review, Safari and Firefox) have not been started and cannot be done by an agent.

What each option implies:

1. **Promote all of glass at 1.0.** Everything below, before 1.0: GLS-01 to GLS-07 fixed; a named device and budget, measured; Safari and Firefox passes; a human keyboard and screen-reader pass of 63 components; the promotion changes in deliverable 4 (GLS-08, GLS-09, about 60 test files, the docs). Estimate: L several times over, and three items need people and hardware. Not realistic for 1.0.
2. **Promote a named subset.** The defensible subset is the original 23 components on the family base preset: they pass the bound as measured and have the declared-backdrop gate for six of them. It still needs: GLS-01 resolved, because Cristal is the default the editors hand out and a stable component cannot default to a preset that fails; the per-component table and labels (GLS-09) and the notice fixes (GLS-08); the declared-backdrop gate extended to all 23 (GLS-06); the seven recorded focus findings fixed; and the same device, browser and human gates as option 1, on a smaller surface. It also creates a family that is stable for Card and experimental for Sidebar in the same project, which the CLI notice and the site would have to explain per component. Estimate: L. Possible for a 1.x release, not obviously worth the split.
3. **Keep experimental at 1.0 (recommended).** Before 1.0, only what makes the experimental label honest: fix the false statements (GLS-01 wording in `liquid-glass.md:104,139,141` and the editor readout and CLI for material presets; GLS-10). Everything else is scheduled:
   - **1.0 (now):** GLS-10 doc corrections; state in the doc, readout and CLI notice that material presets are checked on their own preview scenes only. S.
   - **1.1 (target: four weeks after 1.0):** GLS-02, GLS-03, GLS-04 (mechanical CSS work with a lint to hold it); GLS-05 pairs and the CSS-to-pair test; GLS-06 blocking contrast probe per offered preset over black, white and pattern; GLS-08 and GLS-09 so the table can express a promotion. M each.
   - **1.2 (target: eight weeks after 1.0):** GLS-01 properly: remove the plate from the model and retune or re-document the material presets; decide whether a stable family may install or publish below the bound. Name the device and budget (GLS-07) and measure. Safari and Firefox runs of the two glass pages. L.
   - **Promotion decision at 1.3:** human keyboard and screen-reader pass recorded; specimen-audit exemption removed with zero glass findings; then flip the table, for all components or for the subset that passed, with the changes in deliverable 4.
