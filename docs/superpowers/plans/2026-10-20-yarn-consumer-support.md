# Yarn Consumer Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add verified Yarn Classic and modern Yarn consumer support while preserving manager, lockfile, source ownership, and existing npm/pnpm behavior.

**Architecture:** Extend the existing `PackageManager` contract and project-inspection flow, then keep Yarn-specific executable resolution and command flags inside the CLI dependency adapter. Validate the final behavior with real Yarn installations in Classic, modern `node-modules`, and modern Plug'n'Play fixtures, and add those fixtures to the foundation evidence gate.

**Tech Stack:** TypeScript, Node.js 24.19.0, pnpm 11.25.0 workspace, Vitest, Yarn Classic 1.22.22, modern Yarn 4.18.1, Corepack, Vite/Next.js, and existing CLI consumer fixtures.

**Spec:** `docs/superpowers/specs/2026-10-20-yarn-consumer-support.md`

## Global Constraints

- Consumer runtime remains React and ReactDOM 19.3.1 with Tailwind CSS v4 in Vite or Next.js.
- Preserve the consumer's selected package manager and Yarn lockfile format; do not convert managers or rewrite linker configuration.
- Install reviewed exact production dependencies and disable lifecycle scripts.
- Run process invocations with argument arrays and `shell: false`; do not evaluate launcher shell text.
- Modern Yarn must pass both `node-modules` and Plug'n'Play linkers; Yarn Classic must remain usable through its documented local CLI dependency route.
- A theme-only command, no-op addition, and dry-run must not invoke Yarn.
- Keep the repository itself pnpm-managed; Bun support is outside this slice.

## Review Focus

- Conflicting manager metadata or multiple lockfiles must fail before writes; test in Task 1.
- An explicit selection must not convert a project or create the selected manager's lockfile when a different manager lockfile exists; test in Task 1.
- Corepack or Windows Yarn launchers must not be treated as arbitrary executable shell scripts; test supported resolution and rejection in Task 2.
- Yarn Classic and modern Yarn must disable lifecycle scripts using their respective supported options; verify a package lifecycle sentinel remains absent in Task 2.
- PnP must install and build without a `node_modules` directory, and recovery must identify Yarn; verify in Task 3.

---

### Task 1: Detect Yarn Projects and Preserve Explicit Selection

**Files:**
- Modify: `packages/contracts/src/types.ts`
- Modify: `packages/cli/src/project/inspect.ts`
- Modify: `packages/cli/src/main.ts`
- Test: `tests/integration/yarn-detection.test.ts`
- Reuse: `tests/helpers/projects.ts`

**Interfaces:**
- Produces: `PackageManager = 'pnpm' | 'npm' | 'yarn'`.
- Produces: `inspectProject(cwd: string, explicitManager?: PackageManager): Promise<ProjectContext>`; `ProjectContext.manager` is the resolved manager.
- CLI accepts `--package-manager <npm|pnpm|yarn>` and passes it to `inspectProject`; Bun is not accepted in this slice.

- [x] **Step 1: Add failing project-detection cases**

Add `tests/integration/yarn-detection.test.ts` with cases that verify:

```ts
it('detects Yarn Classic from packageManager and yarn.lock')
it('detects modern Yarn from packageManager and yarn.lock')
it('detects Yarn from a unique yarn.lock when packageManager is absent')
it('uses an explicit Yarn choice when packageManager disagrees and yarn.lock is unique')
it('rejects multiple lockfiles even when an explicit manager is supplied')
it('rejects selecting Yarn when only a foreign lockfile exists')
it('rejects unsupported Yarn declarations and package-manager choices')
it('writes Yarn into plan output and saved Ombelle configuration')
```

Use exact declarations `yarn@1.22.22` and `yarn@4.18.1`, each with and without a Corepack integrity suffix. Assert all rejected inputs leave the fixture tree unchanged.

- [x] **Step 2: Run the targeted suite and confirm it fails**

Run: `pnpm exec vitest run tests/integration/yarn-detection.test.ts`
Expected: FAIL because Yarn is absent from the manager contract and project inspection/CLI flags.

- [x] **Step 3: Extend the contract and inspection flow**

Add `'yarn'` to `PackageManager`. Update `inspectProject` to accept `explicitManager`, parse valid Yarn Classic and modern `packageManager` versions with an optional `+sha224.<base64>` Corepack suffix, recognize a unique `yarn.lock`, and apply the spec's explicit-selection and no-conversion rules. Add `--package-manager` value parsing and usage text in `main.ts`. Preserve the existing `auto` config behavior and reject an Ombelle config manager that differs from the resolved project manager.

- [x] **Step 4: Run the targeted suite and confirm it passes**

Run: `pnpm exec vitest run tests/integration/yarn-detection.test.ts`
Expected: PASS, including pre-write rejection and manager/config propagation cases.

- [x] **Step 5: Commit the project-detection slice**

```bash
git add packages/contracts/src/types.ts packages/cli/src/project/inspect.ts packages/cli/src/main.ts tests/integration/yarn-detection.test.ts
git commit -m "feat: detect Yarn consumer projects"
```

### Task 2: Resolve and Run Yarn Safely

**Files:**
- Modify: `packages/cli/src/apply/manager.ts`
- Test: `tests/integration/yarn-manager.test.ts`
- Modify: `tests/integration/cli.test.ts` (manager failure recovery)

**Interfaces:**
- Consumes: `PackageManager` and `ProjectContext.manager` from Task 1.
- Produces: existing `managerEntry(manager: PackageManager): Promise<string>` resolves a Yarn JavaScript entry; `runDependencies(root: string, deps: Dependency[], manager: PackageManager): Promise<void>` installs with generation-appropriate Yarn flags.

- [x] **Step 1: Add failing executable and argument tests**

Add tests for: inherited Yarn Classic `.js` and modern `.cjs` entries; a Yarn executable found through PATH; a Yarn Windows command shim with a safe local JavaScript target; rejection of an unparseable shim; the exact `add --exact` dependency list; Classic `--ignore-scripts`; modern `--mode=skip-build`; `shell: false`; and a failing executable producing `DEPENDENCY_FAILURE` with a Yarn-specific message. Also verify a dry-run and theme-only invocation do not execute a fake Yarn entry. Assert lifecycle sentinel scripts do not execute in the real manager checks.

- [x] **Step 2: Run the targeted suite and confirm it fails**

Run: `pnpm exec vitest run tests/integration/yarn-manager.test.ts`
Expected: FAIL because `managerEntry` and `runDependencies` currently only support npm and pnpm.

- [x] **Step 3: Implement Yarn executable resolution and commands**

Extend `managerEntry` to accept Yarn entry basenames from inherited `npm_execpath` and supported PATH shims, resolve only readable JavaScript targets, and reject shell-only or ambiguous launchers. Resolve the Yarn major version from the selected executable before constructing the command. Use `yarn add --exact --ignore-scripts` for Yarn 1 and `yarn add --exact --mode=skip-build` for Yarn 4; pass dependencies as individual arguments. Keep `cwd` at the selected app root, timeout and recovery behavior consistent with the existing adapter, and `shell: false`.

- [x] **Step 4: Run manager and existing npm/pnpm regression tests**

Run: `pnpm exec vitest run tests/integration/yarn-manager.test.ts tests/integration/npm-options.test.ts tests/integration/npm.test.ts tests/integration/cli.test.ts`
Expected: PASS; npm/pnpm argument and recovery behavior remains unchanged, while Yarn failure recovery names Yarn and marks package state uncertain.

- [x] **Step 5: Commit the Yarn adapter slice**

```bash
git add packages/cli/src/apply/manager.ts tests/integration/yarn-manager.test.ts tests/integration/cli.test.ts
git commit -m "feat: install consumer dependencies with Yarn"
```

### Task 3: Verify Yarn Consumer Fixtures and Document Support

**Files:**
- Create: `tests/helpers/yarn-project.ts`
- Create: `tests/integration/yarn-consumers.test.ts`
- Modify: `scripts/prepare-consumers.ts`
- Modify: `scripts/build-consumers.ts`
- Modify: `scripts/check-foundation.mjs`
- Modify: `.github/workflows/foundation.yml`
- Modify: `README.md`
- Modify: `docs/05-cli-specification.md`
- Modify: `docs/10-installation-and-theme-merging.md`
- Create: `docs/evidence/yarn-consumer-support.md`

**Interfaces:**
- Consumes: manager detection and Yarn dependency adapter from Tasks 1–2.
- Produces: three locked Yarn consumer fixture entries, recorded versions and outcomes in the foundation evidence, plus user-facing support boundaries.

- [x] **Step 1: Add fixture-preparation tests and assertions**

Create `tests/integration/yarn-consumers.test.ts` with three real-manager cases: Yarn Classic 1.22.22 with `node_modules` and Vite; Yarn 4.18.1 with `node-modules` and Next.js; Yarn 4.18.1 with Plug'n'Play and Vite. Assert each row records its version/linker, completes init and component add, reuses the saved preset in a fresh CLI process, creates no npm/pnpm lockfile, keeps unrelated source, and builds. For PnP, assert `node_modules` is absent and invoke the build through the Yarn runtime.

- [x] **Step 2: Run the fixture-focused checks and confirm the Yarn rows fail**

Run: `pnpm exec vitest run tests/integration/yarn-consumers.test.ts`
Expected: FAIL because `tests/helpers/yarn-project.ts` and the real Yarn fixture flow do not yet exist.

- [x] **Step 3: Add pinned, isolated Yarn fixture creation**

Implement `tests/helpers/yarn-project.ts` to create the three fixture forms from the existing Vite/Next templates without copying repository-owned files outside the temp fixture. Pin `packageManager` to `yarn@1.22.22` or `yarn@4.18.1`; set modern PnP with `.yarnrc.yml` `nodeLinker: pnp` and modern node-modules with `nodeLinker: node-modules`. Generate and commit fixture lockfiles; install with immutable/frozen lockfile behavior. Keep the test fixture generator bounded to the three declared matrix rows.

- [x] **Step 4: Integrate Yarn rows into the foundation gate**

Update `prepare-consumers.ts` to verify Yarn executables and exact versions, prepare all three rows, run init/add/preset-reuse, audit production dependencies, verify lockfile ownership, and write per-row provenance. Update `build-consumers.ts` to build PnP via `yarn run` and other rows with the manager's local executable. Update `check-foundation.mjs` to include Yarn version and matrix evidence in the final report. Extend CI to install Corepack-enabled Yarn 1.22.22 and 4.18.1 without changing the root pnpm manager, then run the same gate.

- [x] **Step 5: Update support documentation and evidence template**

Document the exact verified Yarn Classic/modern versions, linker support, Classic local CLI dependency route, command scripts disabled, lockfile preservation, PnP no-`node_modules` behavior, and the remaining Bun exclusion in README and the CLI/install docs. Add `docs/evidence/yarn-consumer-support.md` with the three-row matrix and actual measured versions/results; do not write success claims before the gate passes.

- [x] **Step 6: Run Yarn fixture and full foundation verification**

Run: `pnpm exec vitest run tests/integration/yarn-consumers.test.ts`
Expected: PASS with real Yarn 1.22.22 and 4.18.1 installs, including PnP without `node_modules`.

Run: `pnpm check:foundation`
Expected: the full npm, pnpm, and Yarn gate passes; all three Yarn consumer builds pass; no foreign lockfiles or lifecycle side effects appear; evidence records exact versions and outcomes.

- [x] **Step 7: Commit the fixture, docs, and evidence changes**

```bash
git add tests/helpers/yarn-project.ts scripts/prepare-consumers.ts scripts/build-consumers.ts scripts/check-foundation.mjs .github/workflows/foundation.yml README.md docs/05-cli-specification.md docs/10-installation-and-theme-merging.md docs/evidence/yarn-consumer-support.md fixtures
git commit -m "test: verify Yarn consumer support"
```

## Self-Review

- Spec coverage: Tasks 1–2 cover detection, explicit selection, manager propagation, safe invocation, generation-specific script controls, and recovery. Task 3 covers Classic/node-modules/PnP consumer flows, saved preset, lock ownership, no-op/theme-only behavior, real builds, evidence, and docs. Bun remains excluded.
- Step scan: each task has a failing test, a focused implementation, passing regression checks, and an independent commit. The full foundation gate is the final system-level verification.
- Type consistency: `PackageManager`, `ProjectContext.manager`, `inspectProject`'s explicit manager argument, and manager adapter APIs use one shared contract.
- Review focus: each of the five listed risks is covered by a test in its owning task.
- Proportion: three tasks align to the detection, execution, and real-consumer verification boundaries in the spec.
