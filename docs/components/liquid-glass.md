# Liquid glass

Liquid glass is the fourth style family. It is **experimental** for Button, Badge, Card, Dialog, Tabs, and Tooltip in light and dark modes. Input, Textarea, Label, Checkbox, Switch, and Native Select are **unavailable** in glass: the compiler and CLI refuse them rather than giving them a fallback. Flat, minimalist, neo-brutalism, and ombelle remain the stable families for all twelve components.

Experimental means the family compiles, installs, and renders through the same preset, compiler, CLI, preview, and editor pipeline as the stable families, and has automated evidence for one browser build. It does not meet the stable bar in [liquid glass constraints](../03-components-styles-accessibility.md#liquid-glass-constraints): mid-range mobile scrolling, human review, and the broader browser range are still owed. See [liquid glass evidence](../evidence/liquid-glass.md) for what was measured and what was not run.

## Coverage

| Component | Glass status | Glass treatment |
| --- | --- | --- |
| Button | Experimental | Secondary, outline, and ghost variants are translucent; default and destructive stay solid |
| Badge | Experimental | Solid fill with the glass highlight border and inner highlight; no translucency |
| Card | Experimental | Translucent root surface with specular sheen and edge light |
| Dialog | Experimental | Translucent content; the overlay is a plain dim with no blur |
| Tabs | Experimental | Translucent list; the active trigger is an opaque inner surface |
| Tooltip | Experimental | Translucent content |
| Input, Textarea, Label, Checkbox, Switch, Native Select | Unavailable | Refused with `STYLE_UNAVAILABLE` |

One compatibility table in `packages/contracts` (12 components × 4 families, each `stable`, `experimental`, or `unavailable`) is read by the compiler, the CLI, the snapshot service, and both editors.

The glass family stylesheet `ui-style.css` contains Input selectors only as an opaque, non-glass baseline. They have no effect, because Input cannot be installed with a glass preset.

## Preset fields

A glass preset sets `styleFamily: "liquid-glass"` and these design fields, which other families ignore. The preset editor shows a control for each one:

| Field | Range | Built-in value | Effect |
| --- | --- | --- | --- |
| `design.transparency` | `auto` or `reduced` | `auto` | `reduced` makes every glass surface opaque, with no blur, filter, or sheen |
| `design.glassBlurPx` | 0–40 | 8 | Backdrop blur radius |
| `design.glassOpacity` | 0.25–1 | 0.5 | Surface opacity: the share of the surface colour in the mix with the filtered backdrop |
| `design.glassSaturation` | 1–2 | 2 | Backdrop `saturate()`; keeps the colour of what is behind the glass |
| `design.glassBackdropContrast` | 0.3–1 | 0.45 | Backdrop `contrast()`; compresses the backdrop's light range |
| `design.glassBackdropTone` | 0–0.6 | 0.4 | Backdrop `brightness()` of `1 + tone` in light mode and `1 − tone` in dark mode |
| `design.glassSheen` | 0–0.5 | 0.25 | White specular gradient over the top of each surface; a quarter as strong in dark mode |
| `design.glassRim` | 0–1 | 0.6 | Edge light: a bright top-left and softer bottom-right inner rim |

Backdrop contrast, tone, and sheen enter the contrast bound, so changing them changes the smallest passing opacity. Blur, saturation, and rim cannot affect it. See [preset fields](../04-presets-and-contracts.md#liquid-glass-design-fields) for the tokens and the contract.

## Contrast bound

A translucent surface shows its backdrop through it. Text on it cannot be checked against one fixed colour, so the compiler checks the two extremes instead. Before the surface is mixed in, the glass filter compresses the backdrop: `contrast()` and `brightness()` map every channel of every backdrop pixel into a range `[low, high]`, whatever its colour or saturation. The compiler mixes the surface colour with grey `low`, and with grey `high` under the full specular sheen, at the preset's opacity. Any real backdrop, blurred or not, produces a surface whose brightness lies between those two. The compiler requires 4.5:1 against both, and requires the text to be either lighter or darker than both. Together these keep 4.5:1 over any backdrop. Compressing the backdrop is what lets the glass be thin: the built-in palette needs opacity 0.5 instead of about 0.9 over raw black and white.

The compiler also requires each pair to pass on its opaque surface, which every fallback uses, and computes `--glass-nested-opacity` for glass nested in a glass Card, Dialog, or Tooltip. Nested glass drops its own filter, so its coverage is bounded against raw black and white.

The bound assumes that the glass element filters the page itself. A glass surface inside an ancestor with `filter`, `opacity` below 1, `mask`, `clip-path`, `mix-blend-mode`, or its own `backdrop-filter` filters only that ancestor's content, and translucent parts of that ancestor then show the page unfiltered. The family's own nesting is handled as above; other such ancestors are outside the guarantee.

The bound is checked in light and dark mode for these pairs:

| Surface | Text | Used by |
| --- | --- | --- |
| `card` | `cardForeground`, `mutedForeground` | Card |
| `popover` | `popoverForeground`, `mutedForeground` | Dialog content, Tooltip content |
| `muted` | `foreground`, `mutedForeground` | Tabs list and inactive triggers |
| `secondary` | `secondaryForeground` | Secondary Button |
| `background` | `foreground` | Outline and ghost Button |

A failing pair stops compilation with `INVALID_DATA` at `/design/glassOpacity`. The message names the pair, the mode, and the smallest passing opacity, rounded up to 0.01. With `transparency: "reduced"` the surfaces are opaque, and the ordinary palette contrast rules apply to them at 4.5:1.

The built-in glass preset uses opacity 0.5, the smallest value at which both built-in palettes pass. Light mode needs 0.5 and dark mode 0.28; nested glass uses 0.7 in light and 0.79 in dark. To reach these, the built-in palette darkens light `mutedForeground` to `#334155` and lightens dark `mutedForeground` to `#E2E8F0`, with `muted` at `#F1F5F9` and `#273449`.

Solid fills keep their existing contrast pairs: the default and destructive Button, both Badge variants, and the active Tabs trigger.

The bound covers only the pairs above. Text that you place on a glass surface with other tokens is your responsibility. For example, Tabs panel text inside a glass Card uses `foreground` on `card`, which is not a bounded pair.

## Declared backdrops

The preview gallery renders each glass component over three declared backdrops, in light and dark mode:

- **solid**: the page `background` token;
- **gradient**: a three-stop orange, blue, and near-black linear gradient;
- **pattern**: a 12px black and white checkerboard, a high-frequency worst case for blur.

The six unavailable components appear in the gallery as labelled placeholders.

## Glass cues

Inside the feature query, each translucent surface paints a white specular gradient over its top 60 percent at `glassSheen`, which the contrast bound includes. Every glass surface also has a bright top-left inner rim, a softer bottom-right rim, a faint inner ring, and a 2px inner shadow along the bottom edge. These stay within 3px of the border, inside the smallest text inset, so they never sit behind text and do not enter the bound. There is no SVG displacement or refraction: a `url()` backdrop filter is Chromium-only, and a browser that rejects it would drop the whole filter, compressing nothing.

## Fallbacks

1. **Opaque base.** Glass surfaces are opaque outside any feature query, using the relevant surface token.
2. **Feature query.** Translucency and blur apply only inside `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`. A browser without filter support never shows text over an unblurred backdrop.
3. **Reduced transparency.** `@media (prefers-reduced-transparency: reduce)` restores opaque surfaces and removes the filter. The preset field `transparency: "reduced"` does the same at compile time.
4. **Forced colours.** `@media (forced-colors: active)` uses system colours with no filter and no translucency.
5. **Glass identity in every fallback.** A 1px highlight border, an inner top highlight, and the preset radius remain.

Blur is never transitioned or animated. Transitions touch only colour and opacity and are disabled by `prefers-reduced-motion`. Everything nested inside a glass Card, Dialog, or Tooltip, including another Card, drops its own filter and uses `--glass-nested-opacity`.

## CLI behaviour

`init`, `theme add`, `add`, `add button --preset <local.json>`, and `add button --recipe <local.json>` accept glass presets. When a plan installs an experimental entry, the plan and dry-run output include a notice:

```text
Notice: liquid-glass is experimental for card, tabs; see docs/components/liquid-glass.md for limitations
```

JSON output always includes a `notices` array. It is empty for stable families.

Planning an unavailable component, such as `add input` in a glass project, fails with `STYLE_UNAVAILABLE` and exit code 2 before any write. The message names the component and lists the experimental glass components. An `init` whose component list includes an unavailable component fails as a whole. `--yes` does not bypass the refusal.

`init` and `theme add` rewrite the tokens and `ui-style.css` only, so they check the managed components recorded in the project lock before any write. `--yes` bypasses neither refusal:

- **Into glass.** If any installed component is unavailable for liquid glass, such as Input in a flat project, switching to a glass preset fails with `STYLE_UNAVAILABLE` at `/componentIds`. The message names the installed unavailable components and lists the experimental glass components. Keep a stable family, or remove those components first.
- **Out of glass.** Badge, Card, Tabs, and Tooltip install colocated glass CSS, such as `components/ui/card.css`, that depends on the `--glass-*` tokens and the contrast bound. If any of them is installed in a glass project, switching to a stable preset fails with `STYLE_UNAVAILABLE` at `/styleFamily`, naming the components and their CSS files. Remove them, switch the theme, then add them again. Button and Dialog keep their glass rules in `ui-style.css`, which the switch rewrites, so they do not block it.

Re-applying another glass preset to a glass project is not a family switch. It still runs the contrast bound.

## Editors

- **Preset editor** (`/editor/preset`): the family picker offers "Liquid glass (Experimental)". Transparency and the seven glass material controls appear only for glass, and the glass preview renders over a photo of a bluebell wood so the translucency shows. The preview follows the site's light or dark theme for every family; the Preview mode select still overrides it until the theme toggles again. A limitations panel is always visible for glass, together with a live contrast-bound readout. Export and publication are disabled while any pair fails. The readout states the minimum passing opacity, and the lowest passing opacity for each mode when the bound passes. The gallery shows the six unavailable components greyed out as "Unavailable in liquid glass".
- **Button editor** (`/editor/component/button`): accepts glass, and shows the experimental notice beside the export and CLI command.

## Limitations

- no mid-range mobile scrolling measurement
- no human visual, keyboard or screen-reader review
- the contrast guarantee covers the declared text pairs, not consumer content placed on glass
- browsers outside the recorded run were not tested
- form controls are unavailable
- the hosted snapshot service must be redeployed before glass codes resolve publicly

Further known limitations:

- The Tooltip arrow stays opaque while the content is translucent, so a seam is visible between them.
- With `transparency: "reduced"`, glass presets must still reach 4.5:1 on their opaque surfaces. This is stricter than the stable families.
- A Tooltip trigger that wraps a Button through `asChild` takes `data-slot="tooltip-trigger"`, so Button family styles do not reach it. This applies to every family, not only glass.
- The contrast bound assumes the glass element filters the page itself; see [contrast bound](#contrast-bound) for the ancestors it does not cover.
- There is no public catalog page that shows the stable, experimental, and unavailable matrix yet.

Component-scoped presets and recipes remain Button-only. See the [design](../superpowers/specs/2026-11-03-liquid-glass-design.md) for the full decisions.
