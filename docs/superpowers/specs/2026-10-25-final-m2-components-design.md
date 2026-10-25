# Final M2 catalog components design

**Status:** Proposed design; implementation planning and code changes wait for user approval.

## Intent

Complete the four remaining M2 catalog rows—Checkbox, Switch, Tabs, and Tooltip—so the web catalog has its planned twelve components. Developers should receive familiar shadcn-style React APIs, reviewed interaction behavior, and the same preview/compiler/installer parity already provided by the existing catalog.

## Goals

- Add Checkbox, Switch, Tabs, and Tooltip to the supported component contract and catalog.
- Support flat, minimalist, and neo-brutalism styles in light and dark modes, with component-scoped CSS and generated source artifacts.
- Preserve controlled and uncontrolled state where supported, forwarded primitive props, refs, `className`, and `style`.
- Document composition, consumer responsibilities, state behavior, and keyboard use for each component.
- Cover form behavior, keyboard interaction, accessibility, all supported styles/modes, and parity between preview and installed artifacts.

## Non-goals

- Liquid glass styles for any of these components. Glass remains a later experiment; Checkbox and Switch remain unavailable for glass, and Tabs and Tooltip will not receive glass styles in this slice.
- React Native, custom Select, a new Field/FormItem abstraction, component-scoped recipes, or changes to global preset tokens and CLI commands.
- Claiming human screen-reader review that was not performed. Record automated and agent-operated evidence precisely; leave NVDA and VoiceOver review identified as pending where no human review occurs.

## Constraints

- Follow `docs/03-components-styles-accessibility.md`, the twelve-component scope in `docs/01-product-requirements.md`, and existing catalog, compiler, CLI, preview, and consumer conventions.
- Use reviewed Radix primitives, matching the existing Dialog and the documented shadcn composition model. Declare each runtime dependency at an exact version, update the workspace lock, and keep each generated component's dependency list scoped to what it imports.
- Keep component CSS in `packages/catalog/src/styles/<component>/<family>.css`; use existing semantic tokens and logical CSS properties. Support visible focus, forced colors, reduced motion, dark mode, and RTL where applicable.
- Mark interactive templates as client components where Radix requires it; keep presentation-only subcomponents server-compatible where the framework permits.
- Preserve current output determinism, artifact hashes, dry-run behavior, file ownership, and source/compiler/CLI parity.

## Approaches considered

1. **Use Radix primitives for all four (selected).** This matches the docs' reviewed-primitive requirement and existing Radix Dialog. It gives the components a consistent composition and accessibility model, at the cost of adding four pinned primitive dependencies and verifying their specific behavior in consumers.
2. **Use native inputs for Checkbox and Switch, with Radix Tabs and Tooltip.** This keeps native form controls direct, but requires custom mixed-state and switch semantics and makes their API diverge from the documented shadcn primitive composition. It is not selected because this catalog is preserving the existing shadcn/Radix model.

## Component behavior and API

- **Checkbox:** Export `Checkbox` with Radix checked state (`boolean` or `indeterminate`), controlled/uncontrolled props, change callback, and native form props (`name`, `value`, `required`, `disabled`). Verify checked, unchecked, mixed, disabled, reset, and submitted form values. The component remains an input-style control; callers provide its accessible name and error relationship.
- **Switch:** Export `Switch` and `SwitchThumb`; support controlled/uncontrolled checked state, callback, and the primitive's native form props. Verify off/on announcement semantics, disabled behavior, and form submission. Callers supply a visible or accessible label.
- **Tabs:** Export `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent`; forward the Radix root, list, trigger, and content props, including orientation and disabled state. Use Radix's automatic activation default and document the activation model; preserve controlled/uncontrolled selection and arrow-key behavior in both orientations.
- **Tooltip:** Export `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `TooltipArrow` if the chosen Radix API supports it. Preserve provider delay options and root/trigger/content props. Verify hover and keyboard-focus display, Escape dismissal, and that content is descriptive and non-interactive.

Slot names and public exports will be asserted in catalog tests and documented in per-component API pages. Any API detail the primitive cannot safely support must be called out before implementation rather than emulated with custom event logic.

## Styling and support status

- Each component receives separate reviewed CSS for flat, minimalist, and neo-brutalism. Each family must remain legible in light and dark mode using current semantic tokens.
- Checkbox covers unchecked, checked, mixed, focus-visible, disabled, and invalid states. Switch covers off, on, focus-visible, and disabled. Tabs distinguish active, inactive, focus-visible, and disabled triggers and style content without changing its semantics. Tooltip has readable content, visible focus-safe placement, and a clear arrow where included.
- Hit targets should meet the documented 24 by 24 CSS pixel minimum subject to WCAG exceptions, aiming for the preferred 44 by 44 where practical. Focus must not be clipped by component styling. Motion follows the existing reduced-motion token.
- Glass support is not implemented or implied by the component output or evidence.

## Integration and evidence

Update the component ID list, catalog templates/styles/dependency manifest, catalog generator output, compiler usage examples, and focused contracts/catalog/compiler/CLI coverage. Add component documentation and preview specimens. Extend consumer and browser evidence so all four components are exercised in preview and generated Vite/Next.js consumers for the three families and both modes, including their documented state and keyboard behaviors. Run the repository's applicable package build, type, unit, integration, browser, and foundation verification steps after implementation, recording actual environment and any unavailable human review.

## Builder decisions

- Prefer the existing Radix release line and determine exact compatible package versions using the repository's dependency evaluation and lockfile workflow.
- Follow current component conventions for exact slot names, focus-ring treatment, example labels, and preview layout unless an accessibility requirement calls for a difference.
- Keep the four components in one M2 slice and preserve the current catalog release unless repository compatibility checks show a required version change.
