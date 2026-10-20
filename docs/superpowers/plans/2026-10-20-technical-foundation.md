# Ombelle Technical Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that generated Button, Dialog, and Input components preserve appearance, saved defaults, and local edits across a local preview and independent Vite/Next.js consumers.

**Architecture:** A pure compiler consumes validated presets and reviewed catalog templates. A thin CLI separately inspects projects, plans deterministic transformations, merges managed CSS declarations, and applies changes safely. Preview, export, and registry generation consume the same canonical artifacts.

**Tech Stack:** TypeScript/TSX, compatible pinned Node LTS and pnpm, React, a Radix-based shadcn edition, Tailwind v4, JSON Schema draft 2020-12 with Ajv, PostCSS, Vitest, Playwright, and axe.

**Spec:** [Approved technical foundation design](../specs/2026-10-20-technical-foundation-design.md). Read both documents before execution.

**Execution method:** Native execution, selected by Codex on 20 October 2026 at the user's request to review the plan and choose a method. Use `superpowers:executing-plans` when implementation is authorized. This review updates planning documents only.

## Global Constraints

- Project root: `D:/Documents/GitHub/ombelle-ui`; preserve the existing Git history and `LICENSE`. Do not initialize another repository.
- "React web components authored as TSX: Button, Dialog, and Input."
- "Flat and neo brutalism style fixtures, each in light and dark modes."
- "The compiler performs no filesystem writes, subprocess execution, or network access."
- "Dry-run performs no filesystem writes, cache writes, or package-manager operations."
- "A confirmation flag must not bypass those conflicts."
- "npm, Yarn, and Bun remain alpha support requirements; pnpm is the initial foundation verification target."
- "The production website framework and hosting remain outside the foundation decision."
- "Pin compatible exact versions and commit a lockfile during implementation setup."
- "Automated scans do not constitute complete accessibility certification."
- Do not publish packages, provision services, deploy, build a full editor, or expand the catalog during this plan.
- Preserve the user instruction: when interacting with Cloudflare, use `cf` unless the project has a Wrangler configuration file. This foundation requires no Cloudflare interaction.
- Schemas remain the public contract. Do not replace draft 2020-12 validation with an incompatible default Ajv instance or a second independently authored schema.
- Commands below run from the project root in PowerShell. Script names are interfaces to create, not claims that they exist today.

## Review Focus

1. Windows paths, case-insensitive collisions, and junction escapes must not write outside the targeted app (Tasks 5 and 7).
2. Duplicate managed declarations, alternate dark selectors, and unrelated stylesheet edits must not cause guessed or destructive theme replacements (Task 6).
3. A file changed after planning, or a second CLI process, must not invalidate source ownership guarantees (Task 7).
4. React Dialog portals and the Next.js server/client boundary must preserve theme and keyboard behavior (Tasks 2 and 9).
5. A package-manager failure must produce honest partial-effect recovery, rather than a success message or a claim of complete dependency rollback (Tasks 7 and 8).

## File Map

| Paths | Responsibility |
| --- | --- |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.node-version`, `.gitignore`, `tsconfig.base.json`, `vitest.config.ts` | Pinned workspace and checks |
| `schemas/`, `examples/`, `docs/01-*.md` through `docs/10-*.md` | Existing baseline; retain rather than invent replacement contracts |
| `packages/contracts/src/{types,validate,diagnostics,index}.ts` | Shared data types, schema/semantic validation, stable diagnostics |
| `packages/catalog/src/{manifest,index}.ts`, `templates/`, `presets/`, `styles/` | Reviewed component source, style/token data, release manifest |
| `packages/compiler/src/{resolve,compile,canonicalize,hash,index}.ts` | Pure normalization and generation |
| `packages/cli/src/registry/{build,adapter}.ts` | Registry output and isolated upstream boundary |
| `packages/cli/src/project/{inspect,paths,transform}.ts` | App detection and target transforms |
| `packages/cli/src/plan/{components,theme}.ts` | Read-only installation and CSS planning |
| `packages/cli/src/apply/{transaction,manager}.ts`, `src/{main,format}.ts` | Safe application, pnpm execution, command routing |
| `apps/preview/`, `fixtures/vite/`, `fixtures/next/` | Generated preview and independent consumers |
| `tests/helpers/`, `tests/integration/`, `tests/e2e/`, `playwright.config.ts` | Temporary projects, subprocess flows, parity and accessibility checks |
| `scripts/{generate-preview,prepare-consumers}.ts`, `.github/workflows/foundation.yml`, `docs/evidence/` | Reproducible generation, verification, evidence |

Each package gets its own `package.json` and `tsconfig.json` when first introduced. Internal package names are `@ombelle/contracts`, `@ombelle/catalog`, `@ombelle/compiler`, and `@ombelle/cli`; they are private workspace identities, not a reserved public namespace. Use ESM and compile the CLI to Node-executable JS. Source-distributed components may not import these packages.

## Task 1: A runnable workspace with validated public contracts

**Files:** Create root tooling files from the map, `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/src/{types,validate,diagnostics,index}.ts`, `packages/contracts/test/validate.test.ts`, and `docs/decisions/0001-toolchain.md`. Preserve existing schemas/examples; update only if a contract bug is demonstrated.

**Interfaces:** Export schema-derived `Preset`, `ComponentId = 'button' | 'dialog' | 'input'`, and `StyleFamily = 'flat' | 'neo-brutalism'` for the supported foundation catalog. Export `validatePreset(input: unknown): Preset` and `FoundationError` with `code`, `message`, optional `path`, and `nextAction`. A schema-valid style outside the foundation catalog is rejected by catalog resolution, not by silently narrowing the original public schema.

- [x] Select compatible exact versions using official package documentation and the host runtime. Record versions and upstream edition/style identifier in `0001-toolchain.md`. Audit new dependencies before installation according to the applicable dependency skill. Create the workspace and install tooling, schema-derived typing support, and Ajv's 2020-12 validator; commit the pnpm lockfile. Do not guess the final upstream style identifier.
- [x] Add a failing test that `validatePreset(existingExample)` preserves the example's `styleFamily`, while an extra top-level `surprise: true` and `design.radiusRem: 3` each throw `FoundationError` with code `INVALID_DATA` and the offending JSON pointer. Add syntactically plausible but numerically invalid OKLCH values and non-finite numbers to the semantic rejection cases.
- [x] Run `pnpm exec vitest run packages/contracts/test/validate.test.ts`; expect missing implementation failures after the runner is configured, not an infrastructure error.

```ts
expect(validatePreset(existingExample).styleFamily).toBe('neo-brutalism')
expect(() => validatePreset({ ...existingExample, surprise: true })).toThrow(FoundationError)
```
- [x] Implement `validatePreset` using the existing schema plus semantic checks. Keep validation independent of browser/Node I/O. Derive or generate checked types from the schema. Define root `build:packages` for dependency-ordered library/CLI builds, `build`, `typecheck`, `test:unit`, and `test:integration`; use non-watch test mode. Exclude Playwright specs from Vitest discovery. The default `test` script must build packages before subprocess integration tests; register only scripts for packages/tests that exist at the current task.
- [x] Run `pnpm typecheck` and the targeted test; require passing results. Record that the schema permits four visual families but the foundation catalog supports two.
- [x] Commit the contract deliverable and tooling as `build: establish workspace and validated preset contracts` using explicit file paths.

## Task 2: A reviewed three-component catalog

**Files:** Create `packages/catalog/package.json`, `packages/catalog/tsconfig.json`, `packages/catalog/src/{manifest,index}.ts`, `packages/catalog/src/templates/{button,dialog,input}.tsx`, `packages/catalog/src/presets/{flat,neo-brutalism}.json`, `packages/catalog/src/styles/{flat,neo-brutalism}.css`, and `packages/catalog/test/catalog.test.ts`.

**Interfaces:** `getCatalog(release: string): Catalog` returns exact release defaults, supported styles, and `ComponentTemplate` entries containing ID, TSX content, logical path, runtime dependencies, and required style slots. `getTemplate(catalog: Catalog, id: ComponentId): ComponentTemplate`. Define/export `Catalog` and `ComponentTemplate` from this package. Foundation catalog release is `0.1.0`; unsupported releases fail with `UNSUPPORTED_RELEASE`.

- [x] Write failing catalog assertions: all three IDs resolve at `0.1.0`; both styles provide every token referenced by their templates; `getCatalog('99.0.0')` throws `UNSUPPORTED_RELEASE`. Add a dialog source assertion that the client boundary is retained, plus runtime component tests that Button defaults to `type="button"`, forwards an explicit submit type, and Input forwards label/ID and disabled state.
- [x] Run `pnpm exec vitest run packages/catalog/test/catalog.test.ts`; expect missing catalog failures.
- [x] Author the templates using the pinned Radix edition, preserving license notices. Keep one component API across styles and literal Tailwind classes/static slots. Dialog exports Root, Trigger, Content, Title, Description, and Close aliases compatible with the chosen edition. Keep its React client directive. Built-in presets include complete token values; use system fonts and normal native HTML controls. Bundle template text into static catalog modules at package build time; runtime catalog/compiler imports must not read TSX from disk or require Vite-only raw-import syntax.

```ts
expect(getTemplate(getCatalog('0.1.0'), 'dialog').id).toBe('dialog')
expect(() => getCatalog('99.0.0')).toThrow(FoundationError)
```
- [x] Run the targeted test and `pnpm typecheck`; require both styles to satisfy all template token references. Defer full dialog browser behavior to Task 9.
- [x] Commit as `feat: add foundation component catalog and two style families`.

## Task 3: Deterministic preset resolution and artifact generation

**Files:** Create `packages/compiler/package.json`, `packages/compiler/tsconfig.json`, `packages/compiler/src/{resolve,compile,canonicalize,hash,index}.ts`, `packages/compiler/test/{resolve,compile}.test.ts`; extend `packages/contracts/src/types.ts` with shared artifacts.

**Interfaces:** `resolvePreset(input: unknown, catalog: Catalog): Promise<ResolvedPreset>`; `compile(input: { preset: unknown; componentIds: ComponentId[]; catalogRelease: string; compilerVersion: string }): Promise<CompileResult>`. Define `ResolvedPreset` with normalized `data: Preset` and `hash: string`. `Artifact` has `logicalPath`, `kind: 'component' | 'style' | 'usage' | 'utility'`, `content`, and `sha256`. `CompileResult` has `artifacts`, `dependencies: { name: string; version: string }[]`, `preset: ResolvedPreset`, and `provenance: { catalogRelease: string; compilerVersion: string }`. Compiler version starts at `0.1.0`. An empty component list still generates theme output for initialization/theme-only operations.

- [x] Add failing assertions that compiling the same input twice gives `expect(first).toEqual(second)`, reordered input object keys preserve preset/artifact hashes, source line endings are LF, and duplicate component IDs do not duplicate artifacts. Assert selected neo brutalist output excludes flat-only slot rules. Unknown catalog/compiler releases and unsupported style/component requests fail explicitly.
- [x] Run `pnpm exec vitest run packages/compiler/test`; expect missing implementation failures.

```ts
expect(await compile(input)).toEqual(await compile(input))
expect((await compile(input)).artifacts.every(a => !a.content.includes('\r'))).toBe(true)
```
- [x] Implement stable key ordering, fixed output ordering, pinned formatting, normalized six-digit hex/numeric OKLCH handling, and SHA-256 using Web Crypto without Node-only module imports. Reject unsupported syntax and non-finite values. Export only selected reviewed styles and include all required utilities/dependencies. Do not put current time, random IDs, or absolute paths into output.
- [x] Run compiler tests and `pnpm typecheck`. Verify a changed preset changes required CSS/hashes while unchanged source remains stable where the contract allows it.
- [x] Commit as `feat: compile reproducible component and theme artifacts`.

## Task 4: A standard registry item and an explicit upstream adapter decision

**Files:** Create `packages/cli/package.json`, `packages/cli/tsconfig.json`, `packages/cli/src/registry/{build,adapter}.ts`, `packages/cli/test/registry.test.ts`, `tests/helpers/{projects,tree}.ts`, `tests/integration/upstream.test.ts`, and `docs/decisions/0002-registry-adapter.md`.

**Interfaces:** `buildRegistry(result: CompileResult): { index: unknown; items: Record<string, unknown> }`; `probeUpstream(input: { cwd: string; registryUrl: string }): Promise<{ files: string[]; dependencyChanges: { name: string; version: string }[] }>` is an experiment adapter used only in a disposable fixture. No production plan may call an upstream mutation API.

Test helpers introduced here: `createProject(kind: 'vite' | 'next'): Promise<string>` creates a disposable minimal supported pnpm app; `snapshotTree(root: string): Promise<Record<string,string>>` reads file hashes without writes. The upstream experiment uses these helpers before later project-planner tasks exist. Keep preparation writes outside the measured operation.

- [x] Write failing tests validating generated Button and theme items against documented upstream registry schemas, with exact content matching compiler artifacts and no Ombelle-only fields added to upstream items.
- [x] Run `pnpm exec vitest run packages/cli/test/registry.test.ts`; expect missing builder failures.

```ts
expect(registryItemSchema.safeParse(buildRegistry(result).items.button).success).toBe(true)
```
- [x] Implement registry generation. Run the pinned documented upstream API against a temporary app and local HTTP registry; record resulting alias transforms, CSS changes, package operations, and unsupported planning behavior. Bind the server to loopback. Never point the probe at the user's app.
- [x] Record one decision: either a documented adapter supplies a safe inspectable transformation boundary, or Ombelle handles its narrow path/alias/CSS subset itself and retains standard registry transport compatibility. In either case retain Tasks 5–7 as the source of truth for planning/conflicts. Run `pnpm exec vitest run packages/cli/test/registry.test.ts tests/integration/upstream.test.ts`; require installable source and a written adapter result.
- [x] Commit as `feat: generate registry items and document upstream adapter boundary`.

## Task 5: Read-only project inspection and component plans

**Files:** Create `packages/cli/src/project/{inspect,paths,transform}.ts`, `packages/cli/src/plan/components.ts`, and `packages/cli/test/{inspect,plan}.test.ts`; reuse Task 4's test helpers and extend contracts with plan and lock types.

**Interfaces:** `inspectProject(cwd: string): Promise<ProjectContext>`; `planAdd(context: ProjectContext, result: CompileResult): Promise<InstallPlan>`. Define `ProjectContext` containing root, framework (`vite` or `next`), manager (`pnpm`), aliases, CSS entry/dark selector, and optional local preset/config/installed lock before initialization. `InstallPlan` contains `projectRoot`, preset/provenance, `changes: FileChange[]`, managed CSS records, `dependencyPlan`, and `diagnostics`. `FileChange` contains relative `path`, `beforeHash: string | null`, `afterContent: string`, `kind`, and action (`create`, `update`, `noop`, `conflict`). `ProjectLock` records version 1, versions/preset hash, artifact destinations/hashes, and managed declarations. Helpers: `createProject(kind: 'vite' | 'next'): Promise<string>` makes a disposable minimal pnpm app; `snapshotTree(root: string): Promise<Record<string,string>>` captures file hashes without writes.

- [x] Add failing tests for both alias layouts, missing/ambiguous CSS entries, conflicting manager evidence, npm-only apps, unsupported upstream editions for component install, existing identical artifacts, edited artifacts, and unknown existing destination files. Assert conflict plans do not mutate the captured tree.
- [x] Include Windows-style `..`, rooted paths, case-insensitive duplicate destinations, and a junction pointing outside the temporary root. Require `UNSUPPORTED_PROJECT` or `FILE_CONFLICT` as appropriate, with unchanged outside files. Explicitly report a junction-test environment skip if creation is unavailable; do not call that case passed.
- [x] Run `pnpm exec vitest run packages/cli/test/inspect.test.ts packages/cli/test/plan.test.ts`; expect missing inspection/planner failures.

```ts
const before = await snapshotTree(root)
const plan = await planAdd(await inspectProject(root), result)
expect(await snapshotTree(root)).toEqual(before)
expect(plan.projectRoot).toBe(root)
```
- [x] Implement project detection from valid `packageManager` and a unique lockfile, alias/path transformation, conflict comparison, dependency planning, and real-path containment. Preserve upstream config. Palette-only support must not reject an otherwise compatible project solely because its primitive edition differs.
- [x] Run targeted tests and `pnpm typecheck`; require no package-manager subprocess and no writes during inspection/planning.
- [x] Commit as `feat: inspect consumers and produce safe component installation plans`.

## Task 6: Declaration-aware theme plans

**Files:** Create `packages/cli/src/plan/theme.ts`, `packages/cli/test/theme.test.ts`; reuse `examples/globals.before.css` and `examples/globals.after.css` as source fixtures.

**Interfaces:** `planTheme(context: ProjectContext, result: CompileResult): Promise<InstallPlan>`. Managed CSS records identify selector, property, last-applied value, and whether the declaration existed before adoption. Plans also save the resolved local preset/config/lock. Template default-prop changes are reported as future-generation changes rather than TSX edits.

- [x] Write failing tests proving requested palette changes in `:root` and the configured dark selector, required `@theme inline` mappings, preservation of unrelated comments/imports/selectors, and byte-identical no-op repeat application after the first plan is applied to a test fixture. An edited managed token conflicts; an unrelated declaration edit does not.
- [x] Add explicit fixtures for duplicate declarations, multiple matching selector blocks, a custom dark selector, and existing upstream-only tokens. Require ambiguity diagnostics before writes, preservation of unrelated tokens, and no dependency operations or component changes for theme-only plans.
- [x] Run `pnpm exec vitest run packages/cli/test/theme.test.ts`; expect missing theme planner failures.

```ts
expect(repeatedPlan.changes.every(change => change.action === 'noop')).toBe(true)
expect(themeOnlyPlan.dependencyPlan).toEqual([])
```
- [x] Implement a PostCSS patch with declaration-level provenance. Compare previous managed values before updating, preserve unowned content and existing aliases/style configuration, and emit only necessary stylesheet/import changes. Do not replace the complete stylesheet with generated CSS.
- [x] Run targeted tests and `pnpm typecheck`; require no-op and conflict proofs in addition to expected token values.
- [x] Commit as `feat: plan repeatable theme merges with declaration provenance`.

## Task 7: Safe writes, concurrency control, and dependency failure recovery

**Files:** Create `packages/cli/src/apply/{transaction,manager}.ts`, `packages/cli/test/{transaction,manager}.test.ts`; extend shared diagnostics with recovery information.

**Interfaces:** `applyPlan(plan: InstallPlan, ports?: ApplyPorts): Promise<ApplyResult>`; `runDependencies(root: string, dependencies: { name: string; version: string }[]): Promise<void>`. `ApplyPorts` permits injected rename/write/dependency failure hooks for tests while the production path uses real filesystem/process adapters. `ApplyResult` includes status, written paths, and recovery details. Error codes map to the starter CLI exit-code contract: invalid data 2, unsupported project 3, conflict 4, resolution/integrity 5, dependency/recovery 6, unexpected failure 1.

- [x] Write failing tests for successful writes and recorded final hashes, edited-after-plan conflicts, escaping symlink replacement between planning and application, simultaneous processes targeting the same app, mid-write failure restoration, and simulated dependency failure. Assert explicit incomplete/recovery status and preserved transaction data on incomplete recovery.
- [x] Run `pnpm exec vitest run packages/cli/test/transaction.test.ts packages/cli/test/manager.test.ts`; expect missing transaction implementation failures.

```ts
await expect(applyPlan(stalePlan)).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
expect(await snapshotTree(root)).toEqual(treeAfterUserEdit)
```
- [x] Implement exclusive project operation locking with cleanup on normal failure, precondition and real-path rechecks, staged writes/backups, and rollback only of transaction-owned changes. Do not remove an unknown existing lock automatically; report recovery guidance. Run pnpm with argument arrays and `shell: false`; handle the Windows executable shim without interpolating commands into a shell string. No operation runs when dependencies are already satisfied or the plan is theme-only.
- [x] Verify local source/config restoration on package failure and report package lock/cache/node_modules uncertainty separately. Check touched source preconditions again before rollback so later user edits are not overwritten. Mark tests passed only when filesystem effects match the status.
- [x] Run targeted tests and `pnpm typecheck`, then commit as `feat: apply installation plans with conflict checks and recovery`.

## Task 8: An executable CLI with fresh-process preset reuse

**Files:** Create `packages/cli/src/{main,format}.ts`, `tests/integration/cli.test.ts`, and `docs/foundation-local-usage.md`; add the local `ombelle` binary and build entry to the CLI package.

**Interfaces:** `runCli(args: string[], io: { stdout(text: string): void; stderr(text: string): void }): Promise<number>` routes `init --preset`, `add`, and `theme add` plus `--cwd`, `--dry-run`, `--json`, and `--yes`. Use a dynamic import/entry wrapper that sets the process exit code. Dry-run returns the complete plan with no call to `applyPlan`. An interactive terminal requires confirmation for mutations unless `--yes` is set; noninteractive mutation requires `--yes`. This flag never resolves conflicts.

- [x] Write subprocess tests that initialize a temporary supported app using a local neo brutalist preset, add Button/Dialog, exit, then add Input in a new process without a preset argument. Assert the saved preset hash and style remain identical, all installed files have lock records, and the app's manager/lockfile format is unchanged.
- [x] Add failing tests for dry-run tree equality with an instrumented dependency runner, malformed local JSON, init on an existing shadcn app routing to theme-only changes, `--yes` on an edited component still returning exit 4, and dependency failure returning exit 6 with JSON recovery details.
- [x] Add a minimal executable entry that reports unsupported commands, then run `pnpm build:packages` and `pnpm exec vitest run tests/integration/cli.test.ts`; expect assertions about missing command behavior to fail. A missing built executable is a setup failure, not the intended behavioral red test. Subsequent test reruns rebuild the CLI first.
- [x] Implement command parsing and output. Route initialization through `compile` with an empty component list and `planTheme`; allow missing Ombelle state only on init/theme application and derive its new config from the detected supported app. `add` with no saved preset fails with initialization guidance. JSON includes `command`, `status`, `projectRoot`, `presetHash`, `catalogRelease`, `compilerVersion`, `changes`, `dependencyPlan`, `warnings`, and stable diagnostic records. Local preset files are not interpreted as arbitrary remote URLs. Preserve meaningful exit codes through the entry wrapper.

```ts
expect(freshProcessResult.presetHash).toBe(initialResult.presetHash)
expect(editedSourceProcess.exitCode).toBe(4)
```
- [x] Build the executable and rerun tests against built JS. Document only working local invocation forms; label public registry/package commands as future work.
- [x] Commit as `feat: expose foundation CLI with persistent presets and dry runs`.

## Task 9: Generated preview and independent consumer parity

**Files:** Create `apps/preview/{package.json,index.html,vite.config.ts,src/main.tsx,src/scenarios.tsx}`, its TS config, the Vite and Next consumer manifests/configs/pages/global styles, `scripts/{generate-preview,prepare-consumers}.ts`, `playwright.config.ts`, and `tests/e2e/{parity,keyboard}.spec.ts`.

**Interfaces:** Root scripts `generate:preview`, `prepare:consumers`, `build:consumers`, `test:e2e`, and `dev:preview`. `generate-preview.ts` calls `compile` and writes generated TSX/CSS plus a manifest under `apps/preview/src/generated/`. `prepare-consumers.ts` creates disposable standalone copies outside the workspace package graph, invokes the built CLI, installs consumer dependencies using pnpm, and records canonical-to-transformed artifact mappings. Do not hand-copy component implementations into fixtures.

- [ ] Write failing browser checks using the same viewport, system font, disabled animation, style, mode, and interaction state across preview and consumers. Assert component roles, controlled computed color/border/radius values, normalized component DOM, and screenshot comparisons after excluding app-shell differences. Capture the generated manifest and confirm consumer differences are limited to declared path/alias transforms.
- [ ] Add keyboard tests for focus entry into Dialog, Tab/Shift+Tab containment, Escape dismissal, restored trigger focus, labelled Input, and Button focus visibility. Check dark theme on portal content and Next.js client-boundary builds. Run axe scans for closed/open Dialog and form states in each style/mode.
- [ ] Establish startable preview and consumer shells and install the test browser, then run `pnpm test:e2e`; expect missing component/keyboard behavior assertions to fail. Missing generated imports or unreachable servers are setup failures, not the intended behavioral red test.

```ts
await page.getByRole('button', { name: 'Open dialog' }).click()
await expect(page.getByRole('dialog')).toBeVisible()
await page.keyboard.press('Escape')
await expect(page.getByRole('button', { name: 'Open dialog' })).toBeFocused()
```
- [ ] Implement fixture UI, generation scripts, and isolated install/build verification. The preview imports generated modules through Vite. Use separate generated output directories for style fixtures to avoid shared-file races. Next uses a client scenario boundary for interactive components while exercising App Router integration. Disallow `@ombelle/*` or `workspace:` dependencies in installed source/standalone consumer manifests.
- [ ] Run `pnpm build:packages`, `pnpm generate:preview`, `pnpm prepare:consumers`, `pnpm typecheck`, `pnpm build:preview`, `pnpm build:consumers`, and `pnpm test:e2e` in that order. Define `build:preview` as the Vite production preview build. Consumer preparation must install/generated-source dependencies before full typechecking. Playwright starts all three servers from prepared output and waits for readiness. Require both consumers to build without resolving workspace packages or contacting an Ombelle service. Compare artifacts with browser-generated SHA-256 in the preview and compiler hashes to verify cross-environment hashing.
- [ ] Commit as `feat: verify generated preview against standalone Vite and Next consumers`.

## Task 10: A reproducible foundation verification gate

**Files:** Create `.github/workflows/foundation.yml`, `docs/evidence/foundation.md`; update `package.json`, `README.md`, `docs/foundation-local-usage.md`, and the approved specification's evidence links without changing its agreed scope.

**Interfaces:** `pnpm check:foundation` runs `build:packages`, `test:unit`, `test:integration`, `generate:preview`, `prepare:consumers`, `typecheck`, `build:preview`, `build:consumers`, and `test:e2e` sequentially, stopping on the first failure. Each script owns only that stage; subprocess tests consume the existing package build, and browser tests consume prepared apps without recursively invoking the foundation gate. The workflow uses pinned Node/pnpm versions and a frozen root lockfile, installs only the required Playwright browser, and uploads failure screenshots/reports. Independently prepared consumer fixtures retain their own manager lockfiles. It does not publish or deploy.

- [ ] Review Task 1–9 tests against every row in the spec's exit table; add an omitted behavioral proof to its owning test rather than writing a test that checks documentation text. Ensure registry integration remains an explicit check and is not accidentally excluded as network-dependent.
- [ ] Wire `check:foundation` and the workflow. Run `pnpm check:foundation`; require an exit code of zero with no unacknowledged skipped required cases. This is the first whole-foundation gate, not a request to repeatedly broaden already passing checks.
- [ ] Manually review Dialog keyboard behavior in flat and neo brutalism, light and dark. Record actual runtime/browser versions, commit, commands, pass/fail results, screenshots, skipped environment-dependent cases, and remaining limitations in `docs/evidence/foundation.md`. Do not fabricate manual or screen-reader evidence.
- [ ] Update usage docs to distinguish foundation support from alpha goals: pnpm verified first; three components/two styles; no public editor, snapshot service, or native support. Record whether the upstream adapter was reused or the narrow fallback implemented.
- [ ] Commit as `ci: gate technical foundation with reproducible integration evidence`.

## Completion and execution handoff

Execution order is Tasks 1 through 10. Each task ends with its meaningful verification and a focused commit. If a pinned upstream tool cannot satisfy the required behavior, document the demonstrated failure and use the specified adapter fallback rather than silently weakening source protection.

Planning itself runs no product tests because no application has been implemented. The task commands and expected failures above are future execution instructions.

Native execution is selected at the user's request: the tasks share contracts and are mostly sequential, so keeping one implementer reduces context transfer. Use `superpowers:executing-plans` for implementation and follow its whole-branch review requirements. Do not claim this planning review is an independent implementation review; no product code exists yet.

The user's current request is to review the plan and choose an execution method before implementation. That review and choice are complete; execution has not started. The next implementation task is Task 1 in the existing project repository, following applicable execution and worktree guidance when implementation is requested.

## Plan review record — 20 October 2026

- Matched the ten task deliverables against the specification's scope and exit criteria.
- Corrected clean-checkout check order: build packages before executable integration tests; generate and prepare apps before full typechecking and browser builds.
- Moved disposable project/snapshot helper ownership to Task 4, their first consumer.
- Replaced a message-regex error assertion with the shared error type; retain the explicit error-code assertion required by Task 2.
- Distinguished expected failing behavior tests from absent executable, generated-file, or server infrastructure.
- Selected native execution; kept all product tasks unchecked. Product verification will run during implementation, not during document review.
