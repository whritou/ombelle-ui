# Retro futurism style family (0.8.2)

Status: draft, awaiting approval. Size: project.

## Intent

Retro futurism is the third new style family of the 0.8 line and the headline of release 0.8.2, after Papier
(0.8.0) and Organic (0.8.1, already published). It is a 1970s space-age look: cream and deep-indigo pages
(violet night sky in dark), one rocket-orange primary, a lagoon-teal secondary, Michroma headings, Exo 2
interface text and Space Mono code. Controls are pills with a 2px indigo outline and a hard key shadow; the
filled ones split into two tones with fine scanlines, and pressing drops the key 4px onto its shadow. Cards and
tables carry a sunset gradient header band (orange to magenta) with a striped sun, dialogs and alert dialogs a
band of three coloured stripes, and progress and slider fills are striped.

The look is drawn in the design canvas (artifact "Ombelle design"), page "0.8.2 Retro futurism": nine boards,
Foundations, Actions, Text fields, Choice controls, Content, Status, Navigation, Overlays, Data, every component
and variant in light and dark. It grew from the "0.8 style proposals" Retro futuristic board (buttons and card).
The shared board stylesheet is committed at `docs/internal/superpowers/specs/assets/retro-futurism-082-board.css`. This
work turns that design into a shipped, stable family, the same way Organic was shipped (decision 0007).

## Goals

- `retro-futurism` is a stable style family in 0.8.2, supported by all 57 catalog components, in light and dark.
- Every variant, size and state drawn in the canvas exists in the real component styles.
- It meets the bar of the other stable families: contrast tests, `pnpm test:specimen-audit` (focus, clipping,
  overflow, label spacing, target size, forced colors, axe) clean for every Retro futurism specimen, and
  deterministic compiler output.
- Retro futurism is selectable wherever the other families are: preset editor, Button editor, preview gallery,
  documentation playground, site showcase and style morph, recipe and component-preset fixtures, consumer
  matrix.
- Seven Retro futurism palettes in the preset editor, each a full light and dark set that passes the contrast
  tests, and each recolouring the signature (gradient band, sun, stripes) because those derive from tokens.
- A decision record `docs/decisions/0008-retro-futurism-family.md`, written like 0007, stating the look, the
  contract change, where it is offered, every deviation from the canvas and exactly what was verified.

## Non-goals

- No new components or variants. The catalog stays at 57.
- No change to the output bytes of the other stable families, nor to liquid glass.
- No new fonts: Michroma, Exo 2 and Space Mono are already in the registry.
- No version bump, npm publish, tag or PR unless asked. The 0.8.2 release itself is a separate step.
- No claim of real-browser forced colors, human keyboard or screen reader review, or consumer apps beyond what
  is actually run.

## Anti-goals

- A Retro futurism that is "Neo-brutalism in orange", or "Organic with borders". The structural differences
  must survive in the CSS: pill controls, two-tone scanline fills, the 4px key drop on press, the sunset
  header band with the striped sun on cards and tables, the three-stripe band on dialogs and alert dialogs,
  striped progress and slider fills, the sun slider thumb.
- A family registered while some component still lacks a Retro futurism file.
- Signature colours hard-coded so that palettes cannot recolour them.
- Controls that lose their outline in forced colors, or a gradient band whose text vanishes there.
- Motion that ignores `prefers-reduced-motion` (hover lift, key drop, indeterminate progress, transitions).
- Documentation or evidence claims broader than what was actually run.

## Constraints

- Follow `AGENTS.md`: Conventional Commits, schemas edited in `schemas/` then regenerated, catalog inputs edited
  in `templates/`, `styles/`, `presets/` and never in `generated.ts`, deterministic compiler output, `.js`
  import specifiers.
- `pnpm build:packages` fails on a catalog style rule that names no slot or marker. Each file targets real
  `data-slot` and marker attributes. Keyframe names stay `ombelle-*`.
- Built-in presets cannot name font families. The preset ships `system-sans`; headings use
  `var(--font-heading, <fallback stack>)` and the editors start the family with its fonts through
  `styleFamilyFonts['retro-futurism']`: body `exo-2`, display `michroma`, mono `space-mono`.
- Michroma is display-only and single-weight (400) and very wide. Every heading rule uses weight 400 and the
  canvas's reduced heading sizes (card titles 16px, dialog titles 18px, accordion triggers 14px, the labelled
  separator 13px). Michroma is never a body or control font.
- Text pairs reach 4.5:1 (3:1 at large size). Contrast and the audit win over the canvas; deviate only as far
  as needed and record it in 0008. The canvas pairs were measured: all pass (light primary on white 5.3:1,
  teal 5.0:1, gradient band text 5.3:1 at the orange end; dark pairs 6.3:1 and above).
- The preset carries the same 26 tokens per mode as Organic: the usual 19, `shadowColor`, and `success`,
  `warning`, `info` with their foregrounds (soft status tints).
- Gate: the site offers Retro futurism only when `publishedInstaller` is at least `retroFuturismMinimumCli`
  (`0.8.2`); the published installer is 0.8.1, so it stays hidden until 0.8.2 ships.
- Branch `feat/style-retro-futurism` in worktree `.claude/worktrees/style-retro-futurism`, cut from
  `origin/main` at `043d65f8` (0.8.1 recorded). It does not carry `fix/component-example-layout`.
- The canvas was built by script from the Organic boards and has not been rendered. Treat it as the design
  source for the look, not as measured evidence; board heights are approximate.

## Approaches

1. **Chosen: the Organic route.** Preset first, then each component's file built from its Papier body (the
   Ombelle structure with slot, state and forced-colors rules) with a mechanical pass and a Retro futurism
   layer after the marker comment `/* retro-futurism layer */`; registration with the last file; one audit run
   and one repair pass, then rerun only what changed. Proven twice. Cost: Papier has borders and offset
   shadows of its own (1px, 2px offsets), so the mechanical pass must turn them into 2px indigo outlines and
   4px/6px key shadows rather than add them from scratch. Risk: a wrong shared decision reworks many files;
   mitigated by a checkpoint after the first three boards.
2. Start from each Neo-brutalism file (already has 2px borders, hard offset shadows, a header band on cards).
   Less rework, but a higher risk of reading as Neo-brutalism in new colours.
3. One board at a time with an audit after each: about nine audit runs, against the convention of not rerunning
   passing audits.

The user chose 1.

## Design

Commits on the branch, in this order. Every commit passes `pnpm test:unit`.

1. **Preset and contract.** `presets/retro-futurism.json` from the canvas `.light` and `.dark` blocks (token
   mapping below), `system-sans`, `borderWidthPx` 2, shadow offset 0 by 4px, nominal `radiusRem`. Add
   `retro-futurism` to the `styleFamily` enum in `schemas/preset.schema.json` (after `organic`, before
   `liquid-glass`), regenerate `preset-schema.ts`. Registration stays out until the last style file lands.
2. **Styles.** `styles/retro-futurism.css`, the family base (shared custom properties, Button, Input, Dialog,
   reduced motion, as in every family) and one `styles/<component>/retro-futurism.css` per other component,
   54 files, in canvas board order. Reference for every rule: the committed board stylesheet. Checkpoint after
   Foundations, Actions and Text fields (base, Button, Button Group, Toggle, Toggle Group, Toolbar, Chip,
   Badge, Kbd, Input family), viewed in the preview in light and dark before the rest.
3. **Registration and wiring**, following the Organic commit (`git show 8dac8920 --stat` lists every site):
   `supportedStyleFamilies` (append after `organic`), `styleSupport` stable for all 57, `styleFamilyFonts`,
   family pickers in both editors (sample: an orange two-tone pill on its key shadow, no Beta tag), preview
   gallery and the `/retro-futurism/` route, recipe fixtures (`rc_retro_futurism_button`), recipe and
   component-preset evidence scripts, four consumer matrix rows (`vite-retro-futurism`,
   `next-retro-futurism`, `npm-vite-retro-futurism`, `npm-next-retro-futurism`: 50 to 54 rows),
   `retroFuturismMinimumCli = '0.8.2'` in `apps/www/src/snapshots/install-command.ts`, the home showcase and
   style-morph demo block (`[data-style="retro-futurism"]`), snapshot migration only if the store validates
   family names.
4. **Palettes.** Seven palettes in `apps/www/src/preset-editor/schemes.ts`, each a full light and dark set,
   none equal to the built-in default, palette tests extended to the family.
5. **Tests and fixtures.** `retro-futurism-styles.test.ts` (57-file coverage, lint, variant coverage, like
   `organic-styles.test.ts`); the per-component family lists in catalog tests, including the 31 files that
   still list `papier` without `organic` where a list is meant to be complete; `stable-family-hashes.json` (only
   `retro-futurism/*` lines may change), compiler style baseline, contrast tests for the token pairs in both
   modes, integration tests that count families. Regression tests for Organic's audit findings that apply here
   (focus ring on highlighted menu rows, toast shadow inside its viewport, decorations inside their box, Base
   UI slider thumb room, forced-colors boundaries) are written before the styles they guard.
6. **Verification.** `pnpm build:packages`, `pnpm generate:preview`, `pnpm typecheck`, `pnpm test:unit`,
   focused `pnpm test:integration`, then `OMBELLE_AUDIT_FAMILIES=retro-futurism pnpm test:specimen-audit`
   with `--timeout=1800000` (Edge via `OMBELLE_BROWSER_CHANNEL=msedge` if bundled Chromium is missing). One
   repair pass, then rerun only what changed. A fresh whole-branch review for cascade bugs the audit cannot
   see, fixed test-first.
7. **Docs.** Decision record 0008, `docs/03-components-styles-accessibility.md`, component docs that list
   families, `docs/cli-release.md`, README consumer list, a CHANGELOG "Unreleased" entry. The record states
   exactly what was run and what was not.

### Token mapping (canvas to preset)

| Preset token | Light | Dark | Canvas source |
|---|---|---|---|
| background / foreground | `#F6EFE3` / `#2A1B4D` | `#150B2E` / `#FFF1F8` | `--bg` / `--fg` |
| card, popover (+ fg) | `#FFFAF0` | `#22123F` | `--card` |
| primary / fg | `#C23B1B` / `#FFFFFF` | `#FF8A4C` / `#1A0B2E` | `--pri` / `--prif` |
| secondary / fg | `#0F7C7A` / `#FFFFFF` | `#3DE6E0` / `#1A0B2E` | `--tea` (teal secondary button) |
| muted / fg | `#ECDFF0` / `#5A4B7A` | `#35205A` / `#BFA9E0` | `--sec` / `--mfg` |
| accent / fg | `#ECDFF0` / `#2A1B4D` | `#35205A` / `#FFF1F8` | `--sec` (wells, hover) |
| destructive / fg | `#8C1D5B` / `#FFFFFF` | `#FF6FB1` / `#1A0B2E` | `--dst` |
| success, warning, info (+ fg) | soft tints `--ok-s`, `--warn-s`, `--info-s` with their `-t` texts | same | status blocks |
| border, input | `#2A1B4D` | `#C9B5EA` | `--bd` |
| ring | `#2A1B4D` | `#3DE6E0` | `--ring` |
| shadowColor | `#2A1B4D` | `#C9B5EA` | key shadow is the border colour |

Derived in `retro-futurism.css`, never hard-coded, so palettes recolour them: the second fill tone
(`--pri2`, `--tea2`, `--dst2` as `color-mix` of the fill with black), gradient band start = primary and end =
destructive, gradient text = primary foreground, the sun colour (see Calls made), the three stripes = primary,
sun and secondary.

### Signature rules (from the board stylesheet)

The board stylesheet is the reference for every rule. Where this summary and the stylesheet disagree, the
stylesheet wins.

- **Button:** pill, 2px border in `--border`, key shadow `0 4px 0`, 4px block-end margin for the shadow, fill
  `linear-gradient(top tone 52%, darker tone)` with a scanline layer over the lower 48%. Hover: brightness
  1.08, lift 1px, shadow 5px. Press: translate 4px, shadow 0. Focus: 3px ring, 4px offset. Disabled: 45%
  opacity, already dropped. Outline: card fill; ghost and link: no border, no shadow; link underline is
  straight 2px in the primary. Sizes 36 / 46 / 56px, icon 46 and 36.
- **Button group:** one outline and key shadow around the group, pill ends, 2px seams; vertical group radius
  24px.
- **Card:** 2px border, 28px radius, 6px key shadow. Header is the sunset gradient band with a 2px bottom
  border and a striped sun disc at the end, hidden when the header holds an action, badge, avatar or
  selection indicator. Outlined and subtle appearances drop the gradient and keep the sun. Table header rows
  use the same band.
- **Dialog and alert dialog:** a band of three stacked stripes (primary, sun, secondary) across the top edge.
  Sheets get the outline only, as drawn. The stripes under the canvas board titles are a canvas device, not a
  component.
- **Separator:** a 2px rule in the border colour; the labelled separator sets its label in Michroma 13px.
- **Fields:** 14px radius, 2px border, a faint inner line, primary border on hover, ring on focus, dashed when
  read-only. OTP slots 12px. Checkbox 6px.
- **Toggles, tabs, chips, badges, pagination, tooltips, compact alerts:** pills. Selected pill tabs,
  toolbar-style toggle group items and the current pagination page sit on a 2px outline and a 3px key shadow;
  a pressed standalone toggle, the selected segment of a segmented toggle group and the selected contained tab
  get the outline without a key shadow.
- **Progress, meter, slider:** outlined pill tracks, striped fills (tones per status), slider thumb a sun disc
  with an outline and key shadow.
- **Overlays:** 2px outline and an 8px key shadow plus a soft drop; popovers and menus 22px radius.

## Calls made (mine, for you to check)

- **Family id and name:** `retro-futurism`, display name "Retro futurism".
- **Secondary is teal.** The canvas uses a soft lilac for wells and hover and teal for the secondary button.
  The shared Button reads `--secondary`, so teal is `secondary`, and the lilac is `muted` and `accent`.
- **Sun colour.** The canvas sun (`#F2B134` / `#FFD36B`) has no token. It is derived from the warning
  foreground mixed toward white (light) or used as is (dark) so palettes move it; the builder may pick a
  different derivation that keeps it a warm yellow in every palette.
- **Dark key shadow** is the lilac border colour, as drawn: shadows read as light slabs under dark controls.
- **Hit areas:** 46px default, 36px small, as drawn; the audit's target-size check decides.
- **Palettes:** seven, names by character (starting point, builder may rename): Sunset, Orbit, Neon, Lunar,
  Atomic, Aurora, Cosmos.
- **No striped separator.** The canvas draws a thick striped separator, carried over from the Organic board,
  but the Separator component has no such variant, and adding one breaks the "no new variants" non-goal. It is
  left out and recorded as a deviation in 0008.
- **Evidence:** measured evidence files are regenerated only if the full gate runs; 0008 says so.

## Left to the builder

- Exact slot selectors per component (follow the Papier and Organic files for structure).
- Forced-colors fallbacks: the gradient band, stripes and scanlines are backgrounds and disappear there, so the
  header keeps a `CanvasText` bottom border and text in `CanvasText`; inset-shadow outlines need border
  fallbacks.
- Whether `color-mix` needs a fallback (follow what Organic does).
- File-by-file token tuning to reach contrast while keeping the look; final palette names and values.
- Whether snapshot migrations are needed (check `apps/www/src/snapshots/server/`).
