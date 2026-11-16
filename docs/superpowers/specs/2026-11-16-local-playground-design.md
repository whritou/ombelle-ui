# Four-project local playground

Status: proposed written spec after in-chat design approval; implementation awaits written-spec review.

## Outcome
Provide persistent next-fresh, next-shadcn, vite-fresh and vite-shadcn projects with Ombelle installed, every supported component visible, interactive feature pages, automatic evidence and management/uninstall commands.

## Setup
Expose pnpm playground <command>. Default storage is .artifacts/playground with projects, state, baselines and runs directories. Allow --root. Reuse checked-in framework scaffolds and genuine Radix shadcn fixtures; report provenance and normalization. Fresh rows begin without shadcn configuration, existing UI components or Ombelle state. Retain framework/Tailwind/alias essentials. Require pinned Node/pnpm, build packages first, and use the built local CLI. Default preset is ombelle.json; support --preset <local-json>. Fresh rows use init, shadcn rows theme add. Install all supportedComponentIds, preserving the shadcn Button through --beside. Record dry-run plans before apply. All dependency installs disable lifecycle scripts.

## Commands
Commands accept --project <id|all>, default all except dev (one project required).
- setup: scaffold, baseline install/snapshot, install Ombelle, generate pages, build; refuse existing roots.
- install: install/reinstall in prepared or uninstalled rows with edit protection.
- add <ids...>: validate IDs, plan/apply additions and update gallery.
- theme --preset <file>: plan/apply supported theme operation.
- dev / stop: foreground development server / stop a verified owned server.
- build / verify: production build / build and browser-check temporary production servers.
- status / report: observed state and URLs / regenerate Markdown evidence.
- uninstall: restore pre-Ombelle baseline, preserving the standalone app.
- clean: delete validated owned projects, retaining reports and baselines.
- help: usage and examples.

Assign distinct stable loopback ports; report collisions without stopping unrelated processes. Validate arguments before mutations. Spawn executable/argument arrays, using the repository pnpm JavaScript-entry approach on Windows.

## Showcase
Use a shared client showcase in Next App Router and Vite with query-state navigation and direct links. Provide landing navigation, searchable gallery, stable per-component anchors, generated examples for every installed catalog ID, light/dark controls and project/preset labels. Missing examples fail generation; example runtime errors remain visible and fail verification. Show original shadcn and Ombelle Buttons together.

Compose a dashboard from cards, badges, progress, tabs and table, plus a settings form using labels, inputs, checkbox/switch, select and confirmation dialog. Controls update local state, submit shows feedback, overlays open/close. No backend. Respect actual aliases and beside paths; keep layout CSS separate from managed theme CSS.

## Evidence
Each invocation gets a unique run directory, append-only JSONL lifecycle events, JSON summary, Markdown report and per-step stdout/stderr logs. Persist running state before work; finalize reports after every step. Record project, operation/command/arguments, cwd, timestamps, duration, status, exit code/signal, error, prerequisite and log links. Statuses: running, passed, failed, skipped, interrupted. Detect incomplete prior runs. Include actual toolchain/framework versions, preset hash and component scope. Link screenshots and URLs and escape report values.

Continue independent rows after failures, skip dependent steps with reasons, and return nonzero on failure. Bound installation/build/startup/browser execution, terminate verified owned child trees on timeout/interruption, and finalize evidence. Always stop temporary verification servers. Distinguish browser evidence from build evidence; record network/browser blockers honestly.

## Ownership and restoration
Markers identify schema version, repository, project ID and resolved root. Before mutation/deletion validate known ID, marker and real-path containment; reject symlink escapes and unmarked directories. Never reuse a stale PID without verifying ownership.

Snapshot baseline source/configuration, manifest and lockfile before Ombelle; exclude node_modules, caches and Git metadata. Record baseline and last-managed hashes. Uninstall preflights the whole restore and refuses affected user edits. Preserve unrelated added files. Back up affected files, remove only tracked generated files, restore baseline files including CSS/entries/manifest/lockfile, then reconcile dependencies from the restored lock with scripts disabled. Preserve the shadcn Button. Repeated uninstall is a recorded no-op. Retain recovery backups on failure and distinguish restored files from incomplete dependency repair. Clean validates ownership/paths and stops verified servers; evidence survives deletion.

## Implementation and acceptance
Separate orchestration, process/evidence, scaffold/baseline lifecycle and showcase generation under scripts/playground. Add one root package script and a README-linked user guide. Reuse existing Node, tsx, Vitest and Playwright; no new production dependency, public CLI behavior, compiler/catalog changes or CI matrix restructuring.

Focused tests cover parsing, matrix selection, failure continuation/skips, interruptions, reports, Windows arguments, ownership/path/symlink protection, edit conflicts, restoration and report retention. Fake runners are not real framework evidence.

Real acceptance: setup/build all four, browser-check catalog coverage, search/direct links, light/dark, feature interactions and absence of page errors, with screenshots. Uninstall all four, verify baseline and shadcn hashes, reinstall/rebuild, then clean disposable owned roots. Run focused tests and typecheck; build packages before tests importing dist. Document environment blockers; do not claim the full foundation gate from focused checks.
