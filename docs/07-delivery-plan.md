# Delivery Plan

## Delivery strategy

Validate one complete browser-to-project journey before expanding component count. The core risk is divergence between preview, source export, saved preset and later installations. A large catalog does not compensate for failure in that loop.

The following web-alpha planning envelope assumes two experienced engineers, a part-time product designer, and access to accessibility review. Allow roughly 10 to 14 calendar weeks including contingency. This is an effort assumption, not a promised delivery date. Re-estimate after M0; a solo build or an immediate mobile commitment needs a different schedule.

## Milestones

| Milestone | Planning allowance | Deliverable | Exit gate |
| --- | --- | --- | --- |
| M0 Foundation spike | 1 week | Pinned stack, architecture decision, Button and Dialog proof | Preview matches exported and installed artifacts in Vite and Next.js |
| M1 Registry and CLI foundation | 2 weeks | Registry, init/add/theme add, config, lock and safe plans for all four managers | Existing-shadcn theme merge and preset reuse pass; source and manager are preserved |
| M2 Style and component system | 2 to 3 weeks | Twelve components, three stable candidate families, glass experiment | API, state, visual and accessibility evidence meets stable matrix |
| M3 Component editor | 2 weeks | Structured controls, artifact views, recipe export | Customize, export and install produces the same component |
| M4 Preset editor and snapshots | 2 weeks | Global gallery, local export, public immutable publish and resolution | Apply preset, then add another component in a new process successfully |
| M5 Pilot and web alpha | 1 to 2 weeks | User pilot, docs, migrations and release evidence | Acceptance criteria PR1 through PR11 pass for declared support |

The allowances total 10 to 12 weeks before additional contingency. Keep unused contingency available for integration failures instead of expanding scope.

## First sprint backlog

| Ticket | Priority | Owner role | Work and acceptance | Depends on |
| --- | --- | --- | --- | --- |
| F01 | P0 | Tech lead | Pin compatible tooling and upstream edition in a lockfile; create support matrix | None |
| F02 | P0 | Engineer | Create contracts package; validate supplied preset and reject unknown fields | F01 |
| F03 | P0 | Designer and engineer | Define three style token sets and Button plus Dialog visual fixtures | F02 |
| F04 | P0 | Engineer | Compile one exact artifact set for each fixture; verify deterministic bytes | F02, F03 |
| F05 | P0 | Engineer | Build a standard registry item and install through pinned upstream CLI in staging | F01, F04 |
| F06 | P0 | Engineer | Render the same artifacts in a local preview and both consumer fixtures | F04, F05 |
| F07 | P0 | Engineer | Save a preset locally; add Input in a fresh process using that preset | F02, F05 |
| F08 | P0 | Engineer | Hash an installed file, edit it, and prove the next operation reports a conflict | F05 |
| F09 | P0 | Accessibility reviewer | Check Button and Dialog keyboard behavior in all three style fixtures | F03, F06 |
| F10 | P1 | Tech lead | Record installer adapter decision and known gaps before M1 | F05 through F09 |
| F11 | P0 | Engineer | Exercise npm, pnpm, Yarn and Bun runners and dependency adapters without changing project manager or lockfile format | F01, F05 |
| F12 | P0 | Engineer | Merge a preset into an existing shadcn globals.css, retain unrelated CSS and source, and repeat with no changes | F02, F04, F05 |

Keep the first sprint centered on these proofs. A temporary local preview is sufficient; the full production website is not a prerequisite for M0.

## Subsequent epics

Registry and CLI work includes namespace output, dependency graph checks, path and alias transforms, parsed CSS token merging, transactional source writes, npm/pnpm/Yarn/Bun adapters, documented recovery, dry-run output, and exact version provenance. All four managers are initial release work, not beta expansion. Include the already initialized shadcn path and stylesheet-declaration provenance from the beginning.

Catalog work includes all component APIs, slot recipes, light and dark states, documentation, style compatibility metadata, contrast validation, native HTML forms, and a glass fallback experiment.

Badge is the first added M2 catalog row after the three-component foundation. Its default/destructive variants use native span semantics and the three implemented families, with shared preview and installed-source fixtures. The [Badge documentation](components/badge.md) describes its installation and ownership boundaries; [its evidence](evidence/badge.md) records the measured coverage. The remaining eight component rows and the broader stable release gates remain M2 work.

Editor work includes generated control metadata, undo and redo, draft recovery, isolated preview, stale-response handling, export bundles, recipe scoping, diagnostics, snapshot publishing, and immutable command generation.

The private local Button slice `add button --preset <local.json>` is implemented before editor integration. It shares reviewed scoped source/style generation with recipes, records independent preset provenance, and preserves project defaults, ordinary components, and recipes. [Local usage](foundation-local-usage.md#component-scoped-button-presets) documents conflicts, dry-run, no-op, manager, and style boundaries; [the measured run](evidence/component-scoped-button-presets.md) records the declared consumer and preview/npm/pnpm browser matrix. This does not complete the wider alpha catalog or editor milestone. Saved-code resolution remains pending until immutable snapshot resolution exists, along with remote publishing and editor integration. Other scoped components, portal propagation, nested independent themes, and arbitrary CSS/style overrides remain outside this slice. The future editor exposes the same preset code for component-scoped installation or global `theme add` installation, with scope clearly labelled.

Release work includes external pilot sessions, installation troubleshooting, license inventory, upgrade notes, a security reporting route, and a repeatable publishing pipeline. Avoid accounts and billing until basic adoption provides a reason to add them.

## Validation matrix

| Area | Automated coverage | Manual or review coverage |
| --- | --- | --- |
| Contracts and compiler | Schema negatives, merge precedence, normalization, deterministic output | Token and API review |
| CLI | Clean and initialized apps; four managers; token merges; idempotence, conflicts, paths, failures, concurrency and dry-run | New setup and existing-shadcn commands on a clean machine |
| Components | Semantics, state transitions, form behavior, accessibility scans | Keyboard, NVDA, VoiceOver and visual state review |
| Styles | Light and dark screenshots, forced-colors and reduced-motion fixtures | Contrast in context, glass fallback and device scrolling |
| Editor | Keyboard flows, draft recovery, export parity, API errors | Usability sessions with developers |
| Native later | Platform-specific unit and integration tests | iOS and Android devices with VoiceOver and TalkBack |

Run stable components across the declared browser range, initially current and previous major Chrome, Firefox, Safari and Edge, with exact versions captured in release evidence. Browser coverage is a project target that must be maintained, not a claim that every platform is already supported.

## Release process

1. Review source, dependency and contract changes and attach migration notes when needed.
2. Build exact catalog and registry artifacts from a committed lockfile.
3. Run compiler, consumer, CLI, visual and accessibility checks for the declared matrix.
4. Review manual evidence and status labels; keep experimental entries separate.
5. Publish immutable artifacts, then packages and catalog metadata referencing them.
6. Smoke-test the public install path in a clean project before updating the website's default release.

Keep a release manifest linking the source commit, catalog version, CLI and compiler versions, artifact hashes, and evidence. Rollback changes the website's recommended release, not the bytes of an already published immutable release.

## After web alpha

Web beta adds tested JSX output, more components, and explicit diff/update workflows. npm, pnpm, Yarn and Bun are already required for alpha. Prioritize complex selects, menus, popovers, radio groups, and form composition based on pilot feedback.

The next platform milestone is React Native discovery and a small native alpha. Share portable tokens and documentation but estimate the implementation independently after testing four components on iOS and Android. Do not give native a fixed delivery date based on the web component count.

Then add a small set of blocks: login form, settings form, pricing section, and dashboard overview. Blocks reuse component IDs and the project preset and include responsive and accessible compositions. Clearly identify example-only authentication and data flows; do not make mock UI look like a production backend integration.

Finally add agent documentation and skills for discovering components, installing safely, applying presets, composing blocks, and checking accessibility. Publish machine-readable catalog metadata and `llms.txt` early, then add installable skills after CLI contracts stabilize. A new MCP service is optional; first evaluate compatibility with the existing shadcn registry tooling.

## Pilot release gate

Release web alpha when pilot users can choose a style, configure both modes, install source, add another component using the saved preset, install a scoped recipe, and preserve a local edit. Fresh setup and the theme-only existing-shadcn path must pass with npm, pnpm, Yarn and Bun. Verify preservation of unrelated CSS, upstream config, component source and the chosen manager's lockfile. The supported matrix must have no known blocking accessibility or export-parity defect. Experimental glass limitations must be visible in the catalog and export flow.
