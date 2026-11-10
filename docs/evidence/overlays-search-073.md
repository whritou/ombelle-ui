# Overlays and search evidence (0.7.3)

Combobox, Command, Hover Card and Context Menu. Spec: `docs/superpowers/specs/2026-11-10-overlays-search-design.md`.

## Website size

First-load JavaScript of the editor routes, measured by `node scripts/measure-www-first-load.mjs` after `pnpm run build` in `apps/www`. It is the sum of the gzipped size (level 9) of every script a route's prerendered HTML loads. The limit for this work's editor changes is 20 kB gzip of growth per route.

The branch starts at `84aca6c`. No `apps/www` or `scripts` file has changed since the last form-controls measurement (`834406c`), so that measurement is the baseline.

| Route | Branch start | Before the editor changes | After the editor changes | Editor changes |
| --- | --- | --- | --- | --- |
| `/editor/preset` | 14 scripts, 756.6 kB | 14 scripts, 778.1 kB | 17 scripts, 781.2 kB | +3.1 kB |
| `/editor/component` | 9 scripts, 237.1 kB | 9 scripts, 238.1 kB | 10 scripts, 238.5 kB | +0.4 kB |
| `/editor/component/button` | 14 scripts, 748.5 kB | 14 scripts, 769.4 kB | 17 scripts, 786.2 kB | +16.8 kB |

All sizes are gzip, level 9.

- **Catalog growth (about 21 kB):** the editor runs the compiler and catalog in the browser, so the four new components' templates and stylesheets add to every editor route that compiles recipes.
- **Editor changes (up to 16.8 kB):** the Combobox pickers (the Button icon and the glass preset) and the Commands button. The command palette and cmdk load on first open (`next/dynamic`), so they are not in these totals. The Button route carries the most because it shows both pickers.

The editor changes stay within the 20 kB limit.
