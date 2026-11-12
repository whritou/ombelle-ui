# 0.7.5 variants evidence

Sub-project 4 of 0.7.5: the board variants of Checkbox, Switch, Progress and Popover (batch 4a) and Dialog, Alert Dialog and Breadcrumb (batch 4b). Spec: `docs/superpowers/specs/2026-11-12-variants-075-design.md`. Plan: `docs/superpowers/plans/2026-11-12-variants-075.md`.

## Website size, before

Measured at `bfc78c2` (`docs: plan the 0.7.5 variants and record the planning rulings in the spec`), the base of this branch, which carries Code Block and its website changes.

Method: a temporary detached git worktree at `bfc78c2`; `corepack pnpm install --frozen-lockfile --ignore-scripts`, `corepack pnpm build:packages`, `corepack pnpm generate:preview`; `corepack pnpm run build` in `apps/www` (exit 0, Next.js 16.4.3 with Turbopack); then `node scripts/measure-www-first-load.mjs` (gzip level 9 of every script a route's prerendered HTML loads). Run on 2026-11-12 by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0 and pnpm 11.25.0. The limit is 10 kB gzip of growth per route.

| Route | Scripts | First Load JS, gzip |
| --- | --- | --- |
| `/editor/preset` | 18 | 883.8 kB |
| `/editor/component` | 10 | 241.4 kB |
| `/editor/component/button` | 18 | 878.4 kB |
| `/docs` | 11 | 242.4 kB |
| `/docs/getting-started` | 12 | 249.6 kB |
| `/components` | 14 | 452.0 kB |
| `/components/accordion` | 16 | 849.9 kB |

The Code Block "after" table (`docs/evidence/code-block-075.md`) was measured at earlier commits; this sub-project compares against this table only.

## Website size, batch 4a

Measured after the batch 4a website change (the component editor's boolean fields as small Switches and its choice lists as `CheckboxOption` rows; Switch, Checkbox and Field compiled into the site): `corepack pnpm run build` in `apps/www` (exit 0), then `node scripts/measure-www-first-load.mjs`. Same machine, Node and pnpm, on 2026-11-12. The script prints one decimal, so each growth figure is within ±0.1 kB.

| Route | Scripts | Before, gzip | After batch 4a, gzip | Growth |
| --- | --- | --- | --- | --- |
| `/editor/preset` | 18 | 883.8 kB | 888.4 kB | +4.6 kB |
| `/editor/component` | 10 | 241.4 kB | 241.6 kB | +0.2 kB |
| `/editor/component/button` | 18 | 878.4 kB | 883.0 kB | +4.6 kB |
| `/docs` | 11 | 242.4 kB | 242.5 kB | +0.1 kB |
| `/docs/getting-started` | 12 | 249.6 kB | 249.8 kB | +0.2 kB |
| `/components` | 14 | 452.0 kB | 456.5 kB | +4.5 kB |
| `/components/accordion` | 16 | 849.9 kB | 854.5 kB | +4.6 kB |

Every route stays within the 10 kB limit.
