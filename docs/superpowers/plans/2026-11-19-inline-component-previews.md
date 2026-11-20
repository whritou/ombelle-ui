# Inline Component Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/components/[id]` renders today's gallery specimen inline, server-rendered in Ombelle, with instant family and mode switches for the seven built-in families, and keeps the worker + iframe path for Liquid Glass and fallbacks.

**Architecture:** A build-time generator scopes each built-in family's compiled CSS under a stage attribute (`[data-preview-family="<f>"]`), renames slots to `pv-*`, and writes per-family CSS to `apps/www/public/previews/`. The same generator writes slot-renamed component modules and per-component specimen modules (split from the shared gallery) to `apps/www/src/generated/previews/`. Radix portals are redirected into the stage through a `PreviewPortal` context, so one attribute change on the stage restyles everything, state included. The page server-renders the Ombelle specimen with React 19 stylesheet links; other families load as suspensey stylesheets inside a transition.

**Tech Stack:** Next.js 16.4.6, React 19.3.1, TypeScript ES modules, postcss + postcss-selector-parser, `@ombelle/compiler`, Vitest, Playwright (Chromium), axe.

**Spec:** `docs/superpowers/specs/2026-11-19-inline-component-previews-design.md`

## Global Constraints

- Work in `D:\Documents\GitHub\ombelle-ui\.claude\worktrees\inline-component-previews` on `feat/inline-component-previews`. Conventional Commits. No push, no PR.
- Node 24.19.0, pnpm 11.25.0. Install with `pnpm install --frozen-lockfile --ignore-scripts` (after adding deps: `pnpm install --ignore-scripts` to update the lockfile).
- Do not modify `packages/catalog/src/generated.ts`, stable hashes, catalog templates or styles, or `packages/compiler` behaviour.
- Built-in families = `supportedStyleFamilies` from `@ombelle/contracts` (Liquid Glass excluded): ombelle, papier, organic, retro-futurism, minimalist, flat, neo-brutalism.
- Generated output is gitignored and deterministic (same input → byte-identical files).
- No axe, focus-visible, keyboard or touch-target regression; no layout shift; no hydration warning on any component page.
- Only re-run tests whose inputs changed (project rule). Run `pnpm build:packages` and `pnpm generate:preview` before tests that read generated output.

## Deviation from the spec (to confirm with the user at hand-off)

The spec says templates read the scope from a React context and write it on **each slot element**. This plan puts the scope on the **stage root** and renders every Radix portal **inside the stage** through a `PreviewPortal` context (a portal container, still a React context). Same outcomes (portals styled, state kept across switches, no site leak because slots are renamed `pv-*`), with one attribute change per switch instead of re-rendering every element, and no hook calls injected into template JSX. Fixed-position overlays still cover the viewport because the stage has no `transform`, `filter`, `contain` or z-index stacking context (asserted in Task 6).

## Review Focus

1. Site dark, preview set to Light: a portalled Dropdown Menu and Dialog must render light. → Task 8 test `explicit light preview stays light under a dark site`.
2. Rapid family clicks (Papier then Organic before Papier's CSS loads): the stage ends on Organic, never mixed. → Task 8 test `last family wins on rapid switches`.
3. Client-side navigation to the next component (prev/next links): the new component's CSS is applied on first paint. → Task 8 test `client navigation keeps the next specimen styled`.
4. Input Group's clear button looks up `[data-slot="input-group"]` in JS; after renaming it must still work. → Task 4 test `renames slot selectors inside string literals`, Task 8 test `input group clear works inline`.
5. `/components/button?glass=<preset>` must still open the Liquid Glass iframe path. → Task 7 test `glass query keeps the iframe path`.

---

### Task 0: Baseline measurement

**Files:**
- Create: `scripts/measure-component-preview.mjs`
- Create: `docs/evidence/inline-component-previews.md`

**Interfaces:**
- Produces: `node scripts/measure-component-preview.mjs <origin> <id...>` printing JSON `{ id, firstReadyMs, familySwitchMs: Record<family, number>, modeSwitchMs }[]`.

- [ ] **Step 1:** Write the script with Playwright Chromium (1100×800, cache disabled for the first load). For each id: `goto(origin + '/components/' + id)`, `firstReadyMs` = navigation start → `getByRole('status')` text matches `/^Ombelle · /`. Family switch: click radio `{ name: 'Papier' }` in radiogroup `Style family`, time until status text starts with `Papier · `; same for each built-in family label. Mode switch: click `Dark`, time until status ends with `· dark`. The status line exists in both the old and new paths, so the same script measures both.
- [ ] **Step 2:** Build production www from this commit (`pnpm build:packages`, `pnpm generate:preview`, then `node scripts/build-hosted-www.mjs` or the documented hosted build; start with `next start` on port 3000) and run `node scripts/measure-component-preview.mjs http://127.0.0.1:3000 button dropdown-menu`. Also run `node scripts/measure-www-first-load.mjs`.
- [ ] **Step 3:** In Chrome DevTools performance trace of `/components/button`, split the first-ready time into worker download, compile, iframe load. Record all numbers, the machine and the commit in `docs/evidence/inline-component-previews.md` under "Baseline".
- [ ] **Step 4:** Commit: `perf(www): measure component preview baseline`.

---

### Task 1: One specimen source

**Files:**
- Create: `fixtures/shared/specimens/<id>.tsx` (one per gallery section), `fixtures/shared/specimens/index.ts`
- Modify: `fixtures/shared/preset-gallery.tsx`, `scripts/generate-preset-gallery.ts:171-180`, `tests/helpers/editor-preset-consumer.ts:225-231`
- Test: `apps/www/src/inline-preview/gallery-parity.test.tsx`, `apps/www/src/inline-preview/__snapshots__/preset-gallery.html`

**Interfaces:**
- Produces: each specimen module exports `function Specimen(props: { only?: string }): React.ReactElement` rendering exactly today's section (the `only` prop exists only on modules that hold several component parts, such as the form).
- Produces: `fixtures/shared/specimens/index.ts` exports `specimenIndex: Record<ComponentId, { module: string; only?: string }>` (module = file basename without extension), covering every id that has a `data-component` section or part today.

- [ ] **Step 1: Snapshot before the split.** Test `renders the same gallery HTML as before the split`: `renderToStaticMarkup(<PresetGallery />)` from `apps/preview/src/generated/preset-gallery/gallery` (after `pnpm generate:preview`), compared with `toMatchFileSnapshot('./__snapshots__/preset-gallery.html')`. Run once to write the snapshot; commit it with the test.
- [ ] **Step 2:** Move each section into its module; `PresetGallery` keeps the `gate(...)` calls and renders `<XSpecimen />` in the same order. Shared helpers (`presetSlides`, `fieldTripPhotos`, `ToastExample`, `Unavailable`) live in `fixtures/shared/specimens/shared.tsx`. Specimens import components as `@/components/ui/<id>`.
- [ ] **Step 3:** Multi-part groups (the `<form className="preset-form">` with label, input, textarea, native-select, select, radio-group, and any other top-level child that is not a `<section>`) get `only?: string`: with `only`, render the wrapper plus that part, plus the `label` part when today's `labelsInside(part, shown)` in `apps/preview/src/preset-preview.tsx:116-126` would keep it. Without `only`, render every part (gallery unchanged).
- [ ] **Step 4:** Test `keeps the same parts as the iframe for each form control`: for each multi-part id, the `data-component` values rendered by `<Specimen only={id} />` equal the parts left visible by the iframe's hiding logic applied to the full gallery DOM (jsdom).
- [ ] **Step 5:** `generate-preset-gallery.ts` copies `fixtures/shared/specimens/` to `<root>/specimens/` with `@/components/ui/` rewritten to `../components/ui/`; `editor-preset-consumer.ts` copies it to `src/specimens/` unchanged. Gallery imports specimens as `./specimens/<module>`. If any scene imports the gallery, extend `assertSceneSources`' allowed list with the copied `specimens/` files.
- [ ] **Step 6:** Run `pnpm generate:preview`, then `pnpm exec vitest run apps/www/src/inline-preview/gallery-parity.test.tsx` → PASS (snapshot identical). Run the gallery generator tests (`pnpm exec vitest run tests/integration/audit-page-generation.test.ts` and any test importing `generate-preset-gallery`) → PASS.
- [ ] **Step 7:** Commit: `refactor(fixtures): split the preset gallery into per-component specimens`.

---

### Task 2: Shared focus layout CSS

**Files:**
- Create: `fixtures/shared/preset-focus.css`
- Modify: `apps/preview/src/preset-preview.css:66-96`
- Test: `apps/www/src/inline-preview/focus-css.test.ts`

**Interfaces:**
- Produces: `fixtures/shared/preset-focus.css` with today's `html[data-focus…]` rules rewritten as `[data-focus…] .preset-gallery …` (no `html` in any selector), imported by `preset-preview.css`.

- [ ] **Step 1:** Test `focus rules name no html element`: parse the file with postcss; no selector contains `html`, `body` or `:root`; the rule count equals the removed block's.
- [ ] **Step 2:** Move the rules; `preset-preview.css` imports the new file at the same position.
- [ ] **Step 3:** Run the test → PASS. Run `pnpm test:site` filtered to the component preview checks (`-g "components"`) → PASS (iframe rendering unchanged).
- [ ] **Step 4:** Commit: `refactor(preview): share the focused specimen layout rules`.

---

### Task 3: CSS scoping transform

**Files:**
- Create: `scripts/www-previews/scope-css.ts`
- Test: `apps/www/src/inline-preview/scope-css.test.ts`

**Interfaces:**
- Produces: `scopePreviewCss(css: string, family: BuiltInFamily): string`, `previewTokensCss(family: BuiltInFamily, theme: ThemeData): string`, `type BuiltInFamily = (typeof supportedStyleFamilies)[number]`, `const previewSlotPrefix = 'pv-'`.
- Stage attributes (used by Tasks 5–8): `data-preview-family="<family>"`, `data-preview-mode="auto" | "light" | "dark"`, `data-focus="<componentId>"`.

- [ ] **Step 1: Write failing tests.**
  - `prefixes every rule with the family scope`: `[data-slot="button"]:hover{}` → `[data-preview-family="papier"] [data-slot="pv-button"]:hover{}`.
  - `renames every data-slot value`: `[data-state='open'] > [data-slot='accordion-icon']` → both sides scoped, value `pv-accordion-icon`; presence-only `[data-slot]` kept as is under the scope.
  - `maps html, body and :root to the stage itself`: `html, body{margin:0}` → `[data-preview-family="papier"]{margin:0}`; `*,*::before` → `[data-preview-family="papier"] *, …`.
  - `renames keyframes per family`: `@keyframes ombelle-tooltip-enter` → `ombelle-tooltip-enter-papier`, and `animation:` / `animation-name:` values follow.
  - `keeps media and supports rules`: `@media (forced-colors: active){[data-slot="x"]{}}` keeps the at-rule, scopes the inner rule.
  - `throws on rules it cannot scope`: `@font-face`, `@import`, `@page` → throws `Unsupported at-rule in preview CSS`.
  - `emits three-mode tokens`: `previewTokensCss('papier', theme)` contains `[data-preview-family="papier"]{…;color-scheme:light}` with light tokens and `[data-preview-family="papier"][data-preview-mode="dark"],.dark [data-preview-family="papier"][data-preview-mode="auto"]{…;color-scheme:dark}` with dark tokens; keys sorted.
  - `is deterministic`: same input twice → identical string.
- [ ] **Step 2:** Run `pnpm exec vitest run apps/www/src/inline-preview/scope-css.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement with `postcss` + `postcss-selector-parser` (already compiler deps; add them to the root devDependencies if not resolvable from `scripts/`). Follow the renaming approach of `packages/compiler/src/component-recipe-styles.ts` without importing its single-recipe assumptions.
- [ ] **Step 4:** Run the test → PASS.
- [ ] **Step 5:** Commit: `feat(www): scope family stylesheets for inline previews`.

---

### Task 4: Template transform and preview portal

**Files:**
- Create: `scripts/www-previews/scope-template.ts`, `apps/www/src/inline-preview/preview-portal.tsx`
- Test: `apps/www/src/inline-preview/scope-template.test.ts`, `apps/www/src/inline-preview/preview-portal.test.tsx`

**Interfaces:**
- Consumes: `previewSlotPrefix` (Task 3).
- Produces: `scopePreviewTemplate(source: string, imports: { utils: string; portal: string }): string`.
- Produces: `PreviewPortalContainer: React.Context<HTMLElement | null>` and `PreviewPortal({ portal: Portal, container, ...props }: { portal: React.ComponentType<any>; container?: HTMLElement | null } & Record<string, unknown>)`, rendering `<Portal {...props} container={container ?? useContext(PreviewPortalContainer) ?? undefined} />`.

- [ ] **Step 1: Write failing tests.**
  - `renames slot attributes`: `data-slot="button"` → `data-slot="pv-button"`.
  - `renames slot object literals`: `{ 'data-slot': 'item' }` → `'pv-item'`.
  - `renames slot selectors inside string literals`: `closest('[data-slot="input-group"]')` → `closest('[data-slot="pv-input-group"]')`.
  - `routes primitive portals through PreviewPortal`: `<DialogPrimitive.Portal forceMount={x}>…</DialogPrimitive.Portal>` → `<PreviewPortal portal={DialogPrimitive.Portal} forceMount={x}>…</PreviewPortal>` plus one import of `PreviewPortal` from `imports.portal`.
  - `strips stylesheet imports and rewrites utils`: `import './button.css'` removed; `@/lib/utils` → `imports.utils`; `@/components/ui/x` → `./x`.
  - `leaves no unrenamed slot`: over every catalog template (`getCatalog('0.1.0').templates`, radix edition), the output matches no `data-slot` value without the `pv-` prefix.
  - `PreviewPortal uses the stage container`: rendering a Radix Dialog open inside `<PreviewPortalContainer.Provider value={el}>` places `[data-slot="pv-dialog-content"]` inside `el` (jsdom); an explicit non-null `container` prop wins.
- [ ] **Step 2:** Run both tests → FAIL.
- [ ] **Step 3:** Implement the transform with the compiler's `rewriteModuleSpecifiers` and `stripStylesheetImports`, plus regex rewrites for the slot forms above; implement `PreviewPortal`.
- [ ] **Step 4:** Run both tests → PASS.
- [ ] **Step 5:** Commit: `feat(www): scope catalog templates for inline previews`.

---

### Task 5: Preview generator

**Files:**
- Create: `scripts/generate-www-previews.ts`
- Modify: `scripts/generate-preview.ts` (call after `generateWwwUi()`), `.gitignore` (add `apps/www/public/previews/`), `apps/www/package.json` (deps), `apps/www/src/app/globals.css` (`@source "../generated/previews";`)
- Test: `apps/www/src/inline-preview/generate-previews.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 3, 4.
- Produces: `generateWwwPreviews(out?: { src: string; public: string }): Promise<void>` writing:
  - `public/previews/<family>/base.css` = `previewTokensCss` + scoped `styles/ui-style.css` artifact + scoped `fixtures/shared/preset-gallery.css` + scoped `fixtures/shared/preset-focus.css` + `[data-preview-family="<f>"] .preset-gallery{min-height:100%}`.
  - `public/previews/<family>/<id>.css` = scoped CSS of every component the specimen for `id` imports (from the compile result's per-component style artifacts).
  - `src/generated/previews/ui/<component>.tsx` (Task 4 transform of the compiled source; utils → `../../ui/lib/utils`, portal → `../../../inline-preview/preview-portal`).
  - `src/generated/previews/specimens/<module>.tsx` (Task 1 modules, `@/components/ui/` → `../ui/`).
  - `src/generated/previews/index.ts` exporting `inlineSpecimens: Record<string, React.ComponentType<{ only?: string }>>` built with `next/dynamic(() => import('./specimens/<module>').then(m => m.Specimen))` (SSR on), and `specimenOnly: Record<string, string | undefined>`.
- Deps added to `apps/www` at `apps/preview`'s versions: `@radix-ui/react-accordion 1.3.1`, `@radix-ui/react-avatar 1.3.1`, `@radix-ui/react-context-menu 2.4.1`, `@radix-ui/react-hover-card 1.2.1`, `@radix-ui/react-progress 1.2.1`, `@radix-ui/react-radio-group 1.5.1`, `@radix-ui/react-select 2.4.1`, `@radix-ui/react-separator 1.2.0`, `@radix-ui/react-toast 1.3.1`, `input-otp 1.5.0`, `react-day-picker 10.0.2`, `date-fns 4.4.0`, `@date-fns/tz 1.5.0`. No Fontsource (all built-in presets use `system-sans`).

- [ ] **Step 1: Write failing tests** (generate into a temp dir):
  - `writes base and component sheets for every built-in family`: 7 `base.css`; one `<id>.css` per family for every id in `specimenIndex` that is not `unavailable` for that family.
  - `is deterministic`: two runs → byte-identical trees.
  - `ships no unscoped rule`: every selector in every CSS file starts with `[data-preview-family=`; no `@keyframes` name appears in two families' files.
  - `ships no font imports`: generation throws `Built-in family <f> needs web fonts` if a family's typography has imports (guard; passes today).
  - `registers every specimen`: `index.ts` names every `specimenIndex` key.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; compile each family with `compile({ preset: catalog.presets[family], componentIds: componentsWithStyleSupport(family, ['stable','experimental']), catalogRelease: '0.1.0', compilerVersion: '0.1.0' })`. Add deps and run `pnpm install --ignore-scripts`.
- [ ] **Step 4:** Run the test → PASS. Run `pnpm generate:preview` and `pnpm typecheck` → PASS.
- [ ] **Step 5:** Commit: `feat(www): generate inline preview styles and specimens`.

---

### Task 6: Inline preview stage

**Files:**
- Create: `apps/www/src/inline-preview/inline-preview.tsx`, `apps/www/src/inline-preview/routing.ts`
- Modify: `apps/www/src/app/globals.css` (`@layer base` exemptions)
- Test: `apps/www/src/inline-preview/inline-preview.test.tsx`, `apps/www/src/inline-preview/routing.test.ts`

**Interfaces:**
- Consumes: Task 5 registry, Task 4 `PreviewPortalContainer`.
- Produces: `InlinePreview({ id, family, mode, height }: { id: ComponentId; family: BuiltInFamily; mode: 'auto' | 'light' | 'dark'; height: number })`.
- Produces in `routing.ts`: `iframeOnly: ReadonlySet<ComponentId>` = `{'sidebar'}`, `clientOnly: ReadonlySet<ComponentId>` (starts empty; Task 8 fills it), `previewPath(id: ComponentId, family: StyleFamily): 'inline' | 'iframe'` (iframe for `liquid-glass` or `iframeOnly`), `previewStylesheets(family: BuiltInFamily, id: ComponentId): [string, string]` = `['/previews/<f>/base.css', '/previews/<f>/<id>.css']`.

- [ ] **Step 1: Write failing tests.**
  - `routes glass and sidebar to the iframe`: `previewPath('sidebar','papier') === 'iframe'`, `previewPath('button','liquid-glass') === 'iframe'`, `previewPath('button','papier') === 'inline'`.
  - `server-renders the specimen with its stylesheets`: `renderToString(<InlinePreview id="button" family="ombelle" mode="auto" height={420} />)` contains `data-preview-family="ombelle"`, `data-preview-mode="auto"`, `data-focus="button"`, a `.preset-gallery` wrapper, `data-slot="pv-button"`, and two `<link rel="stylesheet"` with `precedence="ombelle-preview"` and the two `previewStylesheets` hrefs.
  - `renders the unavailable placeholder`: a component `unavailable` in a family renders today's `Unavailable` markup.
  - `server-renders a skeleton for client-only components`: with `clientOnly` mocked to contain `calendar`, the server HTML holds a `[data-preview-skeleton]` of `height` px and no specimen.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Stage: a `div` with the three data attributes, `style={{ height }}`, `overflow: auto`, no `transform`/`filter`/`contain`/`z-index`; its ref feeds `PreviewPortalContainer`. Renders `<link rel="stylesheet" href precedence="ombelle-preview" />` for both sheets, then `<div className="preset-gallery">` with `<Specimen only={specimenOnly[id]} />`. `clientOnly` ids mount after `useEffect`. In `globals.css`, change `h1, h2, h3` and `:focus-visible` base rules to `:where(h1, h2, h3):not(:where([data-preview-family] *))` and `:focus-visible:not(:where([data-preview-family] *))`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `feat(www): render component specimens inline`.

---

### Task 7: Playground wiring

**Files:**
- Modify: `apps/www/src/site/components/playground.tsx`
- Test: `apps/www/src/site/components/playground.test.tsx` (create)

**Interfaces:**
- Consumes: `InlinePreview`, `previewPath`, `useSiteDark()` (`apps/www/src/site/theme.tsx:13`).

- [ ] **Step 1: Write failing tests** (jsdom, `next/dynamic` mocked to render synchronously, worker hook mocked):
  - `starts inline in Ombelle auto without the worker`: initial render has `[data-preview-family="ombelle"][data-preview-mode="auto"]`, no iframe, `usePresetCompiler` not called; status reads `Ombelle · light`.
  - `switches family in a transition`: clicking Papier sets `data-preview-family="papier"` on the same stage node (not remounted: a typed value in the specimen survives).
  - `explicit mode overrides the site`: clicking Dark sets `data-preview-mode="dark"`.
  - `glass query keeps the iframe path`: with `?glass=<valid preset>` and a glass-capable id, an iframe renders and the worker hook runs.
  - `falls back to the iframe when the inline preview throws`: a specimen that throws → `PresetPreviewFrame` renders for that id.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: `mode` state `'auto' | 'light' | 'dark'` (initial `'auto'`; toggle value shows `siteDark ? 'dark' : 'light'` while auto); `setFamily` wrapped in `startTransition`; `usePresetCompiler` lives in a child `IframePreview` component mounted only on the iframe path; an error boundary around `InlinePreview` switches that id to `IframePreview`; status derived (`ready` immediately on the inline path); idle `preload(href, { as: 'style' })` (from `react-dom`) of the six other families' two sheets via `requestIdleCallback`. Code tab and glass controls unchanged.
- [ ] **Step 4:** Run → PASS; run `pnpm exec vitest run apps/www/src/site` → PASS.
- [ ] **Step 5:** Commit: `feat(www): show built-in families inline on component pages`.

---

### Task 8: Browser checks and hydration list

**Files:**
- Create: `tests/e2e/inline-previews.spec.ts`
- Modify: `playwright.site.config.ts` (add to `testMatch`), `apps/www/src/inline-preview/routing.ts` (`clientOnly` entries found here), `tests/e2e/site-shell.spec.ts` (only where it asserted iframe-only behaviour on component pages)

- [ ] **Step 1: Write the tests.**
  - `renders the specimen without JavaScript`: context with `javaScriptEnabled: false`, `/components/button` → `[data-preview-family="ombelle"] [data-slot="pv-button"]` visible with a background different from the site's `--background`.
  - `no hydration warning on any component page`: for each id in `componentDocs`, load the page, collect console errors/warnings matching `/hydrat|did not match/i` → none. Ids that fail go into `clientOnly`, each with a one-line reason comment.
  - `explicit light preview stays light under a dark site`: site dark, preview Light, open Dropdown Menu and Dialog → their content's computed `background-color` equals the light token value.
  - `last family wins on rapid switches`: with network throttled, click Papier then Organic → stage settles on `organic`, and no element under the stage matches a `papier` rule (computed style equals a fresh Organic load).
  - `client navigation keeps the next specimen styled`: click the next-component link → first frame after navigation has the specimen styled (no unstyled frame, checked with `requestAnimationFrame` sampling).
  - `input group clear works inline`: type in the Input Group, press its clear button → empty.
  - `does not leak styles`: on `/components/dialog` with Papier selected, the site header, sidebar links and Code tab computed styles equal those on `/docs`; the specimen's computed styles equal those in the iframe preview of the same family (sampled properties: color, background-color, border, border-radius, font-family, box-shadow).
  - `portals, focus and keyboard`: Dialog opens with Enter, traps focus, Escape closes and returns focus to the trigger; Dropdown Menu opens with ArrowDown, items reachable by arrow keys; overlay sits above the sticky header (`elementFromPoint` at the header's centre hits the overlay).
  - `no layout shift`: `PerformanceObserver('layout-shift')` sum < 0.01 on load and across a switch through all seven families, at 375×812 and 1100×800.
  - `axe stays clean`: existing axe checks for `/components` and `/components/data-table` plus `/components/button` and `/components/dropdown-menu` in each family, light and dark.
- [ ] **Step 2:** Run `pnpm build:packages`, `pnpm generate:preview`, `pnpm test:site` → fix until PASS (fixes go in the owning task's files).
- [ ] **Step 3:** Commit: `test(www): cover inline component previews in the browser`.

---

### Task 9: Measure and record

**Files:**
- Modify: `docs/evidence/inline-component-previews.md`

- [ ] **Step 1:** Production build as in Task 0; run `node scripts/measure-component-preview.mjs http://127.0.0.1:3000 button dropdown-menu dialog data-table` and `node scripts/measure-www-first-load.mjs`.
- [ ] **Step 2:** Compare against the spec's targets: specimen in the first paint of the static HTML; mode switch under one frame (≤ 16 ms); family switch < 100 ms once loaded, < 300 ms first time on a fast connection; first-load JS of `components/accordion` reported against the baseline. If a target is missed, stop and report the numbers (blocked).
- [ ] **Step 3:** Record results, the `clientOnly` and `iframeOnly` lists with reasons, and what stays out of scope (Liquid Glass, custom presets, editors, Sidebar).
- [ ] **Step 4:** Commit: `docs(evidence): record inline component preview measurements`.
