# Organic style family (0.8.1)

Status: draft, awaiting approval. Size: project.

## Intent

Organic is the second new style family of the 0.8 line and the headline of release 0.8.1, after Papier in
0.8.0. It is a soft, earthy look: cream and deep-moss pages, one green primary, a clay accent, Young Serif
headings, Nunito interface text, and shapes whose corners never match. Raised controls sit on a soft shadow,
shift shape a little on hover and shrink when pressed. Cards and dialogs carry a tinted blob in the header
corner, links have a wavy underline, dividers are quiet 2px lines.

The look is drawn in the design canvas, page "0.8.1 Organic" (9 boards: Foundations, Actions, Text fields,
Choice controls, Content, Status, Navigation, Overlays, Data), every component and variant in light and dark.
It grew from the "0.8 style proposals" Organic board (buttons and card). This work turns that design into a
shipped, stable family, the same way Papier was shipped.

## Goals

- `organic` is a stable style family in 0.8.1, supported by all 57 catalog components, in light and dark.
- Every variant, size and state drawn in the canvas exists in the real component styles.
- It meets the bar of the other stable families: contrast tests, `pnpm test:specimen-audit` (focus,
  clipping, overflow, label spacing, target size, forced colors, axe) clean for every Organic specimen, and
  deterministic compiler output.
- Organic is selectable wherever the other families are: preset editor, Button editor, preview gallery,
  documentation playground, recipe and component-preset fixtures, consumer matrix.
- Seven Organic palettes in the preset editor, each a full light and dark set that passes the contrast tests
  (as Papier has in `apps/www/src/preset-editor/schemes.ts`).
- A decision record `docs/decisions/0007-organic-family.md`, written like `0006-papier-family.md`, states the
  look, the contract change, where it is offered, every deviation from the canvas and what was verified.

## Non-goals

- No new components or variants. The catalog stays at 57.
- No change to the output bytes of the other stable families, nor to liquid glass.
- No fonts beyond the design's three. Young Serif and Nunito are already in the registry; DM Mono is added
  (see Calls made).
- No version bump, npm publish, tag or PR unless asked.
- No claim of real-browser forced colors, human keyboard or screen reader review, or of consumer apps beyond
  what is actually run.

## Anti-goals

- An Organic that is "Ombelle in green". The structural differences must survive in the CSS: uneven corner
  radii that shift on hover, soft shadows instead of borders, inset-ring outlines, the header blob on cards
  and dialogs, wavy links, pill progress and sliders.
- A family registered while some component still lacks an Organic file.
- Controls that lose their outline or boundary in forced colors. The canvas draws many outlines as
  `box-shadow: inset 0 0 0 2px` (outline button, toggle, chip, badge, kbd, card, input group, item); box
  shadows are removed in forced colors, so each such rule needs a border-based forced-colors fallback.
- Motion that ignores `prefers-reduced-motion` (the radius morph, hover lift, press scale, track and thumb
  transitions).
- Documentation or evidence claims broader than what was actually run.

## Constraints

- Follow `AGENTS.md`: Conventional Commits, schemas edited in `schemas/` then regenerated, catalog inputs
  edited in `templates/`, `styles/`, `presets/` and never in `generated.ts`, deterministic compiler output,
  `.js` import specifiers.
- `pnpm build:packages` fails on a catalog style rule that names no slot or marker, so each file targets real
  `data-slot` and marker attributes. Papier files start from the same component's `ombelle.css` for slot,
  state and forced-colors structure; Organic does the same, with an Organic layer after a marker comment.
- Built-in presets cannot name font families (`compileButtonPreset` rejects them). Organic's built-in preset
  ships `system-sans`; its CSS sets headings and links with `var(--font-heading, ui-serif, Georgia, serif)`.
  The editors start Organic with its own fonts through `styleFamilyFonts.organic` in
  `packages/catalog/src/fonts.ts`, exactly as for Papier (decision 0006, Fonts).
- Young Serif has a single weight (400). Every heading rule in Organic sets weight 400; a heavier weight would
  be faux-bold. The registry already gives it `displayLineHeight: 1.5`.
- Text pairs reach 4.5:1 (3:1 at large size). Contrast and the audit win over the canvas; deviate only as
  far as needed and record it in 0007.
- The preset carries the same 26 tokens per mode as Papier: the usual 19, `shadowColor`, and `success`,
  `warning`, `info` with their foregrounds. Organic's shapes are fixed values in `organic.css`; the preset
  `radius` token is a nominal value where a component still reads `--radius`.
- Branch `feat/style-organic`, cut from `origin/main` at `6b8bd045`. Papier and the palettes work are already
  on `main`, so there is nothing to carry.
- The canvas was built by script from the Papier boards and has not been rendered or contrast-checked. Treat
  it as the design source for look, not as measured evidence. One known issue: the editor measured the
  Foundations panes at about 1923px against the board height of 1886, so board heights are unreliable.

## Approaches

1. **Chosen: preset first, then all 57 stylesheets, then audit once.** Write the preset and the base
   `organic.css`, then every component file from one shared rule set lifted from the canvas CSS; registration
   lands with the last file; one audit run and one repair pass, then rerun only what changed. Risk: a wrong
   shared decision (corner radii, hover shape change, inset-ring outlines) reworks many files. Mitigation: a
   checkpoint after Foundations, Actions and Text fields (base, Button, Badge, Chip, Toggle, Input family)
   reviewed in the preview before the rest.
2. Port one canvas board at a time and audit after each. Nine audit runs; slower, and against the project
   convention of not rerunning passing audits.
3. Fix the canvas first (render, contrast, heights), then port. Cleanest source, but a design round before any
   code, and the audit measures the same problems for real.

The user chose 1.

## Design

Commits on the branch, in this order. Every commit passes `pnpm test:unit`.

1. **Preset and contract.** `presets/organic.json` (light and dark tokens from the canvas `.light` and `.dark`
   blocks, including the soft status tints and the text-safe destructive pair; `system-sans`; shadow colour
   from `--sh`). Add `organic` to the `styleFamily` enum in `schemas/preset.schema.json`, regenerate
   `preset-schema.ts`. Registration in `supportedStyleFamilies` and `styleSupport` stays out until the last
   style file lands, so no test sees a family with missing files.
2. **Styles.** `styles/organic.css` (family base, which also styles Button, Input and Dialog as in every
   family) and one `styles/<component>/organic.css` per component, 54 files, in the order of the canvas
   boards. The reference for every rule is `docs/superpowers/specs/assets/organic-081-board.css`, committed
   with this design. Checkpoint after the first three boards.
3. **Registration and wiring**, following the Papier commit: `supportedStyleFamilies` (append after `papier`),
   `styleSupport` stable for every component, `styleFamilyFonts.organic` (body `nunito`, display
   `young-serif`, mono `dm-mono`), family pickers and chips in both editors, preview gallery and the
   `/organic/` route in `apps/preview`, recipe fixtures (`rc_organic_button`), recipe and component-preset
   evidence scripts, consumer matrix rows (`vite-organic`, `next-organic`, `npm-vite-organic`,
   `npm-next-organic`: 44 to 48 rows), the published-CLI gate `organicMinimumCli = '0.8.1'` in
   `apps/www/src/snapshots/install-command.ts` (the published installer is 0.8.0, so Organic stays hidden on
   the site until 0.8.1 is published), the home showcase and style-morph demo block, snapshot migration only
   if the store validates family names.
4. **Palettes.** Seven Organic palettes in `schemes.ts`, each a full light and dark set, named by character
   (starting point, builder may rename: Fern, Terracotta, Lichen, Heather, Seaglass, Marigold, Bark), and the
   palette tests extended to Organic.
5. **Tests and fixtures.** Add Organic to every per-component family list in catalog tests, add
   `organic-styles.test.ts` (57-file coverage and lint, like `papier-styles.test.ts`) and a review-fixes
   file if needed, update `stable-family-hashes.json` (only `organic/*` lines may change), the compiler
   style baseline, contrast tests (Organic token pairs, both modes) and the integration tests that count
   families.
6. **Verification.** `pnpm build:packages`, `pnpm generate:preview`, `pnpm typecheck`, `pnpm test:unit`,
   focused `pnpm test:integration`, then `OMBELLE_AUDIT_FAMILIES=organic pnpm test:specimen-audit` with
   `--timeout=1800000` (the default is too short for the axe pass on Windows). One repair pass, then rerun
   only what changed.
7. **Docs.** Decision record 0007, docs pages and component docs that list families, release notes. The
   record states exactly what was run and what was not.

## Calls made (mine, for you to check)

- **Mono font:** DM Mono, as drawn in the canvas (the user chose the design's fonts). Young Serif and Nunito
  are already in the registry; DM Mono is not, so it is added as a static Fontsource font (400 and 500).
- **Heading weight:** 400 everywhere (Young Serif is single-weight).
- **Palettes:** seven, matching Papier.
- **Preset radius token:** nominal, since the shapes are fixed values in the CSS.
- **Hit areas:** 46px default and 38px small, as drawn; the audit's target-size check decides if that stands.
- **Evidence:** do not regenerate measured evidence files unless the full gate is run, and say so in 0007.

## Left to the builder

- Exact slot selectors per component (follow the Ombelle and Papier files for structure).
- Forced-colors and reduced-motion fallbacks for each Organic rule, and whether a rule needs a modern-CSS
  fallback for `color-mix` (follow what other families do).
- File-by-file token tuning to reach contrast while keeping the look.
- Final palette names and values.
- Whether snapshot migrations are needed (check `apps/www/src/snapshots/server/`).
