# Organic style family decision

16 November 2026. Organic is added as a stable style family beside flat, minimalist, neo-brutalism, ombelle and papier, for release 0.8.1. Liquid glass stays experimental and is not changed.

Design source: the design canvas page "0.8.1 Organic" (nine boards, every component and variant in light and dark), grown from the "0.8 style proposals" Organic board. The reference stylesheet is committed at `docs/superpowers/specs/assets/organic-081-board.css`. Spec: `docs/superpowers/specs/2026-11-16-organic-family-design.md`. Plan: `docs/superpowers/plans/2026-11-16-organic-family.md`.

## Look

Organic is cream and deep moss with a clay accent and soft, uneven shapes. The page is `#EEEBDC` light and `#1B2118` dark, borders are soft lines (the border colour at 42% opacity), and no two corners match: buttons, inputs, cards and popovers each carry their own set of unequal radii, and the radii shift when you hover or focus. Raised controls sit on a soft shadow and shrink to 96% when pressed. Cards, dialogs and alert dialogs carry a tinted corner blob. Links are bold with a wavy underline, dividers are quiet 2px or 3px pills, progress, slider and meter are pills with an unevenly rounded fill, and the switch thumb and calendar selection are pebbles. The primary is one green (`#3F6B3A` light, `#9FCB8A` dark).

Tokens live in `packages/catalog/src/presets/organic.json`. The family stylesheet is `packages/catalog/src/styles/organic.css` (which also styles Button, Input and Dialog, as in every family), with one `organic.css` per component under `packages/catalog/src/styles/<component>/`. Each component file is the component's Papier body (the Ombelle structure with its slot, state and forced-colors rules) with a mechanical softening pass (radii to `--o-r*`, border colours to `--o-line`, offset shadows to soft shadows) and an Organic layer after the marker comment `/* organic layer */`. Keyframe names stay `ombelle-*`, as in every family. The shared shapes and shadows are custom properties declared once in `organic.css` (`--o-r1` to `--o-r4`, `--o-r3h`, `--o-rr`, `--o-line`, `--o-sh`, `--o-e1` to `--o-e3`).

## Contract changes

- `schemas/preset.schema.json` gains `organic` in the `styleFamily` enum (after `papier`, before `liquid-glass`) and `dm-mono` in `monoFontFamilyId`; `packages/contracts/src/preset-schema.ts` is regenerated from it.
- `supportedStyleFamilies` is now `flat`, `minimalist`, `neo-brutalism`, `ombelle`, `papier`, `organic`; `styleFamilies` appends `liquid-glass`. `styleSupport` reports `stable` for every component in organic.
- Catalog and compiler compatibility versions stay 0.1.0 and schema 1.0. The change is additive: the other families produce the same bytes (the recorded hashes for them are unchanged, and only `organic/*` lines were added to the fixtures), and a preset or recipe that does not name organic is unaffected.
- The preset carries 26 tokens per mode, as Papier does: the usual 19, `shadowColor`, and `success`, `warning`, `info` with their foregrounds, which are the design's soft status tints.
- The button recipe compiler allows only the `data-slot`, `data-size`, `data-variant` and `data-halo-active` attributes in a button selector, so the family base has no `[aria-busy]` rule.

## Fonts

The design uses Young Serif for headings, Nunito for the interface and DM Mono for code. Young Serif and Nunito were already in the font registry. DM Mono was not, so it is added as a static Fontsource font (`@fontsource/dm-mono` 5.3.0, weights 400 and 500, OFL-1.1) with its preview import, schema enum value and `docs/fonts.md` row. As with Papier, a built-in preset cannot name fonts, so Organic ships `system-sans`, its CSS sets headings with `var(--font-heading, ui-serif, Georgia, "Times New Roman", serif)`, and the editors start Organic with its own fonts through `styleFamilyFonts.organic` (body `nunito`, display `young-serif`, mono `dm-mono`). Young Serif has a single weight, so every Organic heading rule uses weight 400. A preset can name DM Mono only if the installer's schema knows it, which is true from CLI 0.8.1, so the editors' code font pickers hide DM Mono until the published installer is 0.8.1 (a restored draft that already uses it will not find it in the picker until then).

## Deviations from the design

- **Focus on highlighted rows.** The canvas highlights a menu, select, command or combobox row with a tint only. The specimen audit measures focus indicators and found none, so highlighted rows also get a 2px inset ring in the ring colour.
- **Corner blobs.** The canvas blobs sit partly outside the card or dialog. Pseudo-elements outside the box make the content wider than the box (the audit's overflow check), so Organic draws a corner tint inside the box instead.
- **Toast shadow.** The toast uses a tighter shadow than other overlays, because its viewport clips anything beyond its 8px padding.
- **Slider thumb.** The thumb border is 3px, not 4px, so the Base UI thumb has room for its hidden input.
- **Outlines.** Where the canvas draws an outline as an inset shadow, forced colors removes it, so each such rule has a border fallback. Several controls keep real borders instead.
- **Palettes.** Seven palettes are offered in the preset editor: Fern, Terracotta, Lichen, Heather, Seaglass, Marigold and Bark, each a full light and dark set that passes the same contrast tests as the other styles' palettes. Fern is a cooler green than the built-in moss, because the editor's reset model treats a palette equal to the style default as no palette.
- **Field boundaries.** The canvas draws text-entry boundaries with the border colour at 42% opacity, which measures about 1.7 to 1 against the card. WCAG 1.4.11 needs 3 to 1, so text-entry controls (input, textarea, selects, number input, input group, password field, combobox, tag input, OTP slots) and the outline rings of toggles, chips and items use the `input` token. Decorative lines and surface edges keep the soft line.
- **Input field colour.** Inputs use the card colour, not a separate, slightly lighter field colour, since the preset has no field token.
- **Preset values.** `radiusRem` is a nominal 1.25 (the shapes are fixed values in the CSS), `borderWidthPx` is 2 and the shadow offset is 8px.

## Where it is offered

- Gate: the website offers Organic only when its published installer (`publishedInstaller` in `apps/www/src/snapshots/install-command.ts`) is at least `organicMinimumCli` (0.8.1), and keeps it selectable for a restored draft that already uses it. The published installer is 0.8.0 at the time of writing, so Organic is hidden on the site until 0.8.1 is published and `pnpm version:set --published 0.8.1` lands. No version bump, publish or tag is part of this change.
- Both editors: the Style family pickers list Organic (sample: a moss pebble with a soft shadow) with no Beta tag.
- Preview: gallery generation iterates `supportedStyleFamilies`, so organic scenes are generated; `apps/preview/src/main.tsx` routes `/organic/`.
- Site: the home showcase and style morph have an Organic demo block (`[data-style="organic"]` in `apps/www/src/app/globals.css`); they appear once the gate opens.
- Fixtures and consumers: the recipe fixtures derive `rc_organic_button` from `supportedStyleFamilies`; the consumer matrix gains four stable rows (`vite-organic`, `next-organic`, `npm-vite-organic`, `npm-next-organic`), from 46 to 50 rows (48 stable, two experimental glass). Organic consumers are pnpm and npm with a Node CLI runtime only.

## Existing projects

Nothing rewrites installed files. A project adopts organic only by running `init --preset` or `theme add` with an organic preset, subject to the usual modified-file conflict checks.

## Verification status

Recorded on 16 November 2026 on Windows 11 with Node 24.19.0 and pnpm 11.25.0 through corepack, on branch `feat/style-organic`.

Run on this machine and passing:

- `pnpm build:packages` (which lints every Organic file against the catalog slots), `pnpm generate:preview`, `pnpm typecheck`.
- `pnpm test:unit`: 255 files, 4846 tests, before the audit repair; after the repair the catalog, contracts and compiler suites were rerun on their own (catalog and contracts 97 files, 2047 tests; the compiler stable-family and specimen suites 254 tests).
- The Organic coverage and lint test (`organic-styles.test.ts`, 110 tests: base file, 54 component files, variant coverage) and the audit regression tests (`organic-review-fixes.test.ts`, 10 tests), each written to fail first.
- Integration tests that count families or measure contrast: `consumer-matrix`, `consumer-evidence`, `component-preset-evidence`, `recipe-evidence`, `foundation-groups` (49 tests) and `contrast` (Organic token pairs in both modes). The stable-family hashes were re-recorded: only `organic/*` lines changed, the other families' bytes are identical.
- `pnpm test:specimen-audit` for Organic (`OMBELLE_AUDIT_FAMILIES=organic`, `tests/e2e/specimen-audit.spec.ts`, radix and base, light and dark: focus, clipping, overflow, label spacing, target size, forced colors, axe), with `--timeout=1800000`, on Microsoft Edge through `OMBELLE_BROWSER_CHANNEL=msedge` because the Playwright Chromium build this version wants was not installed. The first run failed on real findings: toast shadows clipped by their viewport, no visible focus ring on highlighted Select, Dropdown Menu and Context Menu rows, decorative blobs wider than their Card and Dialog boxes, and a Base UI Slider thumb too small for its hidden input. Each was reproduced by a failing test and fixed; the second run passed in all four configurations.
- A visual check of `/organic/` and `/audit/organic/radix/` in light and dark.
- A whole-branch review by a fresh reviewer found cascade bugs the audit cannot see: the Alert Dialog lost its fixed position and scrolling, dialog text ran under the close button, outlined and subtle cards had no forced-colors boundary, a linked card was clickable only over its title, a wide table was clipped instead of scrolling, meter cells, carousel dots and the calendar range lost their forced-colors fill, field boundaries were below 3 to 1, and DM Mono was offered before CLI 0.8.1. Each was reproduced by a failing test (`organic-review-fixes.test.ts`, 31 tests in all) and fixed; the unit suite was then rerun in full (256 files, 4877 tests) and the Organic specimen audit rerun.

Not run, so nothing here supports a claim about them:

- The Organic consumer apps. No consumer app was prepared, built or browsed, and no consumer evidence file was regenerated. The four Organic rows exist in the consumer matrix by derivation and the counts in the evidence tests were updated.
- `pnpm check:foundation`, the Yarn and Bun consumers, and the rest of the end-to-end suite (the browser specs outside the Organic specimen audit). The first audit run also showed that the bundled Chromium build is missing on this machine.
- Real-browser forced-colors rendering beyond the automated audit, and human keyboard or screen reader review.
- The Organic palettes were checked by the editor's contrast tests only, not by eye in every component.

Known gaps, deferred (minor review findings): disabled and busy buttons, the segmented toggle-group container, the toast close button, the bare card action, the colour-picker area and hue, and disabled pill tabs have no boundary in forced colors; the calendar selected day, the complete progress fill and a complete stepper use authored or border-only highlights in forced colors; dialogs clip their overflow even without a body; 31 catalog test files still list `papier` without `organic` (the Organic coverage test covers all 57 components); the README consumer list omits the four Organic consumers.

Other known gaps: the canvas was built by script and was not rendered before this work (its board heights are approximate); the input field colour is the card colour; and Young Serif and DM Mono are installed only through the editors' font install, so a project that installs the built-in preset alone has the system serif for headings and the system monospace for code.
