# Instant editor previews: evidence

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
