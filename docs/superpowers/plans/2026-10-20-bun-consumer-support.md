# Bun Consumer and Runtime Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Complete F11 Bun support with preserved text/binary lockfiles and verified execution of the built CLI under Node and Bun.

**Architecture:** Carry Bun lockfile ownership through inspection and installation plans, and use binary-safe metadata fingerprints. Separate native executable/runtime discovery from package-manager JavaScript entry resolution. Keep Bun argument/configuration policy in a dedicated adapter and verify the behavior with real isolated consumers and existing-manager cross-runner checks.

**Tech Stack:** TypeScript, Node 24.19.0, Bun 1.4.3, pnpm 11.25.0, npm 11.19.0, Yarn Classic 1.22.22 and modern 4.18.1, Vitest, existing Vite/Next.js and Playwright fixtures.

**Spec:** `docs/superpowers/specs/2026-10-20-bun-consumer-support.md` (written spec approved in chat).

## Global Constraints

- Keep the repository managed by pnpm and consumer React/ReactDOM at exact 19.3.1 with Tailwind v4; use existing framework versions and the flat preset for new consumers.
- Preserve existing bun.lock or bun.lockb format/filename; never migrate managers or emit another lockfile as a side effect. No workspace-wide installation.
- Only reviewed exact production dependencies; disable project and trusted-dependency lifecycle scripts. No source writes before dependency preflight succeeds.
- Built JavaScript CLI execution under Node and Bun is required; Bun's TypeScript loader or an unverified Node-delegating runner is insufficient evidence.
- Shell-free argument arrays, bounded subprocesses, existing transaction/local-edit protections, and manager-specific honest recovery.
- Dry-run, theme add, and no-op paths do not require or execute a dependency manager.
- Bun 1.4.3 is the verified foundation target; fail dependency preflight for a different executable version until it is deliberately verified. Node launcher support is major 24, version >=24.19.0; CI uses exact 24.19.0. Report local patch deviations.
- Do not install tools or execute implementation probes until this plan is approved. During execution, install the exact official Bun release outside the pnpm project rather than adding it as a repository dependency.
- Scope excludes public publication, framework execution exclusively under Bun, new catalog/styles, and expanded browser claims. Push/PR integration requires the user's existing or subsequent authorization for this feature.

## Review Focus

1. Two distinct binary byte sequences can decode to the same UTF-8 replacement characters; stale bun.lockb detection must still reject the change (Task 1).
2. process.execPath is Bun when the CLI runs under Bun; npm/pnpm/Yarn must still use compatible Node, while native Bun must never be executed as JavaScript (Task 2).
3. Global/local Bun configuration or environment can cause zero-exit simulated installs, foreign lock emission, or format migration; reject unsafe effective settings or prove an explicit override (Task 3).
4. bunx may delegate to a Node shebang; matrix evidence must record the actual executable/runtime and use built output (Task 4).
5. Dependency installation may fail after source writes; recovery must retain both source-restoration truth and the correct Bun lockfile path, with no success report (Tasks 3–4).

## File map and task dependencies

- Task 1: `project/fingerprint.ts` owns safe file-byte hashing; inspector/contracts/plan output own selected lockfile metadata.
- Task 2: `apply/executable.ts` owns native Bun and Node discovery; `apply/manager.ts` retains JavaScript manager discovery and command dispatch.
- Task 3: `apply/bun.ts` owns Bun version/configuration/argument policy and post-install ownership checks.
- Task 4: `tests/helpers/bun-project.ts` and `tests/helpers/cli-runtime.ts` own disposable locked apps and explicitly selected built-CLI runtimes.
- Task 5: consumer scripts, workflow, report, and docs integrate measured evidence. Tasks 2–5 consume the named interfaces below; implement in order.

## Verified upstream inputs

Official release metadata for [bun-v1.4.3](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.3) was checked during planning: published 10 October 2026, with Windows/Linux x64 assets and SHA256 sums. The [tagged lockfile implementation](https://github.com/oven-sh/bun/blob/bun-v1.4.3/src/install/lockfile.rs) retains an existing lockfile's format unless conversion is requested; effective saveTextLockfile=true can request text. This is source-level evidence, not a substitute for Task 3's real-executable preservation check.

Pin CI setup to `oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6` with `bun-version: 1.4.3`; the action commit was resolved from the official repository during planning. Consult the official [add](https://bun.sh/docs/pm/cli/add), [configuration](https://bun.sh/docs/runtime/bunfig), and [lockfile](https://bun.sh/docs/pm/lockfile) references when executing the capability checks. Do not invent unsupported boolean-negation flags.

---

### Task 1: Detect Bun and fingerprint metadata as bytes

**Files:** Create `packages/cli/src/project/fingerprint.ts`, `tests/integration/bun-detection.test.ts`, `tests/integration/bun-metadata.test.ts`. Modify `packages/contracts/src/types.ts`, `packages/cli/src/project/inspect.ts`, `packages/cli/src/main.ts`, `packages/cli/src/plan/components.ts`, `packages/cli/src/plan/theme.ts`, `packages/cli/src/format.ts`, `packages/cli/src/apply/transaction.ts`, and the Yarn unsupported-manager assertion in `tests/integration/yarn-detection.test.ts`.

**Interfaces:**
- Produces `PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'` and `BunLockfile = 'bun.lock' | 'bun.lockb'`.
- Adds optional `bunLockfile?: BunLockfile` to ProjectContext and InstallPlan; Bun contexts/plans always select one, defaulting to bun.lock for field-only apps. Expose it in JSON plan output and use it in recovery.
- Produces `fingerprintFile(root: string, relative: string): Promise<string | null>`: safePath, raw readFile, SHA256 bytes, null only for ENOENT. UTF-8 source fingerprints remain equivalent for valid generated source.

- [x] **Step 1: Add detection and stale-metadata regressions.**

```ts
expect((await inspectProject(root)).manager).toBe('bun')
expect((await inspectProject(root)).bunLockfile).toBe(lockfile)
await fs.writeFile(path.join(root, 'bun.lockb'), Buffer.from([0x80]))
const beforeHash = await fingerprintFile(root, 'bun.lockb')
await fs.writeFile(path.join(root, 'bun.lockb'), Buffer.from([0x81]))
expect(await fingerprintFile(root, 'bun.lockb')).not.toBe(beforeHash)
await expect(applyPlan(plan, { dependencies: dependencySpy })).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
expect(dependencySpy).not.toHaveBeenCalled()
```

Create each root with existing createProject and locally adapt its manager/locks before planning. Parameterize detection over both lock paths and bun@1.4.3 with/without a sha224 suffix. Name rejection cases for both Bun locks, a foreign lock, malformed declaration, saved-manager mismatch, changed bunfig.toml, and alternate-lock appearance; assert FILE_CONFLICT for stale metadata and UNSUPPORTED_PROJECT for invalid project evidence, with unchanged tree snapshots. Assert the explicit Bun override reports the original manager. Also assert field-only init creates no lockfile, records expected bun.lock ownership, and does not resolve an executable. Reject the nearest governing workspace when the selected root cannot own the install; test a nested app below a workspace package.json. Keep aliases, exact React validation, and auto config behavior unchanged. Change the existing unsupported-manager test to a genuinely unsupported value such as deno.

- [x] **Step 2: Observe RED.** Run `pnpm build:packages`, then `pnpm exec vitest run tests/integration/bun-detection.test.ts tests/integration/bun-metadata.test.ts`. Expected: failures from missing Bun selection/fingerprint behavior, not fixture/import mistakes.
- [x] **Step 3: Implement the interfaces.** Recognize both locks and declarations; propagate metadata in both plan builders and output. Fingerprint every lock/config precondition as bytes, including bunfig.toml, .npmrc, and all lockfile absences. Use fingerprintFile for transaction checks; keep text content reads separate. Preserve existing explicit-choice/no-conversion rules and guard unsupported workspace ownership.
- [x] **Step 4: Observe GREEN and regressions.** Rebuild, rerun both suites plus `tests/integration/yarn-detection.test.ts` and `tests/integration/cli.test.ts`; expected all pass, including pre-write rejection.
- [x] **Step 5: Commit only this slice.** `git add` the listed files; `git commit -m "feat: detect Bun projects with binary-safe metadata"`.

### Task 2: Represent native commands and preserve Node-hosted managers

**Files:** Create `packages/cli/src/apply/executable.ts`, `tests/integration/manager-runtime.test.ts`. Modify `packages/cli/src/apply/manager.ts`, `packages/cli/src/apply/transaction.ts`, `tests/integration/yarn-manager.test.ts`, and affected existing adapter tests.

**Interfaces:**
- Produces `resolveBunExecutable(): Promise<string>` and `resolveNodeExecutable(): Promise<string>`.
- PreparedManager becomes `{ executable: string; prefixArgs: string[]; version?: string }`; managerEntry(manager) continues returning the selected manager entry path for existing scripts. prepareManager(root, manager, bunLockfile?: BunLockfile) returns the executable command; runDependencies keeps its existing first four parameters and adds optional fifth bunLockfile for Task 3.
- Bun resolution order: `OMBELLE_BUN_EXECUTABLE`, verified Bun process.execPath, PATH bun/bun.exe. Node resolution: `OMBELLE_NODE_EXECUTABLE`, current process.execPath only when actually Node, then PATH node/node.exe. Explicit paths are absolute readable executable files; do not execute command scripts. Verify runtime identity/version with bounded probes.

- [x] **Step 1: Add runtime regressions.**

```ts
const native = await prepareManager(root, 'bun', 'bun.lock')
expect(native.executable).toBe(bunExecutable)
expect(native.prefixArgs).toEqual([])
const scripted = await prepareManager(root, manager)
expect(scripted.executable).toBe(nodeExecutable)
expect(scripted.prefixArgs[0]).toBe(await managerEntry(manager))
```

Run these assertions from both Node and Bun against the native command, and parameterize scripted assertions over npm, pnpm, and Yarn. Name additional tests for executable paths with spaces and missing/wrong/unsupported Node; assert successful shell-free execution for the former and pre-write UNSUPPORTED_PROJECT with unchanged trees for the latter. Use actual Bun 1.4.3 installed in an ignored tool directory or normal user tool installation during approved execution. Tests spawn built JavaScript with the requested runtime. Preserve all existing npm flags and Yarn Corepack prefix arguments; assert version probes and dependency calls use the same resolved executable.

- [x] **Step 2: Observe RED.** Run `pnpm exec vitest run tests/integration/manager-runtime.test.ts`; expected command/runtime assertions fail with the current process.execPath-only implementation.
- [x] **Step 3: Implement native/runtime discovery and command representation.** Keep JavaScript entry discovery inside manager.ts. Existing managers prepare `[Node, managerEntry, ...prefix]`; Bun prepares its native executable. Keep the 15s preflight and 120s dependency timeouts. Preserve ApplyPorts injection and skip resolution entirely when no dependency work exists. Task 3 supplies Bun operation policy.
- [x] **Step 4: Observe GREEN.** Run the runtime suite and all existing yarn-manager/npm-options/npm/cli integration suites after rebuilding. Expected no runtime/argument regressions.
- [x] **Step 5: Commit.** `git commit -m "refactor: separate manager executables from CLI runtime"` after staging only listed changes.

### Task 3: Enforce Bun dependency, configuration, and recovery guarantees

**Files:** Create `packages/cli/src/apply/bun.ts`, `tests/integration/bun-manager.test.ts`, `tests/integration/bun-options.test.ts`. Modify manager.ts, transaction.ts, and existing dependency-recovery tests as needed.

**Interfaces:**
- Consumes Task 1 BunLockfile and Task 2 native command.
- Produces `prepareBun(root: string, executable: string, lockfile: BunLockfile): Promise<PreparedManager>` and `bunAddArgs(deps: Dependency[], lockfile: BunLockfile): string[]`.
- Produces `assertBunOwnership(root: string, lockfile: BunLockfile): Promise<void>` after a real add; any alternative/foreign lock is DEPENDENCY_FAILURE with honest package-state uncertainty.
- Configuration inspection stays in bun.ts. Parse TOML through a bounded native Bun invocation of a fixed script using Bun.TOML.parse; pass file paths as data, never evaluate file content. Run this parser from an owned clean temporary directory with an explicitly empty runtime config and without inherited preload/auto-install options, so inspecting a project cannot execute its runtime preloads. Read effective documented global/local package-manager config and relevant environment, preserving registry settings and never rewriting config. No new TOML dependency.

- [x] **Step 1: Add raw-capability and adapter regressions.** First run isolated Bun 1.4.3 controls proving that existing text and binary locks survive actual dependency additions with scripts disabled. Create binary fixtures with install.saveTextLockfile=false only in disposable preparation config; remove that generation-only setting before testing default legacy preservation. If preservation fails, stop and request the spec revision described in section 4; do not migrate or change version silently.

```ts
await runDependencies(root, [{ name: 'clsx', version: '2.1.1' }], 'bun', prepared, lockfile)
expect(JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')).dependencies.clsx).toBe('2.1.1')
expect(JSON.parse(await fs.readFile(path.join(root, 'node_modules/clsx/package.json'), 'utf8')).version).toBe('2.1.1')
await expect(fs.access(path.join(root, alternateLockfile))).rejects.toMatchObject({ code: 'ENOENT' })
await expect(fs.access(sentinel)).rejects.toMatchObject({ code: 'ENOENT' })
```

Parameterize real additions over text/binary locks; compare lock format and assert all foreign locks absent. Add named pre-write rejection tests for unsafe inherited dryRun, lockfile.save/print/savePath/path, saveTextLockfile, production, and frozenLockfile settings. A simulated-zero-exit control must fail if the dependency is absent. Add failure recovery assertions for sourceRestored=true, packageStateMayHaveChanged=true, and recovery naming Bun plus the selected path. For the lifecycle test, put a local tarball in existing trustedDependencies, generate a lock without installing it, then request reviewed clsx through the adapter. This makes script suppression observable during the real install, rather than checking a previously installed package. Snapshot trustedDependencies and user configuration unchanged.

- [x] **Step 2: Observe RED.** Run `pnpm exec vitest run tests/integration/bun-manager.test.ts tests/integration/bun-options.test.ts`. The raw Bun controls must pass; adapter cases must fail for the missing Bun operation/policy.
- [x] **Step 3: Implement supported arguments and preflight.** Base add arguments are `add --exact --save-prod --save --ignore-scripts`, followed by individual reviewed name@version arguments. For text locks include `--save-text-lockfile`; for existing binary omit that conversion flag and reject effective configuration that requests text. Reject contradictory save/foreign-lock/custom-output/dry-run/frozen/production settings before source writes rather than guessing boolean-negation flags. Test relevant .npmrc/environment settings for simulation and save effects too. Keep safe registry configuration intact. A field-only Bun project defaults to text even if inherited settings request binary: reject that incompatibility before mutation.

Preflight native Bun version 1.4.3 and config only when dependencies are planned. Carry bunLockfile to post-install ownership validation and recovery copy. After command success, verify each requested dependency has an exact production manifest entry and a physically installed package manifest with the requested version; do not use Bun imports that might auto-install a missing dependency. Fail honestly for simulated success. Preserve established transaction semantics and do not attempt to delete manager side effects as rollback.

- [x] **Step 4: Observe GREEN.** Rerun both suites plus metadata, runtime, and existing manager suites. Assert no extra manager launch for dry-run, actual theme add, and no-op add with the executable deliberately unavailable.
- [x] **Step 5: Commit.** `git commit -m "feat: install Bun dependencies without lockfile migration"` after staging this slice.

### Task 4: Verify the eight built-CLI consumer cases and cross-runner behavior

**Files:** Create `tests/helpers/bun-project.ts`, `tests/helpers/cli-runtime.ts`, `tests/integration/bun-consumers.test.ts`, `tests/integration/bun-cross-runner.test.ts`, and committed `fixtures/bun/{text-vite,text-next,binary-vite,binary-next}/{bun.lock|bun.lockb}`.

**Interfaces:**
- Export `BunFixture = { root: string; executable: string; version: '1.4.3'; lockfile: BunLockfile }`. `createBunProject(framework: 'vite' | 'next', format: 'text' | 'binary'): Promise<BunFixture>` clones existing framework/shared fixtures outside the repo, removes only fixture-owned foreign locks, excludes clsx to force real addition, and installs a committed lock with frozen/script-free preparation.
- `runBuiltCli(runtime: 'node' | 'bun', args: string[], cwd: string, env?: NodeJS.ProcessEnv): Promise<{ code: number | null; output: string; data?: unknown; runtime: { executable: string; name: 'node' | 'bun'; version: string } }>` probes runtime identity and directly starts packages/cli/dist/main.js with that executable. Parse JSON into a typed test result, not unguarded any.

- [x] **Step 1: Add eight real matrix cases and cross-runner assertions.**

```ts
const init = await runBuiltCli(runtime, ['init', '--preset', preset, '--yes', '--json'], fixture.root)
expect(init.code, init.output).toBe(0)
expect(init.runtime.name).toBe(runtime)
expect(init.runtime.version).toBe(runtime === 'bun' ? '1.4.3' : nodeVersion)
const added = await runBuiltCli(runtime, ['add', 'button', 'dialog', '--yes', '--json'], fixture.root)
expect(added.code, added.output).toBe(0)
const later = await runBuiltCli(runtime, ['add', 'input', '--yes', '--json'], fixture.root)
expect(later.code, later.output).toBe(0)
```

Name and parameterize the primary test as '$framework / $format / $runtime preserves manager and builds' over all eight combinations. Add three 'Bun-hosted CLI keeps <manager> dependency execution on Node' real-install smoke cases. Add 'generates equivalent artifacts and relevant JSON under Node and Bun', comparing source/preset/error output after normalizing only temporary root/runtime evidence. Each matrix case asserts exact installed clsx, saved-preset identity, canonical generated source hashes, unchanged unrelated CSS/manager declaration, owned lock bytes readable by the pinned Bun, absence of alternate/foreign locks, no-op add, theme add with no manager, and edited-source conflicts. Use a 180s per-case timeout. Build the app through verified Node and its existing Vite/Next build entry; record build runtime separately. Do not require frameworks themselves to run under Bun.

- [x] **Step 2: Observe RED before helper implementation.** Run `pnpm exec vitest run tests/integration/bun-consumers.test.ts tests/integration/bun-cross-runner.test.ts`; expected missing fixture/helper behavior. Record the failing output.
- [x] **Step 3: Implement helpers and generate committed locks.** Use official Bun 1.4.3, frozen installs, lifecycle suppression, owned temporary directories, cleanup-on-failure, and explicit tool paths. Validate binary lock fixtures contain raw binary data and remain .lockb after real additions; never create fake binary files by renaming text. Use existing npm/Yarn fixtures for cross-runner checks, with one missing reviewed dependency. Prove Node-hosted adapter identity via an owned Node forwarding harness in tests while the actual manager performs the install.
- [x] **Step 4: Observe GREEN.** Rebuild and run both suites, then `pnpm test`. Expected all eight cases and three cross-manager smoke checks pass, with existing tests green. Runtime identity must show Bun for the Bun-hosted built CLI and Node for the existing manager scripts.
- [x] **Step 5: Commit.** `git commit -m "test: verify Bun consumer and CLI runtime matrix"` after staging helpers, tests, and real locks.

### Task 5: Integrate the matrix into CI and measured support documentation

**Files:** Modify `scripts/prepare-consumers.ts`, `scripts/build-consumers.ts`, `scripts/check-foundation.mjs`, `playwright.config.ts`, `.github/workflows/foundation.yml`, `README.md`, `docs/05-cli-specification.md`, `docs/10-installation-and-theme-merging.md`. Create `docs/evidence/bun-consumer-support.md` and retained `docs/evidence/bun-consumer-run.json` after a successful run.

**Interfaces:** Consumer-map Bun rows use keys `bun-<format>-<framework>-<runtime>` with `{ root, framework, family: 'flat', manager: 'bun', cliRuntime, buildRuntime: 'node', bunLockfile, bunVersion }`; add typed fields to the existing map. Bun rows do not participate in the current browser server list. Report `.artifacts/bun-matrix.json` and `.artifacts/bun-version.json` plus per-row production audits and source provenance.

Produce `BunOutcome = { cliRuntime: { executable: string; name: 'node' | 'bun'; version: string }; buildRuntime: { executable: string; name: 'node'; version: string }; sourceHashes: Record<string, string>; auditExitCode: number; buildExitCode: number }` and `bunEvidenceRow(fixture: BunFixture, outcome: BunOutcome): Record<string, unknown>`. Export these from tests/helpers/bun-project.ts. Evidence includes the supplied runtime identities, hashes, actual statuses, fixture version, and owned lockfile; reject a failed/missing audit or build instead of inventing success.

- [x] **Step 1: Add evidence assertions to bun-consumers.test.ts.** Assert a row records its actual native executable/runtime version, lockfile, source hashes, successful production audit, and build outcome. Use the shared bunEvidenceRow helper for preparation and tests: `expect(row.bunVersion).toBe('1.4.3')`, `expect(row.bunLockfile).toBe(fixture.lockfile)`, `expect(row.cliRuntime).toEqual(outcome.cliRuntime)`, and `expect(() => bunEvidenceRow(fixture, { ...outcome, auditExitCode: 1 })).toThrow()`. Reject missing outcomes rather than defaulting success.
- [x] **Step 2: Observe RED.** Run the focused evidence assertions; expected the new helper/report fields to be missing. Do not write success evidence in docs yet.
- [x] **Step 3: Integrate preparation, builds, CI, and docs.** Prepare eight owned disposable apps through Task 4 helpers; invoke init/add/fresh-process reuse with the selected CLI runtime, and check source/lock ownership. Audit production dependencies after additions using native `bun audit --prod --json`, with exit zero and no skipped production packages required; assert lockfile bytes unchanged across audit for both formats. Never convert the lock to use another manager's audit. Build all eight through Node; publish measured outcomes in the final foundation report. Retain the existing eight npm/pnpm plus three Yarn consumers, for nineteen consumer builds total.

Install pinned Bun with the immutable setup-bun action above before integration tests. Keep Corepack Yarn priming in runner.temp and the repository pnpm-managed. Archive Bun reports with existing evidence. Exclude Bun keys alongside Yarn from browser server startup, preserving the existing 24 browser tests and their scope. Update README with all required tool pins/setup. Document binary preservation, explicit executable environment options, actual runtime checks, recovery, and unsupported workspaces. Do not describe bunx as a proven public route while the package is private.
- [x] **Step 4: Run the complete acceptance gate.** `pnpm check:foundation` must pass all nine stages, nineteen consumer builds/audits, eight Bun CLI-runtime cases, cross-runner cases, existing manager regressions, and unchanged browser parity. Record exact Node/Bun/manager/browser versions and runtime-specific test counts from actual results, without predicting counts here. Inspect artifacts for errors, skips, or hidden manager conversions.

Copy the successful machine report to docs/evidence/bun-consumer-run.json, retaining source revision, dirty-tree flag, platform, versions, statuses/counts, and relative evidence locations; remove temporary absolute paths. Explain whether it is a local or hosted run. Do not claim clean committed-source or CI evidence when the report says otherwise. Fill the evidence Markdown only after success.
- [x] **Step 5: Commit and review.** `git diff --check`, stage only Task 5 files, and `git commit -m "ci: verify Bun consumer support in the foundation gate"`. Request the execution method's fresh whole-branch review, resolve important findings with observed regression tests, and run affected/full checks as needed. Integration/push/PR is a separate authorized finishing decision; after an authorized push, observe final hosted CI before claiming hosted success.

## Plan self-review

- Spec coverage: detection/ownership/binary preconditions are Task 1; native/runtime boundaries Task 2; configuration, script controls, installed-package truth, and recovery Task 3; full runtime/lock/framework matrix and existing-manager cross-runner checks Task 4; audits/CI/docs/retained evidence Task 5.
- All five review risks have named regressions. Legacy lockfile feasibility is an explicit gate with a spec-revision stop rather than a hidden downgrade.
- Shared interface names and parameters are defined once; Task 1 plan metadata flows into Task 3, and Task 2 command representation is consumed by manager dispatch and test helpers.
- Every task includes RED, implementation, GREEN, and a commit. Changes stay within manager/runtime and evidence responsibilities; repository builds remain pnpm/Node.
- Preferred execution: preserve the user's earlier Native selection and current-folder feature-branch workflow, subject to approval of this plan. No implementation has started at this stage.
