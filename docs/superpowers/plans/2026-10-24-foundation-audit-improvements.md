# Foundation Audit Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement the nine approved audit recommendations without weakening validation.
**Architecture:** Keep the complete local foundation gate. Extract testable process/evidence helpers, introduce controlled concurrency, then split CI quality/consumer execution with strict aggregate validation.
**Tech Stack:** TypeScript/ESM, Node, pnpm, Vitest, Playwright, GitHub Actions.
**Spec:** docs/superpowers/specs/2026-10-24-foundation-audit-improvements.md

## Global Constraints

- Preserve all 34 consumer cases and all 118 existing browser tests and their source/parity/accessibility/state assertions; additional regression tests are allowed.
- Preserve dry-run, stale-plan, containment, conflict, locking and rollback safety; --yes never bypasses validation.
- Use Node 24.19.0 and pnpm 11.25.0; existing manager versions remain pinned; all dependency installs disable lifecycle scripts.
- Local pnpm check:foundation remains a complete gate and rejects failed, skipped, flaky, missing or duplicate evidence.
- No pushes, merges or publication. Use Conventional Commits on perf/foundation-audit.
- Record measurements honestly; Windows observations are not Linux or CI benchmark results.

## Review Focus

- Cancellation while a child is running preserves completed stages and partial logs, terminates descendants, and allows stable evidence capture (Task 1).
- Cache fallback hits never skip frozen installation or current advisory checks (Tasks 3 and 5).
- Saved preset drift and unsafe revisions reject before source/dependency writes (Task 4).
- Shared input/evidence paths cannot cross-contaminate concurrent consumers or browser files (Tasks 6 and 7).
- Missing jobs, mismatched commits and incomplete matrices cannot produce a passed aggregate (Task 8).

### Task 1: Durable foundation diagnostics and stable evidence uploads
**Files:** scripts/check-foundation.mjs; new focused process/evidence helpers in scripts/; tests/integration/foundation-runner.test.ts; .github/workflows/foundation.yml.
**Interfaces:** Keep default gate CLI stable. Extract a reusable stage runner; report stage lifecycle and millisecond timing; emit final stable upload directories using a dedicated evidence staging script.
- [ ] Write failing subprocess tests proving output reaches disk before exit, completed stages survive interruption, and a canceled child is terminated; on Windows use supported termination behavior and cover POSIX signals conditionally.
- [ ] Stream stdout/stderr live and to files with bounded in-memory tails; persist report before/after stages; handle termination and await child tree shutdown, preserving nonzero status.
- [ ] Stage core JSON/logs separately from finalized browser reports/attachments after teardown; exclude .playwright-artifacts-* and avoid treating missing optional canceled outputs as success evidence. Include component-preset measurement/consumer/browser JSONs.
- [ ] Run focused tests; commit fix(ci): preserve cancellation diagnostics and stable evidence.

### Task 2: Explicit setup and verification budgets
**Files:** .github/workflows/foundation.yml; docs/foundation-local-usage.md.
**Interfaces:** Task 1 stable uploads remain independent steps. Task 8 will retain these budgets in split jobs.
- [ ] Set a temporary 60-minute job ceiling, browser setup timeout 15 minutes, foundation step timeout 40 minutes, stable evidence staging/upload bounded separately at 3/5 minutes. Explain setup is included in job time.
- [ ] Keep cancellation/failure visible; do not add continue-on-error to validation. Refresh pinned pnpm/upload actions to verified Node-24-native releases only if official support exists, otherwise document remaining warning without inventing a replacement.
- [ ] Validate workflow YAML and inspect timeout relationships; commit ci: separate setup and foundation time budgets.

### Task 3: Dependency remediation and current workspace audit
**Files:** package.json/pnpm-lock.yaml/pnpm-workspace.yaml as needed; .github/workflows/foundation.yml; docs/decisions/0002-registry-adapter.md; focused dependency policy test only if substantive behavior is added.
**Interfaces:** Provide package script audit:workspace invoking a fresh full workspace audit; Task 8 retains it in quality job.
- [ ] Re-query advisories before changes. Remediate fast-uri 3.1.8 to >=3.1.9 and body-parser 2.3.0 to >=2.4.0 through minimal compatible resolution updates; prefer lock refresh to overrides and justify overrides if required.
- [ ] Install frozen with --ignore-scripts after lock update. No advisory suppression. Update withdrawn braces advisory documentation to current status and document exact audit scope.
- [ ] Run fresh workspace audit plus build:packages, package tests and upstream compatibility integration check. Record any new registry findings instead of silently suppressing them.
- [ ] Commit fix(deps): remediate audited transitive dependencies.

### Task 4: Consistent saved-preset and revision validation
**Files:** packages/cli/src/plan/components.ts; schemas/preset.schema.json or packages/contracts/src/validate.ts; focused tests in contracts and CLI; generated schema output only through generator.
**Interfaces:** Ordinary planAdd rejects initialized saved preset hash/compiler mismatch like recipe/scoped planners; initialization remains supported.
- [ ] RED: initialized flat preset edited primary #123456 then ordinary add input rejects FILE_CONFLICT before writes; unchanged initialized add and first initialization continue passing.
- [ ] RED: preset revisions Number.MAX_SAFE_INTEGER+1 and 1e21 reject INVALID_DATA at revision; valid positive safe integers work.
- [ ] Implement shared or direct provenance guard without mutating global CSS; require theme operation for global changes. Match existing recipe safe-integer semantics.
- [ ] Build packages and run affected tests; commit fix(cli): reject preset drift and unsafe revisions.

### Task 5: Explicit package-store and browser caching
**Files:** .github/workflows/foundation.yml; optional reusable workflow/action helper if it genuinely reduces repeated setup; docs/foundation-local-usage.md.
**Interfaces:** Task 8 reuses cache setup in quality/consumer jobs.
- [ ] Add explicit pnpm/npm/Yarn/Bun/Corepack download-store caching using verified cache paths; cover root and all relevant fixture lockfiles including bun.lockb, package locks and yarn locks. Keys include OS/architecture and manager/runtime versions. Do not cache node_modules or audit outcomes.
- [ ] Cache Playwright browser downloads using OS/architecture and pinned Playwright version/lock; continue system-dependency setup and browser verification on cache hits.
- [ ] Check official action support, pin new actions by verified SHA, preserve fresh frozen installs/audits and narrow contents:read permissions. Validate YAML and key coverage; commit ci: cache pinned manager stores and browser downloads.

### Task 6: Controlled browser parallelism and reusable immutable references
**Files:** playwright.config.ts; tests/e2e/badge.spec.ts; tests/helpers/component-preset-isolation.ts; optional test reference helper; docs/evidence/foundation-performance.md.
**Interfaces:** Keep sequential tests within each spec and existing aggregate evidence owners. Expose OMBELLE_E2E_WORKERS validated positive integer, default 2; benchmark override 1.
- [ ] Add behavior-level tests for any new cache/worker parsing helper. Preserve viewport/media/font readiness and isolation request assertions in reference cache keys/setup.
- [ ] Use two file-level workers; keep retries zero and fullyParallel disabled. Reuse Badge reference per family/mode and independent scoped host baseline per equivalent family/mode/viewport/media within the owning worker, not mutable pages.
- [ ] After consumers are available benchmark workers 1 and 2 on the same focused representative spec set and then the full suite at final verification; do not start redundant full gates. Record actual environment/durations and counts, no predicted speedup. Controller may perform browser measurements after Task 7 preparation.
- [ ] Run focused checks, document pending measurement ownership explicitly; commit perf(test): reuse browser references with bounded workers.

### Task 7: Runtime probe reuse and bounded consumer work
**Files:** tests/helpers/cli-runtime.ts; scripts/prepare-consumers.ts; scripts/prepare-component-preset-consumer.ts; scripts/build-consumers.ts; new bounded map helper/tests; existing evidence helpers as needed.
**Interfaces:** OMBELLE_CONSUMER_WORKERS validated positive integer default 2, override 1. Parent owns deterministic merged evidence; each worker uses a distinct consumer root and input directory.
- [ ] RED: identical runtime/env identity reuses probes, changed executable or relevant environment cannot reuse identity; failed probes are not cached. Keep production executable checks unchanged.
- [ ] RED: bounded scheduling never exceeds limit, preserves input ordering, stops scheduling after failure and waits for already-running workers before returning/cleanup.
- [ ] Isolate recipe/scoped input paths per consumer, including temporary tamper mutations. Memoize test-helper identity using effective executable/config-sensitive inputs.
- [ ] Prepare and build consumers through bounded scheduling; workers return independent evidence and a single writer persists deterministic snapshots. Preserve pending/failed states and owned-fixture cleanup safety. Benchmark representative work only if feasible; final gate covers all 34.
- [ ] Build packages, run focused runtime/evidence/concurrency tests; commit perf(ci): bound consumer work and reuse runtime probes.

### Task 8: Independent CI groups and strict aggregate evidence
**Files:** scripts/check-foundation.mjs; new group/aggregate helper and tests; package.json; .github/workflows/foundation.yml; docs/foundation-local-usage.md.
**Interfaces:** Default local gate remains complete. Add explicit quality/consumers execution modes and required final aggregate mode; names/options chosen clearly and documented. Quality runs package build, unit/integration, typecheck and fresh workspace audit; consumers builds packages, generates preview, prepares/builds consumers/preview and runs browser checks. Each records actual sourceCommit and group identity.
- [ ] RED: aggregate rejects absent/failed group, sourceCommit mismatch, duplicate group and incomplete/skipped/flaky matrix; accepts complete matching measured groups. Do not merely trust a status string.
- [ ] Split independent jobs with separate checkouts/setup and unique evidence artifacts; required aggregate job consumes only their stable core evidence and performs existing final evidence validators. Stage/browser uploads still run on failure/cancellation; aggregate success is impossible when a prerequisite job failed.
- [ ] Avoid whole-file browser sharding; six evidence-owning files plus controlled workers suffice for this implementation. Do not serialize machine-local fixture roots as reusable build inputs across jobs.
- [ ] Run group orchestration/aggregate tests and validate workflow. Final local complete gate must exercise shared code. Commit ci: split foundation jobs with required evidence aggregation.

### Task 9: Verified cleanup and responsibility-focused splits
**Files:** packages/cli/src/project/inspect.ts; packages/compiler/src/recipe.ts; packages/cli/src/recipe-file.ts; packages/cli/test/component-preset-plan.test.ts and new focused test/helper files; scripts/component-preset-evidence.ts and focused extracted evidence modules if valuable; tests/e2e/recipes.spec.ts plus helper(s).
**Interfaces:** Preserve public exports, browser test registration/count and evidence ownership; helper extraction does not enable arbitrary sharding.
- [ ] RED: generated recipe dependencies exclude @radix-ui/react-slot while ordinary Button retains it and recipe generated imports remain resolvable. Filter only recipe dependency result.
- [ ] RED: recipe-file rejects directories and POSIX FIFO without hanging using child timeout; normal bounded UTF-8/size validation retained. Use pre-open/nonblocking safeguards appropriately.
- [ ] Verify readJson usage/public exports then remove only that dead helper. Split large scoped planner tests by behavior and share setup helpers; extract recipe browser operations/evidence validation by responsibility while retaining top-level tests/aggregate hooks.
- [ ] Build/typecheck and run affected suites; final full gate measures all coverage. Commit refactor: simplify recipe dependencies and verification modules.
