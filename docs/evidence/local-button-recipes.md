# Local Button recipe installation evidence

21 October 2026. The complete local foundation gate passed on Windows at source revision `e28638b7473fc3ff69edfa5e9bdfa7099c4049f5`, with a clean working tree. [The retained summary](local-button-recipes-run.json) records the exact nine stage results, runtime identities, browser version, canonical and transformed artifact hashes, all 90 recipe browser measurements, and all 34 consumer descriptors with 102 recipe installations. This document and summary were committed afterward. The run took **20 minutes 11 seconds**; this establishes a local result, not a hosted CI result or duration.

Measured tools: Node **24.19.0**, pnpm **11.25.0**, npm **11.19.0**, Yarn Classic **1.22.22**, modern Yarn **4.18.1**, Bun **1.4.3**, and Microsoft Edge Chromium **155.0.4283.62**. The local runner selected the bundled pinned Node explicitly and used the system certificate store for registry access. CI retains its existing pinned Node, bundled Chromium, and time budget.

All nine stages passed: **110 unit tests, 130 integration tests, and 68 browser tests**, plus **34 standalone production builds and audits**. There were zero failures, skips, or flaky outcomes. The previous foundation matrix remains present. All three local recipe families were installed in every consumer. Their recorded component, scoped CSS, and usage hashes match canonical compilation. Protected hashes confirm recipe installation preserved each project's preset, configuration, global CSS, ordinary components/usages, utility, and style pack.

The full sanitized report is retained outside Git at `.artifacts/local-button-recipes-run.full.json`; the summary records its SHA-256 and byte size and the original foundation report's hash. Repeated recipe records, source hashes, styles, checks, and runtime identities use content-keyed references. Each measurement retains its host, recipe, mode, app, and measured font-size pair counts. Full reports retain individual font samples. CI archives its own reports, recipe measurements, consumer records, logs, screenshots, and traces in `foundation-evidence`.

## Verified behavior

`add --recipe ./button.recipe.json` accepts a strict local UTF-8 Button recipe, resolves its exact pinned built-in preset, and creates a native `RecipeButton`, colocated CSS, and usage example. Importing the component imports its scoped CSS. Local file paths are the implemented transport; saved remote codes, component `--preset`, theme-code installation, and the editor remain planned. See [usage and ownership rules](../foundation-local-usage.md#local-button-recipes).

Unit and subprocess checks cover malformed/oversize files, unresolved revisions, dry-run, repeat/no-op, revision coexistence, immutable-content conflicts, edited/untracked utility conflicts, source edits, legacy and tampered provenance, stale plans, concurrent operations, and rollback/dependency-failure recovery. Ordinary add/theme operations retain recipes. Later compatible host theme changes preserve pinned recipe appearance.

The 90 browser outcomes are three host families × three recipe families × two color modes × five applications: preview plus npm/pnpm Vite/Next.js. Exact specimen PNG bytes, normalized DOM, computed styles, canonical hashes, and actual transformed source hashes agree across apps. No pixel tolerance was introduced. Tests verify neighboring ordinary Button/Input/Dialog styles remain unchanged, protected scope markers resist caller overrides, loading/disabled prevent activation while retaining the label, and keyboard/activation, variants/sizes, icon text, escaped long text, minimum height, focus, axe, forced colors, and reduced motion work. A 150ms motion token supplies a positive control before reduced-motion suppression. Custom single dark classes work on the element and ancestor.

Every measured outcome includes synthetic 200% font enlargement at 1100 and 320 CSS pixels, with actual before/after font-size samples and overflow checks. This does not complete native browser text zoom or screen-reader acceptance. Yarn/Bun rows verify installation, source parity, audit, and Node production builds; their browser behavior is outside this run. Bun audits the whole graph; other managers audit production dependencies. A separate production dependency audit found zero advisories among 47 dependencies plus three optional dependencies. The already documented development-only upstream-registry advisory remains outside that production audit.

The implementation agent visually inspected actual flat/light, minimalist/dark, and neo-brutalism/dark recipe states including loading, all variants/sizes, icon text, and escaped long text. Images are retained locally under `.artifacts/recipe-visual`. Human review, native browser text zoom, screen readers, and additional browsers remain pending.

## Independent review and implementation decisions

One fresh whole-branch review found no critical issue, one important alias/text corruption issue, and a human-output omission initially graded minor. The latter was regraded important because default human CLI output withheld actionable conflict guidance. Both were reproduced by failing regressions and fixed in one pass: module-specifier parsing preserves alias-looking saved text, including Unicode line separators, in installed defaults/examples and preview; human output now includes recipe provenance and diagnostics. Targeted regressions, types, builds, and the full gate passed after the fixes. There was no second reviewer pass. No minor findings remain deferred.

The complete decision record, in execution order:

1. Reuse the current checkout on a separate feature branch, honoring the recorded branch-only preference. Cost: uncommitted work shares the checkout.
2. Use Windows-native task bookkeeping in place of Bash helpers, retaining the ledger and checks. Cost: progress bookkeeping requires manual care.
3. Exercise injected recovery failures in the real planner/transaction unit tests rather than adding a duplicate subprocess-only hook. Cost: recipe-specific injected failure coverage relies on that shared engine; existing subprocess manager coverage remains.
4. Make evidence validation asynchronous and bind it to actual built compiler results. Cost: callers must await validation.
5. Make fixture inclusion opt-in for recipe consumers so ordinary manager fixtures build independently. Cost: new recipe harnesses must opt in.
6. Overlap the read-only final review with expensive verification. Cost: review alone does not certify the final run; completion requires the later clean gate. An initial host-PATH assumption was corrected by explicitly selecting the pinned bundled Node and correct npm path.
7. Keep the fixture query assertion tolerant of formatting whitespace. Cost: it checks semantic query text rather than exact spacing; browser tests directly exercise the resulting behavior. The first final gate exposed this assertion (129/130 integration tests passed); the corrected assertion passed before the complete clean restart recorded here.
8. Retain the review's exclusions for remote recipes, preset bundles, custom recipe roots, portals, and component `--preset`. Cost: those workflows remain unavailable in this local slice.
9. Retain the documented parity boundary for nested independently themed subtrees and arbitrary consumer CSS/style overrides. Cost: consumer overrides can change appearance outside the guarantee.
10. Retain the declared coverage boundary for Yarn/Bun browser behavior, screen readers, and native text zoom. Cost: those acceptance results remain unverified.
11. Treat final builds, browser results, and evidence publication as execution responsibilities rather than reviewer certification. Cost: any omitted final check would leave a completion gap; all required gate records are retained here.

## Pending human checks

1. Open each recipe family in light/dark on a differently themed host. Inspect default, hover, pressed, focus, disabled, and loading states.
2. Use Tab/Shift+Tab and Enter/Space, including loading toggles, then check names and busy state with NVDA/Chrome and VoiceOver/Safari.
3. Repeat with native 200% browser text zoom at 320 CSS pixels, OS forced colors, and reduced motion; check wrapping, reachable controls, and unclipped focus.

These checks cover local Button recipes on the documented foundation. They do not mark the wider alpha catalog stable or establish editor, remote-code, portal, arbitrary-override, workspace, or public-distribution support.
