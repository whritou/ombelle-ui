# Forms, navigation and overlays implementation plan

> **For agentic workers:** Use the Superpowers execution workflow. Steps use checkbox syntax for tracking.

**Goal:** Ship six new catalog components and all five variant additions selected in chat.

**Architecture:** Reviewed standalone templates, family CSS, shared catalog/compiler and schema-driven recipes. Native presentation templates share editions; interactive overlays have dedicated primitive editions.

**Tech Stack:** React 19.3.1, TypeScript, Radix, Base UI 1.9.0, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-forms-navigation-overlays-design.md`

## Global constraints

- Node 24.19.0 and pnpm 11.25.0.
- All five style families; liquid glass is experimental.
- Preserve native semantics, focus behavior, source ownership and deterministic output.
- New IDs have website minimum CLI 0.7.2; no publication or deployment.
- Edit schema/catalog inputs and regenerate their generated copies.

## Review focus

- Disabled paging links must not navigate or enter the tab order.
- Sheet logical sides must follow RTL and stay usable with long content.
- Alert Dialog must initially focus cancellation and resist outside clicks.
- Input Group action buttons must not submit forms by default.
- Tabs appearance must survive recipe export without changing selection behavior.

## Task 1: Native composition templates

Files: new catalog templates, family styles, focused rendered tests and component docs for `input-group`, `breadcrumb`, `pagination`.

- [x] Write rendered semantics/default tests and observe failure.
- [x] Implement the exact exported APIs in the spec with standalone imports.
- [x] Match family tokens and implement forced-color/glass fallbacks.
- [x] Run the focused rendered tests and document the APIs.

## Task 2: Overlay templates

Files: new Radix/Base templates, styles, rendered tests and docs for `sheet` and `alert-dialog`; the coordinator owns dependency registration and lockfiles.

- [x] Write trigger/default/semantics tests and observe failure.
- [x] Implement the exact APIs using dedicated primitives and logical CSS.
- [x] Implement family states, bounded scrolling, focus rings and fallbacks.
- [x] Run focused tests; document composition differences and keyboard behavior.

## Task 3: Catalog/compiler/editor integration and Tabs

Files: component IDs, catalog index/manifest, compiler examples/specimens, recipe schema/appearance metadata, website catalog, preview generation, Tabs templates/styles, tests.

- [x] Write a compiler/recipe test for the new IDs and Tabs appearance; observe failure.
- [x] Register components, dependencies, slots and five-family support.
- [x] Add schema branches, validated defaults, specimen descriptions and editor metadata.
- [x] Add compiler examples, catalog pages and generated preview gallery cases.
- [x] Add contained/underline TabsList appearance to both editions and recipe export.
- [x] Regenerate packages and run focused compiler/recipe tests.

## Task 4: Verification and review

Expanded scope before verification:

- [x] Implement Toast with both primitive editions, all five families, recipe controls, usage and browser behavior evidence.
- [x] Implement Card appearances, Table density/striping and Badge size/dot with default-preserving tests.
- [x] Implement Alert status intents with optional palette pairs and reviewed fallback colors; verify existing presets remain byte-identical.
- [x] Expand schema/specimen/preview/docs coverage for all additions.

- [x] Build packages, check types, and pass the full unit suite (1,628 tests).
- [x] Exercise the complete integration inventory and record its outcome (606 tests across 71 files; seven failed cases passed in isolated retries).
- [x] Build generated preview and product app.
- [x] Run focused browser checks for keyboard, RTL, disabled links, group inputs and overlays (26 cases), plus explicit recipe customization (12 cases).
- [x] Review final changes and correct material findings.
- [x] Record exact verification evidence, update documentation and commit using Conventional Commits.
