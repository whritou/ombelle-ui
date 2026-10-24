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

## Pending browser measurements — controller owns completion

Consumers were not prepared for Task 6. Under the approved execution order, the controller must collect the following after Task 7's final consumer preparation. No timing or speedup is claimed here, and Windows results must not be described as Linux/CI results.

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
