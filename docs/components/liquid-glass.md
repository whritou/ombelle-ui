# Liquid glass

Liquid glass is the experimental style family, beside the four stable ones. It is **experimental** for all twenty-three components in light and dark modes: Accordion, Alert, Avatar, Button, Badge, Card, Checkbox, Dialog, Dropdown Menu, Input, Label, Native Select, Popover, Progress, Radio Group, Select, Separator, Skeleton, Switch, Table, Tabs, Textarea, and Tooltip. No component is unavailable in glass; the compatibility table keeps the `unavailable` status for future components and families. Flat, minimalist, neo-brutalism, and ombelle remain the stable families for all twenty-three components.

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
| Label | Experimental | Plain text: `foreground` at 14px, weight 500; the required marker is `mutedForeground` at weight 400. It has no surface, so place it on a glass or card surface beside the field. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Textarea | Experimental | The Input field surface (`background` at 55% under a 60% sheen, input-colour border) with the same value, placeholder, focus, invalid and disabled treatments. It keeps `resize: vertical`, a native affordance the kit tile does not draw. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Native Select | Experimental | The Input field surface with a `mutedForeground` chevron. The browser draws the open option list, outside the glass. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Checkbox | Experimental | A field-glass box (`background` at 55%) with the input-colour border. Checked and indeterminate are `card` + `primary` at the resting tint + 8 points (26% light, 30% dark) at 80% coverage, with a `primary` rim at 60% and a glow; the mark stays `foreground`, a declared pair at 80%. Disabled is dashed at 50% opacity. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Switch | Experimental | A `card` + `foreground` 10% track at 55% coverage; on is `card` + `primary` 26% / 30% at 85% with a `primary` rim at 60% and a glow. The thumb is solid white with a shadow, so its position reads over any backdrop and in forced colours. Disabled is dashed. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Radio Group | Experimental | Field-glass radios; checked is `card` + `primary` 26% / 30% at 80% with a `primary` rim and a `foreground` dot. Option rows are the field surface (`background` at 55%), so the field pairs bound their label and description; a checked row is `card` + `primary` 18% / 22% at 78% with a `primary` rim at 55%; disabled rows are dashed. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Select | Experimental | The trigger is the field surface; the list is the Dropdown Menu glass surface. A highlighted option is its own glass surface, `popover` + `primary` 18% / 22% at the nested glass coverage, with its `foreground` text and hint declared pairs; the selected option is weight 600 with the check; a disabled option is `mutedForeground`. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Avatar | Experimental | `foreground` initials at weight 600 on card glass discs with a white rim at 55%, an inner highlight and a soft drop shadow. The primary variant is `card` + `primary` 18% / 22%, the resting Button pair, with a `primary` rim at 55%; default and secondary are neutral card glass. The presence dot is `#16A34A` with a white ring, and offline is `mutedForeground`; in forced colours online is filled and offline hollow. A group overlaps its avatars by 10px and layers a white 55% rim over each avatar's own highlight and shadow. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Separator | Experimental | An etched hairline: a `var(--border-width)` line in the `border` colour with the glass highlight 1px beside it. The highlight is a logical border, so vertical separators flip in right-to-left layouts; each line's box is 1px larger than the kit's `box-shadow` highlight. The label is `mutedForeground` at 12px / 600 with no surface of its own, as in the kit, so its contrast comes from what it sits on (see [contrast bound](#contrast-bound)). Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Table | Experimental | One card-glass container with the glass edge, a radius 4px larger than the preset radius and a drop shadow; it scrolls horizontally when the table is wider. The header is `muted` glass with `mutedForeground` labels at 12px / 600, painted at the full nested opacity, so it is denser than the kit's 55% overlay but exactly the declared `muted` pair. Rows are separated by hairlines. A selected row is `card` + `primary` 12% at the nested coverage with `foreground` text, a declared pair; in forced colours it is `Highlight` and weight 600. Numeric cells align to the end with tabular figures. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Accordion | Experimental | A card-glass container with hairlines between items. Triggers are `foreground` at 15px / 600 and at least 44px high; the open trigger is `card` + `primary` 12% at the nested coverage, the selected-row pair, and its chevron turns. Content is `mutedForeground`, and its height animates only while opening. In forced colours the open trigger keeps a 4px `CanvasText` bar at its start edge as well as the chevron, and gives up that width from its padding so the title does not move. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Progress | Experimental | A 10px pill track of `card` + `foreground` 10% at the glass opacity, as the kit's track, with the glass edge and an inner shadow. The fill is solid `primary` with a gloss and a glow; complete is `#16A34A`; indeterminate is a faded full fill with a sweep that stops under reduced motion. No text sits on it, so it declares no pair. Forced colours fill with `Highlight`. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |
| Skeleton | Experimental | Frosted shapes: a 10% `foreground` film with a white top sheen and a white rim at 30%, in text, circle and block shapes. It carries no text. Its pulse stops under reduced motion. Installing it needs `@ombelle-ui/cli` 0.5.0 or later. |

One compatibility table in `packages/contracts` (23 components × 5 families, each `stable`, `experimental`, or `unavailable`) is read by the compiler, the CLI, the snapshot service, and both editors.

The glass family stylesheet `ui-style.css` styles Input as glass inside `@supports (backdrop-filter)`, over an opaque `background` baseline that browsers without backdrop filters, reduced transparency and forced colours (`Field` and `FieldText`) fall back to. The field paints `color-mix(in srgb, var(--background) calc(var(--glass-inner-opacity, calc(var(--glass-opacity) * 0.55)) * 100%), transparent)`: 55% of the glass opacity at top level, and the full `--glass-nested-opacity` when nested in glass. Focus colours the border with `ring` and adds the 3px ring, offset by 2px; disabled fields are dashed at 50% opacity; `aria-invalid` gives a 2px destructive border (double in forced colours). Textarea, Native Select and the Select trigger share this surface. Screenshots of every form control, light and dark: [glass form controls evidence](../evidence/glass-form-controls.md); of Avatar, Separator, Table, Accordion, Progress and Skeleton: [glass display evidence](../evidence/glass-display.md); the earlier Input captures are in [images/glass-input](../evidence/images/glass-input/). Place forms on a glass or card surface: labels and messages beside a field are plain text. Error messages in `destructive` are bounded on `card` glass; on the bare backdrop no text is covered by the bound.

## Preset fields

A glass preset sets `styleFamily: "liquid-glass"` and these design fields, which other families ignore. The preset editor shows a control for each one:

| Field | Range | Built-in value | Effect |
| --- | --- | --- | --- |
| `design.transparency` | `auto` or `reduced` | `auto` | `reduced` makes every glass surface opaque, with no blur, filter, or sheen: the tokens set `--glass-opacity`, `--glass-inner-opacity` and `--glass-nested-opacity` to 1 and `--glass-inner-filter` to `none`, so covered and nested surfaces paint their whole token too |
| `design.glassBlurPx` | 0–40 | 3 | Backdrop blur radius; low values keep the refraction visible |
| `design.glassOpacity` | 0.25–1 | 0.57 | Surface opacity: the share of the surface colour in the mix with the filtered backdrop |
| `design.glassSaturation` | 1–2 | 2 | Backdrop `saturate()`; keeps the colour of what is behind the glass |
| `design.glassBackdropContrast` | 0.3–1.6 | 0.45 | Backdrop `contrast()`: below 1 compresses the backdrop's light range, above 1 deepens it. Above 1 it also adds a drop shadow of alpha `(contrast − 1) × 0.545` (`--glass-drop`) |
| `design.glassBackdropTone` | 0–0.6 | 0.4 | Backdrop `brightness()` of `1 + tone` in light mode and `1 − tone` in dark mode |
| `design.glassSheen` | 0–1 | 0.25 | White specular gradient over the top of each surface; a quarter as strong in dark mode |
| `design.glassRim` | 0–1 | 0.6 | Edge light: a bright top-left and softer bottom-right inner rim |
| `design.glassRefraction` | 0–1 | absent | Displacement strength along the rim (`--glass-refraction-strength`, the value ÷ 6.9). Chromium only |
| `design.glassRefractionWidth` | 0–0.3 | absent | Share of the surface the rim refraction reaches (`--glass-refraction-width`). When set, `LiquidGlassFilter` uses a rim-only map instead of the edge ramp and prism |
| `design.glassHalo` | 0–1 | absent | Strength of the rim light near the pointer (`--glass-halo`). Needs `LiquidGlassFilter` |
| `design.glassDepth` | 0–1 | absent | Relief: a bevel, an inner bounce light and a layered drop shadow (`--glass-depth`) |
| `design.glassMotion` | 0–1 | absent | How far the shine follows the pointer, a Card's hover lift and the Button press (`--glass-motion`) |
| `design.glassDispersion` | 0–1 | absent | Pink, amber and cyan fringe along the rim (`--glass-dispersion`) |

The six material fields are optional. A preset that leaves them out compiles to the same tokens as before, and every material layer in the stylesheet multiplies by a token that falls back to 0, so it renders as before. Under `transparency: "reduced"` halo, refraction and dispersion are 0; depth and motion keep their values.

Backdrop contrast, tone, and sheen enter the contrast bound, so changing them changes the smallest passing opacity. Blur, saturation, and rim cannot affect it. See [preset fields](../04-presets-and-contracts.md#liquid-glass-design-fields) for the tokens and the contract.

## Repurposed controls

Three shared design controls that glass used to ignore now drive the glass edges and drop shadows. Their values are kept when a draft switches family, as for every other field.

| Control (preset and Button editor) | Glass label | Glass effect | Built-in value |
| --- | --- | --- | --- |
| Shadow X / Shadow Y (`shadowOffsetXPx`, `shadowOffsetYPx`) | Glass shadow X, Glass shadow Y | Offset of the glass drop shadow on Card, Dialog, Popover, Dropdown Menu and Tooltip, and of the Button glow. Blur and spread scale from the offset's magnitude, the larger of \|X\| and \|Y\|, so 0 / 12 reproduces the kit's shadows and negative or sideways offsets stay soft | 0 / 12 |
| Border width (`borderWidthPx`) | Glass edge width | Thickness of every glass edge hairline | 1 |
| Border colour (`border` token, light and dark) | Glass edge colour | Colour of every glass edge, used as is. Preset colours may carry alpha (`oklch(L C H / A)`), so the token sets the edge's strength. Input and the outline Button keep the `input` colour | light `oklch(20.8% 0.040 265.8 / 14%)`, dark `oklch(96.8% 0.007 247.9 / 14%)` |

For glass drafts, both editors show the glass labels with a one-line hint each; for other families the labels stay "Shadow X offset", "Shadow Y offset", "Border width" and "Border". Edges carry no text, so an opaque `border` colour makes a solid edge and does not change the contrast bound. Negative offsets move the shadow left and up. `box-shadow` offsets are physical, so they do not flip in right-to-left layouts. A Button recipe's shadow and border overrides apply to the scoped glass Button's glow and edge.

## Upgrading from 0.4.x

`init` saved the whole built-in preset to `ui-preset.json`, and `add` compiles that saved file. So every glass project initialized with 0.4.x keeps the 0.4.x values, not only projects with a custom preset. Under 0.5.0 those values fail the contrast pairs 0.5.0 adds (the field placeholder at 55% coverage, `destructive` on `card`, the checked Radio Group row and the highlighted Select option hint): every `add`, even `add button`, and `theme add` with that file stop with `INVALID_DATA` at `/design/glassOpacity`, for example `Liquid glass text contrast fails in light for mutedForeground on background at 55% coverage: 2.98:1 over the darkest filtered backdrop. Minimum passing glassOpacity is 0.93. See "Upgrading from 0.4.x" in docs/components/liquid-glass.md.` Raising `glassOpacity` to 0.93 passes but makes the glass nearly opaque. Instead, set the 0.5.0 values in `ui-preset.json`, or run `theme add` with a copy of the 0.5.0 built-in liquid glass preset:

| Field | 0.4.x | 0.5.0 |
| --- | --- | --- |
| `design.glassOpacity` | 0.5 | 0.57 |
| `modes.light.mutedForeground` | `#334155` | `#1E293B` |
| `modes.light.destructive` | `#B91C1C` | `#7F1D1D` |
| `modes.dark.destructive` | `#FCA5A5` | `#FECACA` |
| `modes.light.border` | `#CBD5E1` | `oklch(20.8% 0.040 265.8 / 14%)` |
| `modes.dark.border` | `#475569` | `oklch(96.8% 0.007 247.9 / 14%)` |
| `design.shadowOffsetYPx` | 0 | 12 |

The first four make the contrast bound pass. The last three only change the look: with the 0.4.x `border` and offset the project compiles, but the glass gets solid slate edges and no drop shadow or glow. A custom glass preset that compiled with 0.4.x can fail the new pairs in the same way; the message names the failing pair with its tint and coverage and the smallest passing opacity, so raise `glassOpacity` or move the named text colour away from its surface.

## Button

Liquid glass Buttons were restyled to one ink in 0.5.0. Earlier installers ship the previous look, with solid default and destructive fills; rerun `add button` or `theme add` with 0.5.0 to get the new rules.

- Every label is `var(--foreground)` at weight 600, and the edge is `var(--border-width) solid var(--border)`.
- Default is card glass tinted with `primary`, with a `primary` rim at 55% and a `primary` glow. Destructive is tinted with `destructive`, with a rim at 60%. The tint amounts are per-mode tokens: `--glass-primary-tint` (18% light, 22% dark) and `--glass-destructive-tint` (16% light, 20% dark). Hover adds 8 points.
- Secondary is neutral card glass. Outline is `background` glass at 60% of the glass opacity with the `input` border; nested in glass it paints at the full nested opacity. Ghost has no surface until hover. Link is `foreground` text with a 2px `primary` underline.
- Sizes follow the kit: default is 40px high with 18px inline padding, `sm` 32px with 12px padding and 13px type, `lg` 48px with 22px padding and 15px type, and link has 6px padding.
- Hover brightens the top highlight and lengthens the glow; secondary and outline gain a 6% `foreground` tint. Pressed moves 1px down with an inner shade. Focus is a 3px ring offset by 3px; disabled is 50% opacity.
- Reduced transparency and missing backdrop filters paint the tinted card opaque, with no blur. Forced colours use `ButtonFace` with `ButtonText` text and border; the default variant gets a 3px border.
- Recipe colour overrides still apply on top: a `foreground` override paints the label of every variant, and a secondary `background` override replaces its card surface. Outline and ghost `background` overrides replace the colour of the glass, not the glass: outline paints the override at its 60% coverage (the hover tint still mixes in), and ghost paints it as its hover surface at the full glass opacity. Without backdrop filters and under reduced transparency they are opaque. A mode without its own override keeps that mode's `foreground` label and its own surface: `card` for secondary, background glass for outline, and no surface at rest for ghost.

Screenshots of every variant and state, the other glass components on the kit backdrop and the Button editor with a glass recipe, light and dark: [glass foundation evidence](../evidence/glass-foundation.md).

## Contrast bound

A translucent surface shows its backdrop through it. Text on it cannot be checked against one fixed colour, so the compiler checks the two extremes instead. Before the surface is mixed in, the glass filter compresses the backdrop: `contrast()` and `brightness()` map every channel of every backdrop pixel into a range `[low, high]`, whatever its colour or saturation. The compiler mixes the surface colour with grey `low`, and with grey `high` under the full specular sheen, at the preset's opacity. Any real backdrop, blurred or not, produces a surface whose brightness lies between those two. The compiler requires 4.5:1 against both, and requires the text to be either lighter or darker than both. Together these keep 4.5:1 over any backdrop. Compressing the backdrop is what lets the glass be thin: the built-in palette needs opacity 0.57; over raw black and white the 55% field placeholder would never pass.

The compiler also requires each pair to pass on its opaque surface, which every fallback uses, and computes `--glass-nested-opacity` for glass nested in a glass Card, Dialog, or Tooltip. Nested glass drops its own filter, so its coverage is bounded against raw black and white.

The bound assumes that the glass element filters the page itself. A glass surface inside an ancestor with `filter`, `opacity` below 1, `mask`, `clip-path`, `mix-blend-mode`, or its own `backdrop-filter` filters only that ancestor's content, and translucent parts of that ancestor then show the page unfiltered. The family's own nesting is handled as above; other such ancestors are outside the guarantee.

The bound is checked in light and dark mode for these pairs:

| Surface | Text | Used by |
| --- | --- | --- |
| `card` | `cardForeground`, `mutedForeground` | Card; `mutedForeground` also for the Table caption, Accordion content, and a Separator label inside a Card |
| `popover` | `popoverForeground`, `mutedForeground` | Dialog content, Tooltip content |
| `muted` | `foreground`, `mutedForeground` | Tabs list and inactive triggers; Table footer and header |
| `secondary` | `secondaryForeground` | Kept for custom presets; the one-ink secondary Button is card glass |
| `background` | `foreground` | Kept for custom presets |
| `card` + `primary` 18% light / 22% dark | `foreground` | Default Button at rest, primary Avatar initials |
| `card` + `primary` 26% light / 30% dark | `foreground` | Default Button on hover |
| `card` + `destructive` 16% light / 20% dark | `foreground` | Destructive Button at rest |
| `card` + `destructive` 24% light / 28% dark | `foreground` | Destructive Button on hover |
| `card` | `foreground` | Secondary Button at rest, ghost Button on hover, neutral Avatar initials, Table body text, Accordion triggers |
| `card` + `foreground` 6% | `foreground` | Secondary Button on hover |
| `background` at 60% coverage | `foreground` | Outline Button at rest |
| `background` + `foreground` 6% at 60% coverage | `foreground` | Outline Button on hover |
| `background` at 55% coverage | `foreground` | Input value, unchecked Radio Group option label |
| `background` at 55% coverage | `mutedForeground` | Input placeholder, unchecked Radio Group option description |
| `card` | `destructive` | Error messages beside a field, on the card that holds the form |
| `card` + `primary` 26% light / 30% dark at 80% coverage | `foreground` | Checkbox mark and radio dot when checked |
| `card` + `primary` 18% light / 22% dark at 78% coverage | `foreground`, `mutedForeground` | Checked Radio Group option label and description |
| `popover` + `primary` 18% light / 22% dark | `foreground`, `mutedForeground` | Highlighted Select option and its hint |
| `popover` | `foreground` | Plain Select option |
| `card` + `primary` 12% light / 12% dark | `foreground` | Selected Table row, open Accordion trigger |

A tinted surface is a token surface mixed with a tint token at a fixed percentage per mode, the same mix the CSS paints. It is checked like any other pair: over the darkest and brightest filtered backdrop, with and without sheen, and on its opaque fallback. The editor readout names the tint, for example "foreground on card + primary 26%".

A pair with a coverage is painted at that fraction of the glass opacity, the same `calc(var(--glass-opacity) * coverage)` the CSS uses at top level. It is checked over the filtered backdrop at that coverage. Its opaque fallback and reduced transparency paint the whole token, so they ignore it. Nested in glass, the CSS uses the full `--glass-nested-opacity`, so the nested bound ignores coverage too. The editor readout names the coverage, for example "mutedForeground on background at 55% coverage".

A failing pair stops compilation with `INVALID_DATA` at `/design/glassOpacity`. The message names the pair with its tint and coverage, the mode, and the smallest passing opacity, rounded up to 0.01, and points to [Upgrading from 0.4.x](#upgrading-from-04x). With `transparency: "reduced"` the surfaces are opaque, and the ordinary palette contrast rules apply to them at 4.5:1.

The built-in glass preset uses opacity 0.57, the smallest value at which both built-in palettes pass. Light mode needs 0.57 and dark mode 0.57; nested glass uses 0.69 in light and 0.92 in dark. The checked Radio Group row raised the dark minimum from 0.4: its `mutedForeground` description on the 22% tint is the closest dark pair, and the row's 78% coverage is the lowest at which it passes at 0.57 with the palette unchanged. With the built-in preset that description sits exactly at the limit, 4.50:1 over the brightest filtered dark backdrop, so a custom preset that lightens the dark `card`, `primary` or `mutedForeground` even slightly fails it first. In 0.5.0 the field and error-message pairs raised these from 0.5 and 0.32 (nested 0.7 and 0.9): the Input placeholder at 55% coverage would need opacity 0.93 with the previous palette, and `destructive` on `card` 0.75. So the built-in palette moves to opacity 0.57, darkens light `mutedForeground` from `#334155` to `#1E293B`, and changes `destructive` from `#B91C1C` to `#7F1D1D` in light and from `#FCA5A5` to `#FECACA` in dark. Dark `mutedForeground` stays `#E2E8F0`, with `muted` at `#F1F5F9` and `#273449`.

Solid fills keep their existing contrast pairs: both Badge variants and the active Tabs trigger.

The bound covers only the pairs above. Text that you place on a glass surface with other tokens is your responsibility. For example, Tabs panel text inside a glass Card uses `foreground` on `card`, which is bounded only because the secondary Button declares that pair. The Button surfaces outside the bound are ghost and link at rest, which sit straight on the backdrop. The Separator label is the same: it is `mutedForeground` text with no surface of its own, bounded by `mutedForeground` on `card` inside a Card or other glass panel and dependent on the backdrop elsewhere. The outline Button is bounded at its 60% coverage. Progress and Skeleton carry no text, so they declare no pair.

The Table header, a selected row and an open Accordion trigger sit inside their container's glass, so they paint at the full `--glass-nested-opacity` (0.69 light, 0.92 dark with the built-in preset), the coverage at which the nested bound evaluates their pairs. The kit draws the header as a 55% `muted` overlay and the selected row and open trigger as 12% `primary` overlays; the CSS instead mixes the tint into the surface first and then applies the glass coverage, so what it paints is the declared pair. The 12% selection tint is a literal in the two stylesheets, not a token.

## Declared backdrops

The preview gallery renders each glass component over three declared backdrops, in light and dark mode:

- **solid**: the page `background` token;
- **gradient**: a three-stop orange, blue, and near-black linear gradient;
- **pattern**: a 12px black and white checkerboard, a high-frequency worst case for blur.

A component that a family cannot style appears in the gallery as a labelled placeholder; no glass component is unavailable now, so the glass gallery shows none.

## Material recipes

The material is defined once in the family stylesheet and applied as three recipes.

| Recipe | Layers | Slots |
| --- | --- | --- |
| Surface | Relief, rim dispersion, extra drop shadow, pointer shine and pointer halo (not on surfaces that scroll); Card lifts on hover | Card, Dialog, Popover, Dropdown Menu and its submenu, Select content, Tooltip, Alert, the Table and Accordion containers |
| Control | The same layers; nothing moves | Button, Badge, Tabs list, Select trigger |
| Mark | The veil and rim their own sheets paint | Input, Textarea, Native Select, Checkbox, Switch, Radio Group items, Avatar, Progress, Skeleton |

Fields are Marks because `<input>`, `<textarea>` and `<select>` render no pseudo-elements. Card, Tooltip, Alert and the Controls carry the material on `::before`, under their content, and the pointer halo on `::after`, a ring masked to the border. Surfaces that scroll or clip (Dialog, Popover, Dropdown Menu, Select content, the Table and Accordion containers) carry it on their own `box-shadow` and have no halo or pointer shine, so nothing is clipped or scrolls away. Relief and rim dispersion stay within 3px of the rim, outside every text inset. The pointer shine sits under the content and enters the contrast bound. Only a Card moves, lifting on hover on devices that hover; nothing presses. The layout rules sit in `@layer components`, so utility classes such as `absolute` or `sticky` still apply. Under `prefers-reduced-transparency` the pseudo layers are removed. The slot lists are exported from `@ombelle/catalog` as `glassSurfaceSlots`, `glassControlSlots`, `glassMarkSlots` and `glassHaloSelector`.

## Glass cues

Inside the feature query, each translucent surface paints a white specular gradient over its top 60 percent at `glassSheen`, which the contrast bound includes. Every glass surface also has a bright top-left inner rim, a softer bottom-right rim, a faint inner ring, and a 2px inner shadow along the bottom edge. These stay within 3px of the border, inside the smallest text inset, so they never sit behind text and do not enter the bound.

## Refraction

`add` installs `components/ui/liquid-glass-filter.tsx` with glass components. Mount `<LiquidGlassFilter />` once, for example in the root layout. It renders a hidden SVG filter (`#ombelle-liquid-glass`) that bends the backdrop inward near each rim and splits the red, green and blue channels slightly for a prism edge. It then sets `--glass-refraction: url(#ombelle-liquid-glass)` on `<html>`, and every glass `backdrop-filter` starts with `var(--glass-refraction,)`.

- **Chromium only.** The component sets the property only when `navigator.userAgentData` reports Chromium (Chrome, Edge). A browser that rejected a `url()` backdrop filter would drop the whole filter, including the contrast compression the bound depends on. Safari, Firefox and pages that do not mount the filter keep the blurred glass unchanged.
- **The contrast bound still holds.** Displacement only moves backdrop pixels and samples inward, never outside the element. The channel split recombines values within the same range. The compression in the same `backdrop-filter` runs after them.
- **Fallbacks are unchanged.** Reduced transparency, forced colours and nested glass remove the filter as before.
- **Blur.** The built-in preset uses a 3px blur so the refraction stays visible. Higher `glassBlurPx` values soften it.
- **Rim refraction.** When the preset sets `glassRefractionWidth` and `glassRefraction` above 0, the filter displaces only a band along the rim; at 0 it removes `--glass-refraction` instead of referencing an empty filter, from a rounded-rectangle distance map, with the strength from `glassRefraction`. The filter re-reads both tokens when `<html>` changes class or style, for example on a theme switch.
- **Pointer halo.** The same component adds one pointer listener for the page. It runs only when the preset sets a halo or motion, writes at most once per animation frame, and sets `--pointer-x`, `--pointer-y` and `data-halo-active` on the glass Surface or Control under the pointer (recipe Buttons included) and clears them when the pointer leaves; touch shows the halo while pressed. Under reduced motion it writes no position, so the halo stays at the top edge and the shine does not travel. Without the component there is no halo and the shine stays at the top left.

## Fallbacks

1. **Opaque base.** Glass surfaces are opaque outside any feature query, using the relevant surface token.
2. **Feature query.** Translucency and blur apply only inside `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`. A browser without filter support never shows text over an unblurred backdrop.
3. **Reduced transparency.** `@media (prefers-reduced-transparency: reduce)` restores opaque surfaces and removes the filter. The preset field `transparency: "reduced"` does the same at compile time: its tokens pin every surface's coverage to 1 (`--glass-inner-opacity`, which covered surfaces such as the 55% field read before their coverage, and `--glass-nested-opacity`), remove the filter (`--glass-inner-filter: none`) and the sheen, and back the Skeleton film with `card` (`--glass-film-backing`).
4. **Forced colours.** `@media (forced-colors: active)` uses system colours with no filter and no translucency. The material's `::before` and `::after` layers are removed.
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

Every catalog component can be planned in a glass project. The refusal remains for a component that a family marks unavailable: planning it fails with `STYLE_UNAVAILABLE` and exit code 2 before any write, the message names the component and lists the experimental glass components, a plan that includes it fails as a whole, and `--yes` does not bypass it. In a glass project an id outside the catalog, such as `add button unknown-component`, takes the same path today.

`init` and `theme add` rewrite the tokens and `ui-style.css` only, so they check the managed components recorded in the project lock before any write. `--yes` bypasses neither refusal:

- **Into glass.** If any installed component is unavailable for liquid glass, switching to a glass preset fails with `STYLE_UNAVAILABLE` at `/componentIds`. The message names the installed unavailable components and lists the experimental glass components. No catalog component is unavailable in glass now, so this check no longer blocks a switch into glass.
- **Out of glass.** Accordion, Alert, Avatar, Badge, Card, Checkbox, Dropdown Menu, Label, Native Select, Popover, Progress, Radio Group, Select, Separator, Skeleton, Switch, Table, Tabs, Textarea, and Tooltip install colocated glass CSS, such as `components/ui/card.css`, that depends on the `--glass-*` tokens and the contrast bound. If any of them is installed in a glass project, switching to a stable preset fails with `STYLE_UNAVAILABLE` at `/styleFamily`, naming the components and their CSS files. Remove them, switch the theme, then add them again. Button, Dialog, and Input keep their glass rules in `ui-style.css`, which the switch rewrites, so they do not block it.

Re-applying another glass preset to a glass project is not a family switch. It still runs the contrast bound.

## Editors

- **Preset editor** (`/editor/preset`): the family picker offers "Liquid glass (Experimental)". Transparency and the seven glass material controls appear only for glass, and the glass preview renders over the kit backdrop (violet, amber, green and blue light spots over a green-to-violet gradient with soft vertical bands), so the translucency shows. Shadow, border width and border colour carry their glass labels. The preview follows the site's light or dark theme for every family; the Preview mode select still overrides it until the theme toggles again. A limitations panel is always visible for glass, together with a live contrast-bound readout. Export and publication are disabled while any pair fails. The readout states the minimum passing opacity, and the lowest passing opacity for each mode when the bound passes. Every component renders in glass; the gallery greys out as "Unavailable in liquid glass" only a component that the support table marks unavailable, and none is now.
- **Button editor** (`/editor/component/button`): accepts glass, previews it over the same kit backdrop, relabels the shadow and border overrides as in [repurposed controls](#repurposed-controls), and shows the experimental notice beside the export and CLI command.
- **Component playgrounds** on the website use the preset preview, so their glass examples sit on the kit backdrop too. The backdrop is declared once, in `apps/preview/src/glass-backdrop.css`; it replaced the earlier backdrop photo, which was removed.

## Limitations

- no mid-range mobile scrolling measurement
- no human visual, keyboard or screen-reader review
- the contrast guarantee covers the declared text pairs, not consumer content placed on glass
- browsers outside the recorded run were not tested
- the hosted snapshot service must be redeployed before glass codes resolve publicly

Further known limitations:

- The Tooltip arrow stays opaque while the content is translucent, so a seam is visible between them.
- With `transparency: "reduced"`, glass presets must still reach 4.5:1 on their opaque surfaces. This is stricter than the stable families.
- The contrast bound assumes the glass element filters the page itself; see [contrast bound](#contrast-bound) for the ancestors it does not cover.
- There is no public catalog page that shows the stable, experimental, and unavailable matrix yet.

Component-scoped presets and recipes remain Button-only. See the [design](../superpowers/specs/2026-11-03-liquid-glass-design.md) for the full decisions.
