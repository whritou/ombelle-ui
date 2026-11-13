# Components 0.7.6 evidence

Track 1 of the 0.7.6 work: Password Field, Carousel, Aspect Ratio and Toolbar, and the Form, Fieldset and Checkbox Group parts of Field and Checkbox. Design: `docs/superpowers/specs/2026-11-13-components-076-design.md`. Plan: `docs/superpowers/plans/2026-11-13-components-076.md`.

## Website size, before

Measured at `8a06cd5d` (branch `docs/specs-076`, same code as `main` at `0b4f3e10`) in a clean worktree, with Node 24.19.0 and pnpm 11.25.0 on Windows 11: `corepack pnpm run build` in `apps/www`, then `node scripts/measure-www-first-load.mjs`.

| Route | Scripts | Raw | Gzip |
| --- | --- | --- | --- |
| `/editor/preset` | 18 | 4294.1 kB | 907.9 kB |
| `/editor/component` | 10 | 815.0 kB | 241.8 kB |
| `/editor/component/button` | 18 | 4269.5 kB | 901.1 kB |
| `/docs` | 11 | 817.1 kB | 242.8 kB |
| `/docs/getting-started` | 12 | 837.1 kB | 250.0 kB |
| `/components` | 14 | 2628.9 kB | 469.1 kB |
| `/components/accordion` | 16 | 4172.0 kB | 867.3 kB |
