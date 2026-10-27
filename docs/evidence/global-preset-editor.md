# Local global preset editor evidence

Date: 2026-10-27. Final verification source: `89be4c3` on `feat/global-preset-editor`, based on `403685d`.

The local editor at `/editor/preset` customizes global project presets, renders reviewed generated components in an isolated gallery, and exports normalized JSON and compiled CSS. Installation uses the existing private CLI. This is the local editor increment of M4; immutable publishing and remote resolution remain pending.

## Recorded focused checks

| Check | Observed outcome |
| --- | --- |
| Expanded unit selection, `pnpm test:unit` | 336 passed across 50 files in the final combined-gate attempt, including app units and the malformed-response regression. |
| `pnpm test:integration` | 320 passed across 46 files in the final combined-gate attempt, using two integration workers. Includes eight editor-export CLI cases and all 39 strict evidence-gate regressions. An earlier one-worker run also passed. |
| `playwright test tests/e2e/preset-editor.spec.ts` | 26 passed using one worker, in 12.7 minutes. Subsequent focused regressions passed for blocked Worker construction/retry, recovery-reset notices, and unavailable-preview guidance. |
| Existing `playwright test tests/e2e/editor.spec.ts` | All nine Button editor cases passed after the preset implementation and refinements. |
| TypeScript and production product build | Passed; the build contains `/`, `/editor/component/button`, and `/editor/preset`. Both compiler workers bundle for the browser. |
| `pnpm audit:workspace` | Passed after the combined attempt; no known vulnerabilities found. |

The focused measurements used Windows 10.0.26200, Node 24.19.0, pnpm 11.25.0, npm 11.19.0, and Microsoft Edge 156.0.4314.42 through Playwright's `msedge` channel. The integration toolchain also included Yarn 1.22.22/4.18.1 and Bun 1.4.3. Dependency lifecycle scripts stayed disabled.

Sandboxed attempts at temporary-project renames, symlink checks, and Next.js dependency junction creation were denied. Their successful runs used the required filesystem permission; no installer conflict rule or test assertion was relaxed. The shell's default Node and bundled pnpm launcher were unsuitable for exact-version evidence, so commands explicitly used Node 24.19.0 and pnpm 11.25.0's JavaScript entry.

## What the browser comparison measures

Six cases cover each family in light/dark: all twelve catalog rows, invalid/disabled/loading/selected states, real focus, contained Dialog portals, token contrast, and local compilation without edit-triggered network requests.

Twelve cases download the actual JSON and apply it through the built CLI to private npm Vite/Next.js consumers. They compare installed component/utility hashes, specimen DOM, computed colors/fonts/radii/borders/heights/shadows/motion, exact representative Button PNG bytes, and open Dialog behavior. The fixtures customize both palettes, radius, density, and font. The capture rectangle includes the iframe's measured content origin and border offsets; paired screenshots use matching raster positions. No pixel tolerance was introduced.

Eight further cases cover refresh/history, explicit family-switch intent, corrupt storage recovery, storage/clipboard failures, invalid and delayed compilation, frame tampering/reconnection, keyboard access and 320 CSS pixel reflow, and valid export with the preview unavailable. Worker construction denial and successful retry are covered inside the stale-export case. Axe scans the editor and its gallery at the narrow viewport; token contrast warnings remain advisory and do not certify arbitrary presets.

The focused fixtures were six separately prepared npm applications, recorded in `.artifacts/editor-preset-prepared.json`. Private comparison copies install from frozen npm locks with `npm ci --offline --ignore-scripts`; preparation and the broader integration suite can use registry access. The original prepared applications and manager metadata are preserved. These six fixtures do not constitute the complete 34-consumer matrix.

The first complete focused outputs are retained locally under `.artifacts/global-preset-editor/first-26-pass/`. Final reports and logs are retained under `.artifacts/global-preset-editor/consumer-gate/` and `full-gate-attempt-1/`. These are measured outputs, distinct from the structural fake reports in `foundation-groups.test.ts`. An agent inspected the editor overview at 1440 × 1000; the capture is `.artifacts/global-preset-editor/editor-overview.png`. This is not human visual review.

## Complete foundation gate

`pnpm check:foundation` on clean `89be4c3` exited 1. Package build, all 336 unit tests, all 320 integration tests, and preview generation passed. Consumer preparation then failed with Windows `ERR_PNPM_EPERM` while creating a React directory in an owned temporary pnpm virtual store. The original failed report and logs remain in `full-gate-attempt-1/`; this is not a successful combined-gate run.

The affected official `pnpm check:foundation:consumers` group was retried on the same clean commit with one consumer worker. It passed in 42.7 minutes: package build, generation, all 34 consumer preparations, preview build, all 34 consumer builds/audits, and all 333 browser cases across fourteen specs. Browser execution used two workers and took 19.3 minutes, with zero skips, retries, unexpected results, or flakes. The strict browser and consumer evidence validators passed, including all 26 preset-editor cases. The unit inventory separately includes apps/www/src. Its report records Node 24.19.0 and source commit `89be4c3`; frozen locks and assertions were unchanged. TypeScript and workspace audit also passed separately after the combined attempt.

These measurements establish the final quality checks and consumer group separately. No successful combined or CI aggregate run is claimed. The full-matrix retry includes the twelve downloaded-preset npm Vite/Next.js comparisons in addition to the 34 prepared baseline consumers.

## Fresh branch review

A fresh read-only review of `403685d..89be4c3` found no confirmed product defect and one Important verification gap: the original frame browser case did not force asynchronous verification races or observe acknowledgement timing. The requested Astra reviewer hit its usage limit before beginning; the available GPT-6.1 Sol reviewer performed the review.

The existing case now suspends one real digest, completes a newer request first, replaces the port while old verification remains outstanding, and captures DOM hash/request, gallery presence, and exact runtime CSS synchronously when each acknowledgement is sent. Mutation checks observed RED for removal of the post-await request fence, removal of the session fence (old radius CSS replaced current CSS), and premature acknowledgement (DOM hash absent). Restoring the original runtime produced GREEN for the strengthened case. The whole 26-case feature suite then passed in 8.4 minutes, including all twelve installed-app comparisons; TypeScript also passed. The strengthened regression is committed as de47a02. Product implementation bytes are unchanged by this review fix. Logs, mutation failures, and the fresh browser JSON are retained in `.artifacts/global-preset-editor/review-fix/`.

The reviewer declined to judge native delivery of retired Worker error callbacks because no post-termination user effect was established. That optional hardening was left out; a hypothetical late callback could invalidate a newer compile. Remote publishing/deployment and broader browser/assistive-technology behavior remain explicitly outside the measured scope. The review's pending consumer-gate judgment is resolved by the separate passing group result above, without converting the failed combined run into a pass. No minor findings were deferred.

## Implementation decisions and limits

- Work continued in the user's requested clean feature branch. There is no additional checkout isolation. PowerShell reproduced the task ledger operations because sandboxed Git Bash could not start; this changes bookkeeping, not product behavior.
- Static CSS-import removal lives beside the compiler's existing module-import rewriter because pnpm exposes the parser dependency to that package. This adds a utility export without changing compiled component artifacts.
- Internal app imports follow the existing Next.js extensionless convention; package ESM imports retain `.js` specifiers. The app therefore depends on its existing bundler resolution.
- Focused npm comparison fixtures have their own map. This isolates focused measurements from claims about the complete consumer matrix.
- Unit and integration fixture discovery run separately. The source-inventory regression uses a bounded 180-second discovery allowance; it retains exact file, assertion-name, and occurrence-count checks.
- Pixel capture uses the page rectangle for the sandboxed specimen, with measured iframe border offsets and a 20-second capture limit. This avoids the stalled direct iframe capture and preserves exact image comparison.
- After the Windows directory-creation failure, only the affected consumer group was rerun, serializing consumer preparation. The cost is separate quality/consumer evidence rather than a successful combined-gate record.
- The fresh read-only branch review overlaps the final verification work without source edits. Its input initially includes pending gate metadata; the author reconciles final documentation against actual outputs.

Human visual/assistive-technology review, native browser text zoom, other browser engines, public publishing, and remote install references are not established by these measurements. Global presets and scoped Button recipes retain their separate ownership and identity rules. The [usage guide](../foundation-local-usage.md#local-global-preset-editor) documents the implemented local flow.
