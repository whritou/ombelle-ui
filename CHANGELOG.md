# Documentation Changes

## Unreleased — 21 October 2026

- Add local Button recipe installation with separate source, scoped light/dark CSS, saved props/content, and accessible loading behavior.
- Preserve project presets, ordinary components, and recipe provenance through later additions and compatible theme changes; retain conflict and transaction safeguards.

- Define `add button --preset <code-or-file>` as component-scoped preset selection, preserving project defaults, global styling, and other installed components.
- Use the same immutable preset reference for a scoped component or a project-wide `theme add`; saved codes are argument values, not flag names.
- Retain local JSON as an offline product workflow and distinguish presets from recipes that also save props, content, and overrides.
- Specify Button-first scope, provenance, conflict handling, editor export, and validation requirements. These commands remain planned; the current CLI rejects `--preset` on `add`.

## Version 0.2 on 19 October 2026

- Make npm, pnpm, Yarn and Bun mandatory for the first release.
- Add an existing-shadcn installation path using `theme add <preset>` and a direct merge into the configured global CSS file.
- Preserve upstream initialization, aliases, component source, unrelated CSS and the project's package manager and lockfile.
- Save the resolved preset during theme application so future library components inherit it.
- Add package-runner examples, a registry theme example, CSS before and after examples, and release criteria for the merge behavior.
- Distinguish a compatible token update from a full visual-family conversion that needs component changes.

The updated commands and guarantees remain development requirements, not an implemented CLI.
