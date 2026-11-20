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

A family's sheets and fonts are now also requested when the pointer enters its button or the button gets keyboard focus (`onItemIntent` on the toggle group, sharing a per-page record with the idle preload, so nothing is fetched twice). Three modes, each switching right after the first load and before the idle preload:

- **Hover then click** (`OMBELLE_PREVIEW_HOVER_MS=150`): the script hovers the family's button for 150 ms, then clicks; the time starts at the click. This is the figure the targets are judged on, since it is what a reader does.
- **No hover** (cold): click without hovering first, so the click pays the whole fetch. Reported alongside.
- **Warm** (`OMBELLE_PREVIEW_WARM_MS=3000`): waits 3 s for the idle preload, then clicks without hovering.

The script records the preload state when the switches start (`preloadState`): in every hover and no-hover pass there were 0 `link[rel=preload][as=style]` elements and 4 font files fetched; in every warm pass there were 12 preload links (two sheets for each of the other six families) and 21 font files fetched, with 20-22 font faces loaded. So the warm numbers are with the idle preload finished.

### Hover then click (150 ms hover, time from the click)

| Metric | button | dropdown-menu | dialog | data-table |
| --- | --- | --- | --- | --- |
| First ready | 702 (674-713) | 127 (114-132) | 100 (98-107) | 96 (79-170) |
| Papier | 36 (36-39) | 26 (26-27) | 26 (26-27) | 56 (51-58) |
| Organic | 37 (34-45) | 27 (27-29) | 24 (22-24) | 50 (47-54) |
| Retro futurism | 33 (26-33) | 24 (23-24) | 23 (23-27) | 47 (46-51) |
| Minimalist | 28 (24-29) | 25 (25-31) | 24 (23-25) | 48 (45-49) |
| Flat | 24 (23-24) | 24 (24-30) | 27 (23-29) | 45 (42-46) |
| Neo-Brutalism | 31 (26-32) | 26 (25-26) | 24 (23-30) | 46 (45-48) |
| Mode switch, script (polling) | 27 (25-35) | 19 (18-20) | 21 (19-27) | 36 (34-45) |
| Mode switch to first frame (`modeFrameMs`, 12 toggles) | 5.2 (4.2-6.6) | 6.6 (2.8-8.4) | 6.5 (3.9-8.7) | 9.7 (9.3-10.3) |

### No hover (click straight after load)

| Metric | button | dropdown-menu | dialog | data-table |
| --- | --- | --- | --- | --- |
| First ready | 635 (104-702) | 105 (102-126) | 104 (84-115) | 190 (172-197) |
| Papier | 206 (131-223) | 190 (190-226) | 202 (174-240) | 319 (290-327) |
| Organic | 39 (37-41) | 50 (48-54) | 33 (26-34) | 60 (54-61) |
| Retro futurism | 87 (83-91) | 33 (26-34) | 26 (24-35) | 52 (50-53) |
| Minimalist | 92 (88-108) | 23 (23-34) | 26 (25-26) | 49 (48-55) |
| Flat | 37 (30-37) | 26 (25-33) | 26 (25-38) | 49 (46-52) |
| Neo-Brutalism | 28 (25-38) | 41 (26-41) | 27 (26-35) | 52 (48-61) |
| Mode switch, script (polling) | 26 (25-27) | 20 (19-26) | 20 (19-21) | 28 (27-39) |
| Mode switch to first frame (`modeFrameMs`, 12 toggles) | 6.1 (4.6-7.3) | 5.7 (4.3-7.6) | 6.6 (3.3-8.5) | 9.9 (9.5-10.9) |

### Warm (after the 3 s idle preload, no hover)

| Metric | button | dropdown-menu | dialog | data-table |
| --- | --- | --- | --- | --- |
| First ready | 622 (113-724) | 109 (107-128) | 151 (102-160) | 85 (80-204) |
| Papier | 48 (46-57) | 31 (31-36) | 33 (32-37) | 50 (50-53) |
| Organic | 37 (36-39) | 41 (41-42) | 23 (23-36) | 72 (71-82) |
| Retro futurism | 84 (84-91) | 33 (33-34) | 23 (23-23) | 53 (51-54) |
| Minimalist | 92 (90-96) | 26 (24-27) | 26 (25-27) | 50 (43-52) |
| Flat | 24 (24-36) | 27 (25-27) | 25 (24-27) | 48 (48-57) |
| Neo-Brutalism | 26 (25-28) | 27 (25-40) | 27 (26-28) | 54 (44-54) |
| Mode switch, script (polling) | 27 (25-28) | 20 (19-28) | 19 (19-19) | 28 (27-36) |
| Mode switch to first frame (`modeFrameMs`, 12 toggles) | 6.6 (5.2-11.5) | 6.6 (3.1-8.6) | 6.5 (3.4-8.5) | 9.6 (9.4-10.2) |

Baseline for comparison (button): first ready 5017, Papier 2621, Organic 2569, Retro futurism 2656, Minimalist 2213, Flat 2183, Neo-Brutalism 2211, mode switch 1027.

How to read the numbers:

- "First ready" is the status line reading `Ombelle · light`, which is already in the server-rendered HTML; the first id measured (button) includes server and browser warm-up, hence about 650-700 ms against about 100 for the next ones. The static HTML of `/components/button`, `dialog` and `data-table` contains the stage (`data-preview-family="ombelle"`, `pv-*` slots) and no `<iframe>`, so the specimen is in the first paint.
- Without a hover, Papier is the slowest switch because it is the first and pays the whole sheet and font fetch: 190-206 ms for button, dropdown-menu and dialog and **319 ms (290-327) for data-table**, which is over the 300 ms first-time target (an earlier no-hover run gave 310 ms, 288-322; localhost, no network latency, the largest sheet set). With a 150 ms hover first, the same switch takes 26-56 ms. Every other no-hover switch is under 110 ms (button Minimalist reaches 108 in one pass).
- Mode switch, script: 19-36 ms. This is the click until the status line and the fingerprint have both changed, polled every 5 ms from Node, so it includes up to 5 ms of polling and the CDP round trips on top of the real work; it is an upper bound, not the render time.
- Mode switch, `modeFrameMs`: measured inside the page, with no polling or CDP overhead. A timestamp at the click, then wait until the stage's `data-preview-mode` has changed, then the next `requestAnimationFrame`. It is the time to the first animation frame after the change, not to paint or composite. Median 5.2-9.9 ms, worst sample 11.5 ms, so every sample is inside the 16 ms of one frame, but data-table sits at 9-11 ms with less headroom.

### Against the targets

| Target | Result |
| --- | --- |
| Specimen in the first paint of the static HTML | Met: stage and slots in the server HTML, no iframe |
| Mode switch within one frame (16 ms) | Met on `modeFrameMs`: median 5.2-9.9 ms, max 11.5 ms over 12 toggles per id and mode; to the first animation frame, not to paint. The script's polled figure (19-36 ms) is not the verdict |
| Family switch < 100 ms once loaded | Met: warm medians 23-92 ms (button Minimalist 90-96) |
| Family switch < 300 ms the first time | Met with a hover first: medians 23-56 ms. Without a hover: Papier 190-206 ms on button, dropdown-menu and dialog, and 319 ms (290-327) on data-table, which misses it |
| First-load JS of `components/accordion` | 1067.0 kB gzip over 19 scripts (6323.3 kB raw) against the baseline 1051.8 kB over 17 scripts (6273.2 kB raw): +15.2 kB (+1.4%), measured before the hover change (the change adds a few lines). Other pages: `/components` 648.6 kB (baseline 647.8), `/docs` 271.2 kB (270.5), `/index` 269.4 kB (268.9) |

Overall: first ready 5.0 s to about 0.1-0.7 s, family switch 2.1-2.7 s to under 60 ms after a hover (under 0.33 s with none), mode switch about 1 s to inside one frame.

### After the final review

Fixes after the final review: the focused specimen is centred in the stage. The stage is a size container and the shared focus layout's `100vh`/`100vw` become `100cqh`/`100cqw`. The previous override lost to a more specific rule, so the gallery took the viewport height. The stage also resets every token a family reads but does not set (the site's `--warning` no longer replaces `var(--warning, #fef3c7)`). Ombelle's faces are self-hosted at `/previews/fonts` and preloaded per specimen. Site component rules carry `:not(:where([data-preview-family] *))`, so they stay off the specimens' catalog markers. A family switch waits at most 2.5 s for its fonts. A family that does not offer a component gets an empty sheet. New e2e checks: the specimen lies inside the stage at 375x812, 1100x800 and 1440x1000; axe on Badge and Alert in light mode for all seven families; site rules stay off preview markers.

Re-check on a production build (same recipe and script, button and data-table, one pass each, so no ranges):

| Metric | button, hover | data-table, hover | button, no hover | data-table, no hover |
| --- | --- | --- | --- | --- |
| First ready | 766 | 217 | 282 | 190 |
| Papier | 33 | 58 | 156 | 321 |
| Organic | 32 | 48 | 44 | 94 |
| Retro futurism | 38 | 50 | 88 | 152 |
| Minimalist | 36 | 50 | 116 | 53 |
| Flat | 40 | 54 | 31 | 55 |
| Neo-Brutalism | 39 | 49 | 40 | 47 |
| Mode switch, script (polling) | 30 | 37 | 28 | 35 |
| Mode switch to first frame (`modeFrameMs`, 4 toggles) | 3.0-6.1 | 10.6-11.8 | 2.7-14.2 | 9.8-14.0 |

Every hover switch stays under 60 ms, as before. Without a hover, data-table Papier is 321 ms against 319 (290-327). Retro futurism (152 against 52-53) and Organic (94 against 54-61) on data-table, and button Minimalist (116 against 88-108), are above the earlier three-pass ranges. These are single samples; they stay under the 300 ms first-time target, except data-table Papier, which already missed it. The data-table first ready with a hover is 217 ms against 79-170, also a single sample. Every mode-frame sample stays inside one frame (max 14.2 ms). In the production build each preloaded Ombelle face is fetched once, with no "preloaded but not used" warning (`/components/card`: Figtree and Bricolage Grotesque; `/components/button`: Figtree).

### Scope and limits

- Server-rendered only for the seven built-in families (`supportedStyleFamilies` minus Liquid Glass). Components with a locale or window dependency are listed in code: `clientOnly = ['calendar']` (the date text depends on the locale, so it renders after hydration) and `iframeOnly = ['sidebar']` (its breakpoint reads the window, so it stays on the iframe path).
- Out of scope: Liquid Glass (iframe and worker path), custom presets, the editors and Sidebar.
- Deviation from the spec: scope is on the stage root (`data-preview-family`, `data-preview-mode`, `data-focus`) rather than per element, and Radix portals render inside the stage through `PreviewPortal`.

### Follow-ups (not caused by this change)

- The site-wide catalog Sidebar has a pre-hydration layout shift at 375 px. Measured as the whole-page layout-shift sum (`layout-shift` entries without recent input) at load, viewport 375x812, Playwright with Chrome: 0.92 on `/components/button` and 0.47 on `/docs`.
- The home page has a pre-existing axe failure on `.ol-codeb`.
