# Instant editor previews: evidence

## Results

Every number below is copied from a section further down; nothing here is new measurement. Machine and method are those of the sections cited (Ryzen 7 2700X, Windows 11, Chrome, production build on localhost).

### Verification at wrap-up (commit `2f440fbc`)

- `corepack pnpm typecheck`: passed (exit 0).
- `corepack pnpm exec vitest run apps/www/src/preset-editor apps/www/src/editor packages/compiler packages/catalog`: 212 test files passed (212); 4709 tests passed, 6 skipped, 0 failed.
- Playwright and production builds were not re-run here; their results are in the sections below.

### Preset editor (milliseconds, medians)

| Metric | Baseline | After Task 6 (fast path) | After Task 6b (optimised) |
| --- | --- | --- | --- |
| Token edit | 2379 | 102 | 26 to 37 (from Tab); 8 to 12 input to iframe frame |
| First ready | 5896 | 1926 | 1302 to 1556 |
| Family switch | 2662.5 | 248 | 93 to 93.5 |
| Scene switch | 1311 | 236 | 163 to 176 |
| Mode switch | 1132 | 153 | 61 to 74 |

Task 6 missed its own bound by 2 ms (102 ms against under 100); Task 6b brought the token edit under the 50 ms target on the input-to-paint measures (see "Final measurement (Step 4)").

Font decision (Task 7): no prefetch. Pick to font load is 154 and 164.5 ms median (slowest 250 ms), under the 300 ms rule; the CSS paints at 13 ms and the font swaps in about 150 ms later.

### Component editor (Tasks 8 and 9c)

Task 8 (cold, median of 5 loads): first render 2760 to 3875 ms (warm 2135 to 3138 ms). The dominant phase is the worker's first compile, 1209 to 1770 ms cold (the next compile on the same worker takes 57 to 295 ms). One edit, cold: 342 ms (button) to 786 ms (select) from input to frame.

Experiment 9c, precompiled default recipe, kept with exception. First view (`firstPreviewMs`, same-session control against `d81d3fd8`, before to after):

| | button | card | dialog | select |
| --- | --- | --- | --- | --- |
| Cold | 2100 to 1081 (-49%) | 2748 to 1078 (-61%) | 2553 to 1115 (-56%) | 2978 to 1139 (-62%) |
| Warm | 1537 to 679 (-56%) | 2197 to 688 (-69%) | 1985 to 707 (-64%) | 2389 to 739 (-69%) |

Exception: the worker's first compile is slower beyond the noise band (about 6 percent) in four cases, select +13% cold and +17% warm, dialog +11% cold, button +10% warm. The compiled first render is within +0.3 to +2.8 percent and edits are unchanged.

### Not done, with reasons

- 9b, warm worker: dropped by the user to wrap up. Task 8 measured the cold first compile at 1.2 to 1.8 s against 57 to 295 ms warm, so about 1 s on the first edit is the estimated follow-up gain (an estimate, not measured).
- 9e, right-height skeleton: no time cost in the measurements, a layout-shift fix only.
- 9d, bundling the iframe's modules: the iframe load is off the critical path, and the script requests are 20 to 46 (23 to 47 after 9c).
- 9a, `modulepreload` of the worker script: the worker download is at most 108 ms cold.

### Decisions for the user

1. The 9c exception: accept a first compile up to 17 percent slower (select) for a first view 49 to 69 percent sooner, or revert 9c.
2. Skip the editor page's second, identical verification in the catalog editors: about 50 to 85 ms per edit; it touches validation, so it needs approval.
3. The iframe's re-verification is 16 to 22 percent of each edit (about 40 percent with the editor page's own); any change to it touches validation.

### Failures that predate this branch

Confirmed on the base commit `68de5cd2`: in `preset-editor.spec.ts`, the style palette and primary colour test and the Color Picker slider test; in `catalog-editors.spec.ts`, `edits and restores separator`.

### Out of scope

The Liquid Glass fast path, other `PresetPreviewFrame` surfaces, inline scenes, and the #180 follow-ups.

## Preset editor audit

Branch `feat/instant-editor-previews`, measured and read on commit `337eb0b488d94d3b4b629ceacfd5b194031baf23` (no product change yet). Design: `docs/superpowers/specs/2026-11-20-instant-editor-previews-design.md`.

### Baseline

- Machine: AMD Ryzen 7 2700X (8 cores, 16 threads), 32 GB RAM, Windows 11. Node 24.19.0, Google Chrome 157.0.8103.81 (headless, `OMBELLE_BROWSER_CHANNEL=chrome`, 1100x800, reduced motion).
- Build: `node scripts/build-hosted-www.mjs` (it runs the schema and catalog sync, the package build, `generate-preview`, `build-editor-worker` and the hosted preview build, then `next build`), served with `next start --hostname 127.0.0.1 --port 3000`. Production, localhost, no network latency or CDN. The preview iframe is the static file set the site serves at `/ombelle-preview/preset-preview/` (`apps/www/src/editor/preview-url.ts:5`).
- Command: `node scripts/measure-preset-editor.mjs http://127.0.0.1:3000 --runs 5`, one browser context, cache disabled for the first load and re-enabled afterwards. Page: `/editor/preset` (Ombelle family, Dashboard scene, light).
- Values are single measured runs in milliseconds; the arrays are the 5 token edits in order.

What the script measures (`scripts/measure-preset-editor.mjs`):

- `firstReadyMs`: navigation start until `[data-testid="preset-preview-status"]` has `data-status="ready"` (`Preview ready`, `preset-editor.tsx:594-597`).
- `tokenEditMs`: set the Corner radius field, press Tab; time until a computed-style fingerprint inside the `Global preset gallery` iframe changes. The fingerprint covers the computed background, colour, radius, font family, border width and shadow of the first 80 `[data-slot]` elements plus the first heading. It is polled every 2 ms through CDP, so expect 5 to 15 ms of overhead. The first version fingerprinted only the first eight buttons and inputs and never saw a change: Ombelle buttons are pills (`border-radius: 999px`, `packages/catalog/src/styles/ombelle.css:5`), so a radius edit does not reach them.
- `familySwitchMs`: click the family in the `Style family` group; when the picker asks for confirmation (`preset-editor.tsx:219-232`, "Change style family?"), the clock starts at the `Confirm change` click; time until the fingerprint changes. Switches are made in sequence from Ombelle.
- `sceneSwitchMs`: Dashboard to Settings, through the `Preview page` select (the segmented control hides below 1200 px). `modeSwitchMs`: light to dark through `Preview mode`.
- `workerCompileMs` and `iframeApplyMs`: an init script wraps `Worker.prototype.postMessage` and `MessagePort.prototype.postMessage` and timestamps each request and its reply by `requestId` (absolute clock, `timeOrigin + now`). `workerCompileMs` is every `compile-preset` request to its worker, reference compiles included (see below). `iframeApplyMs` is every `preset-render` to its `preset-render-ack` on the editor's port.
- `iframePhases` splits `iframeApplyMs` inside the iframe: the same init script runs there and records when each `preset-render` arrived, every `crypto.subtle.digest` call (the compile hashes each artifact, 190 calls per render), and when the ack was posted. Verification is the span from the first to the last digest of one render, so it covers the iframe's whole `compile()`, Prettier included; it is a proxy because the compile has no start or end marker of its own.

### Baseline results

| Metric | ms |
| --- | --- |
| First ready | 5896 |
| Token edit (Corner radius), 5 runs | 2634, 2402, 2320, 2258, 2379 (median 2379) |
| Family switch, Papier | 2743 |
| Family switch, Organic | 2859 |
| Family switch, Retro futurism | 2879 |
| Family switch, Minimalist | 2424 |
| Family switch, Flat | 2429 |
| Family switch, Neo-brutalism | 2582 |
| Family switch, median of 6 | 2662.5 |
| Scene switch (Dashboard to Settings) | 1311 |
| Mode switch (light to dark) | 1132 |

An earlier 2-run pass of the same script gave first ready 5641, token edits 2449 and 2289, family switches 2344 to 2777, scene 1207, mode 1167, so the figures reproduce within about 5 to 10 percent. They sit where the design brief put them (first about 5.7 s, switches 2.2 to 3.0 s).

### Phase split

Medians over the 5-run pass (19 worker requests, 14 renders; the per-render array is in the task report). Corrected later: the script's `median()` took the upper middle value for an even count; the even-count rows below are now the true median (mean of the two middle values), recomputed from the same raw values. The raw JSON below still shows the medians the script printed then.

| Phase | Median | Range |
| --- | --- | --- |
| Worker `compile()` (`workerCompileMs`, 19 requests) | 1211 | 982 to 2530 (the first two, 2530 and 2417, include the worker's cold start) |
| Iframe apply, post to ack (`iframeApplyMs`, 14 renders) | 1064.5 | 971 to 1655 |
| of which: post to arrival | 3 | |
| of which: arrival to first digest (`verifyPresetRender` validation) | 8.5 | |
| of which: verification compile, first to last digest | 1030.5 | |
| of which: last digest to ack (state update, layout effect, style swap) | 27.5 | |
| of which: ack back to the page | 0 | |

A token edit of about 2.38 s is therefore 150 ms debounce (`use-preset-compiler.ts:121-123`) plus the worker compile (about 1.2 s) plus the iframe's verification compile (about 1.0 s) plus about 30 ms of real apply. The actual work that changes pixels, swapping the style text and re-rendering, is about 30 ms; 97 percent of the apply phase is the iframe running `compile()` a second time. First ready adds the worker download, the first compile with a cold worker (2.5 s) and the iframe's own load (about 1 s, as in the component-preview evidence).

Worker requests exceed renders (19 against 14) because the editor also compiles the family's default draft as the reference for Get code (`usePresetCompiler(defaultDraft)`, `preset-editor.tsx:249`). A family switch therefore triggers two worker compiles; they run in separate workers.

### (a) Which preset properties become variables, and which change structure

`compile()` builds the theme from the preset alone, before any formatting or hashing (`packages/compiler/src/compile.ts:118-142`).

Variables, all emitted into `styles/ui-tokens.css` as `:root`, `.dark` and `@theme inline` blocks (`compile.ts:150-161`):

- Every colour in `modes.light` and `modes.dark` becomes `--<kebab-key>` in the matching block (`compile.ts:119-122`), and `theme.theme['--color-*']` maps each to `var(--key)` (`compile.ts:141-143`). The editor edits 19 colour keys (`apps/www/src/preset-editor/model.ts:16-36`). The schema also allows `success`, `warning`, `info` (each with a foreground) and `shadowColor` (`schemas/preset.schema.json`, `$defs.colors`); the editor does not expose them.
- Design controls, written to `:root` only (`compile.ts:124-132`): `radiusRem` to `--radius`, `borderWidthPx` to `--border-width`, `shadowOffsetXPx` and `shadowOffsetYPx` to `--shadow-x` and `--shadow-y`, `density` to `--control-height` (2.25rem compact, 2.5rem otherwise), `fontFamilyId` to `--font-family`, `motion` to `--motion-duration` (0ms reduced, 150ms otherwise). `headingFontFamilyId` adds `--font-heading` and `monoFontFamilyId` adds `--font-mono` (`compile.ts:133-134`).
- Liquid glass adds `glassTokens(...)` to both blocks (`compile.ts:135-139`). Out of scope for the fast path.

Properties that change structure, not only variables:

- Family. It selects which sheet text is emitted: `catalog.styles[family]` plus each component's `template.styles[family]` (`compile.ts:166-173` and `compile.ts:205-212`), and the component default for Button's variant and size is rewritten into the TSX (`compile.ts:189-200`). The iframe's rendered tree does not depend on family beyond `unavailableIds(family)` and `familyLabel` (`apps/preview/src/preset-preview.tsx:163-168`).
- Display or code font. `fontRuleBlock` adds one `[data-slot="..."]:not([hidden]){font-family:var(--font-heading)...}` rule per heading slot, and one per mono slot, to `styles/ui-style.css` (`compile.ts:172`, `packages/compiler/src/typography.ts:116-125`). The block is empty unless the preset sets `headingFontFamilyId` or `monoFontFamilyId`, so setting or clearing either adds or removes rules.
- `headingLineHeight`. It is `fontById(headingFontFamilyId).displayLineHeight` (`typography.ts:98`, set for Young Serif and Michroma, 1.5, `packages/catalog/src/fonts.ts:88,90`) and is appended to the same heading rules as `;line-height:1.5` (`typography.ts:119-121`). It depends on which display font is chosen, not only on whether one is set.
- `glassMaterialActive`. For liquid glass, `catalog.glassLabStyle` is appended to the family sheet when any glass material field is above zero and transparency is not reduced (`compile.ts:171`, `packages/compiler/src/glass-contrast.ts:352-353`). It also changes `recipe-styles.ts:132`. Glass only.
- Font imports. `typography.imports` is prepended to both style artifacts (`compile.ts:153,166`); the preview strips them (`stripFontImports`, used by `presetRuntimeStyles`, `apps/www/src/preset-editor/preview-protocol.ts:200-209`) and loads the faces itself (`loadPresetFonts`, `apps/preview/src/preset-preview.tsx:134-137`). Not CSS the fast path needs to derive.

Everything else the preset carries (name, revision, `componentDefaults` other than Button's two defaults, `transparency` and the other glass fields for non-glass families) does not reach a non-glass style sheet.

### (b) Hard-coded values in the family and component sheets

Scanned: the seven built-in non-glass families, 7 family sheets plus 60 component sheets each (`packages/catalog/src/styles/<family>.css` and `<component>/<family>.css`; 61 files per family with the family sheet). Literal colours are hex, `oklch`, `rgb(a)`, `hsl(a)` and the colour words `white`, `black`, `red`, `blue`, `green`, `gray`. A scan script classified each by whether it sits in the fallback of a `var()`.

Literal colours as the fallback of a variable: 302 in total, 43 per family (44 in retro-futurism), all in component sheets, none in a family sheet:

| Variable | Fallback uses (non-glass, all 7 families) |
| --- | --- |
| `--success`, `--success-foreground` | 35 and 63 |
| `--warning`, `--warning-foreground` | 35 and 77 |
| `--info`, `--info-foreground` | 28 and 49 |
| local custom properties (`--color-picker-backdrop`, `--resizable-ink`) | the remaining 15 |

The success, warning and info tokens are in the schema but not editable in the editor. Whether a fallback is live depends on the built-in preset: `neo-brutalism`, `ombelle`, `organic`, `papier` and `retro-futurism` define `success`/`warning`/`info` or `shadowColor` in their own `modes` (checked against `packages/catalog/src/presets/*.json`), so those arrive as variables through `presetTheme`; `flat` and `minimalist` define none of them, so their alert and status colours are the literal fallbacks. An edit in the editor cannot change either, so deriving styles from the preset gives the same result as the full path.

Literal colours that are not fallbacks of any variable (non-glass, counted over all seven families):

| Kind | Count | Where |
| --- | --- | --- |
| Neutral shadow colours inside `box-shadow` (`rgb(15 23 42 / 8%)`, `rgb(0 0 0 / 28%)`) | 84 in component sheets, 1 in `minimalist.css` | flat 46, minimalist 24 (+1), neo-brutalism 2, ombelle 2, organic 4, papier 2, retro-futurism 4 |
| Code Block syntax palette (`--code-block-*: oklch(...)`) | 63 | 9 per family, `code-block/<family>.css` |
| Hue gradient of Color Picker (`#f00, #ff0, ...`) | 28 | 4 per family |
| `color-mix(... black)` hover shading of a token (`var(--primary) 86%, black`) | 34 in component sheets, 10 in family sheets | the base is a variable, only the shade is literal |
| Scrim and backdrop literals (`oklch(22% 0.012 275 / 0.45)` on dialog and sheet overlays, `--color-picker-backdrop`) | 51 `background` plus 7 backdrop plus 7 in family sheets | all families |
| Other single literals | `#15803d` on Avatar status and Progress complete (flat), `#2f6b3a` (minimalist), `#FFFFFF` on Switch (flat, 3), `#fff`/`#111` on the Color Picker thumb (9 `border` plus shadow), `#C2543A` on Sheet resize focus (papier), `--resizable-ink: #2a1b00` (retro-futurism), `--rf-scan`, `--rf-sun-mask` (retro-futurism), a repeating-gradient in neo-brutalism | |

None of these answers to an editable token, so a colour, radius or border edit cannot be missed by them in either path. They also exist, byte for byte, in the sheet the iframe already uses today, so the fast path inherits them with no new difference. One consequence worth knowing for the report: the Code Block and neutral shadows will not follow a colour edit, in the current preview as well.

Exceptions found, with evidence:

- 41 `font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace` declarations in non-glass sheets (command 7, context-menu 7, data-table 7, dropdown-menu 7, menubar 6, table 7) and one `'JetBrains Mono', ui-monospace, monospace` (`sidebar/minimalist.css:557`). They do not read `--font-mono`, so a mono-font edit does not restyle those shortcut and tabular cells. This is how the sheets behave today; it is a catalog finding, not a fast-path risk. (The same families use `var(--font-mono, ui-monospace, monospace)` in 33 other places.)
- Border radii and widths: literal radii (`999px` pills, `50%`, `0`, `inherit`) are deliberate shape choices next to many `var(--radius)` uses. For comparison, `var(--radius)` appears 37 (organic, retro-futurism) to 225 (papier) times per family, `var(--border-width)` 72 (flat) to 184 (papier), `var(--motion-duration)` 82 to 108, `var(--control-height)` 23 to 26. `--shadow-x` and `--shadow-y` are used 1 to 112 times: flat and minimalist (0 to 1) barely read them, as expected for their flat and minimal look, so an offset edit changes little there. No sheet defines `--radius`, `--border-width`, `--shadow-x/y`, `--control-height`, `--font-family` or `--motion-duration` itself (the scan found no declaration of them in catalog sheets), so these are always the preset's values.

### (c) Synchronous derivability, and `previewTokensCss`

- The token step of `compile()` (`compile.ts:118-142`) uses `resolveTypography` (`typography.ts:77-105`), `variable()`, `glassTokens` and plain object assignment. None of it awaits; `await` first appears at the artifact loop (`compile.ts:236-245`: Prettier `format`, `sha256`). The one asynchronous input is `resolvePreset`, which only normalises colours and takes `sha256(canonicalize(data))` (`packages/compiler/src/resolve.ts:26-66`, `hash.ts:1-4` through `crypto.subtle.digest`). So tokens, the family sheet, the component sheets and the font block are derivable synchronously from validated preset data. Only the preset hash needs one async digest (one call, microseconds against the 190 digests and the Prettier passes of a full compile).
- `previewTokensCss(family, theme)` (`scripts/www-previews/scope-css.ts:110-116`) is already a pure, synchronous formatter of a `ThemeData`: it writes the light block and a dark block under the stage selector, each with a `color-scheme`. It takes `theme` as input, and `scripts/generate-www-previews.ts:33,63,150` fills that from an awaited `compile()` at build time, only to read `result.theme`. So the inline `/components` path proves the token blocks can be applied by data (`:root`/`.dark`, here scoped to a stage), but it gets its theme from a compile at build time, not at edit time. A `presetTheme(presetData)` function extracted from `compile()` would be the missing synchronous step; `previewTokensCss` would not be used by the iframe (the iframe styles `:root` and `.dark`, `preset-preview.tsx:100-107,174-178`) and is not needed on this path.
- What the iframe takes from a `CompileResult`: only style artifacts, through `presetRuntimeStyles` (`preview-protocol.ts:200-209`): `@theme inline` blocks removed, font imports stripped, the style artifacts joined. Which means the fast path has to produce that text (formatted or not), plus the `data-preset-hash`/`data-preset-request` marks the e2e and the ack use (`preset-preview.tsx:134-143`).
- The iframe also re-runs `compile()` for each render and compares it to the received result with `canonicalize` (`verifyPresetRender`, `preview-protocol.ts:140-153`), over every component the family supports (`componentsWithStyleSupport`, `preview-protocol.ts:134-139`), with `glassContrast: 'report'`. That is the 1033 ms verification in the phase split above.

### (d) Scenes that depend on a full iframe page

Scenes are `apps/preview/src/scenes/{dashboard,projects,settings,sign-in,workspace}.tsx` (1950 lines with `index.tsx` and `shared.tsx`), rendered from `PresetScenePage` inside the iframe (`preset-preview.tsx:182-186`). With the iframe kept, none of the following changes; they would matter only if scenes moved inline (approach B).

- Workspace (`workspace.tsx:7,67`): `SidebarProvider` and the catalog Sidebar. Sidebar reads the window's width for its breakpoint, which is why it is `iframeOnly = ['sidebar']` in the inline component work (`docs/evidence/inline-component-previews.md`, Scope and limits).
- Portals: the scenes use `Sheet` (2 uses), `Popover` (2), `DropdownMenu` (2), `Tooltip` (2 with provider) and `Command`. These render into `document.body` of the iframe, which is why inline previews needed `PreviewPortal`. In the iframe they are styled by the single `<style data-preset-styles>` and the `.dark` class on `<html>` (`preset-preview.tsx:106-109`).
- Settings (`settings.tsx:140-146`): a `window` `keydown` handler for Ctrl/Cmd+K that opens the command palette; it would need scoping to a stage if inlined.
- Settings also holds a Calendar (`settings.tsx:130`, dates built with `new Date(2026, 10, 12)`); Calendar's date text depends on the locale (`clientOnly = ['calendar']` in the inline work).
- Scroll: Projects uses `ScrollArea` (`projects.tsx:70,534`). Focus mode and the scene hide or show gallery children by toggling `hidden` and `html[data-scene]`/`html[data-focus]` (`preset-preview.tsx:112-143`), which assumes a document of its own.
- Liquid glass adds `LiquidGlassFilter`, backdrop art and a control halo to the document (`preset-preview.tsx:170-173`) and is excluded from the fast path anyway.

### Findings that bear on the plan

1. The two `compile()` runs per edit (worker, then iframe) cost about 1.2 s and 1.0 s; the apply itself costs about 30 ms. A message that carries only the validated preset and lets the iframe derive its styles synchronously removes both compiles from the visible path.
2. The sheets read every editable design value through variables (section b), so a derived stylesheet changes exactly as the full result does. The exceptions are catalog facts that exist in both paths: the literal mono stack on command, menus and tables, the code palette, neutral shadows and scrims.
3. `presetTheme` is a pure extraction of `compile.ts:118-143`. The family-sheet and component-sheet assembly (`compile.ts:166-173`, `205-212`) is also pure; font-rule assembly needs `resolveTypography` only.
4. The preset hash needs one `crypto.subtle.digest` (async but fast). The ack must carry it so it matches the later compiled result's `preset.hash` (`preset-preview-frame.tsx:72-77`).
5. Prettier formatting of the CSS is the only place the fast path's text will differ from the full path's (the artifacts are formatted, `compile.ts:238-244`); equivalence has to be tested on parsed CSS, as the spec says.

## Raw measurement

`node scripts/measure-preset-editor.mjs http://127.0.0.1:3000 --runs 5` (per-render phase array omitted here; it is in the task report):

```json
{
  "origin": "http://127.0.0.1:3000",
  "runs": 5,
  "firstReadyMs": 5896,
  "tokenEditMs": [2634, 2402, 2320, 2258, 2379],
  "familySwitchMs": { "Papier": 2743, "Organic": 2859, "Retro futurism": 2879, "Minimalist": 2424, "Flat": 2429, "Neo-brutalism": 2582 },
  "sceneSwitchMs": 1311,
  "modeSwitchMs": 1132,
  "workerCompileMs": [2530, 2417, 1175, 1080, 1031, 982, 1051, 1169, 1414, 1324, 1561, 1289, 1509, 1047, 1282, 1065, 1291, 1211, 1126],
  "iframeApplyMs": [1655, 1200, 1068, 1029, 1022, 1061, 1166, 1150, 1183, 989, 971, 1019, 1166, 1008],
  "iframePhases": {
    "samples": 14,
    "medianPostToReceiveMs": 3,
    "medianReceiveToFirstDigestMs": 9,
    "medianVerificationMs": 1033,
    "medianLastDigestToAckMs": 29,
    "medianAckToTopMs": 0
  },
  "workerRequests": 19,
  "renderMessages": 14
}
```

## Prototype gate measurement

Branch `feat/instant-editor-previews`, commit `ae047417aa92bcf7a0d89b3f175c260d3151076a` (preset-tokens fast path from the preceding tasks in place). Same machine, browser, build method and command as the baseline (`node scripts/build-hosted-www.mjs`, `next start --hostname 127.0.0.1 --port 3000`, `node scripts/measure-preset-editor.mjs http://127.0.0.1:3000 --runs 5`, `OMBELLE_BROWSER_CHANNEL=chrome`). Single pass, no cherry-picking.

Script changes since the baseline (Method):

- The family-switch confirmation is no longer detected with a 750 ms window. The script polls for the `Confirm change` dialog and for a preview change and takes whichever comes first, failing with a named error after 60 s. Without a dialog the clock runs from the family click; with one, from the `Confirm change` click (as before).
- Ack matching: `preset-tokens` posts are tracked by `requestId` alongside `preset-render`, on the editor's port and in the iframe. Both kinds are acked with `type: 'preset-render-ack'`. `iframeApplyMs` now holds every post-to-ack round trip of either kind, and the new `tokensApplyMs` is the `preset-tokens` subset. In this run every apply was a tokens round trip, so the two arrays are equal. The phase split (digest-based) no longer measures a verification compile: the single digest left is the preset hash.

### Gate

Median token edit, Dashboard / Ombelle: **102 ms** (118, 103, 102, 101, 100). Required: under 100 ms and at most 237.9 ms (10x faster than 2379 ms). The speedup is 23x and clears the 10x bound, but 102 ms is not under 100 ms. **Gate: FAIL** on the binding bound, by 2 ms. The measurement carries 5 to 15 ms of polling overhead (CDP fingerprint polled every 2 ms), and four of five runs sit between 100 and 103 ms.

### Before and after

| Metric | Baseline ms | Fast path ms | Change |
| --- | --- | --- | --- |
| First ready | 5896 | 1926 | 3.1x faster |
| Token edit, median of 5 | 2379 | 102 | 23x faster |
| Family switch, Papier | 2743 | 257 | |
| Family switch, Organic | 2859 | 271 | |
| Family switch, Retro futurism | 2879 | 246 | |
| Family switch, Minimalist | 2424 | 232 | |
| Family switch, Flat | 2429 | 250 | |
| Family switch, Neo-brutalism | 2582 | 233 | |
| Family switch, median | 2662.5 | 248 | 10.7x faster |
| Scene switch (Dashboard to Settings) | 1311 | 236 | 5.6x faster |
| Mode switch (light to dark) | 1132 | 153 | 7.4x faster |
| Iframe apply, median | 1064.5 | 118 | |
| Worker `compile()`, median (19 requests, still in the background) | 1211 | 1094 | same code path; the difference is run-to-run variance |

Where the remaining time goes: iframe apply (post to ack) medians 118 ms. The phase split printed below (arrival to first digest 2 ms, digest to ack about 28 ms, ack back to the editor page about 68 ms) is not established: this run's renders include request ids that repeat across channels (see Corrections), and the script then matched posts, arrivals and acks by request id alone. The optimisation pass replaces it with trace evidence. The first two worker compiles still include the worker cold start (2376 and 2275 ms).

Corrections (made with the optimisation pass, same raw values):

- Medians. The script's `median()` returned the upper middle value for an even count. It now returns the true median. Recomputed from the raw values: worker compile 1094 ms (printed 1173), family switch 248 ms over six switches (the table said 249), and the baseline family switch 2662.5 ms (the table said 2582, the Neo-brutalism value). Token edit 102 ms (five values) and iframe apply 118 ms (fifteen values) were already correct.
- Repeated request ids. The iframe announces `ready` every 150 ms until it holds a port, and the editor opens a new `MessageChannel` for every `ready` it receives (`preset-preview-frame.tsx`), restarting its request ids at 1. During start-up several announcements are in flight, so the editor opens several channels in a row and the iframe accepts each init in turn; a rerun on this commit counted 4 `ready` messages at the editor, 3 inits received in the iframe and 3 editor channels carrying renders. Old ports are closed on both sides, so nothing stale is applied, but a measurement keyed by request id alone can pair a post with another channel's ack. The script now keys every record by port on each side and pairs a post with the first arrival of its request id at or after the post (both clocks are absolute), and prints the handshake counts under `channels`.
- Family switch clock. The script did not record which switches went through the `Change style family?` dialog. It now prints `familyConfirmed`. A rerun of the same sequence on this commit showed the dialog for all six switches (Papier, Organic, Retro futurism, Minimalist, Flat, Neo-brutalism), so every family figure here runs from the `Confirm change` click; the baseline used the same sequence.

### Raw measurement

```json
{
  "origin": "http://127.0.0.1:3000",
  "runs": 5,
  "firstReadyMs": 1926,
  "tokenEditMs": [118, 103, 102, 101, 100],
  "familySwitchMs": { "Papier": 257, "Organic": 271, "Retro futurism": 246, "Minimalist": 232, "Flat": 250, "Neo-brutalism": 233 },
  "sceneSwitchMs": 236,
  "modeSwitchMs": 153,
  "workerCompileMs": [2376, 2275, 1067, 1013, 989, 958, 975, 1094, 1299, 1372, 1248, 1220, 1440, 1078, 992, 978, 1185, 1173, 1079],
  "iframeApplyMs": [146, 143, 102, 92, 93, 90, 89, 130, 127, 124, 116, 127, 118, 133, 25],
  "tokensApplyMs": [146, 143, 102, 92, 93, 90, 89, 130, 127, 124, 116, 127, 118, 133, 25],
  "iframePhases": {
    "samples": 15,
    "medianPostToReceiveMs": 0,
    "medianReceiveToFirstDigestMs": 2,
    "medianVerificationMs": 0,
    "medianLastDigestToAckMs": 28,
    "medianAckToTopMs": 68
  },
  "workerRequests": 19,
  "renderMessages": 15
}
```

## Optimisation pass

Branch `feat/instant-editor-previews`, from `dc945388` (gate measurement) to `1c71ed3a`. Same machine, browser and build method as above; `next start --hostname 127.0.0.1 --port 3000`, `OMBELLE_BROWSER_CHANNEL=chrome`. Target: median token edit under 50 ms input to paint.

### Method changes

- Medians are true medians, and records are keyed by channel (see Corrections above).
- The Corner radius field commits on every input, so the edit reaches the editor during Playwright's `fill`, before the clock of `tokenEditMs` starts at the Tab press. `tokenEditMs` is kept for comparison. Two metrics are added:
  - `tokenInputMs`: from the start of `fill` to the fingerprint change. It includes the editor's own handling of the input, since `fill` returns only once the input event has been handled.
  - `tokenFrameMs`: from the input event's `timeStamp` in the editor page to the first frame the iframe produces after it applies the preset (a task queued from `requestAnimationFrame` after the applied ack, read inside the iframe). Both clocks are `timeOrigin + now`. It involves no CDP round trip and is the closest of the three to input to paint.
- Both CDP metrics carry a fixed cost. With no change to detect, on the final build, the median of 10 rounds was: `press('Tab')` 8 ms, one fingerprint poll 9.7 ms, Tab plus one poll 17.6 ms, and fill (same value) plus Tab plus poll 24 ms. `tokenEditMs` cannot go below about 18 ms, and `tokenInputMs` cannot go below about 24 ms plus the editor's input handler.
- Single passes of 5 runs varied by up to 10 ms on this machine, so each change was also compared over 15 runs (`--runs 15`).

### Profile before any change (Step 1)

One Corner radius edit on the gate build. Chrome trace (browser-wide `Tracing`, all renderer processes) and CPU profiles (`Profiler`, 100 µs sampling) of the editor page and of the iframe, which runs out of process.

Editor page (main thread, from the input event):

| Time from input, ms | Task | Cost, ms |
| --- | --- | --- |
| 0 | `input` event handler: React render, commit and the synchronous passive effects. `preset-tokens` is posted at the end of this task | 111.7 |
| 117 | Scheduler task: second render of the editor, from the compiler state update in `usePresetCompiler` | 103.1 |
| 227 | `keydown` (Tab) is dispatched only now | 1.7 |

CPU profile of the editor page over the edit: 212 ms busy. `getCatalog('0.1.0')` takes 163 ms inclusive: it rebuilt the whole catalog on every call (every template's dependency filter, `validatePreset` on every built-in and starting preset), and the editor calls it per field per render (`fieldValue` in `preset-editor/model.ts`, 156 ms; the family defaults in `ThemeControls`; `materializePreset`). The Ajv preset validator alone is about 11 ms of it. Most of the rest is the React render and commit of the editor tree. `materializePreset`, `presetHashOf` and the contrast computation are each under 2 ms or not on the path: contrast runs only when the worker result changes.

Iframe (main thread): one 40.2 ms task from the message to the ack. The `flushSync` render in `apply` 20 ms, of which 7 ms is a forced layout (`getBoundingClientRect` in the catalog Button's per-render layout effect, for every Button in the scene); the reduced-transparency mirror 8.6 ms (it serialises every rule of the replaced preset sheet to look for `prefers-reduced-transparency`); CSS parsing of the whole preset sheet 7 ms; validation and derivation (`verifyPresetTokens`: `resolvePreset`, `presetPreviewSheets`, the hash digest) 9 ms, most of it `getCatalog` again.

The editor posted the tokens 108.9 ms after the input; the iframe finished at 149 ms. The "about 68 ms before the ack reaches the editor page" seen at the gate was the 103 ms second render: the ack waited in the editor's task queue. The gate's 102 ms `tokenEditMs` mostly measured that queue: the preview had already changed before the Tab keydown was dispatched.

### Changes (Step 2)

Medians in ms. "Pass" is the number of token-edit runs. Each row is measured with its change on top of the kept rows above it.

| Change | Pass | Token edit (Tab) | Token input | Token frame | Family | Scene | Mode | First ready | Kept |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Before (gate build, new script) | 5 | 102 | 200 | | 240.5 | 231 | 148 | 1770 | |
| 1. `perf(catalog)`: build the catalog once per release | 5 | 30 | 48 | | 85 | 165 | 74 | 1478 | yes |
| (same build, control for 2) | 15 | 28 | 47 | | 94.5 | 169 | 66 | 1857 | |
| 2. `perf(preview)`: memoise the scene element on family and scene, so a token edit re-renders only the style | 15 | 27 | 45 | | 92.5 | 163 | 48 | 1752 | yes |
| 3. `perf(preview)`: skip mirroring a style element whose text never names `prefers-reduced-transparency` | 15 | 25 | 41 | | 79 | 175 | 49 | 1393 | yes |
| 4. Memoise the top bar's Breadcrumb trail | 15 | 25 | 42 | | 88.5 | 177 | 51 | 1283 | no, reverted |
| (control for 5: changes 1 to 3, script with `tokenFrameMs`) | 15 | 29 | 45 | 25 | 88 | 175 | 58 | 1645 | |
| 5. `perf(www)`: post `preset-tokens` from the editor's input handler, before it re-renders | 15 | 27 | 47 | 17 | 89 | 192 | 61 | 1315 | yes |
| 6. `perf(preview)`: one style element per preset sheet | 15 | 26 | 42 | 8 | 90.5 | 171 | 53 | 2031 | yes |

Notes on each change:

1. `getCatalog` caches the built catalog per release (`packages/catalog/src/index.ts`). Callers only read it; the presets inside were already shared objects (`validatePreset` returns its input). All 288 unit test files passed with the cache. In the editor it shrank the input handler from 112 to about 24 ms and the second render from 103 to about 14 ms; in the iframe, the derivation from 9 to about 1 ms.
2. The iframe's `flushSync` render dropped from about 20 to about 9 ms and the token apply (post to ack) from about 20 to about 12 ms. On the end-to-end metrics the gain is 1 to 2 ms: the forced layout moves out of the apply task into the next frame instead of disappearing.
3. Before the change, the mirror ran in a microtask after the commit, so it delayed the frame but not the ack. Token edit 27 to 25, token input 45 to 41, family 92.5 to 79.
4. The profile after change 1 showed 10 ms in the Breadcrumb's per-render layout effect (it measures its items) inside the input handler. With the trail memoised, the next layout effect, the catalog Button's per-render `getBoundingClientRect`, paid the same forced style recalc (7.5 ms in the profile). No gain (25 to 25, 41 to 42), so it was reverted. Changing the catalog Button is out of scope.
5. `PresetPreviewFrame` takes an optional `sender` ref; the preset editor fills it and calls it from `commit()` with `materializePreset(next)`, inside the input handler. The frame posts `preset-tokens` only on the fast path, and remembers the last posted preset and view, so the render that follows does not post the same message again. Glass, the playground, the demo page and published snapshots pass no `sender` and behave as before. In the trace the iframe now receives the edit 2 ms after the input instead of 22 ms. `tokenFrameMs` 25 to 17. The CDP metrics cannot show it: by the time `fill` returns, the preview has already changed in both builds.
6. `verifyPresetTokens` now also returns the derived sheets (their join is still `css`), and the preview renders one `<style data-preset-styles>` per sheet, in the same order. A radius edit changes only the token sheet's text, so the browser no longer re-parses the whole preset CSS (about 9 ms). `preset-render` keeps a single sheet. `tokenFrameMs` 17 to 8.

Not done: avoiding the second `presetWithDefaults` merge on the fast path (candidate c). After change 1, the iframe's whole validation and derivation is under 2 ms in the profile, so there was nothing measurable to remove.

### Final measurement (Step 4)

Commit `1c71ed3a`, full build with `node scripts/build-hosted-www.mjs`, three consecutive passes on one server:

| Metric | Pass A (5 runs) | Pass B (5 runs) | Pass C (15 runs) | Gate (5 runs) |
| --- | --- | --- | --- | --- |
| Token edit, from Tab (`tokenEditMs`) | 37 | 26 | 27 | 102 |
| Token edit, from the input (`tokenInputMs`) | 67 | 45 | 46 | 200 (gate build, new script) |
| Token edit, input to iframe frame (`tokenFrameMs`) | 12 | 8 | 8 | not measured |
| First ready | 1302 | 1546 | 1556 | 1926 |
| Family switch, median of 6 (all six confirmed) | 93.5 | 93 | 93 | 248 |
| Scene switch | 163 | 166 | 176 | 236 |
| Mode switch | 74 | 61 | 65 | 153 |

Raw token edits: A `[37, 34, 41, 41, 36]`, input `[74, 60, 68, 67, 55]`, frame `[12, 15, 16, 10, 11]`; B `[43, 26, 28, 26, 25]`, input `[87, 46, 45, 45, 42]`, frame `[16, 8, 8, 8, 8]`; C `[34, 27, 26, 30, 28, 25, 28, 25, 26, 32, 28, 27, 27, 24, 30]`, input `[64, 46, 42, 47, 44, 40, 47, 41, 45, 47, 49, 43, 46, 38, 51]`, frame `[9, 8, 8, 9, 8, 8, 8, 8, 8, 8, 8, 8, 9, 7, 8]`. Family switches A: Papier 102, Organic 94, Retro futurism 98, Minimalist 93, Flat 80, Neo-brutalism 81. Every pass recorded one `ready` handshake and one channel.

A trace of one edit on this build: the input handler takes 26.4 ms; the iframe receives the tokens 1.6 ms after the input, applies them in 3.1 ms and finishes its style recalc 12 ms after the input. Before the pass, the same point came about 150 ms after the input.

Result against the 50 ms target: met on the two measures of input to paint, `tokenFrameMs` (8 to 12 ms) and the trace (12 ms to the iframe's style recalc), and on `tokenEditMs` (26 to 37 ms). `tokenInputMs` (45 to 67 ms) is under 50 in two of three passes: it includes the editor's own 24 to 26 ms input handler, which `fill` waits for, and about 24 ms of CDP cost. The editor page is still busy for about 26 ms on each edit (React render and commit of the editor, plus a forced style recalc from the catalog Button's layout effect) and for a further 13 ms on the compiler-state render; neither delays the preview any more.

Family-switch apply (post to ack) rose from about 40 to 55 to 60 ms with change 5: the family's tokens are now posted before the editor's larger family render, and the ack waits behind it. The family switch as measured end to end did not change (88 to 89).

## Fonts (Task 7, Step 1)

Question: does picking a display font need a prefetch into the preview iframe? The sandboxed iframe has an opaque origin, so a preload in the editor page would not reach its cache; the only option is a `prefetchFonts` field on `preset-tokens` that the iframe passes to `loadPresetFonts`. Rule: add it only if the median time from pick to font load exceeds 300 ms.

Method: production build of `1c71ed3a` plus the Task 7 tests (`node scripts/build-hosted-www.mjs`, `next start --hostname 127.0.0.1 --port 3000`, Chrome via `OMBELLE_BROWSER_CHANNEL=chrome`, 1100x800, reduced motion). A fresh browser context per font, so nothing is cached. The editor is left on the default (Flat) draft; the "Display font" select is changed with `selectOption`. Inside the iframe a `requestAnimationFrame` loop records, on the absolute clock, when the heading (`[data-slot="empty-title"]`) computed `font-family` first differs ("CSS paint") and when a `FontFace` of that family in `document.fonts` first has status `loaded` ("font load"), both from the moment before `selectOption`. Two passes of the same 10 fonts: Fraunces, Young Serif, Michroma, Exo 2, Nunito, Space Grotesk, Instrument Sans, Inter Tight, DM Sans, Work Sans.

| Pass | Median to CSS paint, ms | Median to font load, ms | Slowest font load, ms |
| --- | --- | --- | --- |
| 1 | 13 | 154 | 201 (Young Serif) |
| 2 | 13 | 164.5 | 250 (Young Serif) |

Raw font load, pass 1: 179, 201, 179, 148, 161, 130, 150, 151, 145, 157. Pass 2: 187, 250, 137, 138, 171, 150, 131, 184, 162, 167. CSS paint: 11 to 25 ms in both passes.

Decision: no prefetch. The median font load (154 and 164.5 ms) is well under 300 ms and no single font reached it. The CSS paints at 13 ms with the fallback face and the font swaps in about 150 ms later. `PresetTokens` is unchanged. Caveat: localhost, no network latency or CDN; on a slow link the font load would take longer, but the preview already paints the new CSS first and the font swaps in. Fonts the draft already uses are loaded already (Bricolage Grotesque and Figtree on Flat measured as loaded before the pick), so those picks cost nothing.

### Two preset-editor.spec.ts failures are older than this branch (Task 7)

`applies a style palette and a primary colour in one step ...` (expects `oklch(98.6% 0.003 67.8)`, the export has `oklch(0.986 0.003 67.8)`) and `edits a token with its Color Picker inside the token panel ...` (the saturation/brightness slider click leaves the value at `oklch(55% 0.22 6)`) both fail the same way on the base commit `68de5cd2`, run in a temporary worktree (`pnpm install --frozen-lockfile --ignore-scripts`, `build:packages`, `generate:preview`, site config with only that spec). They are not regressions of the instant preview work.

## Component editor audit (Task 8)

Branch `feat/instant-editor-previews`, measured on commit `f11751e9` (the catalog cache of change 1 is already in). Question: where does the component editor's preview spend its time, and does the iframe's re-verification compile dominate? Design: "Design: component editor" and "Calls made during review" 3. No product change in this task.

### Method

- Same machine, toolchain and build as the preset audit: AMD Ryzen 7 2700X, Windows 11, Node 24.19.0, Google Chrome (headless, `OMBELLE_BROWSER_CHANNEL=chrome`, 1100x800, reduced motion). `node scripts/build-hosted-www.mjs`, `next start --hostname 127.0.0.1 --port 3000`. Production, localhost, no network latency or CDN.
- Command: `node scripts/measure-component-editor.mjs http://127.0.0.1:3000 button card dialog select --runs 5` (cold) and the same with `--warm`. Pages: `/editor/component/button` (the Button editor, `useCompiler`, `render` messages) and `/editor/component/{card,dialog,select}` (the catalog editor, `useCatalogCompiler`, `catalog-render` messages). Ombelle family, light, single layout.
- Cold: a fresh browser context for each of the 5 loads, HTTP cache disabled. Warm: a fresh context, one priming load, then the measured load with the cache on. The load phases are the true median of the 5 loads. The edits are 5 recipe edits on the last page (the first editable text field of the properties panel, set with `fill`), each waited out until the editor settles; the arrays are those 5 edits in order.
- Records, on the absolute clock, keyed by worker and `requestId` (worker) and by port and `requestId` (render): `Worker` construction, every worker request and reply, every render post on the editor's ports and its ack, the iframe `load` event, and `crypto.subtle.digest` calls in both documents (a compile hashes each artifact). Inside the iframe, when each render arrived and each ack was posted.
- Phases: `iframeLoadMs` navigation start to the iframe `load` event. `workerDownloadMs` Resource Timing duration of `/editor-compiler.worker.js` (833 KB compressed, 5.5 MB raw). `firstCompileMs` the first compile request to its reply (includes the worker's cold start). `iframeFillMs` the first render post to its ack (the iframe's verification compile plus the state update; the ack precedes the paint, so paint is not in it). `firstRenderMs` navigation start to the first frame produced after the first applied render. `iframeVerifyMs` (per edit) the render's arrival in the iframe to its ack. `moduleRequests` script requests under `/ombelle-preview/`. Per edit the script also records `workerGotToRenderPostMs`: from the worker's reply to the render post, which is the editor page's own verification compile on its main thread (`verifyPreviewCompileResult`, `verifyCatalogCompileResult`).

### Phases, cold (median of 5 loads, ms)

| Phase | button | card | dialog | select |
| --- | --- | --- | --- | --- |
| Iframe load (navigation to `load`) | 909 | 457 | 947 | 364 |
| Worker download | 96.5 | 108 | 81 | 88 |
| First compile (request to reply) | 1209 | 1713 | 1493 | 1770 |
| Editor main-thread verification, worker reply to render post | 104 | 188 | 237 | 408 |
| Iframe fill (post to ack) | 143 | 340 | 273 | 377 |
| First render (navigation to first frame) | 2760 | 3648 | 3376 | 3875 |
| Iframe script requests | 22 | 20 | 35 | 46 |

### Phases, warm (median of 5 loads, ms)

| Phase | button | card | dialog | select |
| --- | --- | --- | --- | --- |
| Iframe load | 716 | 670 | 708 | 662 |
| Worker download | 17 | 14 | 13 | 15 |
| First compile | 975 | 1481 | 1398 | 1581 |
| Editor main-thread verification | 101 | 198 | 142 | 386 |
| Iframe fill | 80 | 238 | 159 | 283 |
| First render | 2135 | 2908 | 2677 | 3138 |
| Iframe script requests | 22 | 20 | 35 | 46 |

The iframe load is bimodal in the cold runs (about 360 to 460 ms in most loads, about 950 to 1010 ms in the others) and about 650 to 770 ms in every warm load; it is off the critical path in both cases (see below).

### One recipe edit (median of 5 edits, cold; warm in brackets, ms)

| Phase | button | card | dialog | select |
| --- | --- | --- | --- | --- |
| Debounce (`use-compiler.ts:92`, `use-catalog-compiler.ts:38`) | 100 | 100 | 100 | 100 |
| Worker compile (`recompileMs`) | 57 (60) | 255 (267) | 174 (179) | 295 (288) |
| Editor main-thread verification (worker reply to post) | 78 (81) | 142 (140) | 100 (115) | 168 (154) |
| Iframe verification (`iframeVerifyMs`, arrival to ack) | 55 (59) | 132 (136) | 99 (87) | 172 (159) |
| Ack to frame | 5 | 3 | 3 | 3 |
| Input to first iframe frame (`editToFrameMs`, measured) | 342 (353) | 664 (690) | 503 (501) | 786 (740) |
| Compiles the edit causes (worker + editor page + iframe, by digest count) | 1 + 1 + 1 | 1 + 2 + 1 | 1 + 2 + 1 | 1 + 2 + 1 |

The listed phases add up to the measured input-to-frame time within about 30 ms (card: 100 + 255 + 142 + 132 + 3 = 632 against 664), which is the CDP and `fill` overhead. Raw per-edit values: recompile button `[57.4, 49.9, 75.7, 69.8, 42.1]`, card `[315.7, 256.6, 246.5, 229.5, 255.2]`, dialog `[205.2, 176.4, 163.7, 163.6, 173.9]`, select `[358.8, 294, 295.2, 328.9, 282.7]`; iframe verify button `[64.1, 54.9, 55.1, 52.4, 43.2]`, card `[159.8, 142.9, 130.5, 131.8, 122.7]`, dialog `[119.5, 100.4, 80.8, 99.2, 86.7]`, select `[204.4, 190.9, 171.6, 149.4, 153.7]`.

Where the digests come from: a catalog compile makes 14 digests (13 for dialog), a Button compile 7. The editor page made 28 (26) digests between the input and the render post for the catalog editors, 7 for the Button: the catalog editor verifies each worker result twice on its main thread, once in `useCatalogCompiler` (`use-catalog-compiler.ts:23`) and again in `PreviewFrame.sendCurrent` (`preview-frame.tsx:78`), then the iframe verifies it a third time. The Button hook only validates the shape (`validatePreviewCompileResult`); the one compile on its main thread is in `sendCurrent` (`preview-frame.tsx:88`).

### Dominant phase

First render (cold 2.8 to 3.9 s, warm 2.1 to 3.1 s) is serial: page boot until the worker is constructed (about 1.2 s cold, 0.8 s warm: navigation and Next hydration, derived as first render minus the worker's start-to-reply time, the editor verification and the iframe fill), then the worker's first compile (1.0 to 1.9 s), then the editor page's verification (0.1 to 0.4 s), then the iframe's fill (0.08 to 0.38 s). The iframe's own load (0.36 to 1.0 s) and the worker download (13 to 108 ms) run alongside the first compile, so they are not on the path. The dominant phase is the worker's first compile: 44 to 47 percent of first render cold, 46 to 52 percent warm. It is mostly cold start, not compile work: the next compile on the same worker takes 57 ms (Button) to 295 ms (select), against 1.2 to 1.8 s for the first. Download time is under 110 ms cold and about 15 ms warm, so a `modulepreload` of the worker script would save at most that, and the cache already saves it on a warm load.

Per edit, the largest single phase is the worker compile for the catalog components (35 to 38 percent of the measured input-to-frame time; 17 percent for the Button, where the 100 ms debounce at 29 percent and the editor's own verification at 23 percent are larger).

### Does the iframe's re-verification dominate?

Not on its own, but verification as a whole is a large share. Per edit, cold:

| Share of input-to-frame time | button | card | dialog | select |
| --- | --- | --- | --- | --- |
| Iframe verification (`verifyPreviewRender` / `verifyCatalogPreviewRender`) | 16% (55 of 342 ms) | 20% (132 of 664) | 20% (99 of 503) | 22% (172 of 786) |
| Editor-page verification (before the post) | 23% (78) | 21% (142) | 20% (100) | 21% (168) |
| Both together | 39% | 41% | 40% | 43% |
| Worker compile | 17% | 38% | 35% | 38% |

On first render the same two verifications cost 9 percent (button), 14 percent (card), 15 percent (dialog) and 20 percent (select) of first render. The iframe's fill is 80 to 380 ms there, close to one compile.

Decision for the user (design call 3; nothing here changes validation): the iframe's re-verification is 16 to 22 percent of each edit, and with the editor page's own verification it is about 40 percent, more than the worker compile itself for the Button. The editor-page share runs on the editor's main thread, so the page is busy for 78 to 168 ms on every edit (two long tasks of about 140 ms each for a card in the trace). Two options exist, both of which touch validation and so need the user's approval: (1) skip the editor page's second, identical verification of a result that `useCatalogCompiler` has just verified (catalog editors only; about half of the editor-page share, 50 to 85 ms per edit, no weakening of what the iframe checks); (2) any change to the iframe's own check. Only (1) is worth asking about if a per-edit gain is wanted; the first-render path does not depend on either.

### Chrome trace of one card edit

One `Title` edit on `/editor/component/card`, after a warm-up edit, browser-wide `Tracing` with the V8 sampling profiler (every phase is inflated, so use it for where the time goes, not for the totals). Editor page main thread, 344 ms busy: two long tasks of 140 ms (at +607 ms from the input, the worker's reply being verified) and 149 ms (at +779 ms), 27 ms in between, and the 14 ms input handler. The worker, 487 ms for the compile under tracing (255 ms untraced): top self times are the CSS formatter's AST and source-offset functions (`qC` 21.7 ms, `yg` 13.7 ms, `ibe` 7.5 ms) and garbage collection (15.9 ms). The iframe's own renderer process (a separate process, so its main thread does not block the editor page): 191 ms, top self times the same formatter functions (22.7, 17.4, 11.3 ms) and 5.6 ms of garbage collection. In the editor page the top self times are likewise one minified compiler function (66 ms, 30 ms, 9 ms), the CSS printer (`print`, 5 ms) and 10.7 ms of garbage collection. The cost of an edit is therefore the compile, run four times for a catalog component (worker, editor page twice, iframe), and nearly all of a compile is the formatter working over the generated CSS; the React work and the style swap are under 10 ms. The function names are minified; the worker's `yg` and `qC` are the Prettier postcss helpers that prefix node types and fill source offsets.

### Order for Task 9 (what the numbers support)

1. A precompiled default recipe per built-in family, bundled into the iframe (call 3 allows it): removes the worker's first compile, the editor-page verification and the iframe's fill from the first view, 1.2 to 2.6 s of the 2.1 to 3.9 s. The first view then waits only for the page boot and the iframe's own load.
2. Start the worker earlier (instantiate it before the editor mounts, for instance from the component index) and warm it with a throwaway compile: the first compile is 1.0 to 1.9 s against 57 to 295 ms for the next, so about 1 to 1.5 s is cold start, and this also helps a restored draft, which a precompiled default does not.
3. Right-height skeleton against layout shift: not a time cost in these measurements; keep it for the layout-shift rules.
4. Bundling the iframe's modules: 20 to 46 script requests, and the iframe load (0.36 to 1.0 s) is off the critical path, so the gain is small.
5. `modulepreload` of the worker script: the download is 13 to 108 ms, so at most that.

Not in the Task 9 list but visible here: the 100 ms debounce is 13 to 29 percent of an edit, and option (1) above is the one change that would cut the per-edit cost.

## Component editor: precompiled default recipe (Task 9, experiment 9c)

Kept with exception after fix round 1 (see "Fix round 1" below: the worker's first compile is still slower for select). Each component editor's default recipe is compiled at build time, per family, and bundled into the editor preview, which shows it as soon as the editor connects, before the worker's first compile. The first compile and every edit then reach the preview through the existing verified render path, which replaces the default. Message validation, the iframe's sandbox and its isolation are unchanged (design, "Calls made during review" 3).

### What changed

- `apps/www/src/editor/precompiled-defaults.ts`: the default recipe a fresh editor shows in each family (Button: the example recipe moved to the family, as `ButtonEditor` starts; catalog components: `createCatalogDraft` moved to the family, as the editor's family picker does), the precompiled families (every built-in family but Liquid Glass, which stays on the compiled path), and the test that tells whether a recipe is still one of those defaults.
- `scripts/generate-editor-defaults.ts`, called from `scripts/generate-preview.ts`: compiles each default with `compileRecipe` (Button) or `compileComponentRecipe` (catalog), the functions the worker and the iframe's verification use, into `apps/preview/src/generated/editor-defaults/<component>/<family>.json` (generated, ignored by git). 441 files: Button and 62 catalog components, 7 families each where the family supports the component.
- The editor puts `default=<family>` in the iframe URL while its recipe is that default. It answers the preview's `ready` only after it has restored its draft; a restored draft that is not a default drops the parameter, so the preview never shows a default for a different recipe (it reloads once, alongside the first compile). The preview fetches the named default as it starts (`import.meta.glob`, one 25 KB chunk) and shows it with request id 0 once its port is attached, unless a render has already been applied; it does not report measurements for request 0.

### Method

As Task 8 (same machine, `node scripts/build-hosted-www.mjs`, `next start --hostname 127.0.0.1 --port 3000`, Chrome headless, `node scripts/measure-component-editor.mjs http://127.0.0.1:3000 button card dialog select --runs 5`, cold and `--warm`). The script now also records `firstPreviewMs`: navigation start to the first frame after the preview first draws an element carrying a recipe scope (`[data-ombelle-recipe]`), compiled or precompiled, watched by a `MutationObserver` inside the iframe. That is what the user first sees; `firstRenderMs` (the first applied render) still measures the compiled path. Before is a control re-run of commit `f188e23c` with the updated script (its `firstRenderMs` is within 5 percent of Task 8's except warm select, 3175 against 3138, and warm card, 3001 against 2908); after is the working tree of the commit below. The warm control was run again after a first warm run overlapped the preview generator.

### First view (median of 5 loads, ms)

| `firstPreviewMs` | button | card | dialog | select |
| --- | --- | --- | --- | --- |
| Cold, before | 2838 | 3654 | 3530 | 4083 |
| Cold, after | 1444 (-49%) | 1557 (-57%) | 1529 (-57%) | 1614 (-60%) |
| Warm, before | 2256 | 3040 | 2854 | 3287 |
| Warm, after | 997 (-56%) | 1014 (-67%) | 975 (-66%) | 1055 (-68%) |

Raw cold after: button `[1676, 1431, 1407, 1502, 1444]`, card `[1641, 1513, 1557, 1543, 1563]`, dialog `[1499, 1546, 1529, 1531, 1518]`, select `[1641, 1614, 1558, 1703, 1613]`. The first view now waits for the page boot (the editor answers `ready` after hydration) and the iframe's own load, not the compile.

### Everything else (median, ms; before → after)

| | button | card | dialog | select |
| --- | --- | --- | --- | --- |
| First applied render, cold | 2794 → 2800 | 3595 → 3835 | 3426 → 3406 | 3941 → 4041 |
| First applied render, warm | 2229 → 2173 | 3001 → 3068 | 2789 → 2654 | 3175 → 3334 |
| First compile, cold | 1204 → 1136 | 1658 → 1843 | 1462 → 1549 | 1849 → 2049 |
| First compile, warm | 1010 → 962 | 1454 → 1529 | 1469 → 1408 | 1568 → 1739 |
| Iframe load, cold (bimodal) | 365 → 942 | 965 → 976 | 921 → 932 | 450 → 961 |
| Iframe load, warm | 749 → 724 | 702 → 723 | 721 → 695 | 706 → 703 |
| Edit, input to frame, cold | 311 → 328 | 651 → 650 | 521 → 531 | 802 → 811 |
| Edit, input to frame, warm | 353 → 359 | 731 → 673 | 593 → 573 | 728 → 751 |
| Edit, worker recompile, cold | 58 → 53 | 245 → 243 | 176 → 185 | 312 → 340 |
| Edit, iframe verification, cold | 49 → 63 | 141 → 139 | 112 → 104 | 193 → 208 |
| Iframe script requests | 22 → 23 | 20 → 21 | 35 → 36 | 46 → 47 |

- Edits are unchanged within run-to-run noise (every edit still goes worker, editor verification, iframe verification).
- The compiled first render, which now replaces a default already on screen and decides when Get code is enabled, is within -5 to +7 percent; the first compile of card and select is 5 to 11 percent slower in both modes (card cold 1540 to 1761 before, 1705 to 1998 after), which matches the iframe rendering the default while the worker compiles. It is no longer on the path to the first view.
- The iframe load stays bimodal cold (about 420 and 950 ms) as in Task 8; four of five cold loads fell in the slow mode for button and dialog this time, against two of five before. Warm loads are unchanged.
- One more script request per editor: the default's chunk.

### Cost

- Bundle: the editor preview's entry chunk grows from 23.6 kB (8.3 kB gzip) to 77.3 kB (14.6 kB gzip), the map of 441 lazy chunks. The defaults add 441 chunks of about 25 kB each (11.5 MB raw in `public/ombelle-preview`), of which a page fetches one.
- Build: generating the defaults takes about 86 s (441 compiles); `node scripts/build-hosted-www.mjs` went from 327 s to 405 s. Limiting `precompiledFamilies` to the site's first family would cut that to about 12 s, at the cost of a restored draft that is another family's untouched default waiting for its compile.

### Tests

- `apps/www/src/editor/precompiled-defaults.test.ts`: the defaults are what a fresh editor shows; a recipe names a family only while it is that default (an edit, a revision, or Liquid Glass name none); the generated set is exactly every component and precompiled family; the bundled Button, card, dialog and select defaults equal a fresh compile (canonical JSON). On `40d8b57f`, after the one-family change, `pnpm exec vitest run apps/www/src/editor/precompiled-defaults.test.ts`: 9 passed.
- `tests/e2e/component-editor-instant.spec.ts` (site config; ignored by the main config): with the compiler worker blocked, the Button, Badge and Card previews show the starting family's (ombelle) default with the scope a fresh compile gives, while the editor still says "Compiling preview…"; a restored draft that is not a default shows nothing until its compile; the first compile keeps the default's scope and the first edit replaces it (Badge, Button). On `40d8b57f`, `pnpm exec playwright test -c playwright.site.config.ts tests/e2e/component-editor-instant.spec.ts`: 8 passed (the family loop now covers one family, plus the draft-recovery family and URL-stability cases from fix round 1).
- `tests/e2e/editor.spec.ts`, the sandboxed preview test: the iframe URL now carries `?default=ombelle`, and the test waits for the first applied render before replaying it (the default shows the same Button text before any render arrives). Against the dev server (`scripts/serve-snapshot-www.ts`, `pnpm dev:preview`), `editor.spec.ts` and `catalog-editors.spec.ts` without the consumer comparisons (which need the consumer apps): 39 passed, 1 failed (run before the one-family change). The failure, `edits and restores separator` (the Decorative switch does not uncheck), also fails with the catalog editor reverted to `f188e23c`, so it is older than this change.
- Re-run on `40d8b57f`: the sandboxed preview test alone (`-g "sandboxed preview"`, through a temporary copy of the site config whose `testMatch` is `editor.spec.ts`, since the site config does not list that file): 1 passed.
- `pnpm typecheck` passes; `next build` passes after the final edit (the JSON import attribute the Playwright loader needs).

### Fix round 1 (review ruling R12)

Changes (commit `d81d3fd8`):
- Only the starting family is precompiled now. `precompiledFamilies` is `[defaultSiteFamily]` (ombelle), giving 63 defaults instead of 441. Generation takes about 11 s instead of 86 s, and the defaults directory is 1.7 MB instead of 13 MB. The preview's entry chunk is 31.6 kB (9.6 kB gzip) instead of 77.3 kB (14.6 kB gzip); before 9c it was 23.6 kB (8.3 kB gzip). The glob map now has one entry per component. `build-hosted-www` took 264 s, against 240 s for the control build in the same session.
- The family in the preview URL now comes from the recipe the editor has at the moment the frame can first connect. That family is then fixed, so later edits do not reload the preview. Before, it was computed once when the draft was restored, so a family chosen in the command palette during draft recovery would have shown the ombelle default for a papier recipe. A new e2e test covers this case: it fails on `93b1e541` (`?component=badge&default=ombelle`) and passes now.
- The preview applies the default in a `React.startTransition`, so drawing it yields to the port.

Same-build A/B check before the fix (card and select, cold, 5 loads, two rounds, default chunk blocked by route against shown):
- First compile: card 1704 and 1673 ms blocked, against 1738 and 1751 ms shown. Select 1696 and 1913 ms blocked, against 1799 and 1803 ms shown.
- Compiled first render: card 3742 and 3699 ms blocked, against 3750 and 3699 ms shown. Select 3784 and 4053 ms blocked, against 4006 and 3864 ms shown.
- Drawing the default costs at most a few percent of the first compile, in the same build. The same setup measured twice differs by up to 13 percent (select blocked: 1696 against 1913 ms).

Re-measurement. The control is a hosted build of `f188e23c` from a temporary worktree; after is `d81d3fd8`. Both were built and measured in the same session, interleaved: control cold, after cold, control warm, after warm. Same script and method. The machine was faster this session than in the first measurement, so compare only within this table. Medians of 5 loads in ms, before → after:

| | button | card | dialog | select |
| --- | --- | --- | --- | --- |
| First view, cold | 2100 → 1081 (-49%) | 2748 → 1078 (-61%) | 2553 → 1115 (-56%) | 2978 → 1139 (-62%) |
| First view, warm | 1537 → 679 (-56%) | 2197 → 688 (-69%) | 1985 → 707 (-64%) | 2389 → 739 (-69%) |
| Compiled first render, cold | 2063 → 2091 (+1.4%) | 2706 → 2730 (+0.9%) | 2483 → 2510 (+1.1%) | 2884 → 2921 (+1.3%) |
| Compiled first render, warm | 1517 → 1560 (+2.8%) | 2173 → 2180 (+0.3%) | 1938 → 1965 (+1.4%) | 2316 → 2345 (+1.2%) |
| First compile, cold | 865 → 872 (+0.8%) | 1156 → 1201 (+3.9%) | 1047 → 1167 (+11.4%) | 1266 → 1432 (+13.1%) |
| First compile, warm | 659 → 725 (+10.0%) | 1128 → 1138 (+0.9%) | 985 → 1021 (+3.7%) | 1096 → 1278 (+16.6%) |
| Edit, input to frame, cold | 256 → 257 | 560 → 561 | 436 → 426 | 621 → 621 |
| Edit, input to frame, warm | 283 → 296 | 556 → 548 | 426 → 427 | 616 → 616 |
| Iframe load, cold | 266 → 278 | 278 → 279 | 285 → 275 | 274 → 280 |
| Iframe load, warm | 503 → 499 | 515 → 506 | 498 → 502 | 500 → 503 |
| Iframe script requests | 22 → 23 | 20 → 21 | 35 → 36 | 46 → 47 |

Noise band, from this session's control loads and the A/B check:
- The compiled first render varies by about ±1.5 percent from load to load. One cold card load, 4199 ms, is an outlier in both builds.
- The first-compile median varies by about ±6 percent between identical setups. Single loads vary by up to ±8 percent (button warm 627 to 728 ms).

Verdict: kept with exception.
- The compiled first render is within noise in every id and mode (+0.3 to +2.8 percent). That render is when Get code is enabled and "Matches current recipe" appears.
- Edits and the iframe load are unchanged.
- The worker's first compile, measured from the request to the reply arriving on the editor's main thread, is beyond the noise band in four cases: select (+13 percent cold, +17 percent warm, every after load above the control median but one), dialog cold (+11 percent) and button warm (+10 percent).
- That extra time is absorbed before the render: the default is already on screen, and the compiled render arrives at the same time as before.
- For the user to decide: accept a first-compile phase up to 17 percent slower (select) for a first view 49 to 69 percent sooner, with the compiled first render unchanged within 3 percent. Otherwise, revert 9c.
- Known limit: if the user changes the family or edits before the iframe connects (about 0.3 to 1 s) and before the first compile, the iframe can briefly show the starting family's default for a different recipe until that recipe's compile arrives; the status reads "Compiling preview…" meanwhile.
