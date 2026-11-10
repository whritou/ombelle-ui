# Form controls evidence

Evidence for Slider, Toggle Group, Chip, Tag Input and Input OTP (0.7.3), and for the website editor's switch to them. Design: [form controls](../superpowers/specs/2026-11-10-form-controls-design.md).

All runs are local runs by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0. None is a CI run or a human review.

## Website size

First-load JavaScript of the editor routes, measured by `node scripts/measure-www-first-load.mjs` after `pnpm run build` in `apps/www`. Next.js 16 no longer prints First Load JS, so the script sums the gzipped size (level 9) of every script a route's prerendered HTML loads. The limit for this work is 10 kB gzip of growth per route.

| Route | Branch start (`67d9fbb`) | Before the editor swap (`94e7949`) | After the editor swap | Swap |
| --- | --- | --- | --- | --- |
| `/editor/preset` | 13 scripts, 725.8 kB | 13 scripts, 738.5 kB | 14 scripts, 756.6 kB | +18.1 kB |
| `/editor/component` | 9 scripts, 235.8 kB | 9 scripts, 237.1 kB | 9 scripts, 237.1 kB | 0 |
| `/editor/component/button` | 13 scripts, 718.1 kB | 13 scripts, 730.2 kB | 14 scripts, 748.5 kB | +18.3 kB |

All sizes are gzip, level 9.

- **Catalog growth (about 12 kB):** the editor runs the compiler and catalog in the browser, so the five new components' templates and stylesheets add to every editor route that compiles recipes.
- **Editor swap (about 18 kB):** one new script of 18.5 kB holds the Radix Slider and Toggle Group runtimes, roving focus and the three compiled components. The inspector renders them at once, so deferring the script would not help.

The swap exceeded the 10 kB limit. The work stopped for review, and the user accepted the 18 kB on 10 November 2026, about 2.5% of each editor route.
