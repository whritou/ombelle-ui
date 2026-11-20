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

Same machine, browser, build recipe and script as the baseline (`node scripts/build-hosted-www.mjs`, `next start` on 127.0.0.1:3000, Chrome headless, 1100x800, reduced motion, cache disabled for the first load only). Command: `node scripts/measure-component-preview.mjs http://127.0.0.1:3000 button dropdown-menu dialog data-table`, 3 passes per mode, values are median (min-max) in milliseconds over the 3 passes (the mode-frame row pools its 4 toggles per pass, so 12 samples). The script was first made independent of the iframe (explicit preview frame, empty fingerprint counts as "not yet changed", one `performance.now()` clock). The family toggle's pressed state updates immediately, but the status line and the stage change only after the family's sheets and fonts are loaded, so the status-plus-fingerprint wait is a valid render time. Each family switch is the first switch to that family in that page.

Two modes: cold, where the first switch starts right after the first load and before the idle preload of the other families' sheets and fonts; and warm (`OMBELLE_PREVIEW_WARM_MS=3000`), which waits 3 s first.

The warm pass did get the preload it waits for. The script records the state when the switches start (`preloadState`): in every cold pass there were 0 `link[rel=preload][as=style]` elements and 4 font files fetched; in every warm pass there were 12 preload links (two sheets for each of the other six families) and 21 font files fetched, with 22-24 font faces loaded. So the warm numbers are with the idle preload finished.

### Cold (switches start right after first load)

| Metric | button | dropdown-menu | dialog | data-table |
| --- | --- | --- | --- | --- |
| First ready | 656 (623-671) | 106 (103-159) | 103 (101-107) | 167 (77-189) |
| Papier | 183 (148-227) | 236 (184-264) | 231 (200-233) | 310 (288-322) |
| Organic | 38 (38-38) | 36 (35-41) | 29 (23-30) | 85 (47-87) |
| Retro futurism | 84 (82-91) | 28 (24-38) | 25 (25-26) | 48 (48-66) |
| Minimalist | 93 (88-102) | 22 (22-25) | 25 (23-26) | 42 (36-68) |
| Flat | 32 (24-34) | 26 (24-26) | 26 (25-26) | 47 (40-64) |
| Neo-Brutalism | 27 (27-28) | 27 (26-48) | 27 (25-27) | 56 (55-62) |
| Mode switch, script (polling) | 26 (26-27) | 19 (19-19) | 20 (18-21) | 37 (34-42) |
| Mode switch to first frame (`modeFrameMs`, 12 toggles) | 5.3 (2.6-8.9) | 5.8 (3.5-8.8) | 7.1 (3-9.2) | 9.5 (9.1-13.4) |

### Warm (after the 3 s idle preload)

| Metric | button | dropdown-menu | dialog | data-table |
| --- | --- | --- | --- | --- |
| First ready | 102 (94-588) | 102 (99-107) | 95 (95-147) | 167 (167-174) |
| Papier | 49 (44-50) | 31 (28-34) | 35 (35-36) | 49 (47-50) |
| Organic | 36 (35-39) | 36 (22-40) | 34 (33-37) | 70 (70-72) |
| Retro futurism | 84 (81-86) | 28 (22-36) | 24 (22-25) | 49 (48-54) |
| Minimalist | 90 (88-101) | 25 (24-25) | 25 (24-26) | 44 (44-52) |
| Flat | 36 (33-36) | 26 (24-27) | 30 (26-31) | 46 (40-47) |
| Neo-Brutalism | 28 (27-30) | 26 (25-28) | 27 (25-27) | 42 (41-54) |
| Mode switch, script (polling) | 26 (25-26) | 19 (19-20) | 19 (19-19) | 27 (23-35) |
| Mode switch to first frame (`modeFrameMs`, 12 toggles) | 6.5 (2.1-8.7) | 6.2 (2.1-14.4) | 6 (2.9-8.8) | 9.3 (9.2-10.2) |

Baseline for comparison (button): first ready 5017, Papier 2621, Organic 2569, Retro futurism 2656, Minimalist 2213, Flat 2183, Neo-Brutalism 2211, mode switch 1027.

How to read the numbers:

- "First ready" is the status line reading `Ombelle · light`, which is already in the server-rendered HTML; the first id measured (button) includes server and browser warm-up, hence about 650 ms against about 100 for the next ones. The static HTML of `/components/button`, `dialog` and `data-table` contains the stage (`data-preview-family="ombelle"`, `pv-*` slots) and no `<iframe>`, so the specimen is in the first paint.
- Papier is the first family switched to in every cold page and is the slowest: it pays the sheet and font fetch that the idle preload does later. It is 183-236 ms for button, dropdown-menu and dialog and **310 ms (288-322) for data-table**, which is over the 300 ms first-time target (localhost, no network latency; the largest sheet set). Every other cold switch is under 100 ms.
- Mode switch, script: 19-37 ms. This is the click until the status line and the fingerprint have both changed, polled every 5 ms from Node, so it includes up to 5 ms of polling and the CDP round trips on top of the real work; it is an upper bound, not the render time.
- Mode switch, `modeFrameMs`: measured inside the page, with no polling or CDP overhead. A timestamp at the click, then wait until the stage's `data-preview-mode` has changed, then the next `requestAnimationFrame`. It is the time to the first animation frame after the change, not to paint or composite. Median 5.3-9.5 ms, worst sample 14.4 ms (dropdown-menu, warm), so every sample is inside the 16 ms of one frame, but data-table sits at 9-13 ms with little headroom.

### Against the targets

| Target | Result |
| --- | --- |
| Specimen in the first paint of the static HTML | Met: stage and slots in the server HTML, no iframe |
| Mode switch within one frame (16 ms) | Met on `modeFrameMs`: median 5.3-9.5 ms, max 14.4 ms over 12 toggles per id and mode; to the first animation frame, not to paint. The script's polled figure (19-37 ms) is not the verdict |
| Family switch < 100 ms once loaded | Met: warm medians 24-90 ms; one warm sample was 101 ms (button, Minimalist) |
| Family switch < 300 ms the first time | Missed for one case: data-table, Papier, cold, 310 ms median (288-322). Others 183-236 ms (Papier) and under 100 ms (the rest) |
| First-load JS of `components/accordion` | 1067.0 kB gzip over 19 scripts (6323.3 kB raw) against the baseline 1051.8 kB over 17 scripts (6273.2 kB raw): +15.2 kB (+1.4%). Other pages: `/components` 648.6 kB (baseline 647.8), `/docs` 271.2 kB (270.5), `/index` 269.4 kB (268.9) |

Overall: first ready 5.0 s to about 0.1-0.7 s, family switch 2.1-2.7 s to at most 0.32 s cold (under 0.1 s warm), mode switch about 1 s to inside one frame.

### Scope and limits

- Server-rendered only for the seven built-in families (`supportedStyleFamilies` minus Liquid Glass). Components with a locale or window dependency are listed in code: `clientOnly = ['calendar']` (the date text depends on the locale, so it renders after hydration) and `iframeOnly = ['sidebar']` (its breakpoint reads the window, so it stays on the iframe path).
- Out of scope: Liquid Glass (iframe and worker path), custom presets, the editors and Sidebar.
- Deviation from the spec: scope is on the stage root (`data-preview-family`, `data-preview-mode`, `data-focus`) rather than per element, and Radix portals render inside the stage through `PreviewPortal`.

### Follow-ups (not caused by this change)

- The site-wide catalog Sidebar has a pre-hydration layout shift at 375 px. Measured as the whole-page layout-shift sum (`layout-shift` entries without recent input) at load, viewport 375x812, Playwright with Chrome: 0.92 on `/components/button` and 0.47 on `/docs`.
- The home page has a pre-existing axe failure on `.ol-codeb`.
