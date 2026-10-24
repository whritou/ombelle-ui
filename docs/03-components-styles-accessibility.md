# Components Styles and Accessibility

## Component authoring contract

Every component must ship its source, dependencies, prop and composition reference, editor metadata, preview fixtures, supported style matrix, keyboard behavior, and accessibility evidence. Follow the selected shadcn edition's composition model and preserve familiar names wherever they mean the same thing.

Use semantic elements and existing accessible primitives for interaction. Public props should forward the relevant native attributes, events, refs, `className`, and `style` without erasing useful types. Interactive state supports controlled and uncontrolled usage when the primitive supports both. Keep server-compatible presentation components free of unnecessary client boundaries.

Styles cannot change semantics or keyboard expectations. A neo brutalist Dialog must retain the same title association, focus management, close behavior, and composition API as its flat version. A style must not make a disabled control look active or make destructive intent indistinguishable.

## Initial component matrix

| Component | Core API or composition | Minimum states | Native HTML basis | Glass alpha |
| --- | --- | --- | --- | --- |
| Button | `variant`, `size`, `loading`, optional supported composition | Default, hover, focus, pressed, disabled, loading | `button`, or valid link composition | Experimental |
| Badge | `variant`, `className` | Default, destructive | `span`; interactive usage must use a real control | Experimental |
| Card | Root, header, title, description, content, footer | Default, dense | Section or div with deliberate headings | Experimental |
| Input | Native input props, invalid and disabled states | Empty, filled, focus, invalid, disabled | `input` | Unavailable |
| Textarea | Native textarea props | Empty, filled, focus, invalid, disabled | `textarea` | Unavailable |
| Label | Association and native label props | Default, required indication | `label` | Unavailable |
| Checkbox | Checked, mixed, disabled, change handling | Unchecked, checked, mixed, focus, invalid | Primitive with verified form behavior | Unavailable |
| Switch | Checked and change handling | Off, on, focus, disabled | Primitive with switch semantics | Unavailable |
| Native Select | Native select props, options | Default, selected, focus, invalid, disabled | `select` | Unavailable |
| Dialog | Trigger, content, title, description, close | Open, closed, scroll, focus return | Reviewed dialog primitive | Experimental |
| Tabs | Root, list, trigger, content, orientation | Active, inactive, focus, disabled | Reviewed tabs primitive | Experimental |
| Tooltip | Provider, trigger, content | Keyboard, hover, dismissal | Reviewed tooltip primitive | Experimental |

Flat, minimalist, and neo brutalism target stable status across all rows. Stable status is awarded after testing, not merely because the primitive is accessible by default. Native Select is an explicitly named browser-control alternative; a fully custom Select is a later component.

## Style families

| Style | Visual rules | Customization surface | Special review |
| --- | --- | --- | --- |
| Flat | Solid fills, restrained elevation, clear outlines | Color, radius, border, density | Distinguishable boundaries and selected states |
| Minimalist | Quiet surfaces, generous space, restrained decoration | Typography, spacing, subtle borders | Muted labels and focus must remain readable |
| Neo brutalism | Strong outlines, offset shadows, assertive contrast | Border width, shadow offset, radius, vivid color | Press transforms cannot move the hit target or obscure focus |
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

The technical foundation implements Button, Badge, Dialog, and Input for flat, minimalist, and neo-brutalism. This four-component scope is separate from the twelve-component alpha roadmap and does not label the full catalog stable. Badge begins M2 catalog expansion; its [API](components/badge.md) and [evidence](evidence/badge.md) describe the supported slice. Liquid glass remains unavailable. The [minimalist evidence](evidence/minimalist-style-support.md) identifies measured environments, agent-operated visual review, synthetic text enlargement, and pending native text zoom, human keyboard, NVDA, VoiceOver, and broader-browser review. Arbitrary preset overrides and consuming applications require their own checks.

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

Source and registry artifacts build in the supported fixtures; public props and examples are accurate; every stable style has light and dark fixtures; required states and keyboard tests pass; visual snapshots are reviewed; contrast failures are resolved or the status is restricted; all dependencies and licenses are recorded; code export and CLI output match; and the docs show what the consumer remains responsible for.
