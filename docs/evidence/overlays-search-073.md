# Overlays and search evidence (0.7.3)

Combobox, Command, Hover Card and Context Menu. Spec: `docs/superpowers/specs/2026-11-10-overlays-search-design.md`.

## Website size

First-load JavaScript of the editor routes, measured by `node scripts/measure-www-first-load.mjs` after `pnpm run build` in `apps/www`. It is the sum of the gzipped size (level 9) of every script a route's prerendered HTML loads. The limit for this work's editor changes is 20 kB gzip of growth per route.

The branch starts at `84aca6c`. No `apps/www` or `scripts` file has changed since the last form-controls measurement (`834406c`), so that measurement is the baseline.

| Route | Branch start |
| --- | --- |
| `/editor/preset` | 14 scripts, 756.6 kB |
| `/editor/component` | 9 scripts, 237.1 kB |
| `/editor/component/button` | 14 scripts, 748.5 kB |
