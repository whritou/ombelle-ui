# Foundation gate: measured evidence

This document records one official `pnpm check:foundation` run that passed every stage in a single process (all groups, no merged partial reports). It is local Windows evidence. It is not hosted CI, a public release, or human assistive-technology review.

## Source and environment

- Source commit: `84f2189cbbd665452f57468d5fae7bb00c54001e` (`chore(audit): accept unpatched minimatch advisory until 2026-11-30`), clean at official run start (`workingTreeDirty: false`).
- Run: 31 October 2026, 18:17:45–19:25:43 UTC (68 minutes).
- Windows 11, Node 24.19.0, pnpm 11.25.0, npm 11.19.0, Yarn Classic 1.22.22, modern Yarn 4.18.1, Bun 1.4.3. Browser: Chromium 156.0.4314.50 through the Microsoft Edge channel (`OMBELLE_BROWSER_CHANNEL=msedge`).
- The Node and Bun archives were checked against their published SHA-256 sums and unpacked under `C:\Users\thomas\.cache\ombelle-toolchain`. pnpm and Yarn came through corepack. Nothing was installed system-wide.
- Registry TLS uses the Windows system certificate store through process-scoped `NODE_USE_SYSTEM_CA=1`. Certificate verification stays enabled.
- Integration uses one worker (`OMBELLE_INTEGRATION_WORKERS=1`), matching the previous official quality run.
- `TEMP` and `TMP` point to a private directory under the user profile, `C:\Users\thomas\.cache\ombelle-gate-tmp`, for two reasons:
  - On this host, `%LOCALAPPDATA%\Temp` has explicit ACL entries granting Modify to `CodexSandboxUsers` and five unresolved SIDs. The snapshot cache correctly refuses directories that other principals can modify.
  - Windows temp cleanup deletes the extracted toolchain mid-run (see runs 1 and 13).

## Official result

`pnpm check:foundation` exited 0 with status `passed`:

| Stage | Result |
| --- | --- |
| Package build, preview generation, typecheck, preview build | passed |
| Unit | 625 passed, 0 failed, 0 skipped |
| Integration | 413 passed, 0 failed, 0 skipped |
| Consumers | 34 prepared and built: 6 pnpm, 6 npm, 6 Yarn (Classic, modern `node-modules`, Plug'n'Play), 16 Bun |
| Browser | 355 passed, 0 skipped, 0 unexpected, 0 flaky (30.3 min) |
| Workspace audit | passed: 1 low and 1 moderate finding, both ignored by the documented exceptions |

Browser cases per spec: Badge 30, Card 30, Checkbox 30, Switch 30, Tabs 30, Tooltip 30, forms 30, keyboard 30, component presets 20, recipes 20, minimalist states 12, parity 6, Button editor 9, preset editor 26, snapshot presets 22.

This single run does three things:
- It replaces the incomplete consumers group and failed aggregate recorded in the [snapshot evidence](immutable-preset-snapshots.md).
- It measures the M2 component-specific browser split (Checkbox, Switch, Tabs, Tooltip) and the M3 Button editor cases, which [the final M2 evidence](m2-components.md) and the delivery plan still listed as unverified.
- Its result files were preserved outside the repository with the run log.

## Changes made to reach the pass

- `fix(deps)` `07a4ca4`: `systeminformation` 5.33.15 → 5.33.17. This is a lockfile-only change within `@dotenvx/dotenvx`'s `^5.22.11` range. It remediates the high-severity [GHSA-3f7j-7jwc-fxfj](https://github.com/advisories/GHSA-3f7j-7jwc-fxfj) in the development-only shadcn chain.
- `chore(audit)` `b13b87e` and `84f2189`: scoped `auditConfig.ignoreGhsas` exceptions, both to be reviewed by 30 November 2026. Neither advisory has an in-range patched release. `tests/integration/audit-policy.test.ts` enforces the exact list and the review date. See the [registry adapter decision](../decisions/0002-registry-adapter.md).
  - `deepmerge` [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): low severity.
  - `minimatch` [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): moderate severity, published during this work.
- `test(yarn)` `a2682c4`: the Yarn consumer integration rows get a 180-second limit instead of the shared 60-second default. Run in isolation, the modern-next row took 38–62 seconds, mostly in Yarn's link step. The global default is unchanged.
- `fix(snapshots)` `a31472b`: the snapshot browser launcher records its PID in `.artifacts/snapshot-browser.json`. On Windows, Playwright stops web servers with a forced tree kill, so the launcher's exit handlers never removed the marker, and every later browser run failed with `EEXIST`. A marker is now recovered only when all three conditions hold:
  - its owner has exited;
  - the marker parses;
  - its root is an `ombelle-snapshot-www-*` directory directly inside the temp directory.
  
  A live owner, an unreadable marker, or an unsafe root still blocks startup. Three focused tests cover this, which is why the unit count rose from 622 to 625.

## Retained failed attempts

None of these counts as passing evidence. Runs 1–5 used commit `b13b87e`, run 6 `a2682c4`, and runs 7–14 `a31472b`.

1. **Run 1:** 14 of 622 unit tests failed, because of the shared-temp ACL described above. A focused rerun of both affected files with a private `TEMP` passed 71 of 71.
2. **Run 2:** a malformed `TEMP` path in the session environment stopped pnpm before any stage, so nothing was measured.
3. **Run 3:** every stage passed (622 unit, 413 integration, 34 consumers, 355 browser), but the run started with a dirty tree. Run 1's package build had rewritten five generated files with LF endings under `core.autocrlf=true`; their content was identical.
4. **Run 4:** four integration tests timed out at 60 seconds during a host slowdown that ended in a PC restart. Run alone afterwards, both files passed 6 of 6.
5. **Run 5:** the Yarn 4 modern-next row timed out at 60 seconds, which led to the `a2682c4` change above.
6. **Run 6:** integration passed 413 of 413 and all consumers built. The browser stage then failed with `EEXIST` because run 3's killed server had left its marker, which led to the `a31472b` change above.
7. **Run 7:** one npm install received a 404 for `rolldown@1.2.16`, published 61 seconds earlier. The npm test fixtures resolve unpinned transitive dependencies; [whritou/ombelle-ui#21](https://github.com/whritou/ombelle-ui/pull/21) pins them separately.
8. **Runs 8, 9 and 11:** the process was killed by a session or PC restart (during browser, consumer and integration stages respectively), with no test failure recorded.
9. **Run 10:** 343 of 355 browser cases passed. One Next consumer's `npm ci --offline` hung, and the snapshot web server then exited silently. The snapshot spec alone then passed 22 of 22.
10. **Run 12:** the Yarn modern-next row exceeded 180 seconds while another project's test suite was running and only 1.5 GB of RAM was free. Replayed alone four times, the same steps took 48–89 seconds; the fetch step took under 1 second, and Yarn's link step took 40–48 seconds.
11. **Run 13:** Windows temp cleanup deleted the scratch toolchain (Bun, and Node's bundled corepack) mid-run, so 10 Bun and pnpm tests could not resolve executables. The toolchain then moved to the user cache directory.
12. **Run 14:** every test stage passed (622 unit, 413 integration, 34 consumers, 355 browser). The audit failed on the newly published `minimatch` advisory, which led to `84f2189`.

## Limits

- **Host load:** the gate is sensitive to load on this host. Yarn's `node_modules` link step and Next builds slowed by 2–4× while other test suites and sessions ran. An official run needs an otherwise quiet machine.
- **Dirty tree after a run:** generators write LF output in a CRLF checkout, and the browser stage's Next dev server rewrites `apps/www/next-env.d.ts`. Every run therefore leaves the tree dirty, and a run is clean only if the tree is restored first.
- **Coverage:** one browser engine (Chromium through Edge) on one Windows host. There is no Firefox, Safari, native text zoom, NVDA, or VoiceOver measurement. The Yarn and Bun rows are build, parity, and audit checks, not browser checks.
- **Audit scope:** an audit with no unignored findings records the registry response at run time only. The two ignored advisories must be reviewed by 30 November 2026.
