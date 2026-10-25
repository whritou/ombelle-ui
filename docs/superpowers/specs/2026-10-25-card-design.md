# Card catalog extension

Date: 25 October 2026. Approved for execution following the documented component matrix and the completed Badge catalog slice. The [Card verification record](../../evidence/card.md) documents measured implementation results and remaining limits.

## Intent

Add Card as the next M2 component so the catalog can compose presentational content surfaces with the same preview, compiler, registry, installer, and source-ownership guarantees as existing components. The supplied Ombelle logos are retained unchanged under `assets/` as repository assets only; Card fixtures and generated artifacts do not depend on them.

## Goals

- Provide the familiar `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` composition.
- Support default and dense presentation in the currently implemented flat, minimalist, and neo-brutalism families, in light and dark modes.
- Forward relevant native element props, refs, `className`, and `style`; use deliberate heading semantics in examples and documentation.
- Generate deterministic component, colocated CSS, and usage artifacts; include them in the standard registry and local CLI path.
- Keep existing component source, shared family stylesheet bytes, utilities, project defaults, and package-manager state unchanged when Card is added.
- Exercise Card in the shared preview and consumer fixtures, with install, repeat no-op, dry-run, ownership-conflict, and rendering-parity coverage appropriate to the established foundation.

## Non-goals

- Liquid glass styling, which the product matrix marks experimental but the current foundation does not implement as a supported style family.
- Interactive behavior, card-level click targets, links, forms, or an implicit client boundary.
- Component-scoped presets, recipes, remote publishing, editor integration, or a claim that the full twelve-component catalog is stable.
- Importing or copying the repository logo images into Card source, previews, or consumer artifacts.

## Contract and behavior

Card is a presentational compound component with root, header, title, description, content, and footer slots. The root exposes a `density` choice with `default` as the default and `dense` as the compact option. Each part forwards its supported native props and ref. The root remains a non-interactive container; usage documentation explains when the containing content needs a real heading or landmark and leaves heading level to the consuming page structure.

Card requires no new dependency versions and remains server-compatible. Its reviewed CSS is emitted as a colocated `card.css` imported by the generated component, giving the TSX and CSS independent ownership hashes. Dense styling is selected through a stable data attribute on the root. Styles use existing semantic surface, foreground, border, radius, typography, and shadow tokens; family rules preserve the three established visual languages. Include reduced-motion and forced-colors behavior where relevant, with no essential information communicated through shadow or color alone.

## Approaches

1. **Compound API with colocated `card.css` (recommended and selected from the docs).** Mirrors the documented slot contract and Badge's independently owned stylesheet. It protects existing global style bytes and gives Card CSS its own conflict boundary.
2. **Compound API with shared family stylesheets.** Keeps all family slot rules together, but adding Card modifies shared artifacts and can create conflicts or alter existing generated stylesheet ownership for consumers who only add Card.

Use the first approach. This follows the Badge precedent and its preservation guarantees while keeping Card's composition API familiar.

## Constraints and decisions

- Add `card` to the shared component ID contract and route its template and family styles through catalog generation, deterministic compilation, registry generation, preview generation, and CLI installation.
- Reuse the existing three-family support matrix; do not add liquid glass or widen the preset/style-family contract as part of this slice.
- Keep CSS and TSX artifact paths, hashes, registry bytes, and CLI conflict behavior deterministic.
- Keep all three provided logo files under `assets/` byte-for-byte unchanged and outside the generated Card artifact set.
- Decide the simplest type-safe way for `CardTitle` to retain a useful visual slot while allowing examples to use a heading level appropriate to their surrounding document; do not add a runtime dependency for polymorphism.
- Document exact supported states and the remaining accessibility-review limits. Do not describe this component slice as certification of consumer applications or the full catalog.

## Acceptance

- The approved Card API and examples match generated TSX and types; default and dense examples render with correct native semantics.
- Compilation for every supported family is deterministic, with no new runtime dependency versions and no changes to existing component, shared style, or utility artifact bytes.
- Standard registry output contains the exact Card component and CSS bytes.
- CLI installation works in the existing declared consumer matrix, preserves the manager and unrelated project state, and verifies dry-run, repeat no-op, and edits to either Card TSX or CSS as conflicts, including with `--yes`.
- Preview and installed-source fixtures agree in DOM and computed styling for both modes, all three supported families, and both density states; screenshots or pixels are recorded where the existing gate supports them.
- Documentation covers composition, native prop forwarding, semantics, density, family behavior, generated files, installation, ownership, and the explicit glass limitation.
- The three logo files remain unchanged in `assets/` and are not referenced by Card or generated consumer artifacts.

## Builder decisions

The implementation plan may settle the precise heading-level API for `CardTitle`, the density token values, CSS slot selectors, fixture sample text, and exact test-file placement, provided the public contract above and existing project safeguards remain intact.
