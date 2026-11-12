# Evidence: Code Block (0.7.5)

Sub-project 3 of the 0.7.5 work. Spec: `docs/superpowers/specs/2026-11-12-code-block-075-design.md`.

## Website size, before

Measured at `894a0e4` (`test(compiler): record the Number Input and Color Picker hashes after the editor fixes`), the base of this branch, which carries the editor-inputs website changes (`7f6d87f`). The branch head could not be built for this: `code-block` had joined the catalog but not the website, so `apps/www` failed its type check.

Method: a temporary git worktree at `894a0e4`; `corepack pnpm install --frozen-lockfile --ignore-scripts`, `corepack pnpm build:packages`, `corepack pnpm generate:preview`; `corepack pnpm run build` in `apps/www` (exit 0, Next.js 16.4.3 with Turbopack); then `node scripts/measure-www-first-load.mjs` (gzip level 9 of every script a route's prerendered HTML loads). Run on 2026-11-12 by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0 and pnpm 11.25.0; the worktree was removed afterwards. The limit is 10 kB gzip of growth per route.

| Route | Scripts | First Load JS, gzip |
| --- | --- | --- |
| `/editor/preset` | 18 | 871.8 kB |
| `/editor/component` | 10 | 241.1 kB |
| `/editor/component/button` | 18 | 864.9 kB |
| `/docs` | 11 | 242.1 kB |
| `/docs/getting-started` | 12 | 249.2 kB |
| `/components` | 14 | 440.5 kB |
| `/components/accordion` | 15 | 837.3 kB |

## Website size, after

Measured at `02fb028` (`feat(preview): show Code Block in the scenes, gallery and site`) with the same method, in this worktree after `corepack pnpm build:packages` and `corepack pnpm generate:preview` (`corepack pnpm run build` in `apps/www` exit 0). The growth covers the whole sub-project, mostly the Code Block template source and recipe description the site ships in the catalog. Every route stays inside the 10 kB gzip limit; the four routes that carry the catalog are within about 1.3 kB of it.

| Route | Scripts | Before, gzip | After, gzip | Growth |
| --- | --- | --- | --- | --- |
| `/editor/preset` | 18 | 871.8 kB | 880.7 kB | +8.9 kB |
| `/editor/component` | 10 | 241.1 kB | 241.4 kB | +0.3 kB |
| `/editor/component/button` | 18 | 864.9 kB | 873.5 kB | +8.6 kB |
| `/docs` | 11 | 242.1 kB | 242.3 kB | +0.2 kB |
| `/docs/getting-started` | 12 | 249.2 kB | 249.4 kB | +0.2 kB |
| `/components` | 14 | 440.5 kB | 449.2 kB | +8.7 kB |
| `/components/accordion` | 15 | 837.3 kB | 846.2 kB | +8.9 kB |

## Browser behaviour

`tests/e2e/code-block-075.spec.ts`, in `playwright.specimen-audit.config.ts` only (ignored by the default config). Command: `corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/code-block-075.spec.ts`, after `build:packages` and `generate:preview`, with the config's own preview server on port 4185 and Playwright's bundled Chromium (headless, reduced motion). Local run by an agent on Windows 11 Home 10.0.26300, Node 24.19.0, on 2026-11-12; not CI or a human review.

- Result: 16 passed, 8 per edition (radix and base), on `/editions/ombelle/<edition>/?mode=light`.
- Before the fix, the missing-clipboard case failed in both editions: a second Copy click made no change to the status region, so "Copy failed" was not announced again. The cleared status and the failure were set in the same render, because no `await` ran when `navigator.clipboard` was missing. `CodeBlockCopy` now awaits a rejected promise in that case, as it does for a rejecting write; the change sits in the shared `code-block-parts` block, byte-identical in both editions, and moves the four stable-family `code-block.tsx` hashes.
- `foundation-browser-inventory.test.ts` and `foundation-groups.test.ts` pass (50 tests), so the default config's browser count is unchanged.

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
