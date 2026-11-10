# Form controls evidence

Evidence for Slider, Toggle Group, Chip, Tag Input and Input OTP (0.7.3), and for the website editor's switch to them. Design: [form controls](../superpowers/specs/2026-11-10-form-controls-design.md).

All runs are local runs by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0. None is a CI run or a human review.

## Website size

First-load JavaScript of the editor routes, measured by `node scripts/measure-www-first-load.mjs` after `pnpm run build` in `apps/www`. Next.js 16 no longer prints First Load JS, so the script sums the gzipped size (level 9) of every script a route's prerendered HTML loads. The limit for this work is 10 kB gzip of growth per route.

| Route | Before (`67d9fbb`) | After |
| --- | --- | --- |
| `/editor/preset` | 13 scripts, 725.8 kB gzip | |
| `/editor/component` | 9 scripts, 235.8 kB gzip | |
| `/editor/component/button` | 13 scripts, 718.1 kB gzip | |
