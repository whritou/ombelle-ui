# Papier style family decision

15 November 2026. Papier is added as a stable style family beside flat, minimalist, neo-brutalism and ombelle, for release 0.8.0. Liquid glass stays experimental and is not changed.

Design source: the design canvas page "0.8.0 Papier" (nine boards, every component and variant in light and dark). The reference stylesheet is committed at `docs/superpowers/specs/assets/papier-080-board.css`. Spec: `docs/superpowers/specs/2026-11-15-papier-family-design.md`.

## Look

Papier is warm paper with ink rules and a serif voice. The page is cream (`#F3EDDF` light, `#16191F` dark), borders are 1px ink, radius is 2px, and raised controls sit on a 0 by 2px ink shadow that they sink onto when pressed. Cards, popovers, dialogs and command menus carry a double rule on top. Outline buttons carry a double rule underneath. Inputs are ruled: an inset bottom line, red border on hover, red 2px ring on focus. Dividers are dotted. Links are serif italic. The accent is one red (`#B8301A` light, `#F0845F` dark).

Tokens live in `packages/catalog/src/presets/papier.json`. The family stylesheet is `packages/catalog/src/styles/papier.css` (which also styles Button, Input and Dialog, as in every family), with one `papier.css` per component under `packages/catalog/src/styles/<component>/`. Each component file started from the same component's `ombelle.css` (for its slot, state and forced-colors structure) and carries a Papier layer after the marker comment `/* papier layer */` that sets the signatures above. Keyframe names stay `ombelle-*`, as in every family.

## Contract changes

- `schemas/preset.schema.json` gains `papier` in the `styleFamily` enum (before `liquid-glass`); `packages/contracts/src/preset-schema.ts` is regenerated from it.
- `supportedStyleFamilies` is now `flat`, `minimalist`, `neo-brutalism`, `ombelle`, `papier`; `styleFamilies` appends `liquid-glass`. `styleSupport` reports `stable` for every component in papier.
- Catalog and compiler compatibility versions stay 0.1.0 and schema 1.0. The change is additive: the other families produce the same bytes (the recorded hashes for them are unchanged), and a preset or recipe that does not name papier is unaffected.
- The preset carries 26 tokens per mode: the usual 19, `shadowColor`, and `success`, `warning`, `info` with their foregrounds. Those six are the design's soft status tints (alerts and toasts use `var(--success)` and the like as backgrounds), so Papier's status colours match the design.

## Deviations from the design

- **Fonts.** The design uses Fraunces for headings, Instrument Sans for the interface and IBM Plex Mono for code. The built-in preset cannot name them: a component preset installs no packages, so `compileButtonPreset` rejects any preset that sets a font family, heading or mono font, and the stable-hash script compiles built-in presets that way. Papier therefore ships with `system-sans` only, and its CSS sets headings and links with `var(--font-heading, ui-serif, Georgia, "Times New Roman", serif)`. A project that sets a heading font overrides the fallback. The preset editor starts Papier with its own fonts (`styleFamilyFonts.papier` in `packages/catalog/src/fonts.ts`: Fraunces for headings, Instrument Sans for body, IBM Plex Mono for code), so an editor export carries the design's type; an install of the built-in preset alone has the system serif for headings. The component editors do the same through the recipe: a Button recipe carries `overrides.fontFamilyId` and a catalog recipe `appearance.fonts`, both starting at the style's fonts. The compiler imports each named registry font in the recipe's stylesheet and adds its Fontsource package to the install, so the preview, the exported recipe and `add --recipe` agree; a recipe with no font field keeps the preset's system font.
- **Destructive colour.** The design's destructive solid is `#5B1A14`; the preset uses `#7A1F12` (light) so invalid borders and destructive text stay clearly distinct from the ink-navy border.
- **Palettes.** The preset editor offers seven Papier palettes (Indigo, Sage, Ochre, Plum, Verdigris, Sepia, Graphite), each a full light and dark set that passes the same contrast tests as the other styles' palettes (`apps/www/src/preset-editor/schemes.ts`). They were added after the first review, once the palettes work was on this branch.

## Where it is offered

- Gate: the website offers Papier only when its published installer (`publishedInstaller` in `apps/www/src/snapshots/install-command.ts`) is at least `papierMinimumCli` (0.8.0), and keeps it selectable for a restored draft that already uses it. The published installer is 0.7.8 at the time of writing, so Papier is hidden on the site until 0.8.0 is published and `pnpm version:set --published 0.8.0` lands. Release order is in [CLI release](../cli-release.md). No version bump, publish or tag is part of this change.
- Both editors: the Style family pickers list Papier (sample: a paper pill with an ink outline and a 2px stamp shadow) with no Beta tag.
- Preview: gallery generation iterates `supportedStyleFamilies`, so papier scenes are generated; `apps/preview/src/main.tsx` routes `/papier/`.
- Site: the home showcase and style morph have a Papier demo block (`[data-style="papier"]` in `apps/www/src/app/globals.css`); they appear once the gate opens.
- Fixtures and consumers: the recipe fixtures derive `rc_papier_button` from `supportedStyleFamilies`; the consumer matrix gains four stable rows (`vite-papier`, `next-papier`, `npm-vite-papier`, `npm-next-papier`), from 40 to 44 rows (42 stable, two experimental glass). Papier consumers are pnpm and npm with a Node CLI runtime only; no Yarn or Bun rows.

## Existing projects

Nothing rewrites installed files. A project adopts papier only by running `init --preset` or `theme add` with a papier preset, subject to the usual modified-file conflict checks.

## Verification status

Recorded on 15 November 2026 on Windows 11 with Node 24.19.0 and pnpm 11.25.0 through corepack, on branch `feat/style-papier`.

Run on this machine and passing:

- `pnpm build:packages` (which lints every Papier file against the catalog slots), `pnpm generate:preview`, `pnpm typecheck`.
- `pnpm test:unit`: 252 files, 4446 tests. Three tests (`snapshot-cache` "bounds valid entries", `preview-protocol` glass backdrop, `generated-types` Base UI typecheck) time out only when the whole suite runs at once under load; each passes when run alone.
- Catalog, compiler and contracts suites with Papier in every per-component family list (89 catalog files, 1492 tests), including the Papier review regression tests (`packages/catalog/test/papier-review-fixes.test.ts`) and the 57-file coverage and lint test (`papier-styles.test.ts`).
- Integration tests that count families: `consumer-matrix`, `consumer-evidence`, `component-preset-evidence`, `recipe-evidence`, `foundation-groups`, `foundation-browser-inventory`, `contrast` (Papier token pairs in both modes). The stable-family hashes were re-recorded: only `papier/*` lines changed, the other families' bytes are identical.
- `pnpm test:specimen-audit` for Papier (`OMBELLE_AUDIT_FAMILIES=papier`, radix and base, light and dark: focus, clipping, overflow, label spacing, target size, forced colors, axe). The default 300 second test timeout is too short for the axe pass on this machine, so it was run with `--timeout=1800000`. It passed after fixes to the Code Block token mapping, the dark-safe scrim tint on dialogs, sheets and alert dialogs, and the sheet resize grip focus colour, and again after the review fixes below.
- The Calendar, Code Block, Display and 0.7.6 component e2e specs, rerun on their own: 76 passed. Two Code Block keyboard-scroll cases (radix and base) failed on a 31px horizontal page overflow on an Ombelle edition page; Ombelle files were not changed, and this was not compared against `main`.

Whole-branch review: an independent reviewer found five defects (matched combobox text invisible in a highlighted row, two tab indicators, forced-colors overrides on checkbox, tabs and tooltip, a tooltip arrow drawn as a box, the destructive badge rule on soft and outline badges). Each was reproduced by a failing test first and fixed. Menu, select, command and combobox highlights now use the design's paper tint with a 2px ring instead of the ported solid primary fill, so that is not a deviation.

Not run, so nothing here supports a claim about them:

- The Papier consumer apps. The consumer pipeline has been failing in daily CI, and the plan is to fix it first and add Papier consumers after. The four Papier rows exist in the consumer matrix by derivation, and the counts in the evidence tests were updated, but no consumer app was prepared, built or browsed, and no consumer evidence file was regenerated. The parity browser spec was not run for Papier.
- `pnpm check:foundation`, and the Yarn and Bun consumers (no native Bun executable is installed here).
- Integration tests that need Bun or the npm registry (`bun-*`, `packed-cli`, `snapshot-journey`, `component-recipe-cli` and others) failed or timed out on this machine for those reasons.
- Real-browser forced-colors rendering beyond the automated audit, and human keyboard or screen reader review.

Known minor leftovers, deferred: a 1px double border for invalid inputs reads solid in forced colors; the table's dotted row dividers lose to the ported solid cell border; some Ombelle sizing remains (11px table head, separator label and badge text, pill meter cells, 2.5px component focus rings); link buttons ignore their size; disabled opacity is 0.5 on Button and Input and 0.45 on component controls; the alert's left rule is ink for success, warning and info; the dialog close button has no border in forced colors.
