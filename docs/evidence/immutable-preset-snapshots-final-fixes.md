# Final review fixes

**Implementation commit:** `68eb9743e792f40cadc6f4939918011188625269` (`fix(snapshots): clean startup resources and stop withdrawn retries`).

## Findings addressed

1. `serve-snapshot-www` now creates its marker exclusively, owns cleanup only after successful creation, and cleans the owned marker and temporary database if initialization, worker prebuild, or child startup fails. Normal child exit and termination also use the same idempotent cleanup. An existing marker is left intact.
2. HTTP 410 now transitions publication to a terminal `withdrawn` state. The same attempt remains available for Cancel, but no submit/retry button is offered and the controller rejects retry. Cancel returns to idle so a new publication intent can be confirmed.

## Focused TDD evidence

RED command (exit 1):

```powershell
pnpm exec vitest run apps/www/src/snapshots/use-publication.test.ts apps/www/src/snapshots/snapshot-www-resources.test.ts -t 'withdrawn publication is terminal|cleans the owned marker|preserves a marker owned'
```

The 410 case observed `failed` instead of `withdrawn`; startup regressions observed the leaked owned temp root and marker overwrite of a pre-existing marker.

GREEN command (exit 0): same command; **3 passed**, 16 skipped by the test-name filter, across 2 files.

The focused test file command also passed (exit 0):

```powershell
pnpm exec vitest run apps/www/src/snapshots/snapshot-www-resources.test.ts
```

Result: 2 passed.

Typecheck (exit 0): `pnpm typecheck` (schema/catalog sync plus `tsc --noEmit`). Runtime used Node 24.19.0 and pnpm 11.25.0.

## Limits and self-review

- No previously passing 619 unit, 411 integration, 34 consumer-build, 57 browser, or 298 browser results were rerun or treated as proof for this change. Those remain historical evidence at source commit `6f0451914997fd5db16db351b8e7a02f4800e593`.
- The low-severity `deepmerge@4.3.1` development-toolchain audit finding remains unsuppressed and unpatched. The official consumers group remains incomplete and the aggregate remains failed as documented in the prior evidence.
- The new launcher regression tests exercise resource preparation and ownership with a forced prebuild failure; they do not launch Next or assert browser behavior. The 410 test exercises the publication controller; this turn did not rerun browser UI tests.
- Self-review found no quota, deadline, audit, dependency, deployment, or production behavior changes. No broad build or test run was performed.
