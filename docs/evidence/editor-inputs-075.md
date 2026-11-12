# Evidence: Number Input and Color Picker (0.7.5)

Sub-project 2 of the 0.7.5 work. Spec: `docs/superpowers/specs/2026-11-12-editor-inputs-075-design.md`. Plan: `docs/superpowers/plans/2026-11-12-editor-inputs-075.md`.

## Website size, before

The baseline is the last measurement of sub-project 1, "after fixes" in `docs/evidence/primitives-075.md`, taken on `feat/primitives-075`. This branch starts from that branch and changed no website code before the swaps, so the build was not repeated. Method: `corepack pnpm run build` in `apps/www`, then `node scripts/measure-www-first-load.mjs` (gzip level 9 of every script a route's prerendered HTML loads). The limit is 10 kB gzip of growth per route.

| Route | Scripts | First Load JS, gzip |
| --- | --- | --- |
| `/editor/preset` | 17 | 829.7 kB |
| `/editor/component` | 10 | 240.4 kB |
| `/editor/component/button` | 18 | 835.0 kB |
| `/docs` | 11 | 241.4 kB |
| `/docs/getting-started` | 12 | 248.5 kB |
| `/components` | 14 | 415.8 kB |
| `/components/accordion` | 16 | 813.1 kB |

## Website size, after the editor swaps

Measured at `894a0e4` on 2026-11-12 with the same method: `corepack pnpm run build` in `apps/www` (exit 0, about 10 minutes on this machine), then `node scripts/measure-www-first-load.mjs`. The limit is 10 kB gzip of growth per route.

| Route | Scripts before / after | First Load JS before | After | Change | Within 10 kB |
| --- | --- | --- | --- | --- | --- |
| `/editor/preset` | 17 / 18 | 829.7 kB | 871.8 kB | +42.1 kB | no |
| `/editor/component` | 10 / 10 | 240.4 kB | 241.1 kB | +0.7 kB | yes |
| `/editor/component/button` | 18 / 18 | 835.0 kB | 864.9 kB | +29.9 kB | no |
| `/docs` | 11 / 11 | 241.4 kB | 242.1 kB | +0.7 kB | yes |
| `/docs/getting-started` | 12 / 12 | 248.5 kB | 249.2 kB | +0.7 kB | yes |
| `/components` | 14 / 14 | 415.8 kB | 440.5 kB | +24.7 kB | no |
| `/components/accordion` | 16 / 15 | 813.1 kB | 837.3 kB | +24.2 kB | no |

Four routes exceed the limit. `/components` grows by about 25 kB without rendering either component, which points at the catalog source text those routes ship (two templates in two editions and five stylesheets each); the editor routes add the pickers' code on top. The split was not measured. Work stopped here for review, as the plan requires.

## Specimen audit

`OMBELLE_AUDIT_COMPONENTS=number-input,color-picker corepack pnpm test:specimen-audit` after `pnpm build:packages` and `pnpm generate:preview` (Chromium, Windows 11, Node 24.19.0): 182 passed, 3 failed (11.7 min). The three failures passed when rerun alone on a warm server:

- `specimen-audit.spec.ts` flat/radix/light: the first configuration of the run timed out waiting for the cold preview server's page; rerun: passed (10.1 s).
- `glass-scenes.spec.ts` luminance range and `overlays-search.spec.ts` Radix Hover Card: not Number Input or Color Picker specimens; rerun: passed.

No audit finding in any family for Number Input or Color Picker, so no style fix was needed.
