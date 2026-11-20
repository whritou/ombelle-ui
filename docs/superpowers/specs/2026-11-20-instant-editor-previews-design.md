# Instant previews in the site editors

Status: draft for approval · 2026-11-20 · branch `feat/instant-editor-previews` (cut from
`feat/inline-component-previews`, PR #180, not merged; merge `main` in if #180 lands meanwhile)

## Intent

Both site editors (`apps/www`) preview through the sandboxed `apps/preview` iframe fed by an in-browser
compile worker. Measured baseline: first render about 5.7 s; each family or preset switch 2.2 to 3.0 s.

- **Preset editor** (`/editor/preset`): a token edit (colour, radius, border, shadow, density, motion,
  font) must show at once, with no loading state.
- **Component editor** (`/editor/component/[id]`): it edits generated TSX and CSS, so the iframe stays;
  cut the time to first render and between two recipe edits.

Decided with the user: **speed is the goal, not leaving the iframe.** The `/components` inline work
(#180) stays as it is and is not redone here.

## What the code already tells us (pre-audit findings)

- `compile()` (`packages/compiler/src/compile.ts:118-142`) builds `theme.light/dark/theme` from the
  preset alone: mode colours plus `--radius`, `--border-width`, `--shadow-x/y`, `--control-height`,
  `--font-family`, `--font-heading`, `--font-mono`, `--motion-duration` (glass adds `glassTokens`).
  What makes `compile()` slow and async is Prettier formatting and SHA-256 of every artifact, not the
  tokens.
- Family and component sheets read design values through variables; literal colours are mostly
  fallbacks for tokens a preset cannot edit (`var(--warning, #fef3c7)`). One structural exception:
  setting or clearing a display or code font adds `fontRuleBlock` rules to `styles/ui-style.css`, and
  `headingLineHeight` depends on the chosen display font.
- The iframe compiles nothing to render: its components are generated at build time
  (`apps/preview/src/generated/preset-gallery`). From the `CompileResult` it uses only the style
  artifacts (`presetRuntimeStyles`). **But it verifies each render by re-running the whole `compile()`**
  and comparing canonically (`verifyPresetRender`, `preview-protocol.ts`). So every edit costs a full
  compile in the worker, then another in the iframe.
- The scenes (Dashboard by default, Projects, Settings, Sign in, Workspace) live in
  `apps/preview/src/scenes/`; Workspace holds Sidebar. With the iframe kept, every scene keeps working.

## Goals

- Preset editor, built-in families except Liquid Glass: a token edit reaches the screen within one or two
  frames (target under 50 ms from input to paint, measured), in every scene, light and dark.
- Preset editor: first render and family switch no longer wait for the worker.
- Compile (validation, contrast reports, export, change summary) still runs, in the background,
  without blocking the preview.
- Component editor: phases measured; each candidate optimisation kept only if a before/after
  measurement shows it pays.
- Deliverable includes a short written audit per editor, with numbers.

## Non-goals

- Moving preset scenes inline (approach B below); revisit only if the audit shows iframe load dominates
  after this work.
- Liquid Glass on the fast path: it keeps today's full render path (worker result + iframe verification).
- Known #180 follow-ups (non-Chromium `container-type`, stalled-font retry, Papier/Data Table cold switch).

## Anti-goals (a failure even if it is fast)

- Export changes: same draft must give the same `CompileResult`, preset hash and artifact hashes as
  before. Stable hashes untouched.
- The iframe injects CSS it did not derive itself. Today it only applies styles it re-derived from a valid
  preset; the fast path must keep that property.
- Any loosening of iframe isolation, `sandbox` attributes or message validation.
- Regressions in contrast reporting, axe, focus-visible, touch targets, keyboard use, mobile layout.
- A preview that silently shows something different from what export would produce.

## Approaches

- **A. Keep the iframe; the client derives tokens (picked).** Extract the token step of `compile()` into a
  pure synchronous function and add a fast message to the iframe that carries only the validated preset;
  the iframe derives the styles itself. The worker keeps compiling for everything else. One path for all
  scenes, isolation unchanged, targets exactly the cost that hurts (two full compiles per edit).
- **B. Inline scenes like `/components`.** Move the four scenes and `scenes.css` into `fixtures/shared`,
  scope them, set tokens on a stage. Fastest possible first render, but ~1,750 lines moved, portals,
  Settings' global key handler and Calendar to adapt, and Workspace stays in the iframe (two paths).
  Rejected for now: costly, and A may make it unnecessary.
- **C. A now, B later if needed.** Effectively A, with B judged on A's numbers.

## Design: preset editor (approach A)

### Pure style derivation (compiler)

- New exported, synchronous functions in `@ombelle/compiler`:
  - `presetTheme(presetData): ThemeData`: the exact token logic now inline in `compile()`.
  - `presetPreviewStyles(presetData, componentIds): string`: tokens (`:root` / `.dark` blocks), the family
    sheet (`catalog.styles[family]` + `fontRuleBlock`), each component's `styles[family]`, without font
    imports, `@theme inline`, Prettier or hashing. Same rules `presetRuntimeStyles(compile(...))` yields.
- `compile()` calls `presetTheme`, so its output is byte-identical (guarded by existing hash tests plus a
  new test comparing a few drafts per family before/after).
- Equivalence test: for every built-in family and a set of edited drafts, `presetPreviewStyles` and
  `presetRuntimeStyles(await compile(...))` parse to the same CSS (PostCSS-normalised or Prettier-formatted
  in the test).
- Liquid Glass is excluded from `presetPreviewStyles` (it throws or is never called for glass) because its
  sheet depends on `glassMaterialActive` and the lab style.

### Fast message to the iframe

- New message `preset-tokens` on the existing `MessageChannel`: `{ type, requestId, preset, view }`, where
  `preset` is preset data (not a `CompileResult`, no CSS strings). Exact-shape validation in the same style
  as `verifyPresetRender`: size cap, `validatePreset`, built-in non-glass family, release/compiler
  versions, same view rules, monotonic `requestId` shared with `preset-render`.
- The iframe derives `presetPreviewStyles` itself and swaps the `<style data-preset-styles>` content;
  scene, focus, mode, viewport handling is shared with the full render.
- Ack: same `preset-render-ack` shape. `presetHash` is the preset's canonical hash (as `resolvePreset`
  computes it, so it matches the later compiled result's `preset.hash`); builder confirms which helper.
- Gallery source verification (`verifyGallerySources`) still gates any render.
- `preset-render` stays unchanged and remains the only path for Liquid Glass (see call 1 below).

### Editor side

- On each draft change, the editor runs `materializePreset(draft)` synchronously. If it succeeds and the
  family is built-in and not glass, it sends `preset-tokens` immediately (no 150 ms debounce on this path).
- If `materializePreset` throws (invalid number, revision), the preview keeps the last valid styles and
  shows today's "Previous valid preview" caption; the worker diagnostic explains why, as today.
- The worker keeps compiling (debounced) for export, contrast checks, change summary and the reference
  compile. The preview's "ready" no longer waits for it; export stays gated on the compiled result
  matching the current draft, as `usePresetCompiler` already enforces.
- First render and family switch use the same fast message: the iframe already bundles the catalog and
  compiler, so no build-time per-family sheet is needed. Fonts load as today (`loadPresetFonts`).
- Drafts restored from storage only contain known editable paths (`validateDraftEnvelope`), so every
  non-glass draft qualifies; anything that fails validation falls back to the full path.

### Prototype first

Before the implementation: audit (written, with evidence) and a prototype on one scene and one family,
measuring input-to-paint for a token edit before and after. Measurement extends
`scripts/measure-component-preview.mjs` (production build, same method as
`docs/evidence/inline-component-previews.md`). Proceed to the full implementation only if the prototype
pays off; otherwise report and stop at the audit.

## Design: component editor

Iframe, sandbox and message validation untouched; work only on perceived time.

1. Measure phases on a production build: iframe load, worker download, first compile, iframe fill,
   recompile per edit. Name the dominant one.
2. Evaluate one at a time, before/after each: preload worker and iframe (`modulepreload`, early
   instantiation); warm worker across navigations; build-time precompiled default recipe per built-in
   family shown at once (compile only on the first edit); bundling the ~158 small iframe module requests;
   right-height skeleton against layout shift. The preset findings above (iframe re-verifying by full
   compile) are checked here too.
3. Keep only what pays; report what did not, with numbers.

## Verification

- Preset editor unit tests, `pnpm test:site`, focused compiler tests; rerun only what changed.
- Export identical: same draft → same `CompileResult` and hashes as before (test over several drafts per
  family).
- Contrast reports unchanged in every family and mode.
- Focus, keyboard, mobile and desktop on both editors; layout-shift rules from the evidence doc.
- New site-only e2e specs listed in `playwright.site.config.ts` `testMatch` and `playwright.config.ts`
  `testIgnore`; locale-dependent snapshots pinned to `en-US`.
- After catalog or worker changes: `pnpm build:packages`, `node scripts/build-editor-worker.mjs`.

## Calls made during review (author's calls, open to correction)

1. **Non-glass drafts stop sending `preset-render`.** Once a draft takes the fast path, the editor no longer
   sends the full render for it: the iframe's verification compile (Prettier over every artifact) would
   occupy the iframe's main thread and delay the next token edit. Fast styles cannot drift from export
   because `compile()` builds its style artifacts from the same functions (`presetTheme`, the family-sheet
   and component-sheet assembly) before formatting: one source, plus the equivalence test over every
   built-in family and every design control. `preset-render` remains for Liquid Glass only.
2. **Fast path accepted, worker compile rejects.** The preview keeps the fast result, the worker diagnostic
   shows as today, and export stays disabled (already gated on a compiled result for the current draft).
   The caption reads "Preview of a draft that cannot be exported yet" instead of "Current preset preview".
3. **Component editor validation.** Measure and report only. If the iframe's re-verification
   (`verifyPreviewRender`, `verifyCatalogPreviewRender`) dominates, the audit says so with numbers and the
   user decides; nothing changes it without that approval. A default recipe precompiled at build time and
   bundled into the iframe is the iframe's own code, shown before any message arrives; it does not relax how
   messages are validated, so it is allowed.
4. **"Pays off" for the prototype:** median input-to-paint for a colour and a radius edit on the Dashboard
   scene, Ombelle, production build, under 100 ms and at least ten times faster than the baseline.
   Otherwise stop at the audit and report.
5. **Fonts.** "On screen" means the new CSS is painted; web-font arrival is measured separately and
   reported. Faces are fetched when a font picker opens, so a pick usually finds them loaded.
6. **Scope of the fast path:** the preset editor only. `PresetPreviewFrame` gains an opt-in; the
   playground's iframe fallback, the demo page and published preset snapshots keep `preset-render`
   unchanged. Adopting the fast path there is a possible follow-up.

## Left to the builder

- Exact function names and file placement in the compiler, and how the iframe shares view-application
  code between the two messages.
- Measurement harness details, run counts, and the evidence doc layout (new
  `docs/evidence/instant-editor-previews.md`).
- Order of the component-editor experiments.
- Commits: Conventional Commits on `feat/instant-editor-previews`; nothing pushed, no PR without an
  explicit request.
