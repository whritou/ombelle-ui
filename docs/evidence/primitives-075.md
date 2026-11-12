# Primitives evidence

Evidence for Toggle, Collapsible, Scroll Area, Button Group and Item (0.7.5). Design: [primitives](../superpowers/specs/2026-11-12-primitives-075-design.md).

All runs are local runs by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0. None is a CI run or a human review.

## Website size, before

Baseline commit: `ac6fe6e` (the branch point, before any 0.7.5 change). The limit for this work is 10 kB gzip of growth per route, and the measurement is `node scripts/measure-www-first-load.mjs` after `pnpm run build` in `apps/www`.

Not recorded. The `apps/www` build did not finish in this environment, so no First Load JS figure exists for `/editor/*`, `/preset-editor`, `/components/*` or `/docs/*` at this commit.

- `corepack pnpm run build` in `apps/www` first ran a 5 minute `pnpm install` (the workspace's `apps/www` dependencies were out of date locally), then stopped at `build-hosted-www.mjs` step `sync-catalog.mjs` for over ten minutes with no output.
- Running the steps by hand, `sync-schema`, `sync-catalog` and `build` each finish in under a second. `build-hosted-preview.mjs` then ran `node --import tsx scripts/generate-preview.ts` for more than ten minutes without finishing, and `next build` was never reached.

The baseline must be taken on a machine where the build completes, from a checkout at `ac6fe6e`.
