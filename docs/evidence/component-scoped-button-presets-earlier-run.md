# Earlier independent component-scoped Button preset evidence

The local `add button --preset <local.json>` workflow is implemented and passed the full foundation gate. The measured source was implementation commit `b0c16f94b17c0f6f51cc5bc80f82cf2b256a58c2`; the working tree was dirty because the Task 6 documentation and evidence files were being prepared. The gate ran from 2026-10-22 18:53:45 UTC to 19:21:59 UTC on Windows (`win32`, OS version `10.0.26100.0`) using Node 24.19.0 and pnpm 11.25.0.

## Verification result

All nine `pnpm check:foundation` stages passed with exit code 0:

| Stage | Result | Duration |
| --- | --- | ---: |
| `build:packages` | Passed | 1.040 s |
| `test:unit` | Passed, 141 tests | 8.007 s |
| `test:integration` | Passed, 147 tests | 208.767 s |
| `generate:preview` | Passed | 2.528 s |
| `prepare:consumers` | Passed | 931.844 s |
| `typecheck` | Passed | 2.084 s |
| `build:preview` | Passed | 1.871 s |
| `build:consumers` | Passed | 154.701 s |
| `test:e2e` | Passed, 86 tests | 381.900 s |

There were no failed, skipped, or flaky unit, integration, or browser tests. The consumer gate completed 34 descriptors and 102 component-preset installations: pnpm 18 rows, npm 18, Yarn 18, and Bun 48. Each consumer installs the three supported preset families and verifies the manager-specific lockfile, preservation, repeat no-op, conflict, audit, and production build behavior.

The component-preset browser suite has 18 Playwright cases across five app targets: preview, Vite, Next.js, npm Vite, and npm Next.js. Each case measures all five targets, for 90 measured rows. These 90 measurements are separate from the 86 passing Playwright cases reported for the entire browser suite. Each measured row checks Button behavior and states, focus, forced colors, reduced motion, host-style isolation, computed styles, and artifact hashes.

## Toolchain

- Windows `win32`, OS version `10.0.26100.0`.
- Node 24.19.0 and pnpm 11.25.0.
- npm 11.19.0 from the isolated task directory at `%TEMP%\ombelle-ui-component-presets-npm-11.19.0`; the global npm installation was not changed.
- Yarn Classic 1.22.22, Yarn modern 4.18.1, and Bun 1.4.3.
- Playwright 1.64.1 with bundled Chromium 156.0.8078.4.
- Consumer installation and audit used registry access. Yarn and Bun were checked for install, preservation, audit, and production builds; the browser matrix did not run against Yarn or Bun apps.

## Initial attempt

The first full-gate attempt stopped at `prepare:consumers` after all 18 pnpm rows passed. Its PATH selected npm 11.4.1 instead of the required isolated npm 11.19.0, so the first npm consumer failed the version guard. The corrected run put the isolated npm package's `bin` directory first on PATH and then passed all nine stages and 102 installations. The failed attempt and its saved report/log hashes are recorded separately in the machine-readable run record; it is not counted as the final result.

## Behavior and verification boundaries

The command accepts a local JSON preset for one Button in an initialized supported project. It writes a separate scoped Button, colocated CSS, usage example, and provenance while preserving the saved project preset, global CSS, ordinary Button, and existing usages. Conflicts protect unowned or edited files and incompatible shared utilities; `--yes` does not bypass them. The target project's selected package manager and lockfile remain in use.

The measured browser matrix does not establish Yarn or Bun browser behavior. Hosted CI, remote or saved-code resolution, arbitrary CSS overrides, portal-rendered components, editor or export workflows, native browser zoom, manual review, and screen-reader acceptance were not verified by this task.

The prior Task 5 full gate passed at `e6929ee8b0670871b5b1f67ad63a8287b26b74f1` with 141 unit, 146 integration, and 86 browser tests, 34 consumers, 102 installations, and 90 component-preset browser measurements. The re-review fix commit `b0c16f94b17c0f6f51cc5bc80f82cf2b256a58c2` added usage-file preservation coverage and is included in this fresh Task 6 measurement. Its summary is in `.superpowers/sdd/2026-10-22-component-scoped-button-presets/task-5-report.md`.

The [machine-readable run record](component-scoped-button-presets-earlier-run.json) lists all stage results, exact counts, tool versions, evidence paths, and SHA-256 hashes. Detailed run artifacts are local under `.artifacts/` and are not committed.

This historical run verifies its recorded source and environment only. The [later feature-branch run](component-scoped-button-presets.md) is the primary retained evidence. Neither run verifies the subsequent merge resolution.
