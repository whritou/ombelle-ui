# Badge catalog extension

Date: 23 October 2026. The user approved this bounded design in chat, then requested continued use of the Superpowers workflow. Implementation proceeds in the existing catalog flow with TDD, verification, and review.

## Approved scope

Add Badge as the first missing row in the M2 component matrix. Provide `variant` and `className`, default and destructive states, and native non-interactive `span` semantics. Support the existing flat, minimalist, and neo brutalism families. The default variant uses the secondary pair; destructive uses the destructive pair. Forward native span props and React 19 refs. Keep the component server compatible and add no dependency versions.

Connect the source template to the contracts, generated catalog, deterministic compiler, standard registry item, local installer, shared preview/consumer fixture, and usage documentation. Preserve the existing component sources and installer safeguards.

## Integration decisions

An independently owned `badge.css` sits beside `badge.tsx` and is imported by the generated component. This keeps the established global stylesheet bytes intact, allowing existing initialized projects to add Badge without a stylesheet migration conflict. The compiler selects the Badge CSS for the saved family; the CLI transforms its destination alongside the component. The registry carries the same CSS bytes.

The shared generated scenario enables Badge examples through `?badges=1`, with both variants, forwarded attributes/ref, escaped text, and a long label. Consumer preparation installs Badge in a fresh process after existing components, across the existing 34 descriptors. Existing scenario helper callers can omit the Badge fixture.

## Acceptance

- Badge compiles deterministically for each supported family, with the correct example and no new runtime dependency versions.
- Existing component, utility, and global stylesheet artifacts retain their bytes.
- Installation preserves project defaults, adjacent source, CSS, manager metadata, and lockfile ownership; dry-run, no-op, and local-edit conflicts cover both TSX and CSS.
- Preview and installed-source fixtures agree in DOM, computed styling, and pixels in both modes.
- Native semantics, forwarded props/ref, escaped text, rendered text contrast, forced colors, and synthetic 200% text enlargement at 320 CSS pixels have attributable checks.
- Documentation distinguishes measured foundation support from the larger stable alpha and human/browser review requirements.

Remote publishing, editor work, Badge recipes, independently scoped Badge presets, liquid glass, and the remaining catalog rows are outside this slice.
