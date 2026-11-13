# Components Styles and Accessibility

## Component authoring contract

The catalog expansion in 0.7.2 adds Input Group, Sheet, Alert Dialog,
Breadcrumb, Pagination and Toast in all five families. Liquid glass remains
experimental. Both Radix and Base UI editions are supported; Base UI Toast uses
its native manager API. Tabs appearances, Table density/striping, Card surfaces,
Badge size/dot composition and Alert success/warning/info intents are also
implemented. See the individual [component references](components/) and the
[batch design](superpowers/specs/2026-11-08-forms-navigation-overlays-design.md).
The public CLI 0.7.2 includes these additions and their new API options.

The 0.7.3 display components add [Spinner](components/spinner.md),
[Kbd](components/kbd.md), [Empty](components/empty.md),
[Field](components/field.md), [Meter](components/meter.md) and
[Stepper](components/stepper.md) in all five families, with Radix and Base UI
editions and recipe editors. Field is a composition that wires a label, hint and
error to the control you already use. Meter covers segmented progress. Liquid
glass remains experimental. Installing them needs CLI 0.7.3 or later. See the [display components design](superpowers/specs/2026-11-09-display-components-design.md)
and the [evidence](evidence/display-components.md).

The 0.7.3 form controls add [Slider](components/slider.md),
[Toggle Group](components/toggle-group.md), [Chip](components/chip.md),
[Tag Input](components/tag-input.md) and [Input OTP](components/input-otp.md)
in all five families, with Radix and Base UI editions and recipe editors. The
website editor uses the catalog Toggle Group, Slider and Chip, compiled at
build time, so its single choices are radio groups with one Tab stop. See the
[form controls design](superpowers/specs/2026-11-10-form-controls-design.md)
and the [evidence](evidence/form-controls-073.md).

The 0.7.5 primitives add [Toggle](components/toggle.md),
[Collapsible](components/collapsible.md), [Scroll Area](components/scroll-area.md),
[Button Group](components/button-group.md) and [Item](components/item.md) in
all five families, with Radix and Base UI editions and recipe editors. A Scroll
Area viewport is a keyboard stop only while its content overflows, closed
Collapsible content leaves the Tab order, and an Item link keeps its link role
inside an Item Group. Command, Combobox, Select and Sheet draw the family
scrollbar on their lists. The website's editors and docs use the compiled
components. Liquid glass remains experimental. Installing the five needs CLI
0.7.5 or later. See the [design](superpowers/specs/2026-11-12-primitives-075-design.md)
and the [evidence](evidence/primitives-075.md).

The 0.7.5 editor inputs add [Number Input](components/number-input.md) and
[Color Picker](components/color-picker.md), with `ColorPickerPair` for a light
and dark token, in all five families with Radix and Base UI editions and recipe
editors. A Number Input keeps a half-typed value and reports it instead of
clearing it. The Color Picker's area is a 2D slider with spoken saturation and
brightness, its contrast readout states the WCAG level in text, and its
eyedropper appears only where the browser has the EyeDropper API. The website's
preset and component editors use them in place of native colour inputs and
number fields. Liquid glass remains experimental. Installing them needs CLI
0.7.5 or later. See the [design](superpowers/specs/2026-11-12-editor-inputs-075-design.md)
and the [evidence](evidence/editor-inputs-075.md).

The 0.7.5 variants add, with recipe fields that need CLI 0.7.5:
[Checkbox Option](components/checkbox.md#variants-075) rows and cards, a small
[Switch](components/switch.md#variants-075), [Progress](components/progress.md#variants-075)
sizes, tones, a label and a value, a [Popover arrow](components/popover.md#variants-075),
a scrolling [Dialog](components/dialog.md#variants-075) body, footer and sizes,
[Alert Dialog](components/alert-dialog.md#variants-075) media and typed confirmation,
and a [Breadcrumb](components/breadcrumb.md#collapse-075) that collapses into a menu.
See the [design](superpowers/specs/2026-11-12-variants-075-design.md) and the
[evidence](evidence/variants-075.md).

The 0.7.5 [Code Block](components/code-block.md) shows read-only source with
Copy: a file block with a title and line numbers, or a command block with one
tab per package manager. It is available in all five families with Radix and
Base UI editions and a recipe editor, on the board's dark surface in both
modes. Its own highlighter covers TSX, CSS, JSON and shell, and another
highlighter's output can be passed as children. The code is a named, scrollable
region; line numbers are a CSS counter, so they are neither read nor copied;
Copy announces "Copied" or "Copy failed" in a polite live region; and every
token colour reaches 4.5:1 on the surface (line numbers 3:1). The website's
docs, component pages, playground, editors' artifact views and Get code dialog
use it in place of the site's own code block. Liquid glass remains
experimental. Installing it needs CLI 0.7.5 or later. See the
[design](superpowers/specs/2026-11-12-code-block-075-design.md) and the
[evidence](evidence/code-block-075.md).

The 0.7.3 overlays add [Combobox](components/combobox.md),
[Command](components/command.md), [Hover Card](components/hover-card.md) and
[Context Menu](components/context-menu.md) in all five families, with Radix and
Base UI editions and recipe editors. The website editor gains a Ctrl+K command
palette, loaded on first open, and searchable Combobox pickers for the Button
icon and the glass preset. See the
[overlays and search design](superpowers/specs/2026-11-10-overlays-search-design.md)
and the [evidence](evidence/overlays-search-073.md).

The 0.7.3 [Calendar](components/calendar.md) chooses a date or a range in all
five families, with Radix and Base UI editions and a recipe editor. Both
editions use react-day-picker 10.0.2 for the grid; its Date Picker opens the
Calendar in the edition's popover. The preview scenes use it; the website
editor does not. See the [Calendar design](superpowers/specs/2026-11-10-calendar-design.md)
and the [evidence](evidence/calendar-073.md).

Every component must ship its source, dependencies, prop and composition reference, editor metadata, preview fixtures, supported style matrix, keyboard behavior, and accessibility evidence. Follow the selected shadcn edition's composition model and preserve familiar names wherever they mean the same thing.

Use semantic elements and existing accessible primitives for interaction. Public props should forward the relevant native attributes, events, refs, `className`, and `style` without erasing useful types. Interactive state supports controlled and uncontrolled usage when the primitive supports both. Keep server-compatible presentation components free of unnecessary client boundaries.

Styles cannot change semantics or keyboard expectations. A neo brutalist Dialog must retain the same title association, focus management, close behavior, and composition API as its flat version. A style must not make a disabled control look active or make destructive intent indistinguishable.

## Initial component matrix

| Component | Core API or composition | Minimum states | Native HTML basis | Glass alpha |
| --- | --- | --- | --- | --- |
| Button | `variant`, `size`, `loading`, optional supported composition | Default, hover, focus, pressed, disabled, loading | `button`, or valid link composition | Experimental |
| Badge | `variant`, `className` | Default, destructive | `span`; interactive usage must use a real control | Experimental |
| Card | Root, header, title, description, content, footer | Default, dense | Section or div with deliberate headings | Experimental |
| Input | Native input props, invalid and disabled states | Empty, filled, focus, invalid, disabled | `input` | Experimental |
| Textarea | Native textarea props | Empty, filled, focus, invalid, disabled | `textarea` | Experimental |
| Label | Association and native label props | Default, required indication | `label` | Experimental |
| Checkbox | Checked, mixed, disabled, change handling | Unchecked, checked, mixed, focus, invalid | Primitive with verified form behavior | Experimental |
| Switch | Checked and change handling | Off, on, focus, disabled | Primitive with switch semantics | Experimental |
| Native Select | Native select props, options | Default, selected, focus, invalid, disabled | `select` | Experimental |
| Dialog | Trigger, content, title, description, close | Open, closed, scroll, focus return | Reviewed dialog primitive | Experimental |
| Tabs | Root, list, trigger, content, orientation | Active, inactive, focus, disabled | Reviewed tabs primitive | Experimental |
| Tooltip | Provider, trigger, content | Keyboard, hover, dismissal | Reviewed tooltip primitive | Experimental |

Flat, minimalist, neo brutalism, and ombelle target stable status across all rows. Stable status is awarded after testing, not merely because the primitive is accessible by default. Native Select is an explicitly named browser-control alternative; a fully custom Select is a later component.

## Style families

| Style | Visual rules | Customization surface | Special review |
| --- | --- | --- | --- |
| Flat | Solid fills, restrained elevation, clear outlines | Color, radius, border, density | Distinguishable boundaries and selected states |
| Minimalist | Quiet surfaces, generous space, restrained decoration | Typography, spacing, subtle borders | Muted labels and focus must remain readable |
| Neo brutalism | Strong outlines, offset shadows, assertive contrast | Border width, shadow offset, radius, vivid color | Press transforms cannot move the hit target or obscure focus |
| Ombelle | Pill controls, ink outlines, hard offset shadows, key-press states, a solid focus ring, uppercase letter-spaced labels | Color, radius, border width, shadow offset, density | Press transforms cannot move the hit target or obscure focus; pink-on-ink contrast and reduced motion |
| Liquid glass | Translucent surfaces, blur, highlights, layered depth | Opacity, blur, border, opaque fallback | Contrast against changing backgrounds, reduced transparency, GPU cost |

A style pack includes reviewed slot CSS, compatible component IDs, minimum token contract version, light and dark defaults, motion rules, and fallbacks. Components inherit the global family through generated CSS rather than requiring a `styleFamily` prop at every use.

Reserve variants for semantic intent. For Button, begin with default, secondary, outline, ghost, link, and destructive; begin sizes with small, default, large, and icon. Some components have different meaningful variants. Do not force every component to expose identical options.

## Token layers and override order

Resolve design values in this order:

1. Versioned foundation defaults such as spacing and typography.
2. Selected style-family defaults.
3. Project preset overrides for each color mode and design category.
4. Project component defaults from the preset.
5. Scoped component recipe overrides.
6. Consumer props and local source changes.

Later values replace only allowlisted values. Arrays replace rather than concatenate. Unknown keys and incompatible types fail validation. Accessibility behavior and structural ARIA rules are outside this merge surface.

Use semantic color pairs such as background and foreground, primary and primary foreground, card and card foreground. Existing shadcn tokens can map to these roles. Additional tokens use a clear prefix such as `--ui-control-height`, `--ui-border-width`, and `--ui-shadow-offset-x`.

The MVP root theme intentionally updates shared shadcn color variables for a consistent application. Explain this in the install diff because existing components using those variables can change appearance. Arbitrary unrelated components may need their own adjustments.

## Accessibility target

The technical foundation implements Button, Badge, Card, Dialog, Input, Label, Native Select, and Textarea for flat, minimalist, and neo-brutalism; ombelle was added later as a further stable family (see [decision 0004](decisions/0004-ombelle-family.md)). This eight-component scope is separate from the twelve-component alpha roadmap and does not label the full catalog stable. Badge begins M2 catalog expansion; its [API](components/badge.md) and [evidence](evidence/badge.md) describe the supported slice. Card follows with its [API](components/card.md) and [evidence](evidence/card.md). Label, Textarea, and Native Select are documented in [Label](components/label.md), [Textarea](components/textarea.md), and [Native Select](components/native-select.md), with [form controls evidence](evidence/form-controls.md); that slice also adds Input invalid styling in every implemented family and an icon close control for Dialog. Liquid glass is implemented as an experimental family for all twenty-three components; none is unavailable in glass. Its [documentation](components/liquid-glass.md) states the contrast bound, fallbacks, and limitations, and its [evidence](evidence/liquid-glass.md) records automated checks in one Chromium build with no human review. The [glass foundation evidence](evidence/glass-foundation.md) records the kit-parity foundation: repurposed controls, tinted Button pairs, the one-ink Button and the kit backdrop. The [glass form controls evidence](evidence/glass-form-controls.md) records the form controls on that backdrop and the built-in preset tune they required, and the [glass display evidence](evidence/glass-display.md) records Avatar, Separator, Table, Accordion, Progress, and Skeleton. The [minimalist evidence](evidence/minimalist-style-support.md) identifies measured environments, agent-operated visual review, synthetic text enlargement, and pending native text zoom, human keyboard, NVDA, VoiceOver, and broader-browser review. Arbitrary preset overrides and consuming applications require their own checks. The next catalog batch adds [Select](components/select.md), [Radio Group](components/radio-group.md), [Dropdown Menu](components/dropdown-menu.md), and [Alert](components/alert.md) in all four stable families, with [batch 1 evidence](evidence/next-components-batch-1.md), then [Popover](components/popover.md), [Avatar](components/avatar.md), and [Separator](components/separator.md) with [batch 2 evidence](evidence/next-components-batch-2.md), then [Table](components/table.md) and [Accordion](components/accordion.md) with [batch 3 evidence](evidence/next-components-batch-3.md), and [Progress](components/progress.md) and [Skeleton](components/skeleton.md) with [batch 4 evidence](evidence/next-components-batch-4.md); Select, Radio Group, and Dropdown Menu use pinned Radix primitives for keyboard and screen-reader behavior.

Target relevant WCAG 2.2 Level AA requirements for supported web experiences. Components and presets alone cannot certify an entire application. Component documentation must identify which checks were performed and what the consuming application must supply. Sources S10 and S11 explain the standards and primitive responsibilities.

For normal text, validate at least 4.5 to 1 contrast; large text can use the applicable 3 to 1 threshold. Validate at least 3 to 1 for required non-text component and state indicators where the criterion applies. Test keyboard operation, visible focus, accessible names, errors, reading order, 200 percent text zoom, and reflow at 320 CSS pixels. Use 24 by 24 CSS pixels as the minimum target-size criterion subject to its defined exceptions, with 44 by 44 as our preferred touch design target.

Keyboard and screen-reader evidence must include:

- Dialog focus entry, containment, Escape handling, labelling, scroll, and focus return.
- Tabs arrow keys, orientation, tab stops, and the documented activation model.
- Checkbox mixed state and form submission, Switch state announcement, and Native Select behavior.
- Tooltip appearing on focus, dismissing appropriately, and carrying no essential interactive content.
- Error messages associated with fields; icons do not replace text or accessible labels.
- Reduced motion, forced colors, dark mode, right-to-left layout, and clipped focus under overflow.

Automated scanning is necessary but cannot prove all of these behaviors. Run NVDA with Chrome on Windows and VoiceOver with Safari on macOS before stable web release. Add mobile assistive-technology testing for interactive mobile-web forms. Record exact tested versions in release evidence.

## Editor validation policy

Presets validate schemas, token bounds, semantic color pairs, required surface definitions, and supported component combinations. Show a failing token pair next to the relevant control. A brand color can remain as a decorative token while the editor suggests an accessible interactive color.

Allow a user to download an explicitly labelled draft with warnings. Do not mark it verified, publish it as a stable catalog preset, or silently alter its colors. A snapshot must carry draft versus verified metadata, and the CLI must show that status before installation. Verification is bound to exact catalog, compiler, component, and test versions.

Changing label text and example content can still create an inaccessible integration. The UI should explain required accessible names and relationships without claiming that color checks certify the complete result.

## Liquid glass constraints

Translucency must be tested against declared background fixtures. A foreground over an arbitrary image cannot receive a universal contrast guarantee. Keep text-bearing surfaces sufficiently opaque or put text on an opaque inner surface. The stable default must remain readable without blur.

Use `@supports` for backdrop-filter enhancement and an opaque fallback for unsupported environments. Supply reduced-motion rules, forced-colors handling, an explicit reduced-transparency option, and progressive use of a platform preference when available. Avoid continuous blur animation and nested large-area filters.

Glass becomes stable only after contrast on declared backgrounds, keyboard focus, fallback rendering, and scrolling on an agreed mid-range mobile device meet the release budget. A style-specific failed gate keeps that entry experimental without blocking unrelated stable entries.

## Native platform track

Native HTML and React Native are separate product commitments. The first web catalog uses real browser elements wherever appropriate. React Native requires separately authored components using mobile primitives and platform accessibility APIs; CSS variables, DOM composition, Radix portals, and browser focus behavior do not transfer directly. Source S13 provides the platform foundation.

Share semantic token names, documented intents, portable metadata, and JSON presets where possible. Convert portable colors, radius, spacing, and typography through a native adapter. Declare unsupported effects and platform mappings explicitly; never inject web CSS strings into native style props.

Begin native discovery with Button, Text Input, Card, and Switch on iOS and Android. Test VoiceOver, TalkBack, Dynamic Type or font scaling, touch targets, press states, keyboard input, and reduced motion. An Expo demo is a convenience, not a substitute for device tests. Dialogs, tooltips, and liquid glass need separate native interaction and rendering decisions before being advertised.

## Component definition of done

Source and registry artifacts build in the supported fixtures; public props and examples are accurate; every stable style has light and dark fixtures; required states and keyboard tests pass; visual snapshots are reviewed; contrast failures are resolved or the status is restricted; all dependencies and licenses are recorded; code export and CLI output match; the docs show what the consumer remains responsible for; the catalog style lint in `pnpm build:packages` passes; and the [specimen audit](evidence/specimen-audit.md) passes in every stable family, edition and mode (experimental liquid glass findings are recorded, not blocking).
