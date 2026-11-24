# Local Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user selects delegation. Steps use checkbox syntax for tracking.

**Goal:** Create and manage four local Next/Vite consumers with real Ombelle showcases and durable per-step evidence.

**Architecture:** A small TypeScript entry point dispatches commands to lifecycle modules. Process execution and evidence are explicit dependencies, allowing failure tests without network activity. Real acceptance uses the built CLI, standalone production builds and Playwright.

**Tech Stack:** Node 24.19.0, pnpm 11.25.0, TypeScript, tsx, Vitest, Playwright; existing dependencies only.

**Spec:** [Approved spec](../specs/2026-11-16-local-playground-design.md)

## Global Constraints
- Default projects: next-fresh, next-shadcn, vite-fresh, vite-shadcn.
- Default root: stable OS temporary ombelle-playground-<checkout-hash> directory; accept --root and --project <id|all>.
- Default preset: packages/catalog/src/presets/ombelle.json.
- All dependency installs disable lifecycle scripts.
- Preserve the shadcn Button through --beside.
- Fresh rows begin without shadcn configuration, existing UI components or Ombelle state.
- Validate ownership and real-path containment before mutations/deletion.
- Uninstall restores baseline; clean deletes owned projects; both retain evidence.
- Use supportedComponentIds, never a duplicated component list.
- Spawn executable/argument arrays; resolve pnpm JavaScript entry on Windows.
- Do not alter public installer behavior, compiler/catalog output or CI matrix.
- Commit with Conventional Commits on feat/local-playground.

## Review Focus
- Paths containing spaces and shell metacharacters must remain literal arguments.
- Failed/interrupted setup must remain diagnosable and must not report downstream success.
- Edited files must block the entire uninstall before any restore occurs.
- Stale PID records and occupied ports must never cause unrelated process termination.
- Catalog growth must update gallery coverage or fail explicitly.

## Task 1: Command model and durable evidence
**Files:** Create scripts/playground/model.ts, arguments.ts, evidence.ts; tests/integration/playground.test.ts.
**Interfaces:** parseArguments(argv: string[], repo: string): Options; matrix: readonly ProjectSpec[]; createRun(root: string, command: string): Promise<RunRecorder>. RunRecorder.step(project: string, name: string, action: () => Promise<void>, prerequisite?: string): Promise<boolean>; finish(): Promise<void>. Options carries command, project IDs, root, preset and component IDs. ProjectSpec carries ID, framework, shadcn flag and port.

- [ ] Write tests rejecting unknown commands/IDs/flags, requiring one project for dev and validating exact matrix selection.
- [ ] Write tests that a failed step records failed, dependent work records skipped without execution, and independent rows still run; assert logs/JSON/Markdown survive reopening and unfinished runs remain interrupted.
- [ ] Run pnpm exec vitest run tests/integration/playground.test.ts; confirm missing-module failures.
- [ ] Implement argument validation before mutations and event persistence before actions. Persist timestamps, durations, operation/cwd, exit/signal and log references; escape Markdown values.
- [ ] Rerun focused tests and commit feat(playground): add command model and durable step reports.

## Task 2: Owned scaffolds and reversible installation state
**Files:** Create scripts/playground/projects.ts and baseline.ts; extend tests/integration/playground.test.ts.
**Interfaces:** projectPath(options: Options, spec: ProjectSpec): string; assertOwned(root: string, spec: ProjectSpec, repo: string): Promise<void>; scaffold(options: Options, spec: ProjectSpec): Promise<void>; snapshot(project: string, baseline: string): Promise<void>; recordManaged(project: string, baseline: string): Promise<void>; restore(project: string, baseline: string): Promise<void>; cleanOwned(options: Options, spec: ProjectSpec): Promise<void>.

- [ ] Add tests for unmarked roots, outside-root markers, symlink escapes, existing setup directories and paths with spaces; confirm failure before writes/deletion.
- [ ] Add tests that fresh scaffolds lack components.json/UI source/Ombelle state, while shadcn scaffolds retain original Button bytes.
- [ ] Add tests for baseline restoration, generated-file removal, unrelated-file preservation and repeated restore. Edit one affected file and assert no other file changes after refusal.
- [ ] Run focused tests and observe new failures.
- [ ] Implement copy/normalization from checked-in fixtures, ownership marker and baseline/managed hash manifests. Exclude Git metadata, dependencies and build caches. Preflight full restore, create recovery backups, then apply. Keep reports separate from deleted roots.
- [ ] Rerun focused tests and commit feat(playground): add owned scaffolds and baseline restoration.

## Task 3: Process execution and server lifecycle
**Files:** Create scripts/playground/process.ts and servers.ts; extend tests/integration/playground.test.ts.
**Interfaces:** execute(request: CommandRequest, recorder: RunRecorder): Promise<CommandResult>; startServer(project: string, framework: 'next' | 'vite', port: number, mode: 'dev' | 'production'): Promise<OwnedServer>; stopServer(server: OwnedServer): Promise<void>. CommandRequest carries executable, args, cwd, timeoutMs and project/step identity. CommandResult carries exitCode, signal and log paths.

- [ ] Add real child-process tests for literal spaces/metacharacters, stdout/stderr persistence, spawn error, nonzero exit, timeout and cancellation.
- [ ] Add tests for occupied ports and stale process identity, asserting unrelated processes remain alive.
- [ ] Run focused tests and confirm failures.
- [ ] Implement shell-free spawning through process.execPath for pnpm/CLI JavaScript entries, bounded timeouts and verified owned process-tree shutdown. Register interruption cleanup and persist incomplete work. Use 15-minute install, 10-minute build and 90-second server-start deadlines; allow internal test overrides.
- [ ] Rerun focused tests and commit feat(playground): record commands and manage owned servers.

## Task 4: Gallery and functional feature views
**Files:** Create scripts/playground/showcase.ts; extend tests/integration/playground.test.ts.
**Interfaces:** writeShowcase(project: string, spec: ProjectSpec, componentIds: readonly string[]): Promise<void>. Generate a shared client module plus framework-specific entry files and separate layout CSS.

- [ ] Test generated imports/sections against supportedComponentIds for fresh and beside layouts; missing examples must throw. Assert direct component links and feature navigation exist.
- [ ] Run focused tests and confirm failures.
- [ ] Implement gallery search, query-state views, light/dark toggle, per-example visible error boundaries and project labels using installed examples. Include original shadcn Button comparison where applicable.
- [ ] Implement dashboard and settings form with state updates, submit feedback and a real generated Dialog. Read installed templates/examples to match their actual API and read fixture-local Next documentation before changing its entry conventions.
- [ ] Rerun focused tests and commit feat(playground): generate component gallery and feature pages.

## Task 5: Orchestration, verification and guide
**Files:** Create scripts/playground/main.ts, commands.ts, verify.ts; modify package.json and README.md; create docs/local-playground.md; extend tests/integration/playground.test.ts.
**Interfaces:** dispatch(options: Options): Promise<number>; verifyProject(project: string, spec: ProjectSpec, run: RunRecorder): Promise<void>. Add playground script invoking tsx scripts/playground/main.ts.

- [ ] Test dispatch with injected process/lifecycle adapters: setup ordering, per-project failure isolation, dependency skips, install/add/theme plans before apply, uninstall dependency-repair failure and cleanup retaining reports.
- [ ] Run focused tests and observe failures.
- [ ] Implement every specified command, prerequisite/version checks, build:packages before local CLI work, safe pnpm installs, preset/hash metadata and supported-component selection. Reject unsafe repeated setup; install regenerates only unchanged managed pages.
- [ ] Implement browser verification with temporary production servers and finally cleanup. Check all catalog sections, search/direct links, light/dark, settings submission and dialog open/close, dashboard controls and page errors. Save screenshots/results and record browser absence as failed evidence.
- [ ] Document commands, local fixture provenance, registry/browser requirements, report locations, ownership/edit conflicts and restoration limits; link guide from README.
- [ ] Run pnpm build:packages, focused tests and pnpm typecheck; resolve failures attributable to the change.
- [ ] Run setup/build/verify for all four real projects. Inspect evidence instead of inferring success from exit alone.
- [ ] Run uninstall for all four and check baseline/shadcn hashes; install/build again; clean disposable owned roots and verify reports survive.
- [ ] Record any environmental blockers and remaining acceptance gaps honestly. Review git diff --check and commit feat(playground): expose and verify local project harness.

## Execution handoff
Recommended method: native execution in this chat. These five tasks share lifecycle/report interfaces, and implementing them sequentially avoids repeated context transfer. Delegation is optional and requires the user's selection. Written-plan review and execution-method selection precede implementation.

## Execution result

Completed natively. Focused checks: 14 tests and TypeScript validation passed. All four apps passed real setup, production builds, browser checks, baseline uninstall/hash verification, and reinstall/build. Dev/stop, repeat add, theme, status, report and clean were exercised. See [measured evidence](../../../evidence/local-playground.md).

Rulings: use a stable external temporary root because the real installer rejects all workspace ancestors; use authenticated server controls rather than saved PIDs; prefer real child-process and recorded consumer tests over a fully mocked lifecycle dispatcher. Reports retain the failed development attempts.
