# Liquid glass style family

Date: 3 November 2026. Design agreed with the product owner in a brainstorming session. It resolves gap 5 of the [web alpha readiness audit](../../web-alpha-readiness.md), "Glass decision", by implementing glass rather than descoping it. Measured results will be recorded in `docs/evidence/liquid-glass.md`.

## Intent

Ship liquid glass as the fourth style family. Make it usable through the same preset, compiler, CLI, preview and editor pipeline as flat, minimalist and neo-brutalism, and keep it honestly labelled **experimental**. The [first release scope](../../01-product-requirements.md#first-release-scope) names Button, Badge, Card, Dialog, Tabs and Tooltip as the experimental glass entries. The six other components stay unavailable. The [liquid glass constraints](../../03-components-styles-accessibility.md#liquid-glass-constraints) govern contrast, fallbacks, motion and GPU cost.

## Goals

- `liquid-glass` is a supported style family with a built-in preset, a family stylesheet and component styles for Badge, Card, Tabs and Tooltip. Button and Dialog are styled in the family stylesheet, as in the other families.
- A single component × family compatibility table (`stable | experimental | unavailable`) is the one source read by the compiler, CLI, snapshot service and both editors.
- Text contrast on every translucent glass surface is guaranteed over **any** backdrop by a compile-time worst-case bound, in light and dark.
- Readable opaque fallbacks for unsupported `backdrop-filter`, preset `transparency: "reduced"`, `prefers-reduced-transparency: reduce` and `forced-colors: active`.
- Experimental limitations are visible in the CLI plan output, the preview gallery, both editors and the docs, satisfying the pilot gate.
- Flat, minimalist and neo-brutalism output stays byte-identical.

## Non-goals

- Glass styling for Input, Textarea, Label, Checkbox, Switch or Native Select. They are refused, not given fallbacks.
- Declaring glass stable. The stable bar in doc 03 is not met in this slice: mid-range mobile scrolling, human review and the broader browser range are all still owed.
- Animated or scroll-linked glass effects, refraction or SVG displacement filters, and background images shipped with components.
- Deploying the hosted snapshot service. The code accepts glass snapshots; the deploy is a separate operation.
- React Native glass.

## Decisions

### Family, not modifier

Glass is a fourth `styleFamily` value, already reserved in `schemas/preset.schema.json` together with `design.transparency` (`auto | reduced`), `design.glassBlurPx` (0–24) and `design.glassOpacity` (0.6–1). Components inherit it through generated CSS, as with every family. In `packages/contracts`, the existing `supportedStyleFamilies` keeps meaning the three **stable** families whose full 12-component matrix the existing tests, scripts and consumers iterate. A new `styleFamilies` list adds `liquid-glass`, and `isStyleFamily` and the `StyleFamily` type widen to it. Code that must handle glass opts in explicitly, so the stable matrix cannot change by accident.

### Compatibility table

`packages/contracts` exports a complete table covering all 12 components × 4 families. Flat, minimalist and neo-brutalism are `stable` for all 12. Liquid glass is `experimental` for Button, Badge, Card, Dialog, Tabs and Tooltip, and `unavailable` for the other six. The following read it instead of hard-coded family lists:

- compiler `compile`, component-scoped presets and recipe compilation
- the snapshot service's family allow-list
- the Button editor preview protocol
- the preset editor gallery

### Unavailable components are refused

Compiling an unavailable component × family pair throws `FoundationError('STYLE_UNAVAILABLE', …, '/componentIds')`. The message names the component and lists the experimental glass components. The CLI surfaces it at planning, before any write. An `init` whose component list includes an unavailable entry fails as a whole. Editors grey these components out and label them "Unavailable in liquid glass".

The family stylesheet `ui-style.css` for glass contains Input selectors only as an opaque, non-glass baseline. They are inert unless Input is installed, which is refused.

### Contrast guarantee: worst-case backdrop bound

A translucent surface renders as `mix(surface, backdrop, α)`, where α = `glassOpacity`. The mix happens in gamma-encoded sRGB, matching `color-mix(in srgb, …)`, and each channel is monotone in the backdrop. Blur only averages the backdrop. Relative luminance is monotone in every channel, so the rendered surface's luminance always lies between its mix over pure black and its mix over pure white. Contrast against a fixed text colour is V-shaped in surface luminance, falling to 1:1 where the two match, so its minimum over that range sits at an end only when the text luminance lies outside the range. The bound therefore requires 4.5:1 against both composites and that the text luminance is not between them; then it meets 4.5:1 over any backdrop.

`packages/compiler` gains a pure `glassContrastReport(preset)` that reuses the existing colour parsing and WCAG luminance formula. It checks each pair below in both modes, unless `transparency` is `reduced` (then the surfaces are opaque and the existing palette rules apply):

| Surface token | Text tokens | Used by |
| --- | --- | --- |
| `card` | `cardForeground`, `mutedForeground` | Card |
| `popover` | `popoverForeground`, `mutedForeground` | Dialog content, Tooltip content |
| `muted` | `foreground`, `mutedForeground` | Tabs list and inactive triggers |
| `secondary` | `secondaryForeground` | secondary Button |
| `background` | `foreground` | outline and ghost Button |

A failing pair throws `INVALID_DATA` at `/design/glassOpacity`. The message names the pair, the mode and the smallest passing opacity, rounded up to 0.01. The compile result does not change shape. Editors call the report function directly to show a live readout. Solid fills stay opaque and keep their existing contrast pairs. These are the default and destructive Button, both Badge variants (`default` and `destructive` are both solid), and the active Tabs trigger, which is an opaque `background` inner surface on the translucent list. Badge gets glass identity (highlight border and inner highlight) but no translucency.

### Tokens

For `liquid-glass` presets only, the compiler adds `--glass-blur` and `--glass-opacity` to `:root` in `ui-tokens.css`:

- `transparency: "auto"` emits `glassBlurPx + 'px'` and `glassOpacity`.
- `transparency: "reduced"` emits `0px` and `1`.

The other families' token output gains nothing and stays byte-identical. The resolved built-in glass preset supplies defaults for absent fields: `transparency: "auto"`, `glassBlurPx: 12`, and `glassOpacity` set to the smallest value at which both built-in palettes pass the bound.

### Layered fallbacks

1. **Base rules are opaque.** Glass surfaces use `background: var(--card)`, or the relevant surface token, outside any feature query.
2. Translucency and blur apply only inside `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`, using `color-mix(in srgb, var(--card) calc(var(--glass-opacity) * 100%), transparent)` with `backdrop-filter: blur(var(--glass-blur)) saturate(140%)`. A browser without filter support never shows text over an unblurred busy backdrop.
3. `@media (prefers-reduced-transparency: reduce)` restores opaque surfaces and `backdrop-filter: none`.
4. `@media (forced-colors: active)` uses system colours, no filter and no translucency, following the existing family rules.
5. Glass identity that survives every fallback: a 1px highlight border (`color-mix` of `--foreground` at low strength), an inner top highlight `box-shadow`, and the preset radius.

### Motion and GPU cost

Blur is never transitioned or animated. Transitions only touch colour and opacity, use `--motion-duration`, and are disabled by `prefers-reduced-motion`, as in the other families. Only the outermost glass surface filters: the Card root, Dialog content, Tooltip content, the Tabs list, and translucent Button variants. Glass Buttons and Tabs lists nested inside a Card or Dialog drop their own `backdrop-filter` and use their opaque-over-surface colours. The Dialog overlay is a plain dim with no blur.

### Scoped Button presets and recipes

Button is experimental for glass, so `add button --preset <glass.json>`, `--recipe` and the Button editor accept glass presets. `recipe-styles.ts` parses the family CSS with postcss and scopes Button rules. It must carry the `@supports` and `@media` blocks into the scope with every selector inside them rewritten, and it must emit the glass tokens in the scoped token block. This is the highest-risk compiler change and has focused tests.

### CLI

`init`, `theme add` and `add` accept glass presets. When a plan installs an experimental entry, plan and dry-run output prints one notice line: "liquid-glass is experimental for <components>; see docs/components/liquid-glass.md for limitations". `--yes` does not suppress `STYLE_UNAVAILABLE`.

### Preview gallery and editors

- **Preview.** Generates a `liquid-glass` family entry. Each glass component renders over three declared backdrop fixtures (solid, gradient and a high-frequency pattern) in light and dark. Unavailable components render as labelled placeholders.
- **Preset editor.** Glass appears in the family picker with an "Experimental" badge. `transparency`, blur and opacity controls appear only for glass. A limitations panel is always visible for glass. A live contrast-bound readout disables export and publish while any pair fails. Unavailable components are greyed out in the gallery.
- **Button editor.** Accepts glass presets and shows the experimental notice next to the export and CLI command.

### Snapshots

The snapshot contract already uses `isStyleFamily`. The service's hard-coded family list is replaced by the shared table, so glass presets can be published once the service is redeployed.

## Testing

- **Byte-identity guard (added first).** A fixture records the hashes of every compile artifact for the three existing families × all 12 components, built-in presets, plus scoped Button preset and recipe outputs. A unit test asserts they are unchanged.
- **Unit:**
  - contrast bound against hand-computed values, including the exact threshold opacity
  - rejection message, path, pair and mode
  - `reduced` emits opaque tokens
  - `STYLE_UNAVAILABLE` for each of the six components
  - table completeness (12 × 4)
  - recipe scoping inside `@supports` and `@media`
  - glass output determinism
  - catalog validation of the built-in glass preset
- **Integration (CLI, npm and pnpm):**
  - `init` and `theme add` with the glass preset
  - adding each experimental component
  - `add input` refused before writes, with files, config, lock and lockfile untouched
  - `init` with an unavailable component refused as a whole
  - scoped glass Button preset and recipe
  - experimental notice in dry-run output
- **Browser (`tests/e2e/liquid-glass.spec.ts`, light and dark):**
  - axe scans of the six components over each backdrop fixture
  - measured contrast of rendered text against the rendered surface, sampled over black and white backdrops through `tests/helpers/contrast.ts`
  - `prefers-reduced-transparency` (emulated where Chromium supports it, otherwise asserted by computed style under a forced media override)
  - an opaque fallback with `backdrop-filter` disabled, forced-colors and reduced motion
  - focus visibility and 24px target sizes
  - a preset-editor glass flow: family switch, failing opacity disables export, unavailable components greyed out
- **Consumers.** A glass Vite consumer and a glass Next.js consumer join the prepared and built consumer matrix. The documented consumer count is updated.

## Documentation

- New `docs/components/liquid-glass.md`: what glass covers, declared backdrops, the contrast bound, fallbacks and the limitations list.
- New `docs/evidence/liquid-glass.md` plus a run JSON tied to the machine, OS, browser channel and versions that actually ran.
- Updates:
  - Docs 01, 03 (matrix and accessibility status), 04 and 07.
  - `web-alpha-readiness.md`: gap 5 resolved as "implemented, experimental", and the PR9 glass row updated.
  - `foundation-local-usage.md`, the README, and the landing page sentence "Liquid glass is not available yet".

Visible limitations to list:

- no mid-range mobile scrolling measurement
- no human visual, keyboard or screen-reader review
- the contrast guarantee covers the declared text pairs, not consumer content placed on glass
- browsers outside the recorded run were not tested
- form controls are unavailable
- the hosted snapshot service must be redeployed before glass codes resolve publicly

## Acceptance

- All existing tests pass and the byte-identity guard shows no drift for flat, minimalist and neo-brutalism.
- Glass compiles, installs and renders for the six experimental components in both modes. The six unavailable components are refused at compile and CLI planning.
- A preset below the bound is rejected with an actionable message, and the editor blocks its export.
- Browser specs pass axe and the measured contrast checks over every declared backdrop in light and dark, plus the fallback and preference cases.
- Docs and the matrix say experimental and list the limitations. The landing page no longer says glass is unavailable.
- Work lands on `feat/liquid-glass-style` with Conventional Commits, rebased on `main`, without editing files owned by the parallel axe, shadcn theme-merge and editor keyboard sessions.
