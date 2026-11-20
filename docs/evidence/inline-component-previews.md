# Inline component previews: evidence

## Baseline (iframe + Web Worker preview)

Measured on commit `90e6b4288730cc3caf429f2437c61d4b3c7606df` (`feat/inline-component-previews`, before any product change).

- Machine: AMD Ryzen 7 2700X (8 cores, 16 threads), 32 GB RAM, Windows 11. Node 24.19.0, Google Chrome 157.0.8103.81 (headless, `OMBELLE_BROWSER_CHANNEL=chrome`, 1100x800, reduced motion).
- Build: `node scripts/build-hosted-www.mjs`, served with `next start --hostname 127.0.0.1 --port 3000` (production, localhost, no network latency or CDN).
- Command: `node scripts/measure-component-preview.mjs http://127.0.0.1:3000 button dropdown-menu`, run 3 times (a fresh browser context per id per run). Cache is disabled for the first load and re-enabled for the switches.
- Values are median (min-max) in milliseconds over the 3 runs.

### What the script measures

- `firstReadyMs`: navigation start until the `role="status"` line reads `Ombelle · <mode>`.
- `familySwitchMs` / `modeSwitchMs`: click until the status line shows the new family or `· dark` AND the rendered preview has actually changed. The status line alone is not enough: it is derived from the selected family and mode, and the iframe path does not return it to "Loading preview" on a switch, so it flips within about 20 ms before the preview repaints (a status-only run gave 21-55 ms, which is wrong as a render time). The preview change is detected by a fingerprint of computed styles (background, colour, radius, font, border, shadow) of the first controls in the preview: the sandboxed iframe's frame when one exists, otherwise the page's active preview panel. The fingerprint is polled every 5 ms, so there is about 5-15 ms of measurement overhead.
- The toggle groups are found by their `aria-label` (`Style family`, `Preview mode`). Today they are `role="group"` buttons with `aria-pressed`, not radios, so the script matches `button` or `[role="radio"]` items.

### Results

| Metric | button | dropdown-menu |
| --- | --- | --- |
| First ready | 5017 (4944-5091) | 4955 (4803-4967) |
| Switch to Papier | 2621 (2581-2626) | 2612 (2565-2795) |
| Switch to Organic | 2569 (2564-2581) | 2657 (2646-2785) |
| Switch to Retro futurism | 2656 (2629-2683) | 2603 (2585-2712) |
| Switch to Minimalist | 2213 (2168-2216) | 2131 (2130-2142) |
| Switch to Flat | 2183 (2141-2194) | 2169 (2146-2183) |
| Switch to Neo-Brutalism | 2211 (2196-2221) | 2234 (2218-2247) |
| Mode switch (light to dark) | 1027 (1016-1064) | 1035 (1006-1040) |

Liquid Glass is excluded. Family switches are made in sequence from Ombelle, so each one compiles a family that has not been compiled in that page yet.

First-load JavaScript (`node scripts/measure-www-first-load.mjs`, gzip): `/components/accordion` 1051.8 kB over 17 scripts (6273.2 kB raw). For comparison `/components` is 647.8 kB, `/docs` 270.5 kB, `/index` 268.9 kB.

### Where the first-ready time goes (`/components/button`)

Method: an init script records `performance.now()` at the Worker constructor, the first worker message, the iframe's `ombelle-preset-preview-ready` handshake and the first moment the status line reads ready; `performance.getEntriesByType('resource')` in the page and in the iframe gives download times. Cache disabled, 3 runs, values in ms from navigation start (runs agree within about 100 ms).

| Moment | Time |
| --- | --- |
| Page scripts downloaded, hydration starts | about 0.2 s |
| Preview iframe document and its ~140 module chunks loaded | 0.05 to 0.35 s (component chunks again at about 0.94 to 1.08 s after the handshake) |
| Worker constructed (`preset-compiler.worker.js`, 796 kB) | 0.81 to 0.83 s |
| Worker script downloaded | about 0.85 to 0.96 s (about 0.1 s) |
| Iframe handshake `ready` | 0.94 to 1.0 s |
| First worker message (compile result) | 3.04 to 3.05 s |
| Status line reads `Ombelle · light` | 4.84 to 4.93 s |

Split of the roughly 4.9 s:

- Worker download: about 0.1 s (starts at 0.85 s).
- Worker compile: about 2.1 s, from the end of the download to the first message back.
- Iframe load: about 1.0 s until the handshake (document, ~140 chunks, then the component modules).
- Remaining about 1.8 s: after the compile result, the page posts it to the iframe, which renders and loads its fonts (font CSS requested at about 4.89 s) before the ack that flips the status to ready.

This is a resource-timing and message-timing breakdown rather than a DevTools performance-panel trace; the Chrome DevTools panel is not scriptable from this harness. The numbers are for localhost with no network latency, so remote download times will be larger.

### Notes for the re-run after the change

The same script is the comparison. If the inline path has no child frame it fingerprints the page's active preview panel, so keep the preview inside the active `tabpanel`.

## After (inline renderer)

Same machine, browser, build recipe and script as the baseline (`node scripts/build-hosted-www.mjs`, `next start` on 127.0.0.1:3000, Chrome headless, 1100x800, reduced motion, cache disabled for the first load only). Command: `node scripts/measure-component-preview.mjs http://127.0.0.1:3000 button dropdown-menu dialog data-table`, one run per pass (the baseline used 3). The script was first made independent of the iframe (explicit preview frame, empty fingerprint counts as "not yet changed", one `performance.now()` clock). The family toggle's pressed state updates immediately, but the status line and the stage change only after the family's sheets and fonts are loaded, so the status-plus-fingerprint wait is a valid render time.

Two passes: cold, where the first switch starts right after the first load and before the idle preload of the other families' sheets and fonts; and warm (`OMBELLE_PREVIEW_WARM_MS=3000`), which waits 3 s for that preload first. Values in ms; each family switch is the first switch to that family in that page.

| Metric | Baseline (button) | button cold | dropdown-menu cold | dialog cold | data-table cold |
| --- | --- | --- | --- | --- | --- |
| First ready | 5017 | 727 | 118 | 102 | 224 |
| Papier | 2621 | 224 | 199 | 214 | 269 |
| Organic | 2569 | 38 | 37 | 23 | 78 |
| Retro futurism | 2656 | 82 | 35 | 26 | 47 |
| Minimalist | 2213 | 89 | 25 | 25 | 52 |
| Flat | 2183 | 26 | 27 | 25 | 61 |
| Neo-Brutalism | 2211 | 27 | 31 | 31 | 54 |
| Mode switch | 1027 | 27 | 19 | 33 | 36 |

| Warm | button | dropdown-menu | dialog | data-table |
| --- | --- | --- | --- | --- |
| First ready | 669 | 101 | 109 | 76 |
| Papier | 42 | 29 | 33 | 55 |
| Organic | 36 | 22 | 22 | 74 |
| Retro futurism | 86 | 27 | 27 | 58 |
| Minimalist | 89 | 22 | 25 | 53 |
| Flat | 35 | 26 | 28 | 53 |
| Neo-Brutalism | 27 | 28 | 26 | 26 |
| Mode switch | 27 | 18 | 20 | 35 |

Notes on reading the numbers:

- "First ready" is the status line reading `Ombelle · light`, which is already in the server-rendered HTML; the first id (button) includes server and browser warm-up, hence 727 against about 100 for the next ones. The static HTML of `/components/button`, `dialog` and `data-table` contains the stage (`data-preview-family="ombelle"`, `pv-*` slots) and no `<iframe>`, so the specimen is in the first paint.
- Papier is the first family switched to in every page and is the slowest cold (199-269 ms): it pays the sheet and font fetch that the idle preload would otherwise have done. Every other cold switch is under 100 ms.
- The measured mode switch (18-36 ms) is dominated by the script's own polling (5 ms interval plus CDP round trips). Measured in the page (click until the first animation frame, with the stage's computed colours already changed; 4 toggles each on button, dialog and data-table) it is 1.5-3.5 ms, inside one frame.

### Against the targets

| Target | Result |
| --- | --- |
| Specimen in the first paint of the static HTML | Met: stage and slots in the server HTML, no iframe |
| Mode switch within one frame (16 ms) | Met: 1.5-3.5 ms in-page; 18-36 ms with the script's polling overhead |
| Family switch < 100 ms once loaded | Met: warm 22-89 ms |
| Family switch < 300 ms the first time | Met: cold 23-269 ms (localhost, no network latency) |
| First-load JS of `components/accordion` | 1067.0 kB gzip over 19 scripts (6323.3 kB raw) against the baseline 1051.8 kB over 17 scripts (6273.2 kB raw): +15.2 kB (+1.4%). Other pages: `/components` 648.6 kB (baseline 647.8), `/docs` 271.2 kB (270.5), `/index` 269.4 kB (268.9) |

Overall: first ready 5.0 s to under 0.8 s, family switch 2.1-2.7 s to under 0.3 s (under 0.1 s warm), mode switch about 1 s to inside one frame.

### Scope and limits

- Server-rendered only for the seven built-in families (`supportedStyleFamilies` minus Liquid Glass). Components with a locale or window dependency are listed in code: `clientOnly = ['calendar']` (the date text depends on the locale, so it renders after hydration) and `iframeOnly = ['sidebar']` (its breakpoint reads the window, so it stays on the iframe path).
- Out of scope: Liquid Glass (iframe and worker path), custom presets, the editors and Sidebar.
- Deviation from the spec: scope is on the stage root (`data-preview-family`, `data-preview-mode`, `data-focus`) rather than per element, and Radix portals render inside the stage through `PreviewPortal`.

### Follow-ups (not caused by this change)

- The site-wide catalog Sidebar has a pre-hydration layout shift at 375 px: whole-page CLS 0.92 on `/components/button` and 0.47 on `/docs` (see the Task 8 report).
- The home page has a pre-existing axe failure on `.ol-codeb`.
