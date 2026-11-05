# Liquid glass

Liquid glass is the experimental style family, beside the four stable ones. It is **experimental** for Alert, Button, Badge, Card, Checkbox, Dialog, Dropdown Menu, Input, Label, Popover, Native Select, Radio Group, Select, Switch, Tabs, Textarea, and Tooltip in light and dark modes. Avatar, Separator, Table, Accordion, Progress, and Skeleton are **unavailable** in glass: the compiler and CLI refuse them rather than giving them a fallback. Flat, minimalist, neo-brutalism, and ombelle remain the stable families for all twenty-three components.

Experimental means the family compiles, installs, and renders through the same preset, compiler, CLI, preview, and editor pipeline as the stable families, and has automated evidence for one browser build. It does not meet the stable bar in [liquid glass constraints](../03-components-styles-accessibility.md#liquid-glass-constraints): mid-range mobile scrolling, human review, and the broader browser range are still owed. See [liquid glass evidence](../evidence/liquid-glass.md) for what was measured and what was not run.

## Coverage

| Component | Glass status | Glass treatment |
| --- | --- | --- |
| Button | Experimental | One ink, all glass: every label is `foreground` at weight 600 on card glass. Default is tinted `primary` and destructive is tinted `destructive`, secondary is neutral, outline is background glass with the `input` border, ghost has no surface until hover, and link is text with a `primary` underline. Restyled to one ink in 0.5.0; see [Button](#button) |
| Badge | Experimental | Solid fill with the glass highlight border and inner highlight; no translucency |
| Card | Experimental | Translucent root surface with specular sheen and edge light |
| Dialog | Experimental | Translucent content; the overlay is a plain dim with no blur |
| Tabs | Experimental | Translucent list; the active trigger is an opaque inner surface |
| Tooltip | Experimental | Translucent content |
| Alert | Experimental | Solid card surface with the glass highlight; no blur, so long messages stay crisp |
| Dropdown Menu | Experimental | Translucent menu and submenu panels; drops the blur under reduced transparency |
| Popover | Experimental | Translucent panel; nested glass inside it drops its own blur |
| Input | Experimental | A field of `background` glass at 55% of the glass opacity, under a 60% sheen, with the input-colour border. The value is `foreground` and the placeholder `mutedForeground`; both are declared pairs at 55% coverage. Nested in glass, such as in a Dialog, it drops its own blur and uses the full nested opacity. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Checkbox | Experimental | A field-glass box (`background` at 55%) with the input-colour border. Checked and indeterminate are `card` + `primary` at the resting tint + 8 points (26% light, 30% dark) at 80% coverage, with a `primary` rim at 60% and a glow; the mark stays `foreground`, a declared pair at 80%. Disabled is dashed at 50% opacity. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Switch | Experimental | A `card` + `foreground` 10% track at 55% coverage; on is `card` + `primary` 26% / 30% at 85% with a `primary` rim at 60% and a glow. The thumb is solid white with a shadow, so its position reads over any backdrop and in forced colours. Disabled is dashed. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Radio Group | Experimental | Field-glass radios; checked is `card` + `primary` 26% / 30% at 80% with a `primary` rim and a `foreground` dot. Option rows are the field surface (`background` at 55%), so the field pairs bound their label and description; a checked row is `card` + `primary` 18% / 22% at 78% with a `primary` rim at 55%; disabled rows are dashed. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Select | Experimental | The trigger is the field surface; the list is the Dropdown Menu glass surface. A highlighted option is `popover` glass + `primary` 18% / 22%; the selected option is weight 600 with the check; a disabled option is `mutedForeground`. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Avatar, Separator, Table, Accordion, Progress, Skeleton | Unavailable | Refused with `STYLE_UNAVAILABLE` |

One compatibility table in `packages/contracts` (23 components × 5 families, each `stable`, `experimental`, or `unavailable`) is read by the compiler, the CLI, the snapshot service, and both editors.

The glass family stylesheet `ui-style.css` styles Input as glass inside `@supports (backdrop-filter)`, over an opaque `background` baseline that browsers without backdrop filters, reduced transparency and forced colours (`Field` and `FieldText`) fall back to. The field paints `color-mix(in srgb, var(--background) calc(var(--glass-inner-opacity, calc(var(--glass-opacity) * 0.55)) * 100%), transparent)`: 55% of the glass opacity at top level, and the full `--glass-nested-opacity` when nested in glass. Focus colours the border with `ring` and adds the 3px ring, offset by 2px; disabled fields are dashed at 50% opacity; `aria-invalid` gives a 2px destructive border (double in forced colours). Screenshots of the gallery form and of a field nested in a Popover, light and dark: [images/glass-input](../evidence/images/glass-input/). Place forms on a glass or card surface: labels and messages beside a field are plain text. Error messages in `destructive` are bounded on `card` glass; on the bare backdrop no text is covered by the bound.

## Preset fields

A glass preset sets `styleFamily: "liquid-glass"` and these design fields, which other families ignore. The preset editor shows a control for each one:

| Field | Range | Built-in value | Effect |
| --- | --- | --- | --- |
| `design.transparency` | `auto` or `reduced` | `auto` | `reduced` makes every glass surface opaque, with no blur, filter, or sheen |
| `design.glassBlurPx` | 0–40 | 3 | Backdrop blur radius; low values keep the refraction visible |
| `design.glassOpacity` | 0.25–1 | 0.57 | Surface opacity: the share of the surface colour in the mix with the filtered backdrop |
| `design.glassSaturation` | 1–2 | 2 | Backdrop `saturate()`; keeps the colour of what is behind the glass |
| `design.glassBackdropContrast` | 0.3–1 | 0.45 | Backdrop `contrast()`; compresses the backdrop's light range |
| `design.glassBackdropTone` | 0–0.6 | 0.4 | Backdrop `brightness()` of `1 + tone` in light mode and `1 − tone` in dark mode |
| `design.glassSheen` | 0–0.5 | 0.25 | White specular gradient over the top of each surface; a quarter as strong in dark mode |
| `design.glassRim` | 0–1 | 0.6 | Edge light: a bright top-left and softer bottom-right inner rim |

Backdrop contrast, tone, and sheen enter the contrast bound, so changing them changes the smallest passing opacity. Blur, saturation, and rim cannot affect it. See [preset fields](../04-presets-and-contracts.md#liquid-glass-design-fields) for the tokens and the contract.

## Repurposed controls

Three shared design controls that glass used to ignore now drive the glass edges and drop shadows. Their values are kept when a draft switches family, as for every other field.

| Control (preset and Button editor) | Glass label | Glass effect | Built-in value |
| --- | --- | --- | --- |
| Shadow X / Shadow Y (`shadowOffsetXPx`, `shadowOffsetYPx`) | Glass shadow X, Glass shadow Y | Offset of the glass drop shadow on Card, Dialog, Popover, Dropdown Menu and Tooltip, and of the Button glow. Blur and spread scale from the offset's magnitude, the larger of \|X\| and \|Y\|, so 0 / 12 reproduces the kit's shadows and negative or sideways offsets stay soft | 0 / 12 |
| Border width (`borderWidthPx`) | Glass edge width | Thickness of every glass edge hairline | 1 |
| Border colour (`border` token, light and dark) | Glass edge colour | Colour of every glass edge, used as is. Preset colours may carry alpha (`oklch(L C H / A)`), so the token sets the edge's strength. Input and the outline Button keep the `input` colour | light `oklch(20.8% 0.040 265.8 / 14%)`, dark `oklch(96.8% 0.007 247.9 / 14%)` |

For glass drafts, both editors show the glass labels with a one-line hint each; for other families the labels stay "Shadow X offset", "Shadow Y offset", "Border width" and "Border". Edges carry no text, so an opaque `border` colour makes a solid edge and does not change the contrast bound. Negative offsets move the shadow left and up. `box-shadow` offsets are physical, so they do not flip in right-to-left layouts. A Button recipe's shadow and border overrides apply to the scoped glass Button's glow and edge.

Upgrading from 0.4.x: `init` saved the whole preset to `ui-preset.json`, including the 0.4.x glass values `border` `#CBD5E1` (light) / `#475569` (dark) and `shadowOffsetYPx: 0`. Running `theme add` with that file under 0.5.0 gives solid slate edges and no drop shadow or glow. To keep the kit look, set `border` to `oklch(20.8% 0.040 265.8 / 14%)` (light) and `oklch(96.8% 0.007 247.9 / 14%)` (dark) and `shadowOffsetYPx` to `12`, or start again from the built-in liquid glass preset.

## Button

Liquid glass Buttons were restyled to one ink in 0.5.0. Earlier installers ship the previous look, with solid default and destructive fills; rerun `add button` or `theme add` with 0.5.0 to get the new rules.

- Every label is `var(--foreground)` at weight 600, and the edge is `var(--border-width) solid var(--border)`.
- Default is card glass tinted with `primary`, with a `primary` rim at 55% and a `primary` glow. Destructive is tinted with `destructive`, with a rim at 60%. The tint amounts are per-mode tokens: `--glass-primary-tint` (18% light, 22% dark) and `--glass-destructive-tint` (16% light, 20% dark). Hover adds 8 points.
- Secondary is neutral card glass. Outline is `background` glass at 60% of the glass opacity with the `input` border; nested in glass it paints at the full nested opacity. Ghost has no surface until hover. Link is `foreground` text with a 2px `primary` underline.
- Sizes follow the kit: default is 40px high with 18px inline padding, `sm` 32px with 12px padding and 13px type, `lg` 48px with 22px padding and 15px type, and link has 6px padding.
- Hover brightens the top highlight and lengthens the glow; secondary and outline gain a 6% `foreground` tint. Pressed moves 1px down with an inner shade. Focus is a 3px ring offset by 3px; disabled is 50% opacity.
- Reduced transparency and missing backdrop filters paint the tinted card opaque, with no blur. Forced colours use `ButtonFace` with `ButtonText` text and border; the default variant gets a 3px border.
- Recipe colour overrides still apply on top: a `foreground` override paints the label of every variant, and a secondary `background` override replaces its card surface. A mode without its own override keeps that mode's `foreground` label and, for secondary, its `card` surface.

Screenshots of every variant and state, the other glass components on the kit backdrop and the Button editor with a glass recipe, light and dark: [glass foundation evidence](../evidence/glass-foundation.md).

## Contrast bound

A translucent surface shows its backdrop through it. Text on it cannot be checked against one fixed colour, so the compiler checks the two extremes instead. Before the surface is mixed in, the glass filter compresses the backdrop: `contrast()` and `brightness()` map every channel of every backdrop pixel into a range `[low, high]`, whatever its colour or saturation. The compiler mixes the surface colour with grey `low`, and with grey `high` under the full specular sheen, at the preset's opacity. Any real backdrop, blurred or not, produces a surface whose brightness lies between those two. The compiler requires 4.5:1 against both, and requires the text to be either lighter or darker than both. Together these keep 4.5:1 over any backdrop. Compressing the backdrop is what lets the glass be thin: the built-in palette needs opacity 0.57; over raw black and white the 55% field placeholder would never pass.

The compiler also requires each pair to pass on its opaque surface, which every fallback uses, and computes `--glass-nested-opacity` for glass nested in a glass Card, Dialog, or Tooltip. Nested glass drops its own filter, so its coverage is bounded against raw black and white.

The bound assumes that the glass element filters the page itself. A glass surface inside an ancestor with `filter`, `opacity` below 1, `mask`, `clip-path`, `mix-blend-mode`, or its own `backdrop-filter` filters only that ancestor's content, and translucent parts of that ancestor then show the page unfiltered. The family's own nesting is handled as above; other such ancestors are outside the guarantee.

The bound is checked in light and dark mode for these pairs:

| Surface | Text | Used by |
| --- | --- | --- |
| `card` | `cardForeground`, `mutedForeground` | Card |
| `popover` | `popoverForeground`, `mutedForeground` | Dialog content, Tooltip content |
| `muted` | `foreground`, `mutedForeground` | Tabs list and inactive triggers |
| `secondary` | `secondaryForeground` | Kept for custom presets; the one-ink secondary Button is card glass |
| `background` | `foreground` | Kept for custom presets |
| `card` + `primary` 18% light / 22% dark | `foreground` | Default Button at rest |
| `card` + `primary` 26% light / 30% dark | `foreground` | Default Button on hover |
| `card` + `destructive` 16% light / 20% dark | `foreground` | Destructive Button at rest |
| `card` + `destructive` 24% light / 28% dark | `foreground` | Destructive Button on hover |
| `card` | `foreground` | Secondary Button at rest, ghost Button on hover |
| `card` + `foreground` 6% | `foreground` | Secondary Button on hover |
| `background` at 60% coverage | `foreground` | Outline Button at rest |
| `background` + `foreground` 6% at 60% coverage | `foreground` | Outline Button on hover |
| `background` at 55% coverage | `foreground` | Input value, unchecked Radio Group option label |
| `background` at 55% coverage | `mutedForeground` | Input placeholder, unchecked Radio Group option description |
| `card` | `destructive` | Error messages beside a field, on the card that holds the form |
| `card` + `primary` 26% light / 30% dark at 80% coverage | `foreground` | Checkbox mark and radio dot when checked |
| `card` + `primary` 18% light / 22% dark at 78% coverage | `foreground`, `mutedForeground` | Checked Radio Group option label and description |
| `popover` + `primary` 18% light / 22% dark | `foreground` | Highlighted Select option |

A tinted surface is a token surface mixed with a tint token at a fixed percentage per mode, the same mix the CSS paints. It is checked like any other pair: over the darkest and brightest filtered backdrop, with and without sheen, and on its opaque fallback. The editor readout names the tint, for example "foreground on card + primary 26%".

A pair with a coverage is painted at that fraction of the glass opacity, the same `calc(var(--glass-opacity) * coverage)` the CSS uses at top level. It is checked over the filtered backdrop at that coverage. Its opaque fallback and reduced transparency paint the whole token, so they ignore it. Nested in glass, the CSS uses the full `--glass-nested-opacity`, so the nested bound ignores coverage too. The editor readout names the coverage, for example "mutedForeground on background at 55% coverage".

A failing pair stops compilation with `INVALID_DATA` at `/design/glassOpacity`. The message names the pair, the mode, and the smallest passing opacity, rounded up to 0.01. With `transparency: "reduced"` the surfaces are opaque, and the ordinary palette contrast rules apply to them at 4.5:1.

The built-in glass preset uses opacity 0.57, the smallest value at which both built-in palettes pass. Light mode needs 0.57 and dark mode 0.57; nested glass uses 0.69 in light and 0.92 in dark. The checked Radio Group row raised the dark minimum from 0.4: its `mutedForeground` description on the 22% tint is the closest dark pair, and the row's 78% coverage is the lowest at which it passes at 0.57 with the palette unchanged. In 0.5.0 the field and error-message pairs raised these from 0.5 and 0.32 (nested 0.7 and 0.9): the Input placeholder at 55% coverage would need opacity 0.93 with the previous palette, and `destructive` on `card` 0.75. So the built-in palette moves to opacity 0.57, darkens light `mutedForeground` from `#334155` to `#1E293B`, and changes `destructive` from `#B91C1C` to `#7F1D1D` in light and from `#FCA5A5` to `#FECACA` in dark. Dark `mutedForeground` stays `#E2E8F0`, with `muted` at `#F1F5F9` and `#273449`.

Solid fills keep their existing contrast pairs: both Badge variants and the active Tabs trigger.

The bound covers only the pairs above. Text that you place on a glass surface with other tokens is your responsibility. For example, Tabs panel text inside a glass Card uses `foreground` on `card`, which is bounded only because the secondary Button declares that pair. The Button surfaces outside the bound are ghost and link at rest, which sit straight on the backdrop. The outline Button is bounded at its 60% coverage.

## Declared backdrops

The preview gallery renders each glass component over three declared backdrops, in light and dark mode:

- **solid**: the page `background` token;
- **gradient**: a three-stop orange, blue, and near-black linear gradient;
- **pattern**: a 12px black and white checkerboard, a high-frequency worst case for blur.

The unavailable components appear in the gallery as labelled placeholders.

## Glass cues

Inside the feature query, each translucent surface paints a white specular gradient over its top 60 percent at `glassSheen`, which the contrast bound includes. Every glass surface also has a bright top-left inner rim, a softer bottom-right rim, a faint inner ring, and a 2px inner shadow along the bottom edge. These stay within 3px of the border, inside the smallest text inset, so they never sit behind text and do not enter the bound.

## Refraction

`add` installs `components/ui/liquid-glass-filter.tsx` with glass components. Mount `<LiquidGlassFilter />` once, for example in the root layout. It renders a hidden SVG filter (`#ombelle-liquid-glass`) that bends the backdrop inward near each rim and splits the red, green and blue channels slightly for a prism edge. It then sets `--glass-refraction: url(#ombelle-liquid-glass)` on `<html>`, and every glass `backdrop-filter` starts with `var(--glass-refraction,)`.

- **Chromium only.** The component sets the property only when `navigator.userAgentData` reports Chromium (Chrome, Edge). A browser that rejected a `url()` backdrop filter would drop the whole filter, including the contrast compression the bound depends on. Safari, Firefox and pages that do not mount the filter keep the blurred glass unchanged.
- **The contrast bound still holds.** Displacement only moves backdrop pixels and samples inward, never outside the element. The channel split recombines values within the same range. The compression in the same `backdrop-filter` runs after them.
- **Fallbacks are unchanged.** Reduced transparency, forced colours and nested glass remove the filter as before.
- **Blur.** The built-in preset uses a 3px blur so the refraction stays visible. Higher `glassBlurPx` values soften it.

## Fallbacks

1. **Opaque base.** Glass surfaces are opaque outside any feature query, using the relevant surface token.
2. **Feature query.** Translucency and blur apply only inside `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`. A browser without filter support never shows text over an unblurred backdrop.
3. **Reduced transparency.** `@media (prefers-reduced-transparency: reduce)` restores opaque surfaces and removes the filter. The preset field `transparency: "reduced"` does the same at compile time.
4. **Forced colours.** `@media (forced-colors: active)` uses system colours with no filter and no translucency.
5. **Glass identity in every fallback.** The edge (`--border-width` in the `border` colour), an inner top highlight, and the preset radius remain.

Blur is never transitioned or animated. Transitions touch only colour and opacity and are disabled by `prefers-reduced-motion`. Everything nested inside a glass Card, Dialog, or Tooltip, including another Card, drops its own filter and uses `--glass-nested-opacity`.

## CLI behaviour

`init`, `theme add`, `add`, `add button --preset <local.json>`, and `add button --recipe <local.json>` accept glass presets. When a plan installs an experimental entry, the plan and dry-run output include a notice:

```text
Notice: liquid-glass is experimental for card, tabs; see docs/components/liquid-glass.md for limitations
Notice: mount <LiquidGlassFilter /> from components/ui/liquid-glass-filter once in your root layout for refraction in Chromium browsers
```

The second notice appears only for `add`, the command that writes the filter component.

JSON output always includes a `notices` array. It is empty for stable families.

Planning an unavailable component, such as `add label` in a glass project, fails with `STYLE_UNAVAILABLE` and exit code 2 before any write. The message names the component and lists the experimental glass components. An `init` whose component list includes an unavailable component fails as a whole. `--yes` does not bypass the refusal.

`init` and `theme add` rewrite the tokens and `ui-style.css` only, so they check the managed components recorded in the project lock before any write. `--yes` bypasses neither refusal:

- **Into glass.** If any installed component is unavailable for liquid glass, such as Label in a flat project, switching to a glass preset fails with `STYLE_UNAVAILABLE` at `/componentIds`. The message names the installed unavailable components and lists the experimental glass components. Keep a stable family, or remove those components first.
- **Out of glass.** Badge, Card, Tabs, and Tooltip install colocated glass CSS, such as `components/ui/card.css`, that depends on the `--glass-*` tokens and the contrast bound. If any of them is installed in a glass project, switching to a stable preset fails with `STYLE_UNAVAILABLE` at `/styleFamily`, naming the components and their CSS files. Remove them, switch the theme, then add them again. Button and Dialog keep their glass rules in `ui-style.css`, which the switch rewrites, so they do not block it.

Re-applying another glass preset to a glass project is not a family switch. It still runs the contrast bound.

## Editors

- **Preset editor** (`/editor/preset`): the family picker offers "Liquid glass (Experimental)". Transparency and the seven glass material controls appear only for glass, and the glass preview renders over the kit backdrop (violet, amber, green and blue light spots over a green-to-violet gradient with soft vertical bands), so the translucency shows. Shadow, border width and border colour carry their glass labels. The preview follows the site's light or dark theme for every family; the Preview mode select still overrides it until the theme toggles again. A limitations panel is always visible for glass, together with a live contrast-bound readout. Export and publication are disabled while any pair fails. The readout states the minimum passing opacity, and the lowest passing opacity for each mode when the bound passes. The gallery shows the unavailable components greyed out as "Unavailable in liquid glass".
- **Button editor** (`/editor/component/button`): accepts glass, previews it over the same kit backdrop, relabels the shadow and border overrides as in [repurposed controls](#repurposed-controls), and shows the experimental notice beside the export and CLI command.
- **Component playgrounds** on the website use the preset preview, so their glass examples sit on the kit backdrop too. The backdrop is declared once, in `apps/preview/src/glass-backdrop.css`; it replaced the earlier backdrop photo, which was removed.

## Limitations

- no mid-range mobile scrolling measurement
- no human visual, keyboard or screen-reader review
- the contrast guarantee covers the declared text pairs, not consumer content placed on glass
- browsers outside the recorded run were not tested
- form controls other than Input are unavailable
- the hosted snapshot service must be redeployed before glass codes resolve publicly

Further known limitations:

- The Tooltip arrow stays opaque while the content is translucent, so a seam is visible between them.
- With `transparency: "reduced"`, glass presets must still reach 4.5:1 on their opaque surfaces. This is stricter than the stable families.
- The contrast bound assumes the glass element filters the page itself; see [contrast bound](#contrast-bound) for the ancestors it does not cover.
- There is no public catalog page that shows the stable, experimental, and unavailable matrix yet.

Component-scoped presets and recipes remain Button-only. See the [design](../superpowers/specs/2026-11-03-liquid-glass-design.md) for the full decisions.
