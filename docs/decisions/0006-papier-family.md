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

- **Fonts.** The design uses Fraunces for headings, Instrument Sans for the interface and IBM Plex Mono for code. The built-in preset cannot name them: a component preset installs no packages, so `compileButtonPreset` rejects any preset that sets a font family, heading or mono font, and the stable-hash script compiles built-in presets that way. Papier therefore ships with `system-sans` only, and its CSS sets headings and links with `var(--font-heading, ui-serif, Georgia, "Times New Roman", serif)`. A project that sets a heading font (for example Fraunces from the editor's font pairs) overrides the fallback. Out of the box, Papier headings are the system serif, not Fraunces. Recommended pairing: Fraunces for headings and Instrument Sans for body.
- **Destructive colour.** The design's destructive solid is `#5B1A14`; the preset uses `#7A1F12` (light) so invalid borders and destructive text stay clearly distinct from the ink-navy border.
- **No Papier palettes.** The editor's per-style palettes are not defined for Papier yet; `palettes[family] ?? []` offers none. They follow once the palettes branch lands.

## Where it is offered

- Gate: the website offers Papier only when its published installer (`publishedInstaller` in `apps/www/src/snapshots/install-command.ts`) is at least `papierMinimumCli` (0.8.0), and keeps it selectable for a restored draft that already uses it. The published installer is 0.7.8 at the time of writing, so Papier is hidden on the site until 0.8.0 is published and `pnpm version:set --published 0.8.0` lands. Release order is in [CLI release](../cli-release.md). No version bump, publish or tag is part of this change.
- Both editors: the Style family pickers list Papier (sample: a paper pill with an ink outline and a 2px stamp shadow) with no Beta tag.
- Preview: gallery generation iterates `supportedStyleFamilies`, so papier scenes are generated; `apps/preview/src/main.tsx` routes `/papier/`.
- Site: the home showcase and style morph have a Papier demo block (`[data-style="papier"]` in `apps/www/src/app/globals.css`); they appear once the gate opens.
- Fixtures and consumers: the recipe fixtures derive `rc_papier_button` from `supportedStyleFamilies`; the consumer matrix gains four stable rows (`vite-papier`, `next-papier`, `npm-vite-papier`, `npm-next-papier`), from 40 to 44 rows (42 stable, two experimental glass). Papier consumers are pnpm and npm with a Node CLI runtime only; no Yarn or Bun rows.

## Existing projects

Nothing rewrites installed files. A project adopts papier only by running `init --preset` or `theme add` with a papier preset, subject to the usual modified-file conflict checks.

## Verification status

VERIFICATION_PLACEHOLDER
