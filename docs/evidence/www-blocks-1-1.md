# Site blocks pages for 1.1

26 November 2026. The `/blocks` gallery and the four block pages (`/blocks/<id>`), added after `@ombelle-ui/cli` 1.1.0 was published. Measured on a local production build of branch `feat/blocks-site` (based on `cf3aceea`, the 1.1.0 publish commit), on Windows 11 with Node 24.19.0.

## Method

- **Build.** `pnpm build:www` (schemas, catalog, packages, `scripts/build-hosted-preview.mjs`, which runs `generate:preview`, then `next build`).
- **Sizes.** `pnpm check:www-budget` sums the brotli size (quality 11) of the scripts each route loads at first paint. `node scripts/measure-www-first-load.mjs` reports the same scripts raw and gzipped. Both scripts now list the block routes, and `scripts/www-budget.json` holds their limits.
- **Browser checks.** `playwright.site.config.ts` runs `tests/e2e/site-blocks.spec.ts` and `tests/e2e/site-shell.spec.ts` against the Next dev server and the preview app's Vite dev server, in Chromium.

## JavaScript at first load

| Route | Scripts | Brotli | Budget | Gzip | Raw |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` (for comparison) | 13 | 233.9 kB | 270 kB | 269.5 kB | 912.6 kB |
| `/blocks` | 13 | 238.6 kB | 270 kB | 274.4 kB | 911.3 kB |
| `/blocks/login-01` | 13 | 243.1 kB | 280 kB | 279.6 kB | 926.9 kB |

The block pages load the same 13 scripts as the home page. The catalog metadata is read on the server, and the preview frame is a separate document. The block preview route is a lazy chunk of the preview app, so the preview frame's first-load size (75.5 kB of a 90 kB budget for the editor and preset frames) is unchanged. Every other line of `check:www-budget` passes, unchanged from the 1.1.0 build.

## Block preview stylesheets

Each family has one stylesheet per block, `public/previews/<family>/blocks/<id>.css`. It holds Tailwind preflight and utilities, the preset's tokens and shared styles, the block's component CSS and the block's own CSS. The frame fetches it; it is not part of any page's first load. The stylesheets are minified (Tailwind's Lightning CSS pass, which also adds fallbacks). Two generator runs produced identical bytes.

| | Raw, before | Raw, minified | Brotli, before | Brotli, minified |
| --- | ---: | ---: | ---: | ---: |
| `ombelle/blocks/login-01.css` | 63,956 B | 54,102 B | 8,418 B | 8,015 B |
| `liquid-glass/blocks/login-01.css` (largest family) | 109,933 B | 92,133 B | 12,103 B | 11,236 B |
| All 32 stylesheets | 2,666,539 B | 2,255,485 B | 325,277 B | 309,975 B |

## Browser checks

- `site-blocks.spec.ts`, 6 of 6:
  - The header links to `/blocks`, and the gallery shows four cards.
  - On `/blocks/login-01`, the family switch changes the frame's stylesheet to `/previews/papier/blocks/login-01.css`, and the width switch sets the frame to 375 px and 768 px.
  - The frame fits the whole block: `dashboard-01` at 375 px is 1,539 px tall, below the frame's 4,000 px cap.
  - The Code tab shows `components/blocks/login-01.tsx` and `.css`.
  - The install command reads `npx @ombelle-ui/cli@1.1.0 add login-01`, and Copy writes it.
  - Liquid glass carries "Accessibility not guaranteed".
- `site-shell.spec.ts`: axe finds no violations on `/blocks` and `/blocks/login-01` at 1440 and 375 px, and the header fits at 768 and 1024 px.
  - 53 of 54 tests passed on the combined run. The keyboard header-panel test ("panels open by click and by keyboard") failed once, the first time after the dev server started. It then passed 3 of 3 with `--repeat-each 3`, and it passed in the earlier full run of the file.

## Not verified or not done

- **Throttled loads.** `scripts/measure-www-vitals.mjs` lists the two block routes, but FCP, LCP and CLS were not measured for them. That needs `next start` and the throttled Edge profile in [the 1.0 site performance evidence](www-performance-1-0.md).
- **Production.** Nothing was measured on Vercel.
- **Visual review.** The blocks were not reviewed by eye in every family. The specimen audit (track 1) measures each block in every family, edition and mode.
- **Full site suite.** The complete `pnpm test:site` was not rerun after the final changes; only the two specs above were.
