# Site performance for 1.0

23 November 2026. Fixes for the hosted-operations audit's performance findings (OPS-08 to OPS-11, OPS-13 in `docs/audits/findings/13-hosted-ops.md` on branch `docs/1-0-audits-wave-3-findings`), measured on local production builds.

## Method

- **Builds.** "Before" is commit `064ee4a8`: PR #190's tip with the DUP-01, DUP-04 and DUP-06 refactors, which change no bundling. "After" is this branch. Each was built with `pnpm build:packages`, `pnpm generate:preview`, `node scripts/build-hosted-preview.mjs` and `next build` in `apps/www`. Both ran under `next start` against one local SQLite snapshot store. That store held two published presets, `examples/preset.example.json` (stable) and the Cristal liquid glass starting point.
- **Profile.** `pnpm measure:www-vitals` (`scripts/measure-www-vitals.mjs`) uses a 412 x 823 phone viewport, 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up, 4x CPU slowdown, a cold cache and the installed Microsoft Edge (158.0.4370.33) through Playwright. The table shows medians of three loads per route.
- **Load.** Other sessions were running test suites on the machine during the runs, at 51 to 62 percent CPU load. To keep the comparison fair, "before" and "after" were loaded alternately: one round of every route on each build, three times. The blocking times are therefore higher than on an idle machine; compare the two columns, not the absolute values. The byte sizes do not depend on load.
- **Sizes.** `pnpm check:www-budget` (`scripts/check-www-budget.mjs`) sums the brotli size (quality 11) of the scripts each route loads at first paint. It reads the prerendered HTML, or the client reference manifest for routes rendered per request.

## Throttled phone loads

| Route | FCP | LCP | CLS | TBT | Transfer | JS | Fonts | Workers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 3.9 s → **3.7 s** | 3.9 s → **3.7 s** | 0.03 → **0.00** | 4.4 s → **3.8 s** | 1028 KB → **524 KB** | 239 KB → **240 KB** | 632 KB → **162 KB** | 0 → **0** |
| `/components` | 1.9 s → **2.1 s** | 2.0 s → **2.1 s** | 0.92 → **0.00** | 5.5 s → **4.2 s** | 870 KB → **483 KB** | 630 KB → **276 KB** | 100 KB → **100 KB** | 0 → **0** |
| `/components/button` | 1.9 s → **2.1 s** | 2.2 s → **2.1 s** | 0.92 → **0.00** | 6.1 s → **4.1 s** | 1836 KB → **1056 KB** | 1052 KB → **306 KB** | 567 KB → **567 KB** | 0 → **0** |
| `/editor/preset` | 1.5 s → **1.4 s** | 10.3 s → **9.4 s** | 0.07 → **0.08** | 6.7 s → **5.9 s** | 1381 KB → **566 KB** | 1122 KB → **376 KB** | 100 KB → **100 KB** | 2 → **1** |
| `/editor/component/button` | 1.4 s → **1.4 s** | 1.4 s → **1.4 s** | 0.19 → **0.00** | 7.9 s → **5.6 s** | 1364 KB → **542 KB** | 1105 KB → **353 KB** | 100 KB → **100 KB** | 3 → **1** |
| `/presets/<stable>/1` | 1.5 s → **1.7 s** | 1.5 s → **1.7 s** | 0.00 → **0.00** | 21.4 s → **4.4 s** | 1233 KB → **447 KB** | 994 KB → **241 KB** | 100 KB → **100 KB** | 0 → **0** |
| `/presets/<glass>/1` | 1.5 s → **1.5 s** | 1.5 s → **1.5 s** | 0.00 → **0.00** | 21.3 s → **4.0 s** | 1234 KB → **448 KB** | 994 KB → **241 KB** | 100 KB → **100 KB** | 0 → **1** |

Notes on the table:

- **Component editor CLS.** The value after is from a later build with the streaming fix (`17511944`): 0.003 in four of four throttled loads of `/editor/component/button` and 0.005 to 0.006 for `/editor/component/badge`. The interleaved run measured the build before that fix, at 0.185, 0.004 and 0.127.
- **Preset editor LCP.** The 9.4 s LCP is not a slow start. The largest element is the "Draft saved on this device." status in the top bar, which appears after the first save. The editor and its preview frame paint at FCP (1.4 s). The 0.08 CLS is a toggle group that settles when the editor hydrates; it is unchanged and below 0.1.
- **Glass published page.** That page now starts one preset worker on purpose: it compiles the glass styles off the main thread. The stable page sends tokens and starts none.
- **`/components/button` fonts.** The 567 KB of fonts are unchanged. The playground warms the other families' fonts while the browser is idle, after load.

## JavaScript at first load (brotli)

| What | Before | After | Budget |
| --- | ---: | ---: | ---: |
| `/` | 234 kB | 234 kB | 270 kB |
| `/docs` | 236 kB | 235 kB | 270 kB |
| `/components` | 457 kB | 264 kB | 300 kB |
| `/components/button` | 775 kB | 287 kB | 330 kB |
| `/editor/preset` | 834 kB | 346 kB | 400 kB |
| `/editor/component/button` | 822 kB | 328 kB | 380 kB |
| `/presets/[id]/[revision]` | 728 kB | 235 kB | 270 kB |
| `/recipes/[id]/[revision]` | 797 kB | 304 kB | 350 kB |
| Largest chunk | 298 kB | 511 kB | 560 kB |
| `editor-compiler.worker.js` | 559 kB | 559 kB | 600 kB |
| `preset-compiler.worker.js` | 545 kB | 545 kB | 600 kB |
| Preview frame, first load | 76 kB | 76 kB | 90 kB |

What the largest chunk is, before and after:

- **Before:** the 3.8 MB generated catalog (every template and every family's stylesheet). Every component, editor and published page loaded it at first paint.
- **After:** the full compiler with that catalog. It is no longer on any page's first load. The editors import it on demand, for their own check of a worker result, and Get code imports it when it publishes. Its limit keeps it from growing unnoticed.

## What changed

- **OPS-08 (CLS).** Below 768 px the catalog Sidebar shows itself inline above the page until hydration, then becomes a closed sheet. The site now hides its directory sidebar on phones until hydration. The editor's inspector, which keeps its desktop layout on phones, gets that layout before hydration as well. On a slow link the editor's preview pane, which comes later in the HTML but sits above the inspector, pushed the inspector down. The inspector now stays hidden until the editor's HTML has fully arrived.
- **OPS-09 (bundles).** The catalog has two light entries:
  - `@ombelle/catalog/presets`: presets, fonts and tints, from a 41 KB `generated-presets.ts`;
  - `@ombelle/catalog/expansion-examples`.

  The compiler has `@ombelle/compiler/light`: canonical JSON, hashing, preset resolution and the glass contrast model. Site code imports these. Verification compiles and publishing load the full compiler on first use.
- **OPS-09 (published pages).** A published preset page compiles nothing on its main thread. The server checks the hash and computes the contrast warning. A stable family goes to the sandboxed gallery as tokens. Liquid glass compiles in the preset worker. Compiling glass on the server was tried and rejected: it took about 10 s of CPU and 1 MB of response per read of a public page. The published recipe page verifies and compiles on the server, since a single recipe compiles quickly.
- **OPS-10 (workers).** Each editor shares one worker per script, so the component editor runs one instead of three and the preset editor one instead of two. The inspector's font roles come from a table that `generate:preview` writes, not from the compiler.
- **OPS-13 (fonts).** A landing tile takes its family's fonts only within 600 px of the viewport, so a first visit fetches 5 font files instead of 17. Both logo variants are lazy, so the browser fetches only the variant the theme shows.
- **OPS-11 (budget).** `scripts/www-budget.json` holds the limits above. CI's `www-budget` job builds the site and runs `pnpm check:www-budget`, and `verify` requires that job.

## Not verified or not done

- **Workers.** Each worker is still 5.5 MB raw and about 550 kB brotli. A worker compiles any component in any family, so it bundles every template and stylesheet. Making it smaller means loading the catalog per family inside the compiler, which changes the compiler's synchronous `getCatalog` API that the CLI also uses. That is left for a follow-up.
- **Production.** Nothing was measured on Vercel. Vercel also serves the preview assets with `max-age=0` (OPS-12), which this change does not touch.
- **Load.** The timings above come from a loaded machine. An idle machine or a real phone gives lower absolute values.
- **Editor interaction budgets** in `docs/06-online-editor.md` (100 ms token feedback) were not measured.
- **CLS in the browser suite.** There is no CLS assertion in a browser test; the Playwright suites belong to the Foundation gate.
