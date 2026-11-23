# Instant Editor Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preset editor token edits reach the iframe preview in milliseconds without waiting for any compile, and the component editor's wait is measured and cut where it pays.

**Architecture:** The compiler's token and style assembly is extracted into pure synchronous functions that `compile()` itself uses. The preset preview iframe accepts a new `preset-tokens` message carrying only preset data, derives the styles itself and acks; the editor sends it on every valid draft while the worker keeps compiling in the background for export and checks. Liquid Glass and every other `PresetPreviewFrame` user keep `preset-render`. The component editor is measured phase by phase and each optimisation is kept only on a measured gain.

**Tech Stack:** TypeScript ES modules, React 19 / Next (apps/www), Vite (apps/preview), Vitest, Playwright, Prettier (compiler formatting), PostCSS.

**Spec:** `docs/internal/superpowers/specs/2026-11-20-instant-editor-previews-design.md`

## Global Constraints

- Node 24.19.0, pnpm 11.25.0; on this Windows machine use `corepack pnpm`; start Next/Turbopack servers from PowerShell with `OMBELLE_BROWSER_CHANNEL=chrome`.
- Export unchanged: same draft → same `CompileResult`, preset hash and artifact hashes. Never hand-edit `packages/catalog/src/generated.ts` or stable hashes; if the catalog changes run `pnpm build:packages` then `pnpm exec tsx scripts/record-stable-hashes.ts`.
- After compiler, catalog or worker changes: `corepack pnpm build:packages` and `node scripts/build-editor-worker.mjs`.
- The iframe applies only CSS it derived itself. No change to iframe isolation, `sandbox` attributes, or the existing validation of `preset-render`, `preview-render` and catalog render messages.
- Liquid Glass stays on `preset-render`. Only the preset editor opts into the fast path.
- Selectors: no chained `data-slot`; Liquid Glass at most one `[data-slot=` per selector.
- No axe, focus-visible, touch-target or keyboard regression; mobile and desktop.
- New site-only e2e specs go in `playwright.site.config.ts` `testMatch` AND `playwright.config.ts` `testIgnore`; pin locale-dependent snapshots to `en-US`.
- Rerun only what changed; no pauses between tasks once the plan is approved, stop only when blocked or at the Task 6 gate.
- Conventional Commits on `feat/instant-editor-previews`. Push nothing, open no PR without an explicit request.

## Review Focus

1. **Fast typing:** many token edits within one frame or while an older `preset-tokens` is still being verified; the last edit wins, an older message resolving late never overwrites newer styles. Test in Task 4.
2. **Intermediate invalid input:** typing `1.` or clearing the radius field; the preview keeps the last valid styles, no flash, no failed state. Test in Task 5.
3. **Family round trip through Liquid Glass:** non-glass → glass (full render) → non-glass (fast); ids stay monotonic across both message kinds and the glass render never lands after a newer fast render. Test in Task 4 and Task 5.
4. **Retry preview / iframe reload:** after the handshake the first message is `preset-tokens` and it renders. Test in Task 5.
5. **Restored draft with edits on page load:** first paint uses the stored edits through the fast path, not the family defaults. Test in Task 7 e2e.

---

### Task 1: Baseline measurement and written audit

**Files:**
- Create: `scripts/measure-preset-editor.mjs`
- Create: `docs/evidence/instant-editor-previews.md`

**Interfaces:**
- Produces: `node scripts/measure-preset-editor.mjs <origin> [--runs N]` printing JSON `{ firstReadyMs, tokenEditMs: number[], familySwitchMs: Record<family, number>, sceneSwitchMs, modeSwitchMs, workerCompileMs: number[], iframeApplyMs: number[] }`.

- [ ] **Step 1: Write the script.** Same structure and method as `scripts/measure-component-preview.mjs` (Playwright chromium, cache disabled for first load, `reducedMotion: 'reduce'`, viewport 1100×800). Ready = the `Preview ready` text in `[data-status]` of the preview status line (`preset-editor.tsx:594`). Token edit = set the Corner radius field to a new value and press Tab; time until a computed-style fingerprint inside the iframe titled `Global preset gallery` changes (border-radius, background-color, color of the first buttons). Family switch = click each family in the `Style family` toggle group. `workerCompileMs` and `iframeApplyMs` come from wrapping `Worker.prototype.postMessage` / `MessagePort.prototype.postMessage` via `page.addInitScript` and timestamping requests and responses by `requestId`.
- [ ] **Step 2: Build and serve production.** `corepack pnpm build:packages`, `corepack pnpm generate:preview`, `node scripts/build-editor-worker.mjs`, then the production site build and start as described in `docs/evidence/inline-component-previews.md` (Method).
- [ ] **Step 3: Run baseline.** `node scripts/measure-preset-editor.mjs http://127.0.0.1:<port> --runs 5`. Expected: numbers near the brief's baseline (first ≈ 5.7 s, switch 2.2–3.0 s); record the raw JSON.
- [ ] **Step 4: Write the audit** in `docs/evidence/instant-editor-previews.md`, section "Preset editor audit", answering with file:line evidence: (a) which preset properties become variables (`compile.ts:118-142`) and which change structure (family, `fontRuleBlock` on display/code font, `headingLineHeight`, glass `glassMaterialActive`); (b) hard-coded values in family and component sheets (counts, and that literal colours are fallbacks of non-editable tokens; list any exception found); (c) synchronous derivability vs `previewTokensCss` in `scripts/www-previews/scope-css.ts`; (d) scenes depending on full iframe pages (Workspace/Sidebar, portals, Settings' window keydown, scroll). Include the baseline table and the phase split (worker compile vs iframe verification compile vs apply).
- [ ] **Step 5: Commit.** `git add scripts/measure-preset-editor.mjs docs/evidence/instant-editor-previews.md && git commit -m "docs(evidence): audit the preset editor preview and measure its baseline"`

### Task 2: Pure token and style derivation in the compiler

**Files:**
- Create: `packages/compiler/src/preview-styles.ts`
- Modify: `packages/compiler/src/compile.ts:118-176`, `packages/compiler/src/index.ts`
- Test: `packages/compiler/test/preview-styles.test.ts`

**Interfaces:**
- Produces:
  - `presetTheme(data: Preset): ThemeData` — the token logic now at `compile.ts:118-142`, glass tokens included.
  - `presetStyleSheets(data: Preset, catalog: Catalog, options?: { prefixedSlots?: readonly string[]; edition?: Edition }): { logicalPath: string; content: string }[]` — unformatted `styles/ui-tokens.css`, `styles/ui-style.css` and each component's `.css` draft content, exactly the strings `compile()` currently pushes into `drafts` before formatting. `compile()` uses it for those drafts.
  - `presetPreviewSheets(data: Preset): string[]` — for non-glass families only (throws `FoundationError('INVALID_DATA', ..., '/styleFamily')` for `liquid-glass`): `presetStyleSheets` for `previewComponentIds`-equivalent ids (`componentsWithStyleSupport(family, ['stable','experimental'])`), each with font imports stripped and `@theme inline{…}` removed, ordered by `logicalPath` like `compile()`'s artifact sort. The iframe joins them with `'\n'`.

- [ ] **Step 1: Write failing tests.**
  - `compile output is unchanged`: for each built-in family plus three edited presets (radius 0, dark primary changed, display font set and mono cleared), `canonicalize(await compile(...))` equals a snapshot recorded from the current `compile()` **before** the refactor (record it in this step by running the test once against the old code, commit the snapshot with the test). In the same step, record `apps/www/src/preset-editor/__snapshots__/export-before.json`: the export files and preset hash from `export.ts` for each non-glass family and the same three edited drafts (used by Task 7).
  - `preview sheets match the compiled artifacts`: for every non-glass family and the same edited presets, `presetPreviewSheets(data)` formatted with the compiler's Prettier options equals `presetRuntimeStyles(result)` split back into its pieces (or compare piecewise against `result.artifacts.filter(kind==='style')` after the same strip and `@theme` removal).
  - `presetTheme equals compile().theme` for every family including liquid-glass.
  - `presetPreviewSheets rejects liquid-glass`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/compiler/test/preview-styles.test.ts` — expected: FAIL (functions not exported), snapshot test PASS.
- [ ] **Step 3: Implement** in `preview-styles.ts`; move the theme and draft-content code out of `compile()` into these functions and call them from `compile()`. No behaviour change.
- [ ] **Step 4: Run** the new test plus `corepack pnpm test:unit --filter @ombelle/compiler` (or `vitest run packages/compiler`) — expected: all PASS, snapshot unchanged. Then `corepack pnpm build:packages` and `corepack pnpm exec tsx scripts/record-stable-hashes.ts --check` if it offers a check mode; otherwise confirm `git diff` shows no stable-hash change.
- [ ] **Step 5: Commit.** `git commit -m "refactor(compiler): derive preset tokens and style sheets from pure functions"`

### Task 3: The `preset-tokens` message contract

**Files:**
- Modify: `apps/www/src/preset-editor/preview-protocol.ts`
- Test: `apps/www/src/preset-editor/preview-protocol.test.ts`

**Interfaces:**
- Consumes: `presetPreviewSheets` (Task 2), `resolvePreset` (`@ombelle/compiler`).
- Produces:
  - `type PresetTokens = { type: 'preset-tokens'; requestId: number; preset: Preset; view: PresetView }`
  - `verifyPresetTokens(input: unknown, previousRequestId: number): Promise<{ message: PresetTokens; css: string; presetHash: string } | null>` — 1 MB size cap; exact keys; `requestId` positive and `> previousRequestId`; view validated by the same rules as `verifyPresetRender` (extract the view check into a shared `validView(view: unknown): boolean` and use it in both — this is a refactor, not a rule change); `resolvePreset(preset, getCatalog('0.1.0'))` succeeds and its data equals the input canonically; family is built-in and not `liquid-glass`; `catalogRelease`/`compilerVersion` `'0.1.0'`. Returns `css = presetPreviewSheets(data).join('\n')` and `presetHash = resolved.hash`.
  - `presetHashOf(preset: Preset): Promise<string>` — `(await resolvePreset(preset, getCatalog('0.1.0'))).hash`, used by the editor to match acks.

- [ ] **Step 1: Write failing tests:** accepts a materialized Ombelle draft and returns css containing `--radius:` with the draft's value; rejects extra keys, `requestId <= previous`, glass presets, an unknown view key, a preset with an injected unknown design key, and a payload over 1 MB; `presetHash` equals `(await compile(...)).preset.hash` for the same preset; `verifyPresetRender` tests still pass unchanged.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run apps/www/src/preset-editor/preview-protocol.test.ts` — expected: new tests FAIL.
- [ ] **Step 3: Implement** the type, `validView`, `verifyPresetTokens`, `presetHashOf`.
- [ ] **Step 4: Run** the same command — expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(www): add a validated preset-tokens preview message"`

### Task 4: The iframe renders `preset-tokens`

**Files:**
- Modify: `apps/preview/src/preset-preview.tsx`
- Test: `apps/preview/src/preset-preview.test.tsx` (create if absent; jsdom, MessageChannel)

**Interfaces:**
- Consumes: `verifyPresetTokens` (Task 3), `verifyPresetRender`, `presetRuntimeStyles`.
- Produces: iframe state `{ requestId: number; port: MessagePort; family: StyleFamily; design: Preset['design']; hash: string; css: string; view: PresetView }`, filled by either message; one `lastId` shared by both kinds; ack `{ type: 'preset-render-ack', requestId, presetHash: hash, status }` for both.

- [ ] **Step 1: Write failing tests:** a `preset-tokens` message renders the gallery with `<style data-preset-styles>` containing the derived css and acks `applied` with the resolved hash; two tokens messages posted back-to-back where the first resolves last → only the second's css is applied and only the second acks `applied` (Review Focus 1); a `preset-render` with id 3 after tokens id 4 is rejected (Review Focus 3); a glass preset in `preset-tokens` acks `rejected`; gallery-source verification failure still blocks both kinds.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run apps/preview/src/preset-preview.test.tsx` — expected: FAIL.
- [ ] **Step 3: Implement:** dispatch on `type`; after every `await`, recheck `attached.current === port` and `requestId > lastId.current` before applying (existing pattern); keep the `useLayoutEffect` view application unchanged but read from the new state shape; `presetRuntimeStyles(result)` fills `css` for `preset-render`. Rejection ack for tokens uses `presetHash: '0'.repeat(64)` when no hash could be computed, which the frame ignores by requestId mismatch.
- [ ] **Step 4: Run** the test, then `corepack pnpm exec vitest run apps/www/src/preset-editor` — expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(preview): render preset-tokens messages in the preset preview"`

### Task 5: Editor sends the fast path

**Files:**
- Modify: `apps/www/src/preset-editor/components/preset-preview-frame.tsx`, `apps/www/src/preset-editor/components/preset-editor.tsx:171,545-617`
- Test: `apps/www/src/preset-editor/components/preset-preview-frame.test.tsx` (create)

**Interfaces:**
- Consumes: `PresetTokens`, `presetHashOf` (Task 3), `materializePreset` (`model.ts`).
- Produces: `PresetPreviewFrame` prop `preset?: Preset | null` (opt-in). When `preset` is non-null and its family is not `liquid-glass`, the frame sends `preset-tokens` on every change of `preset` or view and never sends `preset-render`; otherwise it behaves exactly as today. Ack matching for tokens: `requestId` equals the latest sent and `presetHash` equals the awaited `presetHashOf(preset)` for that request. Hook `useLivePreset(draft: PresetEditorDraft): { preset: Preset | null; lastValid: Preset | null }` in `apps/www/src/preset-editor/use-live-preset.ts` — `materializePreset` in `useMemo`, keeping the last valid preset when the current draft throws.

- [ ] **Step 1: Write failing tests** (fake iframe window + MessageChannel): with `preset` set, a radius change posts `preset-tokens` synchronously in the same effect flush (no 150 ms debounce); no `preset-render` is posted even when `result` changes; `onStatus('ready')` on a matching ack; switching `preset` to a glass preset falls back to `preset-render` with `result`; after Retry preview the first post after handshake is `preset-tokens` (Review Focus 4). `useLivePreset`: an invalid radius edit (`'1.'`, `''`) returns `preset: null, lastValid: <previous>` (Review Focus 2).
- [ ] **Step 2: Run** `corepack pnpm exec vitest run apps/www/src/preset-editor/components/preset-preview-frame.test.tsx apps/www/src/preset-editor/use-live-preset.test.ts` — expected: FAIL.
- [ ] **Step 3: Implement** the prop, the hook, and wire `preset={live.lastValid}` in `preset-editor.tsx`. Captions: `Current preset preview` when `live.preset` is current and the worker result matches or is pending; `Previous valid preview` when `live.preset` is null; `Preview of a draft that cannot be exported yet` when `live.preset` is current but the worker returned `invalid` for this draft key (spec call 2). Export gating unchanged.
- [ ] **Step 4: Run** the tests plus `corepack pnpm exec vitest run apps/www/src/preset-editor` and `corepack pnpm typecheck` — expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(www): send preset token edits straight to the preview"`

### Task 6: Prototype gate measurement

**Files:**
- Modify: `docs/evidence/instant-editor-previews.md`

- [ ] **Step 1: Rebuild** (`build:packages`, `generate:preview`, `node scripts/build-editor-worker.mjs`, production site build) and run `node scripts/measure-preset-editor.mjs <origin> --runs 5`.
- [ ] **Step 2: Apply the gate:** median token edit on Dashboard / Ombelle under 100 ms AND at least 10× faster than Task 1's median. Record before/after tables (first ready, token edit, family switch, scene switch, mode switch) in the evidence doc.
- [ ] **Step 3: If the gate fails:** commit the evidence (`docs(evidence): record the preset fast-path prototype measurement`), stop, and report to the user with the numbers. If it passes: commit the same way and continue.

### Task 7: Fonts, e2e and full preset verification

**Files:**
- Modify: `apps/www/src/preset-editor/components/preset-controls.tsx` (font picker open handler), `apps/preview/src/preset-fonts.ts` only if a preload entry point is missing
- Create: `tests/e2e/preset-editor-instant.spec.ts`
- Modify: `playwright.site.config.ts` (`testMatch`), `playwright.config.ts` (`testIgnore`)
- Test: `apps/www/src/preset-editor/export.test.ts` (extend)

**Interfaces:**
- Consumes: Tasks 2–5.

- [ ] **Step 1: Font prefetch.** The sandboxed iframe has an opaque origin, so a parent-side preload does not reach its cache. Measure first: record in the evidence doc the median time from picking a display font to CSS paint and to font load (`document.fonts` inside the frame). If font load exceeds 300 ms median, add an optional `prefetchFonts: string[]` field to `PresetTokens` (each id must be in `fontControlOptions`; validated in `verifyPresetTokens`, test added in `preview-protocol.test.ts`), sent while a font picker is open with the ids it offers, which the iframe passes to `loadPresetFonts`. Otherwise record that prefetch was not needed.
- [ ] **Step 2: Export test:** for each non-glass family and three edited drafts, the existing export path in `export.ts` produces the same file contents and preset hash as the snapshot recorded in Task 2 Step 1 (record that export snapshot there too, before the refactor).
- [ ] **Step 3: e2e spec** `preset-editor-instant.spec.ts`: (a) restored draft from `localStorage` with a radius edit paints that radius first (Review Focus 5); (b) radius edit updates the iframe's computed `border-radius` within 200 ms while the worker is blocked (route `/preset-compiler.worker.js` to a never-resolving response); (c) typing `1.` keeps the previous radius and shows `Previous valid preview`; (d) Liquid Glass still renders via the full path; (e) keyboard: Tab through family toggle, radius field, scene select, focus visible; (f) phone viewport 375×812 same as (b). Add the spec to both Playwright configs.
- [ ] **Step 4: Run** `corepack pnpm exec vitest run apps/www/src/preset-editor packages/compiler` , `corepack pnpm test:site` — expected: PASS. Contrast: `contrast.test.ts` and `preset-checks.test.tsx` PASS unchanged.
- [ ] **Step 5: Commit.** `git commit -m "test(www): cover instant preset previews end to end"`

### Task 8: Component editor phase measurement

**Files:**
- Create: `scripts/measure-component-editor.mjs`
- Modify: `docs/evidence/instant-editor-previews.md`

**Interfaces:**
- Produces: `node scripts/measure-component-editor.mjs <origin> <id...> [--runs N] [--warm]` printing JSON per id `{ iframeLoadMs, workerDownloadMs, firstCompileMs, iframeFillMs, firstRenderMs, recompileMs: number[], iframeVerifyMs: number[], moduleRequests: number }`.

- [ ] **Step 1: Write the script** (same harness as Task 1): iframe load = iframe `load` event; worker download = Resource Timing for `/editor-compiler.worker.js`; first compile = worker request → response by `requestId`; iframe fill = render post → ack; iframe verify = time inside `verifyPreviewRender` / `verifyCatalogPreviewRender`, measured as post → ack minus paint; module requests = count of iframe-origin script requests.
- [ ] **Step 2: Run** on `button`, `card`, `dialog`, `select` with `--runs 5`, cold and `--warm`.
- [ ] **Step 3: Write** "Component editor audit" in the evidence doc: phase table, the dominant phase, and whether the iframe's re-verification compile dominates (if yes, state it with numbers as a decision for the user — no change to validation).
- [ ] **Step 4: Commit.** `git commit -m "docs(evidence): measure the component editor preview phases"`

### Task 9: Component editor experiments, one at a time

**Files:** depend on the experiment; each starts from a clean tree and ends with a commit (kept) or `git restore` (rejected) plus an evidence entry.

Run in this order, ranked by Task 8's dominant phase (reorder if the audit says otherwise). For each: implement minimal change → rebuild → `measure-component-editor.mjs` same ids and runs → keep only if the targeted phase's median improves by ≥ 15 % and nothing else regresses → record before/after either way.

- [ ] **9a Preload:** `<link rel="modulepreload">` / `<link rel="preload" as="worker">` for `/editor-compiler.worker.js` and early `new Worker` at route entry in `apps/www/src/app/editor/component/[id]/page.tsx`; iframe `src` set on first render. Commit `perf(www): preload the component editor worker and preview`.
- [ ] **9b Warm worker across navigations:** a module-scoped worker singleton in `apps/www/src/editor/use-compiler.ts` reused between `[id]` routes, terminated on `pagehide`. Commit `perf(www): keep the component compiler warm between editors`.
- [ ] **9c Precompiled default recipe:** build-time compile of each editable component's default recipe per built-in family (in `scripts/build-editor-worker.mjs` or a sibling generator), bundled into the editor iframe and shown before any message; first edit compiles as today; message validation unchanged. Test: iframe shows the default for each family before the worker answers; the first edit replaces it. Commit `perf(preview): show each component's default recipe before the first compile`.
- [ ] **9d Bundle iframe modules:** Vite `build.rollupOptions.output.manualChunks` (or equivalent) in `apps/preview` to collapse the ~158 small module requests; verify `pnpm test:specimen-audit` unaffected for touched components only. Commit `perf(preview): bundle the editor preview modules`.
- [ ] **9e Right-height skeleton:** reserve the preview's final height (`preview-size.ts`) before first render; layout-shift test per the evidence doc's method. Commit `fix(www): reserve the component preview height before it renders`.

### Task 10: Final verification and evidence

**Files:**
- Modify: `docs/evidence/instant-editor-previews.md`

- [ ] **Step 1: Run** `corepack pnpm typecheck`, `corepack pnpm exec vitest run` on every touched package directory, `corepack pnpm test:site`, and `pnpm test:specimen-audit` only if Task 9d kept a change. Expected: PASS.
- [ ] **Step 2: Write the deliverable** at the top of the evidence doc: per-editor audit summary with numbers; preset prototype and final gain; component phase table, kept and rejected ideas with numbers; what stays out of scope (Liquid Glass, other `PresetPreviewFrame` surfaces, scenes inline, #180 follow-ups).
- [ ] **Step 3: Commit** `docs(evidence): record the instant editor preview results`, then request a whole-branch review.
