# Primitives evidence

Evidence for Toggle, Collapsible, Scroll Area, Button Group and Item (0.7.5). Design: [primitives](../superpowers/specs/2026-11-12-primitives-075-design.md).

All runs are local runs by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0. None is a CI run or a human review.

## Website size, before

Measured at `ac6fe6e` (`docs(plans): plan the 0.7.5 primitives`), the branch point and the last commit before any 0.7.5 contract change, on 2026-11-12. The build ran in a detached git worktree of that commit. It could not run at `6ce2ccd` (the contracts commit): its catalog build stops with `ENOENT ... templates/toggle.tsx` until the template tasks land, so `ac6fe6e` is the true "before".

Method: `corepack pnpm install --frozen-lockfile --ignore-scripts`, then `corepack pnpm run build` in `apps/www` (exit 0, Next.js 16.4.3 with Turbopack). Next.js 16 no longer prints First Load JS in its route table, so the figures are from `node scripts/measure-www-first-load.mjs`, which sums the gzipped size (level 9) of every script a route's prerendered HTML loads. The script's route list now covers all seven routes (it was extended after the baseline run, which used a temporary copy for the docs and component routes). The limit for this work is 10 kB gzip of growth per route.

| Route | Scripts | Raw | First Load JS, gzip |
| --- | --- | --- | --- |
| `/editor/preset` | 18 | 3774.9 kB | 820.8 kB |
| `/editor/component` | 10 | 804.8 kB | 239.4 kB |
| `/editor/component/button` | 19 | 3787.1 kB | 827.8 kB |
| `/docs` | 11 | 806.9 kB | 240.4 kB |
| `/docs/getting-started` | 12 | 826.3 kB | 247.4 kB |
| `/components` | 15 | 2199.7 kB | 412.6 kB |
| `/components/accordion` | 17 | 3737.3 kB | 809.4 kB |

There is no `/preset-editor` route in this build; the preset editor is `/editor/preset`. `/editor/component/[id]` is rendered on demand, so it has no prerendered HTML to measure; `/editor/component/button` stands in for it.

The build is slow on this machine: `pnpm install` and `generate-preview.ts` each took many minutes with long quiet stretches, but nothing hung and the build ran to the end.

## Website size, after

Measured at `c91c7a6` (`feat(www): use catalog Toggle, Collapsible, Scroll Area and Button Group in the editors and docs`) on 2026-11-12, with the same method: `corepack pnpm run build` in `apps/www` (exit 0) and then `node scripts/measure-www-first-load.mjs`, which now lists all seven routes. The limit is 10 kB gzip of growth per route.

| Route | Scripts before / after | First Load JS before | First Load JS after | Delta | Within 10 kB |
| --- | --- | --- | --- | --- | --- |
| `/editor/preset` | 18 / 18 | 820.8 kB | 837.9 kB | +17.1 kB | no |
| `/editor/component` | 10 / 11 | 239.4 kB | 248.7 kB | +9.3 kB | yes |
| `/editor/component/button` | 19 / 19 | 827.8 kB | 843.2 kB | +15.4 kB | no |
| `/docs` | 11 / 12 | 240.4 kB | 249.7 kB | +9.3 kB | yes |
| `/docs/getting-started` | 12 / 13 | 247.4 kB | 256.7 kB | +9.3 kB | yes |
| `/components` | 15 / 15 | 412.6 kB | 424.1 kB | +11.5 kB | no |
| `/components/accordion` | 17 / 17 | 809.4 kB | 821.3 kB | +11.9 kB | no |

Four routes exceed the 10 kB limit. Every route carries the site header, whose theme toggle now loads the compiled Toggle and its Radix package; that is the likely source of the roughly 9.3 kB common to the routes that grew least, and the editors and the components layout add the Collapsible, Scroll Area and Button Group on top (the split was not measured). Nothing was shrunk or deferred: the numbers are recorded for review before any merge.
