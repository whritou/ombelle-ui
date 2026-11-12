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
