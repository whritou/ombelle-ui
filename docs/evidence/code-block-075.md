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
