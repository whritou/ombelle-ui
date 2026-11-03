# Liquid glass

Liquid glass is the fourth style family. It is **experimental** for Button, Badge, Card, Dialog, Tabs, and Tooltip in light and dark modes. Input, Textarea, Label, Checkbox, Switch, and Native Select are **unavailable** in glass: the compiler and CLI refuse them rather than giving them a fallback. Flat, minimalist, and neo-brutalism remain the stable families for all twelve components.

Experimental means the family compiles, installs, and renders through the same preset, compiler, CLI, preview, and editor pipeline as the stable families, and has automated evidence for one browser build. It does not meet the stable bar in [liquid glass constraints](../03-components-styles-accessibility.md#liquid-glass-constraints): mid-range mobile scrolling, human review, and the broader browser range are still owed. See [liquid glass evidence](../evidence/liquid-glass.md) for what was measured and what was not run.

## Coverage

| Component | Glass status | Glass treatment |
| --- | --- | --- |
| Button | Experimental | Secondary, outline, and ghost variants are translucent; default and destructive stay solid |
| Badge | Experimental | Solid fill with the glass highlight border and inner highlight; no translucency |
| Card | Experimental | Translucent root surface |
| Dialog | Experimental | Translucent content; the overlay is a plain dim with no blur |
| Tabs | Experimental | Translucent list; the active trigger is an opaque inner surface |
| Tooltip | Experimental | Translucent content |
| Input, Textarea, Label, Checkbox, Switch, Native Select | Unavailable | Refused with `STYLE_UNAVAILABLE` |

One compatibility table in `packages/contracts` (12 components × 4 families, each `stable`, `experimental`, or `unavailable`) is read by the compiler, the CLI, the snapshot service, and both editors.

The glass family stylesheet `ui-style.css` contains Input selectors only as an opaque, non-glass baseline. They have no effect, because Input cannot be installed with a glass preset.

## Preset fields

A glass preset sets `styleFamily: "liquid-glass"` and three design fields, which other families ignore:

| Field | Range | Built-in value | Effect |
| --- | --- | --- | --- |
| `design.transparency` | `auto` or `reduced` | `auto` | `reduced` makes every glass surface opaque, with no blur |
| `design.glassBlurPx` | 0–24 | 12 | Backdrop blur radius |
| `design.glassOpacity` | 0.6–1 | 0.87 | Surface opacity: the share of the surface colour in the mix with the backdrop |

For glass presets only, the compiler adds `--glass-blur` and `--glass-opacity` to `:root` in `ui-tokens.css`. With `transparency: "reduced"` they are `0px` and `1`. See [preset fields](../04-presets-and-contracts.md#liquid-glass-design-fields) for the contract.

## Contrast bound

A translucent surface shows its backdrop through it. Text on it cannot be checked against one fixed colour, so the compiler checks the two extremes instead. It mixes the surface colour with pure black and with pure white at the preset's opacity. Any real backdrop, blurred or not, produces a surface whose brightness lies between those two mixes. The compiler requires 4.5:1 against both mixes, and requires the text to be either lighter or darker than both. Together these keep 4.5:1 over any backdrop.

The bound is checked in light and dark mode for these pairs:

| Surface | Text | Used by |
| --- | --- | --- |
| `card` | `cardForeground`, `mutedForeground` | Card |
| `popover` | `popoverForeground`, `mutedForeground` | Dialog content, Tooltip content |
| `muted` | `foreground`, `mutedForeground` | Tabs list and inactive triggers |
| `secondary` | `secondaryForeground` | Secondary Button |
| `background` | `foreground` | Outline and ghost Button |

A failing pair stops compilation with `INVALID_DATA` at `/design/glassOpacity`. The message names the pair, the mode, and the smallest passing opacity, rounded up to 0.01. With `transparency: "reduced"` the surfaces are opaque, and the ordinary palette contrast rules apply to them at 4.5:1.

The built-in glass preset uses opacity 0.87, the smallest value at which both built-in palettes pass. Its limiting pair is light `muted` with `mutedForeground`: 4.59:1 at 0.87, and 4.48:1 at 0.86.

Solid fills keep their existing contrast pairs: the default and destructive Button, both Badge variants, and the active Tabs trigger.

The bound covers only the pairs above. Text that you place on a glass surface with other tokens is your responsibility. For example, Tabs panel text inside a glass Card uses `foreground` on `card`, which is not a bounded pair.

## Declared backdrops

The preview gallery renders each glass component over three declared backdrops, in light and dark mode:

- **solid**: the page `background` token;
- **gradient**: a three-stop orange, blue, and near-black linear gradient;
- **pattern**: a 12px black and white checkerboard, a high-frequency worst case for blur.

The six unavailable components appear in the gallery as labelled placeholders.

## Fallbacks

1. **Opaque base.** Glass surfaces are opaque outside any feature query, using the relevant surface token.
2. **Feature query.** Translucency and blur apply only inside `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`. A browser without filter support never shows text over an unblurred backdrop.
3. **Reduced transparency.** `@media (prefers-reduced-transparency: reduce)` restores opaque surfaces and removes the filter. The preset field `transparency: "reduced"` does the same at compile time.
4. **Forced colours.** `@media (forced-colors: active)` uses system colours with no filter and no translucency.
5. **Glass identity in every fallback.** A 1px highlight border, an inner top highlight, and the preset radius remain.

Blur is never transitioned or animated. Transitions touch only colour and opacity and are disabled by `prefers-reduced-motion`. Buttons and Tabs lists nested inside a glass Card or Dialog drop their own filter.

## CLI behaviour

`init`, `theme add`, `add`, `add button --preset <local.json>`, and `add button --recipe <local.json>` accept glass presets. When a plan installs an experimental entry, the plan and dry-run output include a notice:

```text
Notice: liquid-glass is experimental for card, tabs; see docs/components/liquid-glass.md for limitations
```

JSON output always includes a `notices` array. It is empty for stable families.

Planning an unavailable component, such as `add input` in a glass project, fails with `STYLE_UNAVAILABLE` and exit code 2 before any write. The message names the component and lists the experimental glass components. An `init` whose component list includes an unavailable component fails as a whole. `--yes` does not bypass the refusal.

## Editors

- **Preset editor** (`/editor/preset`): the family picker offers "Liquid glass (Experimental)". Transparency, blur, and opacity controls appear only for glass. A limitations panel is always visible for glass, together with a live contrast-bound readout. Export and publication are disabled while any pair fails, and the readout states the minimum passing opacity. The gallery shows the six unavailable components greyed out as "Unavailable in liquid glass".
- **Button editor** (`/editor/component/button`): accepts glass, and shows the experimental notice beside the export and CLI command.

## Limitations

- no mid-range mobile scrolling measurement
- no human visual, keyboard or screen-reader review
- the contrast guarantee covers the declared text pairs, not consumer content placed on glass
- browsers outside the recorded run were not tested
- form controls are unavailable
- the hosted snapshot service must be redeployed before glass codes resolve publicly

Further known limitations:

- Nested glass Cards each apply their own blur. The design intended only the outermost surface to filter.
- The Tooltip arrow stays opaque while the content is translucent, so a seam is visible between them.
- With `transparency: "reduced"`, glass presets must still reach 4.5:1 on their opaque surfaces. This is stricter than the stable families.
- A Tooltip trigger that wraps a Button through `asChild` takes `data-slot="tooltip-trigger"`, so Button family styles do not reach it. This applies to every family, not only glass.
- The inactive Tabs trigger has a thin contrast margin: 4.60:1 to 4.73:1 measured in the recorded run.
- There is no public catalog page that shows the stable, experimental, and unavailable matrix yet.

Component-scoped presets and recipes remain Button-only. See the [design](../superpowers/specs/2026-11-03-liquid-glass-design.md) for the full decisions.
