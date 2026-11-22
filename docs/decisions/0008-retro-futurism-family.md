# Retro futurism style family decision

16 November 2026. Retro futurism is added as a stable style family beside flat, minimalist, neo-brutalism, ombelle, papier and organic, for release 0.8.2. Liquid glass stays experimental and is not changed.

Design source: the design canvas page "0.8.2 Retro futurism" (nine boards, every component and variant in light and dark), grown from the "0.8 style proposals" Retro futuristic board. The reference stylesheet is committed at `docs/internal/superpowers/specs/assets/retro-futurism-082-board.css`. Spec: `docs/internal/superpowers/specs/2026-11-16-retro-futurism-family-design.md`. Plan: `docs/internal/superpowers/plans/2026-11-16-retro-futurism-family.md`.

## Look

Retro futurism is a 1970s space-age look: cream (`#F6EFE3`) and deep indigo (`#2A1B4D`) in light, a violet night sky (`#150B2E`) in dark. The primary is rocket orange (`#C23B1B` light, `#FF8A4C` dark) and the secondary a saturated lagoon teal (`#0F7C7A`, `#3DE6E0`); soft lilac (`#ECDFF0`, `#35205A`) is the muted and accent surface. Controls are pills with a 2px indigo outline and a hard key shadow (`0 4px 0` in the border colour, a light lilac slab in dark). Filled buttons split into two tones with fine scanlines on the lower half; hover lifts them 1px and pressing drops them 4px onto the shadow. Cards carry a sunset gradient header band (primary to destructive) with a striped sun disc; table header rows use the same band; dialogs and alert dialogs carry a band of three stacked stripes (primary, sun, secondary). Progress and meter fills and the slider range are striped, the slider thumb and the checked switch thumb are small suns. Headings are Michroma, interface text Exo 2, code Space Mono.

Tokens live in `packages/catalog/src/presets/retro-futurism.json`. The family stylesheet is `packages/catalog/src/styles/retro-futurism.css` (which also styles Button, Input and Dialog, as in every family), with one `retro-futurism.css` per component under `packages/catalog/src/styles/<component>/`. Each component file is the component's Papier body after Organic's mechanical pass, with Organic's shape tokens mapped to Retro futurism ones (`--rf-r1` to `--rf-r4`, `--rf-pill`, key-shadow elevations `--rf-e1` to `--rf-e3`, the divider colour `--rf-rule`), followed by a Retro futurism layer after the marker comment `/* retro-futurism layer */`. The signature colours are derived in the base from tokens, never hard-coded in component files, so palettes recolour them: the second fill tones `--rf-pri2`, `--rf-sec2`, `--rf-dst2` (the fill mixed 16% toward black), `--rf-band`, `--rf-stripes`, `--rf-sun` (a warm yellow mixed with the warning foreground) and `--rf-key` (the shadow colour). Keyframe names stay `ombelle-*`.

## Contract changes

- `schemas/preset.schema.json` gains `retro-futurism` in the `styleFamily` enum (after `organic`, before `liquid-glass`); `packages/contracts/src/preset-schema.ts` is regenerated from it.
- `supportedStyleFamilies` is now `flat`, `minimalist`, `neo-brutalism`, `ombelle`, `papier`, `organic`, `retro-futurism`; `styleFamilies` appends `liquid-glass`. `styleSupport` reports `stable` for every component in retro-futurism.
- Catalog and compiler compatibility versions stay 0.1.0 and schema 1.0. The change is additive: the other families produce the same bytes (only `retro-futurism/*` lines were added to the recorded hashes and specimens), and a preset or recipe that does not name retro-futurism is unaffected.
- The preset carries 26 tokens per mode, as Papier and Organic do. `radiusRem` is a nominal 0.875 (shapes are fixed values in the CSS), `borderWidthPx` is 2 and the shadow offset is 0 by 4px.

## Fonts

Michroma (display, single weight 400), Exo 2 (body) and Space Mono (code) were already in the font registry, so no font is added and no font is gated. As for Papier and Organic, a built-in preset cannot name fonts, so Retro futurism ships `system-sans`, its CSS sets headings with `var(--font-heading, system-ui, sans-serif)` at weight 400, and the editors start the family with its fonts through `styleFamilyFonts['retro-futurism']` (body `exo-2`, display `michroma`, mono `space-mono`). Michroma is far wider than the other families' display faces, so every heading that switches to it is drawn at about three quarters of the Organic size (card title 16px, dialog title 18px, accordion trigger 14px).

## Deviations from the design

- **Secondary.** The canvas uses one soft lilac for wells and hover and a teal only for the secondary button. The shared Button reads `--secondary`, so teal is the `secondary` token and the lilac is `muted` and `accent`. Every surface the Papier and Organic bodies drew with `--secondary` is drawn with `--muted` (wells, tracks) or `--accent` (hover, highlighted rows); a test fails any `--secondary` background that is not a filled control.
- **No striped separator.** The canvas draws a thick striped separator carried over from the Organic board; the Separator component has no such variant, so it is left out.
- **No toast countdown bar.** The canvas toast has a striped countdown bar; the Toast component has no such element.
- **Card sun.** The sun is placed against the card, 14px from its top, because positioning the header would confine a linked card's click area. It is hidden when the header holds an action or more than a title and description, and on cards with media.
- **Card selectors.** Card selectors name one slot each, so appearances and density reach the header through inherited custom properties (`--rf-head-bg`, `--rf-head-fg`, `--rf-head-line`, `--rf-desc`, `--rf-sun-*`, `--rf-title-size`).
- **Card actions.** The family base cannot name a second slot (the button recipe compiler refuses it), so the card-action button reset lives in the card file.
- **Focus on highlighted rows**, **toast shadow**, **dialog decoration inside the box**, **Base UI slider thumb room**: carried over from Organic's audit fixes (decision 0007).
- **Tooltip key cap** keeps Papier's 4px radius.

## Verification status

Recorded on 17 November 2026 on Windows 11 with Node 24.19.0 and pnpm 11.25.0 through corepack, on branch `feat/style-retro-futurism`.

Run on this machine and passing:

- `pnpm build:packages` (which lints every Retro futurism file against the catalog slots), `pnpm generate:preview`, `pnpm typecheck`.
- `pnpm test:unit`: 259 files, 5422 tests (before the audit repair; the changed catalog and compiler suites were rerun after it).
- The Retro futurism coverage and lint test (`retro-futurism-styles.test.ts`, 201 tests: base file, 54 component files, variant coverage, the `--secondary`-as-fill rule and the signature rules per board) and the audit regression tests (`retro-futurism-review-fixes.test.ts`), each written to fail first.
- Integration tests that count families or measure contrast: `contrast` (Retro futurism token pairs in both modes, including the band text against destructive), `consumer-matrix`, `consumer-evidence`, `recipe-evidence`, `component-preset-evidence`, `foundation-groups`, `preset-gallery-generation`. The stable-family hashes and the three default-specimen fixtures were re-recorded: only `retro-futurism/*` entries were added, the other families' bytes are identical.
- 27 catalog test files whose family lists stopped at papier now include organic and retro-futurism. Four Organic cases in them fail on Organic's own files and are left out (see Known gaps).
- `pnpm test:specimen-audit` for Retro futurism (`OMBELLE_AUDIT_FAMILIES=retro-futurism`, radix and base, light and dark), with `--timeout=1800000`, on Microsoft Edge through `OMBELLE_BROWSER_CHANNEL=msedge`. The first run failed on real findings, all focus indicators under 3:1: the ring inside an orange button-group segment, and the ring on the sunset band around the card action and the table sort button. Each was reproduced by a failing test and fixed; the rerun for those three components (`OMBELLE_AUDIT_COMPONENTS=button-group,card,table`) passed in all four configurations.
- A fresh whole-branch review found cascade bugs the audit cannot see: the sorted table column drawn in indigo on the band (about 2:1), transparent sticky header cells, button-group hover squaring the end segment, card-action buttons regaining the key shadow on hover and press, wrapped tooltips cutting their text, and the component editors offering Retro futurism before CLI 0.8.2. Each was reproduced by a failing test (`retro-futurism-review-fixes.test.ts`, `catalog-properties.test.tsx`) and fixed; the unit suite was rerun (5430 of 5431 pass; the CLI snapshot-cache test timed out under full-suite load and passes alone), and the specimen audit was rerun for Button Group, Card, Table and Tooltip in all four configurations.
- A computed-style check of the first boards (actions and text fields) in the preview against the canvas, in light mode.

Not run, so nothing here supports a claim about them:

- The Retro futurism consumer apps; no consumer app was prepared, built or browsed, and no consumer evidence file was regenerated. The four rows exist in the consumer matrix by derivation.
- `pnpm check:foundation`, the Yarn and Bun consumers, and the browser specs outside the specimen audit. The browser spec counts in `scripts/foundation-evidence.mjs` and `foundation-groups.test.ts` (1185 cases in 21 files) were confirmed with `playwright test --list` against a consumer manifest written from the consumer matrix; the browser specs themselves were not run.
- Real-browser forced-colors rendering beyond the automated audit, dark mode by eye, and human keyboard or screen reader review. The palettes were checked by the contrast tests only.

Review minors fixed after the first review round, each by a failing test in `retro-futurism-review-fixes.test.ts`: fields keep their 14px corners on focus; outlined surfaces with a key shadow (toolbar, table container, bordered accordion, scroll area, code block, aspect ratio) keep 8px below them; a card description outside a banded header stays muted; a link-button underline in a card header follows the header text colour; item media draws one outline and item media and actions keep a forced-colours boundary; compact alerts use a fixed 1.375rem radius so wrapped text stays inside.

Other known gaps: the specimen-audit run also failed `code-block-075.spec.ts` ("the code scrolls from the keyboard inside its height and the page does not", page 1131px wide in a 1100px viewport) on the Ombelle edition page, whose output this change does not alter; it is not investigated here. Four Organic cases stay out of the widened family lists (card stretched-link selectors, tooltip key radius, command radius, destructive mix spacing) because fixing them changes Organic's output. The canvas was built by script and only partly rendered; the toast countdown bar and the striped separator are not implemented (no matching component element).


## Where it is offered

- Gate: the website offers Retro futurism only when its published installer (`publishedInstaller` in `apps/www/src/snapshots/install-command.ts`) is at least `retroFuturismMinimumCli` (0.8.2), and keeps it selectable for a restored draft that already uses it. The published installer is 0.8.1, so Retro futurism is hidden on the site until 0.8.2 is published and `pnpm version:set --published 0.8.2` lands. No version bump, publish or tag is part of this change.
- Both editors: the Style family pickers list Retro futurism (sample: an orange two-tone pill on its key shadow) with no Beta tag. Seven palettes in the preset editor: Sunset, Orbit, Neon, Lunar, Atomic, Aurora and Cosmos, each a full light and dark set that passes the shared contrast tests and keeps the band text legible against the preset destructive.
- Preview: `/retro-futurism/` and the audit gallery. Site: the home showcase and style morph (`[data-style="retro-futurism"]`), once the gate opens.
- Fixtures and consumers: the `rc_retro_futurism_button` recipe derives from `supportedStyleFamilies`; the consumer matrix gains four stable rows (`vite-retro-futurism`, `next-retro-futurism`, `npm-vite-retro-futurism`, `npm-next-retro-futurism`), from 50 to 54 rows.

## Existing projects

Nothing rewrites installed files. A project adopts retro-futurism only by running `init --preset` or `theme add` with a retro-futurism preset, subject to the usual modified-file conflict checks.
