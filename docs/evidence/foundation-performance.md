# Foundation performance evidence

## Browser reference reuse and worker budget

Playwright defaults to two file-level workers. `OMBELLE_E2E_WORKERS` accepts a positive safe integer, including `1` for comparison runs; malformed or empty values fail configuration before workers start. `fullyParallel` stays disabled and retries stay zero, so each spec retains sequential execution and its aggregate evidence owner.

Badge captures the preview reference once per equivalent style family, mode, viewport, reduced-motion setting, forced-colors setting and color scheme in the owning worker. The component-preset helper similarly reuses measurements from the independent ordinary-component host baseline. Every new capture retains readiness/font checks and the baseline's assertion that it requested no preset modules or CSS. Actual consumer pages still perform their existing parity, source, accessibility, state and isolation assertions.

Caches store serialized JSON only. Badge images are encoded as base64; every lookup returns a separate data copy. Pages, contexts, locators and Buffers remain local to each test/capture. Failed captures are evicted, and caches live only for the worker process.

## Implementation checks, 2026-10-24

Environment: Windows, Node 24.19.0, pnpm 11.25.0, Vitest 5.0.5, Playwright 1.64.1. Browser configuration uses Chromium with the local `msedge` channel when supplied by the environment; no browser was launched for these checks.

- `pnpm typecheck`: passed.
- `pnpm test:unit`: 190 tests passed across 24 files.
- `pnpm exec playwright test --list --reporter=list`: registered all 118 tests across six specs. A temporary ignored descriptor containing the 34 consumer identities was used only for registration and was removed immediately afterward. This is not browser execution evidence.
- Focused cache/worker, consumer-matrix, recipe-evidence and component-preset-evidence checks: 26 tests passed across four files. The cache/worker regression suite passed 15 tests after a behavioral RED run with 13 failures. It covers malformed worker counts, rendering-condition key separation, single capture for concurrent requests, copy isolation, failed-capture recovery and worker-local lifetime.

## Runtime probe reuse and bounded consumer work

Consumer preparation and builds default to two workers. Set `OMBELLE_CONSUMER_WORKERS=1` for serial comparison or another positive safe integer to choose a budget. The scheduler stops assigning new consumers on failure, waits for all running consumers, and only then publishes completed/failed evidence in original matrix order from the parent. A failed run cannot publish a successful consumer matrix; unstarted builds retain pending status. Recipe and scoped-preset inputs, including deliberately changed same-revision presets, use private temporary directories outside consumer snapshots and are removed when each operation settles.

Test-helper runtime probes reuse a worker-local promise for identical runtime, safe effective environment, executable selection and executable metadata. Replacing a configured binary, changing PATH or configuration, or changing runtime forces a new probe. Failed probes are evicted and callers receive separate identity records. The production executable/native/version checks remain unchanged.

`pnpm test:integration` uses an integration-only Vitest configuration with four workers. `OMBELLE_INTEGRATION_WORKERS` accepts the same positive safe integer overrides. Focused integration commands should include `--config vitest.integration.config.ts`. The base/unit Vitest configuration retains its existing worker behavior. Actual resolved configuration on this Windows host was 15 base workers, four integration workers, and one integration worker with an explicit override of 1.

Task 7's complete integration run on the same Windows/Node 24.19.0/pnpm 11.25.0 environment passed all **204 tests across 35 files**, with zero failed or skipped tests, in **241.05 seconds** reported by Vitest (**243.13 seconds** measured wall time). The previously timing-out scoped preservation test passed in **45.196 seconds** under its unchanged 60-second timeout. This single successful run does not establish the earlier timeout's cause or a speedup. The focused runtime/concurrency/evidence run passed 39 tests across seven files after a behavioral RED run with 10 failures and three passes. Package build, TypeScript checks and all 190 unit tests passed; the final focused rerun also passed 39 tests. No full consumer preparation or foundation gate was run during this implementation step, to avoid duplicating the controller's final preparation/gate.

## Pending browser measurements — controller owns completion

Consumers were not prepared for Task 6. Under the approved execution order, the controller must collect the following after final consumer preparation. No timing or speedup is claimed here, and Windows results must not be described as Linux/CI results.

1. Use the same prepared consumers, preview sources, browser/channel/version, machine and focused spec set for both runs. Record wall duration and actual pass/fail/skip/flaky counts separately from server startup where available. Run complete Badge and keyboard files together (60 tests); parity may be added consistently to both runs. For example, in PowerShell:

   ```powershell
   $env:OMBELLE_E2E_WORKERS = '1'
   pnpm exec playwright test tests/e2e/badge.spec.ts tests/e2e/keyboard.spec.ts --reporter=list
   $env:OMBELLE_E2E_WORKERS = '2'
   pnpm exec playwright test tests/e2e/badge.spec.ts tests/e2e/keyboard.spec.ts --reporter=list
   Remove-Item Env:OMBELLE_E2E_WORKERS
   ```

2. At final verification, run the complete 118-test browser suite through the complete foundation gate with the default two workers. Record its actual duration, browser version, environment and counts, and ensure the aggregate recipe/preset evidence is complete. Avoid a redundant additional full gate solely for Task 6.
3. Fill this document with the observed comparison and full-suite results. Recipe and component-preset files validate complete row arrays in `afterAll`; do not benchmark grep subsets of those aggregate-owning files. Preserve all assertions and reject missing, duplicate, failed, skipped or flaky final evidence.
