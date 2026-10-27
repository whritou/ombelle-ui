# Local global preset editor evidence

Date: 2026-10-27. Implementation source: `852cb7d` on `feat/global-preset-editor`, based on `403685d`.

The local editor at `/editor/preset` customizes global project presets, renders reviewed generated components in an isolated gallery, and exports normalized JSON and compiled CSS. Installation uses the existing private CLI. This is the local editor increment of M4; immutable publishing and remote resolution remain pending.

## Recorded focused checks

| Check | Observed outcome |
| --- | --- |
| Expanded unit selection, `pnpm test:unit` | 335 passed across 50 files before the final failure-path refinements; the additional compiler-response regression and existing controller test then passed 2/2. The complete gate will remeasure the final unit inventory. |
| `pnpm test:integration` | 320 passed across 46 files, using one integration worker. Includes eight editor-export CLI cases and all 39 strict evidence-gate regressions. |
| `playwright test tests/e2e/preset-editor.spec.ts` | 26 passed using one worker, in 12.7 minutes. Subsequent focused regressions passed for blocked Worker construction/retry, recovery-reset notices, and unavailable-preview guidance. |
| Existing `playwright test tests/e2e/editor.spec.ts` | All nine Button editor cases passed after the preset implementation and refinements. |
| TypeScript and production product build | Passed; the build contains `/`, `/editor/component/button`, and `/editor/preset`. Both compiler workers bundle for the browser. |

The focused measurements used Windows 10.0.26200, Node 24.19.0, pnpm 11.25.0, npm 11.19.0, and Microsoft Edge 156.0.4314.42 through Playwright's `msedge` channel. The integration toolchain also included Yarn 1.22.22/4.18.1 and Bun 1.4.3. Dependency lifecycle scripts stayed disabled.

Sandboxed attempts at temporary-project renames, symlink checks, and Next.js dependency junction creation were denied. Their successful runs used the required filesystem permission; no installer conflict rule or test assertion was relaxed. The shell's default Node and bundled pnpm launcher were unsuitable for exact-version evidence, so commands explicitly used Node 24.19.0 and pnpm 11.25.0's JavaScript entry.

## What the browser comparison measures

Six cases cover each family in light/dark: all twelve catalog rows, invalid/disabled/loading/selected states, real focus, contained Dialog portals, token contrast, and local compilation without edit-triggered network requests.

Twelve cases download the actual JSON and apply it through the built CLI to private npm Vite/Next.js consumers. They compare installed component/utility hashes, specimen DOM, computed colors/fonts/radii/borders/heights/shadows/motion, exact representative Button PNG bytes, and open Dialog behavior. The fixtures customize both palettes, radius, density, and font. The capture rectangle includes the iframe's measured content origin and border offsets; paired screenshots use matching raster positions. No pixel tolerance was introduced.

Eight further cases cover refresh/history, explicit family-switch intent, corrupt storage recovery, storage/clipboard failures, invalid and delayed compilation, frame tampering/reconnection, keyboard access and 320 CSS pixel reflow, and valid export with the preview unavailable. Worker construction denial and successful retry are covered inside the stale-export case. Axe scans the editor and its gallery at the narrow viewport; token contrast warnings remain advisory and do not certify arbitrary presets.

The focused fixtures were six separately prepared npm applications, recorded in `.artifacts/editor-preset-prepared.json`. Private comparison copies install from frozen npm locks with `npm ci --offline --ignore-scripts`; preparation and the broader integration suite can use registry access. The original prepared applications and manager metadata are preserved. These six fixtures do not constitute the complete 34-consumer matrix.

The first complete focused outputs are retained locally under `.artifacts/global-preset-editor/first-26-pass/`. Additional command logs remain in the plan execution workspace until final evidence is collected. These are measured outputs, distinct from the structural fake reports in `foundation-groups.test.ts`.

## Complete foundation gate

The complete foundation run is pending. Its final outcome must include fresh results for the final unit inventory, all integration assertions, all 34 consumer rows, and the 333-case browser inventory. The focused results above do not imply a complete foundation pass. The strict validator now independently requires `apps/www/src` unit files/assertions and all 26 preset-editor browser cases.

## Implementation decisions and limits

- Work continued in the user's requested clean feature branch. There is no additional checkout isolation. PowerShell reproduced the task ledger operations because sandboxed Git Bash could not start; this changes bookkeeping, not product behavior.
- Static CSS-import removal lives beside the compiler's existing module-import rewriter because pnpm exposes the parser dependency to that package. This adds a utility export without changing compiled component artifacts.
- Internal app imports follow the existing Next.js extensionless convention; package ESM imports retain `.js` specifiers. The app therefore depends on its existing bundler resolution.
- Focused npm comparison fixtures have their own map. This isolates focused measurements from claims about the complete consumer matrix.
- Unit and integration fixture discovery run separately. The source-inventory regression uses a bounded 180-second discovery allowance; it retains exact file, assertion-name, and occurrence-count checks.
- Pixel capture uses the page rectangle for the sandboxed specimen, with measured iframe border offsets and a 20-second capture limit. This avoids the stalled direct iframe capture and preserves exact image comparison.

Human visual/assistive-technology review, native browser text zoom, other browser engines, public publishing, and remote install references are not established by these measurements. Global presets and scoped Button recipes retain their separate ownership and identity rules. The [usage guide](../foundation-local-usage.md#local-global-preset-editor) documents the implemented local flow.
