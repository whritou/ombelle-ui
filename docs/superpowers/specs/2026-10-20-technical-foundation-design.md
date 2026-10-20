# Ombelle technical foundation design

Date: 20 October 2026

Status: Approved for implementation planning on 20 October 2026. Implementation requires subsequent plan review and execution-method selection.

## 1. Intent and agreed constraints

Ombelle is a source-distributed React UI system. Developers choose a visual family, save a project preset, and install editable components whose appearance agrees with the preview and subsequent installations.

The user selected the technical foundation as the first deliverable and will build solo with Codex. The immediate objective is to prove the complete preview-to-project flow before expanding the catalog or building the production website.

The selected approach is a small TypeScript workspace with a shared deterministic generator and a thin project CLI. The existing documentation remains the broader product roadmap. This specification narrows the foundation milestone; it does not reduce the eventual alpha requirements.

At initial inspection, the starter workspace contained documentation, schemas, and examples, with no application implementation, package manifest, lockfile, or Git repository. The user subsequently added `D:/Documents/GitHub/ombelle-ui` as the project repository; at planning inspection it contains an initial commit and a license. Carry the approved planning baseline into that repository. Namespaces, domains, and sample release numbers in the starter are illustrative and must not be treated as published services.

## 2. Foundation scope

### Included

- React web components authored as TSX: Button, Dialog, and Input.
- Flat and neo brutalism style fixtures, each in light and dark modes.
- Local JSON presets, schema validation, semantic validation, and normalized project defaults.
- One shared compilation path producing source, CSS, dependency metadata, and hashes.
- A local Vite preview that renders generated component artifacts.
- Independent Vite and Next.js App Router consumer fixtures using Tailwind v4.
- Local registry generation and a pinned shadcn integration experiment.
- A narrow CLI for project initialization, component addition, theme application, and dry-run planning.
- Preservation of local source edits and unrelated stylesheet content.
- Automated checks for determinism, preset reuse, installation behavior, visual parity, and keyboard behavior.

### Deferred

The production documentation website, interactive component editor, arbitrary TSX execution, remote snapshots, authentication, database, deployment, public package publication, JSX conversion, React Native, composed blocks, agent services, and update/migration commands are outside this milestone.

Minimalist and experimental liquid glass remain later catalog work. npm, Yarn, and Bun remain alpha support requirements; pnpm is the initial foundation verification target. Passing this milestone must not be described as passing the complete alpha support matrix.

## 3. Approach and alternatives

Choose a shared generator with a thin CLI. This directly tests Ombelle's distinguishing requirements: preview/export parity, saved defaults, and safe installation. It introduces a few explicit package boundaries but keeps generation independently testable.

A registry-only approach would deliver installable source sooner but would not prove Ombelle's preset and provenance guarantees. A full website-first approach would create visible product progress while adding editor, routing, and hosting decisions before the hardest integration assumptions are tested.

## 4. Stack

| Area | Foundation choice | Boundary |
| --- | --- | --- |
| Language | TypeScript and TSX | React web output only |
| Runtime | A supported Node LTS compatible with all selected tooling | Exact version pinned at setup |
| Workspace | pnpm workspaces and package scripts | No task orchestrator initially |
| Components | React and one pinned Radix-based shadcn edition | One primitive family; one public API per component |
| Styling | Tailwind CSS v4, semantic CSS variables, reviewed slot rules | Presets contain validated design data, not arbitrary CSS |
| Contracts | Existing JSON Schema draft 2020-12 contracts with Ajv's matching validator | Shared inferred/generated or equivalently checked TypeScript bindings |
| Preview | Vite and React | Local generated-artifact demonstration |
| Consumer fixtures | Vite React and Next.js App Router | Both consume installed local source |
| CSS updates | PostCSS parsing and declaration-level provenance | Preserve unrelated stylesheet content |
| Tests | Vitest, Playwright, axe integration | Focus on contracts and user-visible guarantees |
| Distribution | Static shadcn-compatible registry JSON | Local distribution first |

Pin compatible exact versions and commit a lockfile during implementation setup. This specification selects technologies rather than claiming an untested version combination is compatible. Setup must record the selected Node, pnpm, React, TypeScript, Vite, Next.js, Tailwind, Radix, shadcn, validator, parser, formatter, and test-tool versions.

The production website framework and hosting remain outside the foundation decision. Next.js is a required consumer fixture here, not a commitment to deploy the website on a particular provider.

## 5. Workspace and ownership

| Unit | Responsibility | Permitted dependencies |
| --- | --- | --- |
| `packages/contracts` | Preset, configuration, artifact, installation-plan, lock, and diagnostic contracts | Validation and checked type bindings |
| `packages/catalog` | Reviewed component templates, dependency requirements, built-in presets, style rules, and supported-state fixtures | Contracts and selected component primitives |
| `packages/compiler` | Validate and normalize inputs; select reviewed templates; generate source, CSS, metadata, and hashes | Contracts, catalog, pinned normalization and formatting utilities |
| `packages/cli` | Detect projects; produce plans; transform aliases and paths; merge CSS; apply safe writes and package operations | Contracts, compiler, filesystem/process adapters, upstream registry adapter |
| `apps/preview` | Render generated artifacts with controlled fixture state | Generated output and component runtime dependencies |
| `fixtures/vite` and `fixtures/next` | Verify independently installed consumer source | Installed local files and declared runtime dependencies |

Tokens and style definitions begin inside the catalog. Registry generation begins as a build module consuming compiler output. Split these into separate packages only when an independent responsibility or release boundary warrants it.

The compiler performs no filesystem writes, subprocess execution, or network access. Environment-specific hashing implementations must agree on the same SHA-256 bytes. Operational timestamps and absolute machine paths do not enter generated content.

## 6. Generation and preview flow

1. Read a local preset and exact bundled catalog/compiler release identifiers.
2. Validate JSON shape and reject unknown fields and unsupported versions.
3. Validate semantic values, component availability, style support, colors, and bounded design settings.
4. Resolve reviewed defaults, apply typed overrides, and materialize a normalized preset.
5. Generate TSX, required CSS, usage examples, dependency requirements, and provenance in stable order.
6. Format with one pinned configuration and calculate artifact hashes.
7. Use the resulting artifact set for preview, export, and installation planning.

The foundation preview uses generated modules imported through the normal Vite build pipeline. It does not independently recreate the component design. A local generation command writes preview fixture output before the preview starts; changing a preset regenerates those files. This deliberate foundation limitation avoids building a browser TSX execution engine or full interactive editor.

Compilation output is independent of consumer paths. The installer performs deterministic path and alias transforms and records final installed-file hashes. Comparisons distinguish canonical generator bytes from transformed consumer bytes.

Dialog portal content must receive the selected application theme. Verify overlay, content, focus ring, and light/dark behavior in each fixture. Nested recipe scoping is deferred.

## 7. Project state and CLI contract

Retain the starter's configuration concepts:

- `ui-library.config.json`: target, language, paths, preset location, stylesheet integration, and package-manager policy.
- `ui-preset.json`: full normalized local preset.
- `ui-library.lock.json`: exact generator/catalog identity, preset hash, artifact destinations, transformed hashes, and managed CSS declaration provenance.
- Existing `components.json`: upstream configuration and aliases, preserved rather than replaced.

The initial command surface is `init --preset <local-file>`, `add <components>`, and `theme add <local-file>`, with `--cwd`, `--dry-run`, and machine-readable output. These are proposed interfaces; final package and binary names are not prerequisites for a local executable.

`init` targets an existing supported consumer app; it does not create the app. If shadcn is already initialized, it uses the existing-project theme plan instead of reinitializing upstream configuration. `add` always reads local saved state. `theme add` updates compatible CSS and the local normalized preset without rewriting component source or installing dependencies.

The initial installation path supports the explicitly targeted pnpm fixture apps. Detect conflicting package-manager evidence and unsupported configurations before writes. Do not silently convert npm, Yarn, or Bun projects. Adding their full adapters and fixtures is required before claiming alpha support.

Dependencies remain governed by the consumer's ordinary package-manager lockfile. The Ombelle lock records provenance rather than replacing package-manager resolution.

## 8. Upstream integration experiment

Evaluate documented shadcn registry APIs behind a versioned adapter. Reuse documented resolution and schema facilities where practical. Do not import undocumented implementation internals.

Prove one generated registry item can be installed through the pinned upstream interface in an isolated fixture. Capture the transformed files and intended dependency effects before selecting the production adapter strategy.

An API that writes files or runs dependency installation cannot be used as a read-only planner. If upstream installation cannot satisfy Ombelle's conflict and dry-run guarantees, retain upstream format compatibility and implement the narrow supported local application path explicitly. Record the experiment and selected boundary in an architecture decision before expanding the CLI.

The foundation may build standard registry JSON locally. It requires no public domain, remote snapshot service, or package publication.

## 9. Installation safety and failure behavior

Separate inspection, planning, and application. A plan lists file creates, changes, no-ops, conflicts, token differences, dependency changes, and diagnostics. Invalid presets, ambiguous aliases or CSS entries, unsupported versions, and conflicting project-manager evidence fail before mutation.

Dry-run performs no filesystem writes, cache writes, or package-manager operations. Foundation resolution uses local bundled inputs and reports whether any adapter experiment requires network access.

For component files, an identical repeated addition is a no-op. A pre-existing file without accepted provenance, or a changed installed-file hash, is a conflict. A confirmation flag must not bypass those conflicts.

For global CSS, update the configured light/dark token declarations and required Tailwind mappings through a parser. Preserve unrelated declarations, selectors, imports, and comments. Ambiguous duplicate managed declarations must produce a diagnostic rather than a guessed replacement. Record managed declarations individually; unrelated stylesheet edits do not count as source conflicts. A later edit to a managed declaration requires conflict resolution. Repeating an identical theme application is a no-op.

Before applying, acquire a project operation lock and recheck inspected file content. Reject traversal and destinations escaping the targeted project, including symlink escapes. Apply reviewed source/config changes with staged files and recoverable backups. Invalid input, conflicts, and precondition changes leave the project unchanged.

If package installation fails, report incomplete status and recovery information. Restore touched source/configuration where safe and retain enough transaction information to diagnose partial effects. Do not claim that external package-manager caches, scripts, or dependency state can be rolled back atomically.

Use stable diagnostics distinguishing validation, unsupported configuration, file conflicts, resolution/integrity errors, and dependency-install failures. Include the affected path or JSON pointer and a concrete next action.

## 10. Verification and exit criteria

| Proof | Required evidence |
| --- | --- |
| Contracts | Existing examples validate; unknown fields, bad semantic values, unsupported releases, and unavailable component/style combinations fail clearly |
| Determinism | Separate generation runs with identical pinned inputs produce identical canonical artifact bytes and hashes |
| Preview integrity | Preview imports generated modules; exported artifacts match the generation manifest |
| Consumer parity | Both installed fixtures build and reproduce the preview's controlled component states in both styles and modes |
| Persistent defaults | A new CLI process installs Input using saved preset data with no repeated preset flag |
| Source preservation | A manually edited installed component produces a conflict and remains byte-for-byte unchanged |
| Theme preservation | Theme application retains unrelated CSS and component source; repeat application makes no changes; edited managed tokens conflict |
| Plan safety | Dry-run leaves fixture trees unchanged and starts no package-manager operation |
| Path and concurrency safety | Escaping paths are rejected; concurrent operations cannot interleave writes; changed preconditions invalidate the plan |
| Accessibility | Button has correct semantics and visible focus; Dialog traps focus appropriately, closes with Escape, and restores focus; Input has an associated label; axe scans cover fixture states |
| Consumer independence | Installed source builds and renders without an Ombelle service or workspace package import |
| Recovery | A simulated write failure and a dependency failure produce honest failure status and verified recovery behavior |

Use controlled viewport, fonts, animation settings, and state for screenshot comparisons. Check generated-file identity and relevant computed styles alongside visual evidence so matching demonstrations cannot conceal separate implementations. Assert expected consumer-specific alias transformations instead of requiring transformed TSX to have identical bytes everywhere.

Manual keyboard review is required for Dialog in each style. Automated scans do not constitute complete accessibility certification. Record browser and tool versions with evidence. Broader browser and screen-reader coverage remains an alpha release gate in the existing delivery plan.

## 11. Delivery sequence

1. Establish the workspace in the existing Git repository: pin tooling, validate contracts, and create build/check commands.
2. Prove generation: Button in flat and neo brutalism, both modes, with reproducibility evidence.
3. Prove integration: add Dialog, generate a registry item, evaluate the upstream adapter, and install into both consumers.
4. Prove state and safety: install Input in a fresh process, apply a theme to an existing shadcn fixture, verify conflicts, idempotence, dry-run, and recovery.
5. Review foundation evidence and revise the broader delivery estimate before adding catalog/editor scope.

These are dependency-ordered milestones rather than calendar promises. Estimate individual implementation tasks in the subsequent plan after this specification is approved. Keep Codex tasks small enough to review as one coherent change with its own observable acceptance result.

## 12. Review handoff

The user approved this document for writing the detailed implementation plan. Execution method selection occurs after that plan is reviewed. No scaffolding, dependency installation, external provisioning, or product implementation is part of writing this specification.

The original specification was saved in the starter workspace without a commit. The project now has a separate Git repository at `D:/Documents/GitHub/ombelle-ui`; preserve its existing history and license, and include the planning baseline there without reinitializing Git.

## References

- Existing product baseline: `docs/01-product-requirements.md`, `docs/02-system-architecture.md`, `docs/04-presets-and-contracts.md`, `docs/05-cli-specification.md`, `docs/07-delivery-plan.md`, and `docs/10-installation-and-theme-merging.md`.
- [shadcn documented registry APIs](https://ui.shadcn.com/docs/registry/api-reference): documented resolution, installation, schemas, and their boundaries; checked 20 October 2026.
- [shadcn registry item format](https://ui.shadcn.com/docs/registry/registry-item-json): source and theme distribution metadata; checked 20 October 2026.
- [Vite guide](https://vite.dev/guide/): preview tooling and installation prerequisites; checked 20 October 2026.
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation): consumer fixture setup; checked 20 October 2026.
- [Tailwind compatibility](https://tailwindcss.com/docs/compatibility): browser compatibility constraints to capture in support evidence; checked 20 October 2026.
