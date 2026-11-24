# Yarn consumer support design

Date: 20 October 2026

Status: Proposed. This specification covers the next F11 package-manager slice; it does not claim Yarn support until implementation and verification pass.

## 1. Intent and agreed constraints

Ombelle already supports pnpm and npm consumer projects. The delivery plan and alpha requirements require npm, pnpm, Yarn, and Bun while preserving the consumer's package manager, lockfile, and source ownership. This slice adds Yarn support without changing the repository's pnpm toolchain or claiming Bun support.

The feature is for developers using existing React 19.3.1 Vite or Next.js projects with Tailwind v4. Yarn consumers should receive the same safe component-install and preset-reuse behavior already verified for npm and pnpm. Yarn Classic and modern Yarn are both in the documented alpha scope; modern Yarn must work with both `node-modules` and Plug'n'Play linkers.

## 2. Scope

### Included

- Detect Yarn from a valid `packageManager` field or one unambiguous `yarn.lock`, including Yarn Classic and modern Yarn version strings.
- Preserve manager selection in plans, saved Ombelle configuration, transactions, and recovery guidance.
- Install only the exact production dependencies required by the requested component, using Yarn's supported command interface with lifecycle scripts disabled.
- Support projects using modern Yarn's `node-modules` and Plug'n'Play linkers without assuming a `node_modules` directory exists.
- Support Yarn Classic consumers through a local CLI dependency and normal Yarn Classic command invocation.
- Preserve the Yarn lockfile format and avoid generating foreign lockfiles or changing the consumer's manager.
- Verify clean setup/add flows, saved-preset reuse, theme-only behavior, idempotence, conflicts, failures, and source/lock ownership in isolated consumer fixtures.

### Excluded

- Bun support or executing Ombelle under Bun.
- Yarn workspaces or mutations outside the explicitly targeted application root.
- Converting a project between Yarn Classic and modern Yarn, or changing its linker configuration.
- Editing `.yarnrc.yml`, `.pnp.cjs`, workspace manifests, or lockfiles outside the targeted app.
- Arbitrary package scripts, dependency ranges, global installs, shell evaluation, public publishing, and expanding the supported React/framework/Tailwind matrix.

## 3. Project identification and manager preservation

The explicit `--package-manager` choice resolves conflicting manager signals. Otherwise, a valid `package.json.packageManager` value selects Yarn, and a unique `yarn.lock` selects Yarn when there is no declaration. Multiple recognized lockfiles, malformed or unsupported manager evidence, and ambiguous workspace ownership fail before writes with an actionable diagnostic. An explicit choice does not remove, rewrite, or create lockfiles; if the selected manager's lockfile is absent while another manager's lockfile exists, reject the project rather than convert it.

Accept Yarn Classic and modern Yarn semver values in the `packageManager` field, including an optional Corepack integrity suffix. Do not infer Yarn from the CLI runner alone when project evidence is absent. If the explicit choice differs from a `packageManager` declaration but the existing lockfile unambiguously belongs to the selected manager, use the explicit choice and report the disagreement in the plan; it does not authorize conversion or lockfile migration.

The selected manager is recorded in plan output and new Ombelle configuration exactly as for npm and pnpm. Existing `auto` configuration remains valid. The manager is carried through dependency execution and failure recovery so messages name Yarn and its lockfile accurately.

## 4. Dependency operation

When a component needs dependencies, run Yarn from the targeted project directory with an argument array and `shell: false`. Install only reviewed, exact production dependencies; disable lifecycle scripts; do not invoke a workspace-wide install or modify another manager's lockfile. A theme-only command and a no-op component addition do not start Yarn.

The adapter must handle Yarn Classic and modern Yarn command differences through a narrow manager-specific implementation. It must resolve the selected Yarn executable safely, including Windows launchers, without evaluating arbitrary shell text. A missing or unresolvable Yarn executable fails before source mutation and provides a concrete setup action.

For Plug'n'Play, the operation must use Yarn itself and must not depend on `node_modules` or Node's default module resolution to locate project dependencies. For Yarn Classic, the documented local development dependency route must remain usable; this slice does not create a public Ombelle package or alter the invocation recipes.

If Yarn reports failure after source writes begin, preserve the current transaction guarantees: restore staged source/configuration where safe, retain honest status for package state that cannot be rolled back, and provide Yarn-specific recovery instructions. Never describe package manager side effects or caches as atomically reversible.

## 5. Verification matrix

Use isolated, locked consumer projects covering:

| Yarn generation | Linker / layout | Required proof |
| --- | --- | --- |
| Classic | `node_modules` | Detect, plan, install exact production dependencies, retain `yarn.lock`, and build the consumer |
| Modern | `node-modules` | Detect, plan, install exact production dependencies, retain Yarn lock/config, and build the consumer |
| Modern | Plug'n'Play | Detect, plan, install without `node_modules`, retain Yarn lock/config, and build the consumer using the supported PnP runtime |

Across the matrix, verify package-manager conflict handling, package field and lockfile selection, plan/config/transaction propagation, no-op and theme-only paths without an unnecessary package operation, preset reuse in a fresh process, local edit protection, install failure diagnostics/recovery, and absence of npm/pnpm lockfiles. Capture exact Yarn and Node versions in evidence. Tests must run against real Yarn executables rather than mocks for the install boundary.

## 6. Acceptance criteria

1. A Yarn project is detected only from valid project evidence or an explicit consistent selection; ambiguity fails before mutation.
2. Plans and saved configuration report Yarn, and later operations continue to use Yarn.
3. Dependency installation adds only exact reviewed production dependencies, disables lifecycle scripts, updates only the targeted Yarn lockfile, and works in the three matrix rows.
4. Modern Plug'n'Play projects work without `node_modules` assumptions; Yarn Classic has a documented local CLI installation route.
5. Theme-only operations, no-op additions, and dry-runs do not invoke Yarn.
6. Existing source edits and unrelated project files remain protected; installation failure reports package state uncertainty and Yarn-specific recovery guidance.
7. The existing pnpm and npm foundation gates continue to pass. Documentation identifies Yarn versions/linkers actually verified and does not imply Bun support.

## 7. Risks and decisions

- Yarn launchers vary across Corepack, global installs, local installs, operating systems, and Yarn generations. The implementation plan must identify supported launch forms and tests without falling back to shell evaluation.
- Plug'n'Play changes how tools locate dependencies. The CLI must invoke the project manager correctly and avoid resolving consumer packages through `node_modules` assumptions.
- Yarn Classic and modern Yarn differ in flags and workspace behavior. Keep compatibility branches inside the dependency adapter, with observable command arguments covered by tests.
- A `yarn.lock` alone does not identify Yarn's major version. Where behavior depends on generation, resolve it safely from the installed Yarn executable or fail with an actionable request rather than guessing.

## 8. Review handoff

This is a proposed feature specification for the remaining Yarn portion of F11. It is intentionally limited to writing the spec at this stage. After the user approves this written specification, invoke the writing-plans skill to produce a task-by-task implementation plan; do not begin implementation before the plan is reviewed and an execution method is selected.

## References

- `docs/07-delivery-plan.md` (F11 and alpha exit gate)
- `docs/05-cli-specification.md` (manager detection, invocation recipes, and manager preservation)
- `docs/10-installation-and-theme-merging.md` (Yarn Classic, modern Yarn, PnP, and consumer acceptance matrix)
- `docs/evidence/npm-consumer-support.md` (current npm/pnpm behavior and verified boundaries)
