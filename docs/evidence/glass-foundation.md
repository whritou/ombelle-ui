# Liquid glass foundation

5 November 2026. This records PR A of [liquid glass kit parity](../superpowers/specs/2026-11-05-liquid-glass-kit-parity-design.md): the repurposed controls, the built-in preset values, the tinted-surface contrast model, the one-ink Button and the kit backdrop. Liquid glass stays experimental. This record does not run the full foundation gate, the browser e2e suite or the consumer matrix, and it is not a human visual or accessibility review.

## Source and environment

Branch `feat/glass-foundation`. Windows 11, Node v24.19.0, pnpm 11.25.0 (through corepack). The browser checks used Playwright 1.64.1 driving Microsoft Edge 156.0.4314.58 (Chromium) against the www dev server on port 3100, after `node scripts/build-hosted-preview.mjs`. The visual source is the "Liquid glass style family (experimental) — UI kit" board: `LiquidGlassKit.dc.html` and `LiquidGlassButtons.dc.html`, rendered locally from `file://` in the same browser for side-by-side comparison.

## What ran

| Check | Result |
| --- | --- |
| `corepack pnpm build:packages` | passed |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm test:unit` (`VITEST_MAX_WORKERS=4`) | 119 files, 1104 tests passed |
| `tests/integration/preset-gallery-generation`, `preview-routing`, `hosted-preview-build`, `liquid-glass-cli`, `www-route` | 5 files, 36 tests passed |
| `node scripts/build-hosted-preview.mjs` | passed |
| Playwright screenshots, light and dark: Button variants, states and hover per variant; Card, Dialog, Popover, Dropdown Menu, Tooltip, Tabs, Badge and Alert on the kit backdrop; the Button editor preview with a glass recipe in every variant and forced state | 26 captures and one inspector capture, reviewed against the kit board |

The checks above ran after the last code change on the branch, the Button size fix below.

Not run: `pnpm check:foundation`, the rest of `test:integration` (CI runs it), and the browser e2e suite (`test:e2e`), which does not run in CI or on this machine. No consumer-matrix row installs the new Button rules.

## Contrast bound, built-in preset

`glassContrastReport` for `packages/catalog/src/presets/liquid-glass.json` passes. The minimum opacity is 0.5. The lowest passing opacity is 0.5 in light and 0.32 in dark, and `--glass-nested-opacity` is 0.7 in light and 0.9 in dark. The editor readout says "Lowest passing opacity: 0.5 light, 0.32 dark." The four tinted Button pairs raised the dark values from 0.28 and 0.79.

The smallest ratio of each new pair, over the darkest filtered backdrop, the brightest, and the opaque fallback:

| Pair | Light | Dark |
| --- | --- | --- |
| `foreground` on `card` + `primary` 18% / 22% (rest) | 6.88 | 5.21 |
| `foreground` on `card` + `primary` 26% / 30% (hover) | 6.32 | 4.79 |
| `foreground` on `card` + `destructive` 16% / 20% (rest) | 6.93 | 5.39 |
| `foreground` on `card` + `destructive` 24% / 28% (hover) | 6.31 | 4.97 |

With `transparency: "reduced"` every pair passes on its opaque surface.

## What changed

- **Repurposed controls.** Shadow X / Y set the glass drop shadow offset on Card, Dialog, Popover, Dropdown Menu and Tooltip and the Button glow, with blur and spread scaled from Y. Border width sets the thickness of every glass edge. The `border` colour is the edge colour; Input and the outline Button keep `input`. For glass drafts both editors label them "Glass shadow X", "Glass shadow Y", "Glass edge width" and "Glass edge colour", with a hint each.
- **Built-in preset.** Shadow 0 / 12, border width 1, `border` light `oklch(20.8% 0.040 265.8 / 14%)` and dark `oklch(96.8% 0.007 247.9 / 14%)`. These reproduce the previous fixed shadows and the 14% foreground hairline.
- **Tinted-surface contrast model** in `packages/compiler/src/glass-contrast.ts`, with the four Button pairs above. The tint amounts are emitted as `--glass-primary-tint` and `--glass-destructive-tint` per mode.
- **One-ink Button** in `packages/catalog/src/styles/liquid-glass.css` and the scoped recipe CSS.
- **Kit backdrop** in `apps/preview/src/glass-backdrop.css`, behind the preset preview, the Button editor preview and the website playgrounds. The `glass-backdrop.webp` photo was removed.

## Tests added on this branch

- `packages/compiler/test/glass-contrast.test.ts`: tinted pairs mix the tint into the surface per mode, and reduced transparency evaluates them opaque. `apps/www/src/preset-editor/components/glass-panel.test.tsx`: the readout names the tint of a failing tinted pair.
- `packages/compiler/test/liquid-glass.test.ts`:
  - edges use `var(--border-width) solid var(--border)`, and no stylesheet keeps the 14% mix;
  - drop shadows read `--shadow-x` / `--shadow-y`;
  - an opaque `border` and negative offsets still compile;
  - the Button is one ink, its pairs are declared and pass, and reduced transparency paints the tinted Button opaque.
- `packages/compiler/test/recipe-styles.test.ts`: a glass recipe's shadow and border overrides reach the scoped Button glow and edge, and colour overrides apply over one ink.
- `apps/www` editor tests: glass labels and hints for the repurposed controls, values kept across a flat round trip, and the Button editor's edge-colour hint.
- `tests/integration/hosted-preview-build.test.ts`: the built preview CSS carries the kit gradient for both previews and no longer references the photo.
- `tests/integration/www-route.test.ts`: only the Button page carries the 0.5.0 restyle note.
- `packages/compiler/test/stable-families.test.ts` passes unchanged, so the stable families' bytes did not move.

## Visual review against the kit

| Surface | Kit board | Finding | Action |
| --- | --- | --- | --- |
| Button sizes | `.gb` padding 0 18px; `.gb.sm` 13px type; `.gb.lg` padding 0 22px, 15px type; `.gb.lnk` padding 0 6px | Glass Buttons used 16px default padding, 14px sm type, 20px lg padding and 16px lg type, and link had the default padding | Fixed: `fix(catalog): size glass Buttons as the kit draws them`. Computed sizes now match: 13px / 32px / 12px, 14px / 40px / 18px, and 15px / 48px / 22px |
| Button variants, hover, pressed, focus, disabled | Buttons board | Ink, tints, rims, glow, outline `input` rim, ghost surface on hover, link underline, 1px press with inner shade, 3px ring offset 3px and 50% disabled all match | None |
| Card, Tabs, Badge, Alert | Kit board | Match | None |
| Dialog | Kit board | Matches. The kit's Dialog holds two Buttons; the gallery's has a body line | None |
| Popover, Dropdown Menu | Kit board | Match. The gallery Popover holds an Input, which PR B moves to the kit's background surface | None in PR A |
| Tooltip | Kit board | The kit draws no arrow; the glass Tooltip keeps its opaque arrow, already a documented limitation | Listed, not fixed |
| Outline Button hover | Buttons board | The kit's 6% `foreground` hover tint has no visible effect on outline, because `.gb.out` sets its own background; ours tints outline. The difference is small | Listed, not fixed |

## Screenshots

Images are in [images/glass-foundation](images/glass-foundation/), each in `-light` and `-dark`:

- `button-variants`: default, secondary, outline, ghost, link and destructive at rest;
- `button-states`: rest, hover (pointer), pressed, focus (keyboard-style focus), disabled, small and large; `button-pressed` holds the pointer down on "Pressed";
- `button-hover`: one row per variant with that variant hovered;
- `card`, `tabs`, `badge` and `alert`;
- `tooltip`, `dropdown-menu` (open, first item highlighted), `popover` (open) and `dialog` (open);
- `button-editor-glass-recipe`: the Button editor preview with the example recipe in liquid glass, in every variant and forced state. The recipe keeps its overrides across the family switch (radius 0, edge width 2, shadow 6 / 6), so the capture also shows the repurposed controls at work.

`button-editor-glass-labels.png` shows the Button editor inspector's glass labels. The gallery Button rows are added to the page by the harness from the gallery's own Button markup, with each variant's attributes and classes. The unavailable placeholders are hidden while the Dialog is open, so it sits on the backdrop as the kit draws it.

## Limits

Agent-operated screenshot review is not a human accessibility or screen-reader audit. Forced colours, reduced transparency and missing backdrop filters were checked by compiler tests, not in the browser. Other browsers, mid-range mobile scrolling and consuming applications need their own checks. The published installer (0.4.1) still ships the previous glass Button. The website previews show the one-ink Button now, and the Button page notes the 0.5.0 restyle.
