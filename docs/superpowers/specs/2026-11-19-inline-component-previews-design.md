# Inline component previews on `/components/[id]`

Status: draft for approval · 2026-11-19 · branch `feat/inline-component-previews`

## Intent

The component detail page (`apps/www/src/app/components/[id]/page.tsx`) shows its example through
`ComponentPlayground`, which compiles the selected family's built-in preset in a Web Worker
(`/preset-compiler.worker.js`) and posts the result to a sandboxed iframe (`apps/preview`, preset
preview). Reported cost: about 5.7 s before the first render, 2.2 to 3.0 s on each family change.

The goal is the shadcn / Radix Themes experience: the page arrives with the component already drawn,
the real components are interactive in the page, and changing family or light/dark mode compiles
nothing. It only swaps a scope.

## Goals

- On `/components/[id]`, the Preview tab renders the component inline, without iframe or worker, for
  the seven built-in families: ombelle, papier, organic, retro-futurism, minimalist, flat,
  neo-brutalism (what `offeredStyleFamilies()` returns, minus Liquid Glass).
- The default preview (Ombelle, mode following the site) is in the static HTML, styled, with no
  skeleton and no light-to-dark flash.
- The specimen is the one the iframe shows today: the `PresetGallery` section for that component,
  with all its variants and compositions (decided: keep the variants).
- Family and mode changes are instant once a family has been loaded; the first switch to a family
  only fetches its CSS and fonts.
- Each family's styles stay isolated from the site and from the other families, portals included.

## Non-goals

- The `/components` grid (no thumbnails).
- Liquid Glass: keeps the worker and iframe path.
- Custom presets, the preset editor, the component editors, recipe pages.
- The CLI, the published catalog, `packages/catalog/src/generated.ts`, stable hashes,
  `packages/compiler` behaviour (see Scoping).
- Removing the worker or the iframe.

## Anti-goals (a failure even if it is fast)

- A family stylesheet changes the site chrome, or the site's `globals.css` changes a preview.
- One family's rules or `@keyframes` leak into another family's preview.
- An axe, focus-visible, keyboard or touch-target regression.
- Layout shift on load or on a family switch.
- Two specimen sources that drift (iframe gallery, consumer fixtures, inline page).
- A hydration error in the console on any component page.

## Audit findings that shape the design

- **For a built-in family the compile result is only CSS.** `apps/preview/src/preset-preview.tsx`
  renders a prebuilt `PresetGallery` and injects `styles/ui-tokens.css` (`:root`, `.dark`,
  `@theme inline`, font `@import`s) and `styles/ui-style.css` (family sheet + font rule block). Both
  are deterministic for a built-in preset.
- **Family CSS is unscoped**: bare `[data-slot="…"]` selectors and component-owned markers
  (`[data-item-link]`, `[data-menubar-dot]`…); `@keyframes` names such as `ombelle-tooltip-enter`
  repeat in all eight families. Some family rules use viewport media queries (Dialog in
  `ombelle.css`, Carousel, Navigation Menu).
- **Ancestor prefixing (`[data-family] …`) cannot work**: 37 templates portal content out of the
  wrapper, keyframes collide, and the site's own `[data-slot="dialog-*"]`, scroll-area and element
  rules in `globals.css` would still match previews.
- **A per-element scoping transform exists**: `scopeRecipeTemplate`
  (`packages/compiler/src/component-recipe-source.ts`) and `compileComponentRecipeStyles`
  (`component-recipe-styles.ts`) rename `data-slot="x"` to `recipe-x`, put
  `data-ombelle-recipe=<scope>` on every slot element (portalled ones too), and rename keyframes.
  `scripts/generate-preview.ts` already runs `scopeRecipeTemplate` over every catalog template except
  Button into `apps/preview/src/generated/catalog-recipes`, and `apps/preview/src/audit-page.tsx`
  renders scoped components inline. Limits: the style transform is built around one component
  recipe (`recipe.component` drives marker ownership and appearance rules) and Button is not a
  recipe component; `createScopedPrimitives(scope)` returns new component functions per call.
- **Specimens and their layout CSS**: `fixtures/shared/preset-gallery.tsx` (1,207 lines, 81
  `data-component` sections) plus `fixtures/shared/preset-gallery.css` (`html, body`, `*`,
  `.preset-*` classes, and `[data-slot='dialog-content' | 'card' | 'card-footer']` rules) are copied
  into the preview (`scripts/generate-preset-gallery.ts`, hash manifest) and into the consumer parity
  fixtures (`tests/helpers/editor-preset-consumer.ts`). The focused look (centred, headings hidden,
  360 px stacks, wider slider/card/scroll-area/carousel) comes from `html[data-focus]` rules in
  `apps/preview/src/preset-preview.css`. Form controls (label, input, textarea, native select,
  select, radio group) are parts of one shared `<form>`; the iframe keeps a label when it names the
  focused control.
- **Site theme**: `themeInitScript` in `apps/www/src/app/layout.tsx` sets `.dark` on `<html>` before
  first paint. The playground currently starts light and flips in a `useEffect`.
- **Site leaks into previews**: `globals.css` `@layer base` sets `h1, h2, h3 { font-family }`, a global
  `:focus-visible` outline, `body` font and colours, and `.dark { color-scheme: dark }`.
- **Dependencies**: `apps/www` lacks several runtime dependencies the templates import
  (react-day-picker, input-otp, several `@radix-ui/react-*`) and the Fontsource packages
  (`apps/preview/src/preset-fonts.ts` lists the loaders).
- **Tailwind**: www uses `@import "tailwindcss" source("..")`; a gitignored generated folder may not be
  scanned, so utilities used only by generated templates need an explicit `@source`.
- **Sidebar** reads `window.matchMedia` with `mobileBreakpoint` (768 px); a container breakpoint
  would be a catalog change, out of scope.

## Approaches

- **A. Inline render with per-element scoping (chosen).** Build-time scoped stylesheets and scoped
  component modules for the seven families; per-component specimen modules; default family
  server-rendered. Only approach that removes the iframe; reuses the tested slot-renaming idea.
- **B. Keep the iframe, drop the worker** (precomputed `CompileResult` JSON). Near-instant switches,
  but the first render still waits for the iframe and the whole gallery. Kept only as the fallback
  path, which already exists.
- **C. Prefix family CSS with `[data-family]`.** Rejected: portals, keyframes, site rule leaks.

Specimen source, decided: **today's gallery sections** (keep variants and compositions), not the
compiler's recipe specimens, which show one default instance and replace composed components such
as `Button` with native buttons.

Initial render, decided: **default preview in the static HTML**, with a client-only fallback for
components that fail hydration.

## Design

### Scopes and modes

- Per family, three scopes: `auto`, `light`, `dark` (names left to the builder, for example
  `pv-papier-auto`).
  - `light` and `dark` carry that mode's full token set on the scope selector, independent of any
    ancestor.
  - `auto` carries light tokens, and dark tokens under `.dark [scope]` / `.dark[scope]`. The site's
    `.dark` lives on `<html>`, which is also the ancestor of portals, so `auto` follows the site
    before first paint, portals included.
- The preview starts in `auto`. The Light/Dark toggle shows the site's current mode as selected;
  choosing one switches to the explicit scope. `color-scheme` is set on each scope (light or dark) so
  native controls match the preview, not the site.
- The scope reaches components through a **React context**, not through
  `createScopedPrimitives(scope)` per scope. The www generator emits templates that read the scope
  from context and write it on each slot element. Consequence: a family or mode change re-renders
  with new attribute values and keeps component state (an open menu stays open, typed text stays).

### Scoping (www-only generator, compiler unchanged)

`packages/compiler` is not modified, so `add --recipe` output and recipe hashes stay identical. The
new generator, `scripts/generate-www-previews.ts`, builds on the same parsers (`postcss`,
`postcss-selector-parser`) and the same slot-renaming rules as `component-recipe-source.ts` /
`component-recipe-styles.ts`, extended for a whole family sheet:

- Every `[data-slot="x"]` becomes `[data-slot="pv-x"][data-ombelle-preview="<scope>"]`.
- Component-owned markers and the few gallery-layout rules are prefixed with the scope attribute.
- `@keyframes` are renamed per family (and the `animation` declarations that use them).
- `@media` and `@supports` rules (reduced motion, forced colours, viewport widths) are kept as-is.
- Any selector it cannot scope fails generation, so no rule ships unscoped.
- Button is handled like every other template: the transform works on templates, not recipe ids.

A generator test asserts: deterministic output, 7 × 3 scopes, no unscoped `[data-slot]` selector, no
`@keyframes` name shared between families, no rule matching `html`, `body` or `*` outside a scope.

### Build-time output

`scripts/generate-www-previews.ts`, run wherever `generate-www-ui` runs (`pnpm generate:preview`,
`predev`, the hosted build, the CI gate), writes to `apps/www/src/generated/previews/` (gitignored):

1. Per family: compile the built-in preset with `@ombelle/compiler` (same inputs as the worker:
   `previewComponentIds(family)`, catalog release `0.1.0`, compiler `0.1.0`) and take its tokens,
   typography and family sheet.
2. Per family and component: scoped CSS (family sheet rules for that component + the component's
   own sheet + tokens for the three scopes). Ombelle's CSS for a component is imported statically by
   its page; the other six are separate files fetched on first switch.
3. Per component: scoped template modules and a specimen module (below).
4. A table `componentId → specimen loader`, `family → CSS loaders and font ids`, and the stage
   height per component.
5. An explicit Tailwind `@source` for the generated folder in the www stylesheet.

### Specimens: one source

- `fixtures/shared/preset-gallery.tsx` is split into per-component modules
  (`fixtures/shared/specimens/<id>.tsx`), each exporting today's section. Form parts keep their
  shared `<form>` wrapper: a focused form control renders the form wrapper, its own label and the
  control, like the iframe today.
- `PresetGallery` composes them, so the rendered tree is unchanged. A test compares the gallery's
  server-rendered HTML before and after the split.
- The generators that copy the gallery follow the split: `generate-preset-gallery.ts` (sources and
  hash manifest), the scenes guard (`assertSceneSources`) and `editor-preset-consumer.ts`.
- The gallery layout CSS needed by a focused section (the `.preset-*` classes, the
  `html[data-focus]` centring and widths, the gallery's slot rules) moves into a shared, scopable
  file used by both the iframe and the inline stage. The iframe's rendering stays pixel-identical,
  checked against today's screenshots.

### Server render and hydration

- The page server-renders `<InlinePreview>` with family Ombelle and scope `auto`. The specimen and its
  scoped components are imported statically for that page; Ombelle's scoped CSS for the component is
  in the page CSS; the Ombelle font is preloaded.
- Components whose specimen cannot hydrate identically (date-based Calendar, anything reading the
  window) are listed in a `clientOnly` table. They render a skeleton of the stage height on the
  server and mount after hydration. A test loads every component page in a browser and fails on any
  hydration warning, which keeps the table honest.
- The six other families are preloaded when the page is idle, and fetched on demand otherwise. Until
  a family's CSS is loaded, the stage keeps showing the previous family; the switch happens when it
  is ready (no skeleton, no shift).

### The stage

- A fixed-height stage, like today's frame: `tallPreviews` heights (default 420 px), content centred
  as in the iframe, overflow scrolling inside. It does not resize on family switch.
- The stage resets site styles for its subtree: `globals.css` element rules (`h1–h3` font,
  `:focus-visible`) are exempted for `[data-ombelle-preview]` subtrees, and the stage sets
  `font-family`, `color`, `background` and `color-scheme` from its scope tokens.
- Overlays (Dialog, Sheet, Alert Dialog, Toast) cover and lock the whole page, as on shadcn. Their
  z-index sits above the site header.
- Viewport media queries now respond to the page width. Accepted for Dialog, Carousel and
  Navigation Menu; checked at 375 px and desktop.

### The playground

`ComponentPlayground` keeps its controls, tabs, status line and Code tab.

- Built-in families: `<InlinePreview>`. The worker hook is only mounted for Liquid Glass or a
  fallback, so the inline path never downloads the worker.
- Liquid Glass: today's `PresetPreviewFrame` with the worker, unchanged.
- Fallbacks to today's iframe path: an error boundary around the inline preview, and an
  `iframeOnly` list for components that cannot be right inline. At launch the list is **Sidebar**
  (window-based breakpoint). Every entry is reported in the delivery notes.
- The `?glass=` query handling and Liquid Glass controls are unchanged.

### Dependencies

Add to `apps/www` the runtime dependencies the specimens import and the Fontsource packages, at the
versions `apps/preview` uses; installs keep lifecycle scripts disabled.

## Measurement

Before any code, on a production build (`next build` + `next start`), for Button and Dropdown Menu:
time to first painted specimen, family switch, mode switch; the split of the 5.7 s baseline (worker
download, compile, iframe load); `scripts/measure-www-first-load.mjs` for `components/accordion`.
Targets: specimen painted in the first paint of the static HTML; mode switch under one frame; family
switch under 100 ms once loaded and under 300 ms on first load over a fast connection; first-load JS
of a component page reported against today. Repeat after the prototype (Button, then Dropdown Menu)
and after the rollout.

## Verification

- Existing: `pnpm test:site` (including axe on `/components` and `/components/data-table`),
  `apps/www` unit tests, gallery source and manifest tests, consumer fixture tests affected by the
  split.
- New: generator test (above); gallery HTML parity test; hydration test over every component page;
  a leak test (two families plus site chrome on one page, computed styles of site elements and of
  each preview unchanged); portal, focus and keyboard checks for Dialog and Dropdown Menu; 375 px and
  desktop; light, dark and auto; seven families.
- Only re-run what changed (project rule).

## Constraints

- No hand edit of `packages/catalog/src/generated.ts`, no stable hash change; the catalog does not
  change.
- Catalog selector rules unchanged (no chained `data-slot`; Liquid Glass at most one `[data-slot=`
  per selector); the generator reads them and never rewrites the sources.
- Conventional Commits on `feat/inline-component-previews`, in its own worktree. No publish, no PR
  without an explicit request.

## Left to the builder

- Exact scope and attribute names, file layout under `src/generated/previews`.
- How the gallery split is mechanised, as long as the rendered gallery is unchanged.
- The skeleton's look for `clientOnly` components.
- Idle preloading strategy for the six other families.

## Calls made without the user (to check)

- Remount avoided via a scope context (keeps state on switch).
- Fixed-height stage, as today.
- Full-page overlays, as on shadcn.
- Sidebar stays on the iframe path at launch.
- `packages/compiler` unchanged; a www-only generator reuses its approach.
- `globals.css` exempts preview subtrees from site element rules.
- Mode starts at `auto` (follows the site) instead of light.
