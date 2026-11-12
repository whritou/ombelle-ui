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

### After the review fixes

Measured at `f386baf` (`fix(www): keep editor rails sticky and scrollable, unclip Scroll Area content and test the theme toggle`), same method. The generated `cn` for the site is now clsx only: no site call site passes classes that need Tailwind conflict merging (the only generated Button in the site is the History group, which passes a CSS-module class), so tailwind-merge no longer ships with the compiled components.

| Route | Scripts | First Load JS before | First Load JS after fixes | Delta | Within 10 kB |
| --- | --- | --- | --- | --- | --- |
| `/editor/preset` | 17 | 820.8 kB | 829.7 kB | +8.9 kB | yes |
| `/editor/component` | 10 | 239.4 kB | 240.4 kB | +1.0 kB | yes |
| `/editor/component/button` | 18 | 827.8 kB | 835.0 kB | +7.2 kB | yes |
| `/docs` | 11 | 240.4 kB | 241.4 kB | +1.0 kB | yes |
| `/docs/getting-started` | 12 | 247.4 kB | 248.5 kB | +1.1 kB | yes |
| `/components` | 14 | 412.6 kB | 415.8 kB | +3.2 kB | yes |
| `/components/accordion` | 16 | 809.4 kB | 813.1 kB | +3.7 kB | yes |

## Specimen audit

`pnpm test:specimen-audit` with `OMBELLE_AUDIT_COMPONENTS=toggle,collapsible,scroll-area,button-group,item,command,combobox,select,sheet`, run after `pnpm build:packages` and `pnpm generate:preview`, with Playwright's bundled Chromium (reduced motion on, as in the audit config). Local run by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0; not a CI run or a human review.

| Run | Result |
| --- | --- |
| First run, before any fix | Radix flat and minimalist failed on the Scroll Area specimen (and, by the same cause, the other Radix configurations); Base UI configurations passed. The run hit its time limit before the neo-brutalism and glass results. |
| All 20 configurations and the 21 check self-tests, after the fixes | 41 passed (15.3 min) |

Findings and fixes (each pinned in `packages/catalog/test/specimen-audit-fixes.test.ts` unless noted):

- **Audit helper, overflow check:** the Radix Scroll Area viewport sets `overflow: hidden scroll`, so its tall content scrolls and nothing is cut, yet the check flagged "content 638x288 exceeds box 638x198". The check now judges each axis on its own. A self-test in `tests/e2e/specimen-audit-checks.spec.ts` plants a wide spill (reported) and a tall scroll (not reported). Base UI's viewport (`overflow: auto`) was never flagged.
- Nothing in the catalog CSS was flagged for Toggle, Collapsible, Button Group, Item, Command, Combobox, Select or Sheet, including the 1px minimalist Collapsible ring and the Toggle rings.
- The audit runs under reduced motion, so the Scroll Area fade below is off in it; it was checked separately with motion on (see below).

## Board comparison

A probe read computed styles from the board files (`<Family>08Components.dc.html`, sections 04 to 08, rendered from `file://` with the web fonts blocked) and from the real components on the edition parity pages (`/editions/<family>/radix/?mode=light`, "Primitives" section, after pressing the Toggle and opening the Collapsible). It covered the group and its buttons; the Toggle unpressed and pressed; the Collapsible box, closed and open trigger and body; the Item box, media, title, description and action; and the Scroll Area box, rail and thumb. The board sections are in `docs/evidence/images/primitives-075/board-<family>-<section>.png`.

Fixed in this task:

| Component | Family | Board | Before the fix | Test |
| --- | --- | --- | --- | --- |
| Collapsible | all | The open chevron stays turned | Reduced motion reset it to `rotate: none`, so open and closed looked the same | `keeps the open chevron turned under reduced motion` |
| Scroll Area | flat, minimalist, neo-brutalism, ombelle | 28px fade of the last rows into the card | No fade | `Scroll Area bottom fade` |
| Button Group | ombelle, neo-brutalism | One shadow for the whole group | A shadow on each button | `casts one shadow for the whole group` |
| Button Group | minimalist, neo-brutalism, ombelle | (consistency) | `--border-width` read without a fallback, beside a `-1px` join margin | `falls back to 1px wherever it reads --border-width` |
| Button Group | all | Rule between outline buttons in their edge colour | The separator was always the primary-foreground/primary mix | `rules between outline buttons in the colour of their edge` |
| Collapsible, Scroll Area, Item | minimalist | Strong line colour (`--input`, `#8C8C86`) | `--border` (`#E5E5E1`) | `board comparison` tests |
| Toggle, Collapsible | minimalist | 4px radius | 2px | same |
| Toggle, Collapsible, Item media, Item title | flat | Radius 10, 10, 12; title weight 800 | 8, 12, 10; 700 | same |
| Collapsible | neo-brutalism | No shadow | The preset shadow | same |

Fixed outside the CSS:

- The recipe specimen for a Scroll Area that scrolls both ways used the Tailwind class `w-[40rem]`, which does nothing without Tailwind. It now sets `inline-size: 40rem` (`packages/compiler/test/primitives-075.test.ts`).
- The Preset gallery's disabled Toggle is now labelled "Disabled toggle", so `getByRole('button', { name: 'Disabled', exact: true })` in `tests/e2e/preset-editor.spec.ts` matches only the Button.
- The same gallery test then failed on `getByRole('tab', { name: 'Overview' })`, which matched two tab lists since the 0.7.2 "Underline sections" variant was added. It is now scoped to the "Project sections" tab list. All eight `renders all twelve <family> gallery components` tests pass (with the website and preview dev servers).
- The stable-family hash fixture was regenerated for the changed stylesheets and the recipe specimen.

Focus rings are on no board (the boards draw no focus state), so the earlier questions about them are settled by the audit:

- **Toggle ring (minimalist 1px, offset 2px; ombelle and neo-brutalism `--ring`):** a standalone Toggle has room around it, so it takes the family's control ring with an outside offset, as Button does. The Toggle Group item ring is inset because the group clips its items. The audit measures all of them at 3:1 or better in both modes and both editions, so they stay.
- **Collapsible ring (minimalist 1px, inset by 4px):** passes the audit in both modes and editions, and matches the minimalist Table sort ring, also 1px. It stays.

Scroll Area liquid-glass thumb (`color-mix(in srgb, var(--foreground) 60%, transparent)`), measured on the liquid-glass edition page by sampling the screenshot under the thumb and beside it:

| Mode | Thumb | Contrast with the glass | Limit |
| --- | --- | --- | --- |
| Light, Radix and Base UI | `#6F747F` | 4.69:1 | 3:1 |
| Dark, Radix and Base UI | `#9BA3AE` | 5.74:1 | 3:1 |

That is on the page's plain backdrop; liquid glass is experimental and the thumb was not measured over the busy glass scenes.

The fade was checked with motion on (the audit runs with reduced motion): the pseudo-element is at full opacity at the top of an overflowing area, at zero at its end and on a short area that does not scroll, in the four families and both editions, and the focus ring stays whole under it.

Differences that remain:

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Group buttons | Plain 700-weight cells with no edges, inside one bordered group | The catalog Button in each cell, with its own edge, weight, padding and (neo-brutalism) uppercase | The group joins the real Button, so a cell looks like the Button it is |
| Group border | One border around the group | Each button's edge, joined by a `-1px` margin | Same, and it works for Buttons, Inputs and Select triggers alike |
| Minimalist pressed Toggle | `#F1F1EF` on white, dark text | Ink fill, light text | The board pair is about 1.1:1; a pressed state must stand out, as the Toggle Group toolbar does |
| Toggle width | Labelled toggles | The probe's icon-only Toggle is 40px square | Board content; heights match (40px) |
| Pressed Toggle colour | Pale `--acc` (flat `#E3EBFD`, neo-brutalism `#A6F4FF`) | The preset's `accent` (flat and neo-brutalism yellow) | Preset colours, as in 0.7.3 |
| Neo-brutalism shadows | 3px offset (2px on small buttons) | The preset's 4px offset | Preset value |
| Flat Toggle edge | 1px border | Inset 1.5px ring | The family draws control edges as inset rings |
| Item media | Four-colour swatch, no fill | Accent-filled box | The swatch is board content, not a style |
| Collapsible body | 16px text, two-column grid | 14px text | Board content: the component sets no layout for its children |
| Scroll Area rail | 8px pill rail beside a 70px pill thumb | A 12 or 16px rail with a padded thumb, square in neo-brutalism and 1px-rounded in minimalist | Radix draws the rail and thumb to the content; the family keeps its corner style |
| Neo-brutalism Item media edge | 1px | 2px | Family border width |
| Liquid glass | Dark-scene colours, no fade | Preset colours; no fade | Experimental family; preset colours |
