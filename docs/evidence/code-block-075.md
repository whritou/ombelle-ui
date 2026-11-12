# Evidence: Code Block (0.7.5)

Sub-project 3 of the 0.7.5 work. Spec: `docs/superpowers/specs/2026-11-12-code-block-075-design.md`.

## Website size, before

The editor-inputs evidence (`docs/evidence/editor-inputs-075.md`) holds only a "before" table, which repeats the "after fixes" table of `docs/evidence/primitives-075.md`. It has no "after" table yet, and `apps/www` changed on this branch's base (`7f6d87f feat(www): use catalog Number Input and Color Picker in the editors`, base `894a0e4`). The table below is therefore the editor-inputs baseline, taken on `feat/primitives-075` before the Number Input and Color Picker swaps, and not a measurement of `894a0e4`. The editor-inputs "after" table, once measured on the commit that carries those swaps, replaces it as this sub-project's "before". The website was not built in this task. Method: `corepack pnpm run build` in `apps/www`, then `node scripts/measure-www-first-load.mjs` (gzip level 9 of every script a route's prerendered HTML loads). The limit is 10 kB gzip of growth per route.

| Route | Scripts | First Load JS, gzip |
| --- | --- | --- |
| `/editor/preset` | 17 | 829.7 kB |
| `/editor/component` | 10 | 240.4 kB |
| `/editor/component/button` | 18 | 835.0 kB |
| `/docs` | 11 | 241.4 kB |
| `/docs/getting-started` | 12 | 248.5 kB |
| `/components` | 14 | 415.8 kB |
| `/components/accordion` | 16 | 813.1 kB |

## Token contrast

Task 4 (`packages/catalog/test/code-block-contrast.test.ts`). The surface is `oklch(0.2 0.012 275)` in every family and both modes; ratios are WCAG 2 contrast on it, from `parseColor` and `contrastRatio` in `templates/color-picker.tsx`. The board's `color-mix(in oklab, var(--code-fg) N%, transparent)` values are written as the sRGB blend over the surface. Keyword and tag keep the family preset primary's hue at lightness `max(0.78, primary L)` and chroma `min(0.12, primary C)`, which gives the board's `oklch(0.78 0.12 6)` in Ombelle; flat and liquid glass are cut to chroma 0.11 to stay inside sRGB. No board colour failed its floor, so none was lightened.

| Property | Families | Value | Ratio |
| --- | --- | --- | --- |
| `--code-block-foreground` | all | `oklch(0.93 0.005 275)` | 14.74 |
| `--code-block-comment` (board 55 %) | all | `oklch(0.631 0.007 275)` | 5.19 |
| `--code-block-string` (board green) | all | `oklch(0.82 0.11 150)` | 10.81 |
| `--code-block-punct` (70 %) | all | `oklch(0.734 0.006 275)` | 7.68 |
| `--code-block-line-number` (board 40 %, floor 3:1) | all | `oklch(0.524 0.008 275)` | 3.34 |
| `--code-block-keyword` (board) | Ombelle | `oklch(0.78 0.12 6)` | 8.58 |
| `--code-block-keyword` | flat, liquid glass | `oklch(0.78 0.11 264)` | 8.99 |
| `--code-block-keyword` | minimalist | `oklch(0.78 0 0)` | 9.05 |
| `--code-block-keyword` | neo-brutalism | `oklch(0.88 0.12 92)` | 12.63 |
| `--code-block-attr` | Ombelle, flat, minimalist, liquid glass | `oklch(0.82 0.1 70)` | 10.22 |
| `--code-block-attr` | neo-brutalism (apart from its yellow keyword) | `oklch(0.8 0.1 350)` | 9.28 |
| `--code-block-property` | Ombelle, minimalist, neo-brutalism | `oklch(0.82 0.08 210)` | 10.66 |
| `--code-block-property` | flat, liquid glass (apart from their blue keyword) | `oklch(0.8 0.1 300)` | 9.41 |

## Liquid glass focus ring and rim

- The glass root sets `--foreground` to `--code-block-foreground`, so the family's 2px `--foreground` focus ring shows on the always-dark code surface (the light-mode glass foreground is `#0F172A`).
- The root clips its rounded corners (`overflow: hidden`, as on the board), so the code `pre` and the command tab panel draw that 2px ring at `outline-offset: -2px`, as Combobox and Command do in glass; the header tabs and Copy keep offset 0.
- The glass root draws the board's rim, `1.5px solid` white at 50 %, instead of the preset's 14 % `--border`, which vanishes on the dark surface. Forced colours still replace it with a 1px `CanvasText` border.
