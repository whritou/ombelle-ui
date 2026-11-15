# Unit suite resource budget

Date: 2026-11-15. Issue: [#143](https://github.com/whritou/ombelle-ui/issues/143).

The base Vitest configuration previously left concurrency to the host CPU count.
Compiler tests also spawn TypeScript processes, so that default can overcommit
memory. The suite now defaults to four workers, using the existing validated
worker-budget helper. `OMBELLE_TEST_WORKERS` overrides it; integration retains
its separate `OMBELLE_INTEGRATION_WORKERS` override. Setup hooks now receive the
same 60-second budget as tests instead of Vitest's 10-second default.

The recipe publication retirement test waited for transport with `vi.waitFor`,
whose one-second default also included asynchronous normalization and compilation.
It now waits for a promise resolved by transport startup, then edits, cancels or
disposes the controller while the response remains pending. The test's overall
60-second timeout still bounds that wait.

Verification on Windows with Node 24.19.0 (`pnpm exec node --version`) and pnpm
11.25.0, with no worker override:

- `pnpm test:unit`: 253 files passed; 4,521 tests passed, 4 skipped; 372.96 seconds.
- `pnpm typecheck`: passed.
- All five files named in #143 passed, including generated types, stable family
  hashes, snapshot cache capacity, preset preview protocol and recipe publication.
- `OMBELLE_TEST_WORKERS=0` rejects configuration before test collection with
  `OMBELLE_TEST_WORKERS must be a positive safe integer`.

The full run required access outside the sandbox for transaction and subprocess
tests. The initial sandboxed run was stopped after transaction failures; those
tests passed in the full run. This measures one complete run on this machine,
not repeated runs across every memory budget or the separately reported
machine-specific `tsx` preload failure.
