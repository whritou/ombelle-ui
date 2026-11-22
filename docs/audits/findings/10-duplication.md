# 10 — Duplication and over-engineering

Date: 2026-11-22. Commit `9317458ab81a8afe9ab95a1402e2bc81cc908e9f` on `docs/1-0-audits-wave-3`. This is 0.9.1 plus the wave 1 fixes (PR #189) and the liquid glass change (PR #190). The wave 2 fixes (PR #191) are not in this tree. For every catalog, www and compiler path named below I checked `git diff docs/1-0-audits-wave-1 feat/1-0-wave-2-findings-fce8bb`. Wave 2 touches only the Get code dialog components, `published-*.tsx`, editor UI and compiler fixtures. None of the duplication or dead code below is changed by it.

**Covered:** I read these by hand:
- `packages/{contracts,compiler,cli}/src`
- `apps/www/src/snapshots`, `recipe-snapshots`, `editor`, `preset-editor`
- `scripts/`
- the root Playwright and Vitest configs
- `tests/helpers`

Most twin files were compared with `diff`. Wider sweeps (script references, per-test repetition, export and dependency usage) were done by subagents. I spot-checked their key claims with `diff`, `git grep -w` and small node scripts in the session scratchpad: the CLI test diffs, the `card.spec` copy, the config diffs, the glass list equality and the dead symbols.

**Not covered:**
- Catalog template internals beyond edition-twin sizes. Audits 04 and 05 own that area, and wave 2 rewrote parts of it.
- `apps/preview/src/scenes` beyond sizes.
- CSS duplication inside style sheets (DES-16 covers it).
- Nothing was built or run. No claim here needs built output.

Line counts are `wc -l`. "Changed" is the number of `diff` lines marked `<` or `>`.

## Summary

The codebase does what it says, but each slice added a second copy of an existing idea instead of generalising the first.

The clearest cases are the preset and recipe "hosted code" paths. These are parallel files in contracts, compiler, CLI, the www client and the www service. The Postgres store and the HTTP layer have already been merged into one kind-parameterised path. The SQLite store, the www publication controller, the CLI input readers and the three CLI install planners have not. Some copies have drifted:
- The scoped install planners use three different case-collision rules.
- The preset file reader lacks the FIFO guard the recipe reader has.
- An oversized normalised recipe gets 400 where a preset gets 413.
- Recipe snapshots report preset errors at the wrong JSON path.

Two blocks of code are dead in production:
- The website's version-gate ladder: the published installer is already 0.9.0, so every gate is false.
- The style-support machinery: since glass became stable, every pair is `stable`.

The test suites carry the most removable lines: about 800 to 1,000 in table-drivable copies.

Nothing here blocks 1.0. Seven should-fix findings reduce drift risk in code that 1.0 freezes. The rest is cleanup. Removing everything below would delete about 3,000 hand-written lines without changing behaviour; about 1,000 of those are tests and 770 are docs-only scripts.

## Findings

### DUP-01 The preset and recipe publication clients are one controller written twice
- Severity: should-fix
- Where:
  - `apps/www/src/snapshots/use-publication.ts:1-338` and `apps/www/src/recipe-snapshots/use-publication.ts:1-342` (88 changed lines out of about 340; about 294 identical)
  - `apps/www/src/snapshots/publication.ts:1-160` and `apps/www/src/recipe-snapshots/publication.ts:1-162` (38 changed)
  - `apps/www/src/snapshots/publication-storage.ts:1-88` and `apps/www/src/recipe-snapshots/publication-storage.ts:1-88` (34 changed)
  - Tests: `snapshots/use-publication.test.ts` (396) and `recipe-snapshots/use-publication.test.ts` (64); the two `publication-storage.test.ts` files (83 and 35)
- What happens:
  - The diff is only nouns and adapters:
    - `preset` becomes `recipe` and `presetHash` becomes `recipeHash`.
    - `normalizePublishedPreset` becomes `normalizePublishedInstallableRecipe`, and `verifyPresetSnapshot` becomes `verifyInstallableRecipeSnapshot`.
    - `/api/v1/presets` becomes `/api/v1/recipes`, and the success message text changes.
  - The recipe copy has gained a `storageKey` option that the preset copy lacks.
  - The release and size checks (`catalogRelease !== '0.1.0'`, `65_536`) are repeated in both storage files and both `publication.ts` files.
  - The retry, idempotency, stale-draft and verification state machine is written twice. A fix to one (for example RL-06 behaviour on Get code) must be copied to the other by hand. The recipe tests cover a fraction of what the preset tests cover, so the recipe copy is the less-tested twin of the same logic.
- How verified: read end to end; `diff` of each pair.
- Suggested change: one `createPublicationController(kind)`, `createPublishAttempt(kind)` and storage module, parameterised by a small descriptor: endpoint, payload field, hash field, validate, normalize, verify, noun and storage key. Run the existing preset test suite against both descriptors. About 590 production lines become about 320, and the recipe client gains the preset tests for free.
- Effort: M

### DUP-02 The preset and recipe paths drift in the service, the CLI readers and the contracts
- Severity: should-fix
- Where:
  - `apps/www/src/snapshots/server/service.ts:23-66` and `recipe-service.ts:29-71`
  - `packages/cli/src/snapshots/input.ts:1-109` and `recipe-input.ts:1-109` (60 changed; about 79 identical)
  - `packages/cli/src/preset-file.ts:8-50` and `recipe-file.ts:9-52`
  - `packages/contracts/src/snapshot.ts:35-49,51-100` and `recipe-snapshot.ts:36-48,66-77`
  - `packages/compiler/src/snapshot.ts:46-80` and `recipe-snapshot.ts:25-75`
  - `apps/www/src/snapshots/install-command.ts:278-299` (`snapshotInstallCommand`), `:315-337` (`codeInstallCommand`) and `apps/www/src/recipe-snapshots/install-command.ts:3-9` (three command builders, each with its own copy of the origin regex)
- What happens: the pairs repeat the same steps:
  - origin check
  - body read
  - rate key
  - attempt budget
  - idempotency-key regex
  - single-field body check
  - early release check
  - normalize
  - publish
  - verify

  They have diverged in ways nobody chose:
  1. **Payload size.** A preset whose normalised form exceeds 65,536 bytes gets 413 `PAYLOAD_TOO_LARGE` (`service.ts:54-55`, matched on the exact error-message string `'Preset exceeds the 65,536-byte UTF-8 limit'`). A recipe in the same state gets 400 `INVALID_DATA` (`recipe-service.ts:58-60`). The raw body is capped at 65,536 by `body.ts:45`, so this only bites when normalisation grows the payload, which defaults do.
  2. **Issues array.** Preset `INVALID_DATA` carries an `issues` array (`service.ts:14-16`); the recipe one does not.
  3. **FIFO guard.** `recipe-file.ts:15-18` opens with `O_NONBLOCK` because "a FIFO can replace the checked path before open". `preset-file.ts:12-15` stats, then opens with plain `'r'`. On POSIX, a FIFO swapped in between those two calls blocks `init --preset ./x.json` or `add button --preset` until a writer appears.
  4. **Error path.** `validatePresetSnapshot` rewrites nested preset error paths to `/preset/...` (`contracts/src/snapshot.ts:91-98`). `validateSnapshotProvenance` in `recipe-snapshot.ts:67` calls `validatePreset(snapshot.preset)` without that prefix, so recipe snapshot diagnostics point at the root. CMP-05 lists other wrong paths but not this one.
- How verified: read end to end; `diff` of each pair.
- Suggested change:
  - Add one `PublicationKind` descriptor in contracts. It holds the reference prefix (`ps_`/`rc_`), payload field, hash field, collection, validate and verify.
  - Drive both services from one `createPublicationService(kind)`, and the CLI from one `resolveCodeInput(kind)`.
  - Use one `readJsonFileBounded(path, limit)` with the `O_NONBLOCK` open, and one `installCommand(kind, scope)`.
  - Make the size error a typed `FoundationError` code instead of a message match.
  - This removes about 200 lines and the four divergences.
- Effort: M

### DUP-03 Three CLI install planners repeat one artifact loop with three different case-collision rules
- Severity: should-fix
- Where:
  - `packages/cli/src/plan/recipe.ts:16-153`
  - `packages/cli/src/plan/component-preset.ts:30-186`
  - the artifact loop in `packages/cli/src/plan/components.ts:203-280`
  - preconditions repeated in `packages/cli/src/main.ts:232-238` and `:259-265`, `plan/recipe.ts:20-25` and `plan/component-preset.ts:35-40`
  - the "saved preset matches lock" check: `plan/components.ts:133-143`, `recipe.ts:35-45` and `component-preset.ts:43-53`
- What happens:
  - `planRecipe` and `planComponentPreset` share the same steps in the same order:
    - precondition
    - re-resolve the saved preset and compare it with the lock
    - build the plan shell
    - check that the prior identity is unchanged
    - loop over the artifacts
    - write the lock row
    - check for a state-file collision
    - plan dependencies
  - They have drifted on case handling:
    - `add --recipe` and `add <id>` use `directoryCaseMismatch`. It flags only directory-case differences, and leaves file-name-only differences to the ordinary unowned-file conflict (the CLI-04 rule).
    - `add button --preset` uses the full `findCaseInsensitivePathMismatch`. It also flags file-name-only differences, and it rejects ambiguous case-insensitive lock keys (`component-preset.ts:115-150`). The recipe planner looks up `lock.artifacts[target.path]` case-sensitively.
    - So the same existing `src/components/ui/presets/x/r1/Button.tsx` conflicts under one scoped command and is treated differently under the other.
  - `component-preset.ts` calls `safePath` on every target three times: in the transform (`component-preset-transform.ts:39`), in the planner (`:114`) and in `fileChange` (`components.ts:31`).
  - The precondition is thrown in four places for one invocation.
- How verified: read end to end.
- Suggested change: extract `planScopedInstall({ lockField, transform, identity, labels })`, which owns the loop, the identity check, the lock row and the collision rules. Use it for recipes and component presets. Pick one case rule, deliberately, and test it once. Drop the duplicate `safePath` and precondition calls. About 340 lines become about 180.
- Effort: M

### DUP-04 The website's install-compatibility ladder is dead in production
- Severity: should-fix
- Where:
  - `apps/www/src/snapshots/install-command.ts:6-196`. Fourteen minimum-CLI constants (0.4.0 to 0.9.0), five field and value tables, `componentRecipeInstallBlocked`, `installableRecipeInstallNotice`, `materialInstallBlocked`, `contrastInstallBlocked`, and the family gates inside `offeredStyleFamilies` (`:257-268`).
  - The unreachable env branch: `:8-9` (`NEXT_PUBLIC_OMBELLE_CATALOG_RECIPES`).
  - `recipe-service.ts:20,29,47,67` (`allowCatalogRecipes`).
  - Tests: `install-command.test.ts` (180), `install-compatibility.test.tsx` (470), `display-install.test.ts` (91).
- What happens:
  - `publishedInstaller.version` is `'0.9.0'` (`:6`), and every gate compares against a minimum of 0.9.0 or lower. So in production every `*InstallBlocked` returns false, every notice is undefined, and every family is offered.
  - `catalogRecipesAvailable` is always true, so the env variable (set nowhere in the repo) and `allowCatalogRecipes = false` are reachable only from tests.
  - Each new release has so far added a new tier to this ladder. That is about 190 lines of source and several hundred lines of tests that guard situations which can no longer occur.
- How verified: read end to end; `git grep -w` for each constant and the env variable.
- Suggested change: keep the mechanism, because it backs the "every command the site shows works" claim. Reduce it to one table of `{ minimumCli, applies(recipe | preset), notice }` that holds only rules newer than the published installer (today, none), plus one generic test. `offeredStyleFamilies` becomes `siteFamilyOrder`. This removes about 170 source lines and most of the 741 test lines.
- Effort: S

### DUP-05 Style support is a constant since glass became stable, but a second component list still gates it
- Severity: should-fix
- Where:
  - `packages/contracts/src/style-families.ts:8` (`'stable' | 'experimental' | 'unavailable'`), `:16-80` (`glassComponents`, 63 ids) and `:82-85` (`styleSupport`)
  - `style-support.ts:13-24` (`assertStyleAvailable`)
  - `packages/cli/src/main.ts:40` (`STYLE_UNAVAILABLE` exit)
  - The `=== 'unavailable'` and `['stable', 'experimental']` branches in:
    - `cli/src/plan/theme.ts:62`
    - `compiler/src/component-preset.ts:54`
    - `apps/www/src/site/components/catalog.ts:611,627,637`
    - `site/components/playground.tsx:97,126,158`
    - `demo/demo-page.tsx:144`
    - `editor/preview-protocol.ts:67`
    - `editor/precompiled-defaults.ts:32,43,50`
    - `apps/preview/src/preset-preview.tsx:33`
    - `scripts/generate-preview.ts:64`
- What happens:
  - `glassComponents` is exactly `supportedComponentIds` (63 = 63; checked by script). So `styleSupport` always returns `'stable'`, `'experimental'` is never produced, `assertStyleAvailable` never throws, and every unavailable branch is dead.
  - The list is not harmless. A 64th component added to `component-ids.ts` but not to `glassComponents` would silently become "unavailable in liquid glass". The CLI would refuse it and the site would hide it, with no test to say why.
  - `glassGatedOnSite` (`catalog.ts:636`) has no caller at all.
- How verified: read end to end; node script comparing the two lists; `git grep -w`.
- Suggested change: if the support seam should stay for future families, keep `styleSupport` but derive glass from `supportedComponentIds` and drop `'experimental'`. Otherwise delete the type, the list and the dead branches. This removes about 90 lines and the drift trap. GLS-09 asked for this table to express stable glass; it now can, trivially.
- Effort: S

### DUP-06 About 1,000 test lines are the same test with a different component name
- Severity: should-fix
- Where:
  - `tests/integration/switch-cli.test.ts`, `tabs-cli.test.ts` and `tooltip-cli.test.ts` (125 lines each; switch vs tabs differs in 6 lines, all of them the id, the dependency and the title)
  - `checkbox-cli.test.ts` (128; 9 changed)
  - `form-controls-cli.test.ts:53-136` (the same scenario as an `it.each`), `card-cli.test.ts` (same skeleton plus pre-existing lock rows)
  - `tests/integration/component-preset-cli.test.ts`: `describe` at `12-200` and again at `201-448`. Node/Bun install, invoking directory, plan labels, invalid invocation table, invalid file and conflict are each tested twice.
  - `tests/integration/snapshot-api.test.ts` (254) and `recipe-snapshot-api.test.ts` (143). Identical `fixture()`, `post()` with swapped parameter order, and eight parallel cases.
  - `tests/e2e/card.spec.ts:48-111`, `badge.spec.ts:51-84` and `forms.spec.ts:74-138` hand-copy `componentUrl`, `componentReferenceKey` and `expectComponentSources` from `tests/helpers/component-browser.ts:6-57`. The app list `['preview','vite','next','npm-vite','npm-next']` is hard-coded in 8 files although `browserApps` exports it.
  - An identical `open(page, edition)` exists in 12 edition specs (for example `variants-075.spec.ts:5`, `components-076.spec.ts:5`). `variants-075.spec.ts` has 9 separate `for (const edition of ['radix','base'])` loops.
- What happens: every behaviour change to `add` (for example the CLI-01 dependency rule or the CLI-03 CRLF rule) has to be made, and reviewed, in four or more identical files. The preset API contract and the recipe API contract can drift because nothing shares them, although `tests/helpers/publication-store-contract.ts` already does this for the stores.
- How verified:
  - `diff` of switch/tabs/tooltip/checkbox and of the API pair.
  - I read the two `describe` blocks of `component-preset-cli`.
  - I compared `card.spec.ts:52-68` against `component-browser.ts:16-27`.
- Suggested change:
  - One `scoped-component-cli.test.ts` driven by `[{ id, dependencies, seedExceptions?, existing? }]`. This removes about 450 to 575 lines.
  - Merge the two `component-preset-cli` blocks (about 150 to 200 lines).
  - Add a `publicationApiContract(kind)` helper next to the store contract (about 100).
  - Import `component-browser` in card, badge and forms (about 140), and add a shared `openEdition` helper.
- Effort: M

### DUP-07 The SQLite store keeps two copies of every operation that Postgres already merged
- Severity: should-fix
- Where:
  - `apps/www/src/snapshots/server/sqlite-store.ts`: `publish` `267-319` and `publishRecipe` `341-391`; `lookup` `321-339` and `lookupRecipe` `393-410`; `withdraw`, `unwithdraw` and `assertExists` `429-448` and the recipe copies `412-427`
  - against `postgres-store.ts:111-210` (`publishRecord`, `lookupRecord` and `changeWithdrawal` with `kind: 'preset' | 'recipe'`)
  - Limits written twice: named constants in `sqlite-store.ts:16-22`, inline literals in `postgres-store.ts:115,129,159,163` (`65_536`, `128 * 1024`, `100_000`, `256 * 1024 * 1024`)
- What happens:
  - SQLite is the development and test store, and the store most integration tests exercise. Postgres is production, and its suite runs in no gate (TST-04).
  - The publication rules are written three times: SQLite preset, SQLite recipe and Postgres generic. The rules are the idempotency replay check, the cross-kind idempotency conflict, the quota order, the capacity check, the response size check and the row verification on lookup. I found no behavioural divergence today, but a rule change has three copies to keep in step, and the tested copy is not the shipped one.
- How verified: read end to end.
- Suggested change:
  - Move the shared rules into one `publication-rules.ts`: limits, `buildEnvelope(kind, …)`, `verifyStoredRow(kind, row)`, and the validate-and-hash input check.
  - Parameterise the SQLite methods by kind, with a table-name map. Its per-kind tables can stay, so no schema migration is needed.
  - About 185 SQLite lines become about 100, and the Postgres literals become shared constants.
- Effort: M

### DUP-08 Consumer preparation and consumer-server helpers repeat the same verification and lifecycle
- Severity: nice-to-have
- Where:
  - `scripts/prepare-node-consumer.ts:200-255` and `scripts/prepare-bun-consumers.ts:85-135`. Both merge component-preset artifacts into the lock view, then compare every installed file with the canonical, recipe and component-preset banks: about 50 identical lines.
  - The scenario flag object (`recipes: true, badges: true, …`) is copied in both files.
  - `tests/helpers/editor-preset-consumer.ts:52-70,247-306` and `tests/helpers/catalog-recipe-browser.ts:12-30,84-109` (free port, build, spawn preview, poll for 30 s, `taskkill`, remove with retries: about 45 lines).
  - `scripts/prepare-*-consumer.ts` import from `tests/helpers/` (`bun-project`, `cli-runtime`, `recipe-fixture`, `scenario-fixture`, `component-preset-fixture`).
- What happens: the foundation gate's proof that installed bytes equal canonical bytes is written twice, so a stricter check added to one runner does not reach the other. The gate's scripts depend on test helpers, so production evidence code lives under `tests/`.
- How verified: read end to end (both prepare scripts); the subagent's diff of the helpers was spot-checked.
- Suggested change: add `verifyInstalledArtifacts(root, lock, banks)` and `fullScenario` to `scripts/consumer-components.ts`, and a `startConsumerServer()` helper. Move the helpers that scripts import into `scripts/` and re-export them for tests. About 120 lines.
- Effort: S

### DUP-09 Ten Playwright configs where one base and a few projects would do
- Severity: nice-to-have
- Where:
  - `playwright.config.ts` (50) and the nine `playwright.*.config.ts` (234). In all of them, `retries: 0`, chromium, headless, `reducedMotion: 'reduce'`, the 1100x800 viewport, the `OMBELLE_BROWSER_CHANNEL` channel and `trace` are repeated.
  - `playwright.editors.config.ts` is identical to `playwright.site.config.ts` except for its comment and `testMatch`.
  - `playwright.preview-dev.config.ts` starts the same two servers as `playwright.config.ts` and runs `editor`, `preset-editor` and `recipe-snapshots`, which `playwright.config.ts` also runs.
  - `edition-parity.spec.ts` is not in `playwright.config.ts` `testIgnore`, so `test:e2e` runs it as well as `test:editions`.
  - `catalog-expansion` falls back to `channel: 'msedge'` where every other config falls back to bundled Chromium.
- What happens:
  - A shared setting has to be changed in ten files. TST-10 (`reuseExistingServer`) is one example of that kind of change.
  - Two configs (`hosted`, `preview-dev`) have no invoker, and two (`editors`, `catalog-expansion`) are reachable only from docs. TST-04 already reports the unrun suites; this finding is about the duplication itself.
- How verified: read all ten; `diff` editors vs site; `git grep` for invokers.
- Suggested change:
  - Add a `playwright.base.ts` that exports `use`, `retries`, the server definitions (`snapshotWww`, `previewDev`, `previewVite(port)`) and a `config(overrides)` factory.
  - Fold editors into site (one `testMatch`).
  - Delete preview-dev, or give it a script.
  - Add `edition-parity` to the default `testIgnore`.
  - This removes about 150 lines.
- Effort: S

### DUP-10 Process, atomic-write and hashing helpers are reimplemented with weaker variants
- Severity: nice-to-have
- Where:
  - **Process-tree kill, 5 copies:**
    - `scripts/foundation-runner.mjs:17-48` (the most complete)
    - `scripts/playground/process.ts:10-28`
    - `scripts/serve-snapshot-www.ts:34-40` (kills only the child on POSIX, `child.kill`, not the process group)
    - `tests/helpers/editor-preset-consumer.ts:52-60`
    - `tests/helpers/catalog-recipe-browser.ts:104-108`
  - **Atomic write, 3 copies:**
    - `scripts/write-atomic.ts:6-22`
    - `scripts/foundation-runner.mjs:6-11` (fixed `.tmp` name, no Windows retry)
    - `scripts/playground/evidence.ts:4-8` (fixed `.next` name)
  - **Spawn-and-collect wrappers:**
    - `scripts/process.ts:2-30`
    - `scripts/prepare-base-consumers.ts:17-27`
    - `tests/helpers/yarn-project.ts:72-90`
    - `tests/helpers/bun-command.ts:6-13`
    - plus in-test CLI spawners in `npm.test.ts:14-40`, `yarn-detection.test.ts:29-46` and `yarn-consumers.test.ts:24-47`, which `runBuiltCli` already covers
  - **Directory-tree hasher, 2 copies:** `tests/helpers/tree.ts:10-17` and `scripts/playground/baseline.ts:18-27`
  - **Sync sha256, 4 copies:** `sqlite-store.ts:31-33`, `postgres-store.ts:21`, `cli/src/apply/recovery.ts:65` and `cli/src/snapshots/cache.ts:106`
- What happens:
  - `write-atomic.ts` exists because Windows refuses a rename onto a file another process has open. The foundation report writer, which the gate runs on Windows, still uses the variant without the retry and with a shared temporary name.
  - `serve-snapshot-www` leaves grandchildren (the Next dev server's workers) running on POSIX when stopped.
- How verified: read end to end.
- Suggested change:
  - Add `killTree(child, graceMs)` to `scripts/process.ts`.
  - Use `writeFileAtomicSync` in `foundation-runner` and the playground.
  - Make `runBuiltCli` the only CLI spawner in tests.
  - Add one `hashTree` helper.
  - Add a sync `sha256Hex` in one www server module.
  - This removes about 120 lines.
- Effort: S

### DUP-11 Two CLI lock-row validators run the same algorithm, and the recipe one is weaker
- Severity: nice-to-have
- Where: `packages/cli/src/project/recipes.ts:11-81` and `project/component-presets.ts:16-110`
- What happens:
  - Both recompile every installed row and compare its identity with the lock metadata. Both check that the row's artifact count and logical paths match, and that each record equals the lock's `artifacts` entry.
  - The component-preset version also checks that each file sits at the path the transform would choose, and that its hash equals the transformed content (`component-presets.ts:89-101`). The recipe version does neither.
  - So a lock edited to move a recipe artifact's path, consistently in both places, passes recipe validation but would fail for a component preset.
- How verified: read end to end.
- Suggested change: add one `validateInstalledRows({ field, compile, keyOf, transform })` with the stronger checks for both kinds. About 180 lines become about 100.
- Effort: S

### DUP-12 Contracts compile the same schemas into five Ajv instances with five error formatters
- Severity: nice-to-have
- Where: `packages/contracts/src/validate.ts:6-21`, `recipe.ts:113-128`, `component-recipe.ts:43-54`, `snapshot.ts:29-49` and `recipe-snapshot.ts:30-42`. Also the twin types `AbsolutePresetReferences` (`snapshot.ts:14-21`) and `AbsoluteRecipeReferences` (`recipe-snapshot.ts:15-20`).
- What happens:
  - The preset schema is compiled three times, the recipe schema twice and the component recipe schema twice, all at import.
  - Each copy formats AJV errors slightly differently. For example, `component-recipe.ts` prefers `/appearance` errors, and the others take the first error.
  - The two reference-qualifying types differ only in which `$id` they use.
- How verified: read end to end.
- Suggested change: add one `ajv.ts` that registers all schemas once and exports `schemaError(check, fallbackMessage)`, plus one generic `AbsoluteReferences<T, Id>`. About 50 lines. Fold the DUP-02 `/preset` path fix in here.
- Effort: S

### DUP-13 A publication is validated three to four times per request
- Severity: nice-to-have
- Where:
  - Publish: `service.ts:47` (`normalizePublishedPreset`: schema, resolve, size twice), then `sqlite-store.ts:272-276` and `postgres-store.ts:113-116` (`validatePreset`, canonicalise, size and hash again), then `validatePresetSnapshot` on the newly built envelope (`sqlite-store.ts:296`, `postgres-store.ts:117`), then `service.ts:61` → `verifyPresetSnapshot` (schema, `validatePreset`, normal form, size and hash again).
  - Read: the store's `lookup` (`sqlite-store.ts:331-336`, `postgres-store.ts:187-191`: schema, canonical bytes, preset hash), then the service's `verified()` (`service.ts:63`), which repeats the same checks.
  - The recipe path is the same.
- What happens: the same immutable bytes are schema-validated and hashed twice on every read and up to four times on every publish. The store comments call this "a defense at the port", but nothing other than the service ever calls the store port. RL-04 reports the read cost; this finding is the duplication behind it.
- How verified: read end to end.
- Suggested change: the store verifies row integrity (byte length, response hash, payload hash). The service verifies the snapshot once (decision 0009). Drop the store's re-validation of input that the service has already normalised, and drop the second envelope validation. Keep one verifier per boundary.
- Effort: S

### DUP-14 The compiler repeats the format-and-hash artifact loop four times
- Severity: nice-to-have
- Where: `packages/compiler/src/compile.ts:179-190`, `recipe.ts:101-112`, `component-recipe.ts:124-131` and `component-preset.ts:110-121`. The scope hash (`recipe.ts:51-57`, `component-recipe.ts:107` and `component-preset.ts:47-49`) and the `lib/utils.ts` artifact are also repeated.
- What happens:
  - Four copies sort drafts, run Prettier with the same options and hash each result. One uses `Promise.all`; three use a sequential loop.
  - Dependency handling differs:
    - `compileButtonPreset` sorts dependencies.
    - `compileRecipe` does not sort them.
    - `compileComponentRecipe` de-duplicates fonts.
  - Output is still deterministic, but the rules are not shared.
- How verified: read end to end.
- Suggested change: add `finalizeArtifacts(drafts)` and `sortedDependencies(...lists)` helpers. About 45 lines, and one place to change formatting.
- Effort: S

### DUP-15 The two editors carry parallel history, storage and test scaffolding
- Severity: nice-to-have
- Where:
  - `apps/www/src/editor/history.ts:1-56` and `apps/www/src/preset-editor/history.ts:1-56` (the same bounded undo/redo with a 500 ms grouping window; one compares with `<=`, the other with `<`; one clones, the other does not)
  - storage keys `ombelle.button-editor.draft` (`editor/storage.ts:5`) and `ombelle:preset-editor:draft:v1` (`preset-editor/storage.ts:6`)
  - e2e: `blockWorker` (`component-editor-instant.spec.ts:16-20`, `preset-editor-instant.spec.ts:30-38`), `seed` (`editors-matrix.spec.ts:15-20`, `editors-glass.spec.ts:17-22`), `chooseMenuItem` (`preset-editor.spec.ts:66-68`, `editors-matrix.spec.ts:22-24`)
  - the gallery frame locator, defined four times although `tests/helpers/snapshot-browser.ts:10` exports it
- What happens: the editors behave subtly differently for the same user action, and their tests duplicate setup code.
- How verified: `diff` of the history pair; read the storage modules; the e2e copies were spot-checked.
- Suggested change: one generic `History<T>` module, with the clone and window rule decided once. Move the e2e helpers into `tests/helpers`. About 90 lines.
- Effort: S

### DUP-16 Test-only and unreferenced exports in production modules
- Severity: nice-to-have
- Where:
  - `packages/cli/src/registry/build.ts:1-100`: the decision 0002 shadcn registry adapter. Only `packages/cli/test/registry.test.ts` and `tests/integration/upstream.test.ts:7` import it, and it is one of only two CLI importers of `postcss`.
  - `packages/compiler/src/recipe-snapshot.ts:17-30` (`normalizePublishedRecipe`, `verifyRecipeSnapshot`): superseded by the `Installable` variants, which also accept 1.0 recipes. Only tests import them.
  - `apps/www/src/site/components/catalog.ts:636` (`glassGatedOnSite`) and `packages/cli/src/snapshots/cache.ts:18` (`SnapshotCacheKey`): no references at all.
  - `apps/www/src/snapshots/server/client-key.ts:42` (`clientRateKey`): only its test calls it; production uses `clientRateKeys`.
  - About 60 exports used only inside their own file (subagent list; examples: `install-command.ts:7,10,16,17,21`, `recovery.ts:59,72`, `transaction.ts:28,39`, `typography.ts:4`).
- What happens: the dead surface makes every package look larger and more public than it is. All four packages are private, so none of this is API.
- How verified: `git grep -w` for each named symbol across `packages`, `apps`, `scripts`, `tests` and `fixtures`; the bulk list came from the subagent's index, and I re-checked the named items.
- Suggested change:
  - Move `registry/build.ts` to `tests/helpers/` (it is evidence for decision 0002, not CLI behaviour).
  - Point the tests at the `Installable` functions and delete the two 1.0-only wrappers.
  - Delete the unreferenced exports, and drop `export` from the file-local ones.
- Effort: S

### DUP-17 Dependencies with no importer
- Severity: nice-to-have
- Where:
  - `date-fns` and `@date-fns/tz` in `apps/www/package.json`, `apps/preview/package.json:8,62` and `packages/catalog/package.json:14,46`. No file in the repository imports either; they are `react-day-picker`'s own dependencies.
  - `@ombelle/preview` in `apps/www/package.json` devDependencies: no importer. `scripts/build-hosted-preview.mjs` builds `apps/preview` by path.
- What happens: the packages are installed and audited for nothing. CAT-15 reports the consumer-facing half (the CLI adds them to user projects); this is the repository half.
- How verified: grep for imports and requires of each name; the subagent's dependency count was re-checked for these names.
- Suggested change: remove them with the CAT-15 fix. Confirm the generated previews still build without them (see Unverified).
- Effort: S

### DUP-18 Docs-only scripts and a 3.8 MB generated file in version control
- Severity: nice-to-have
- Where:
  - `scripts/measure-component-editor.mjs` (295), `measure-preset-editor.mjs` (312), `measure-component-preview.mjs` (127) and `measure-www-first-load.mjs` (33). No package script, workflow or other script runs them; only `docs/evidence/*` does.
  - `scripts/generate-npm-test-locks.ts` (41), referenced only in a comment and an error string in `tests/helpers/npm-project.ts:5,41`.
  - The CLI mode of `scripts/record-stable-hashes.ts:67-72` (docs only).
  - `packages/catalog/src/generated.ts`: one 3,851,566-byte line, committed and regenerated by every `build:packages`.
- What happens:
  - The measurement scripts are evidence tools that will rot unseen: no gate runs them, so an API change breaks them silently.
  - The committed `generated.ts` turns every template edit into an unreviewable one-line diff and a guaranteed merge conflict between parallel branches. CMP-08 is the same problem for the schema copies.
- How verified: `git grep` for invokers (subagent, spot-checked); `git ls-files`; `wc -c`.
- Suggested change:
  - Give the measurement scripts `measure:*` package scripts, or move them under `docs/evidence/tools/`.
  - Keep `generate-npm-test-locks` with a package script.
  - Stop committing `generated.ts`. Every consumer of it already runs `build:packages` first; see Unverified.
- Effort: S

### Ten largest opportunities

| # | Finding | Files | Approx. lines involved | Lines removed | Shape of the consolidated version |
| --- | --- | --- | --- | --- | --- |
| 1 | DUP-06 | `tests/integration/{switch,tabs,tooltip,checkbox,card,form-controls}-cli`, `component-preset-cli`, `snapshot-api`/`recipe-snapshot-api`, `e2e/{card,badge,forms}` | ~2,000 | ~800–1,000 | Table-driven scoped-component CLI test; an API contract helper like the store contract; specs import `component-browser` |
| 2 | DUP-04 | `snapshots/install-command.ts` and its three tests | ~930 | ~500 | One `{ minimumCli, applies, notice }` table, empty today, plus one generic test |
| 3 | DUP-18 | four `measure-*.mjs`, `generate-npm-test-locks.ts`, `generated.ts` | ~810 (+3.8 MB) | moved, not deleted | Package scripts, or `docs/evidence/tools/`; `generated.ts` ignored |
| 4 | DUP-01 | `{snapshots,recipe-snapshots}/{use-publication,publication,publication-storage}.ts` | ~1,180 incl. tests | ~270 src (+ shared tests) | `createPublicationController(kind)` with a descriptor |
| 5 | DUP-02 | `service`/`recipe-service`, `input`/`recipe-input`, `preset-file`/`recipe-file`, contracts and compiler snapshot pairs, 3 command builders | ~1,000 | ~200 | A `PublicationKind` descriptor driving the service, CLI input, file reader and command builder |
| 6 | DUP-03 | `plan/recipe.ts`, `plan/component-preset.ts`, `plan/components.ts` loop, `main.ts` | ~420 | ~160 | `planScopedInstall({ lockField, transform, identity, labels })` |
| 7 | DUP-09 | 10 Playwright configs | 284 | ~150 | `playwright.base.ts` factory; editors folded into site |
| 8 | DUP-08 + DUP-10 | `prepare-{node,bun}-consumer`, two consumer-server helpers, five kill-tree, three atomic-write, six spawn copies | ~600 | ~240 | `verifyInstalledArtifacts`, `startConsumerServer`, `killTree`, `writeFileAtomicSync`, `runBuiltCli` |
| 9 | DUP-07 | `sqlite-store.ts`, `postgres-store.ts` | ~400 | ~85 | Kind-parameterised SQLite methods; shared `publication-rules.ts` |
| 10 | DUP-05 + DUP-11 | `style-families.ts`, `style-support.ts`, ~15 call sites; `project/recipes.ts`, `project/component-presets.ts` | ~350 | ~170 | Glass derived from `supportedComponentIds`; one `validateInstalledRows` |

## Unverified

- **date-fns in previews.** Whether the gitignored generated previews (`apps/www/src/generated/previews`, `apps/preview/src/generated`) import `date-fns` through the Calendar template sources. If they do, keep it in `apps/www` and `apps/preview` and remove it only from `packages/catalog`. To settle: `pnpm generate:preview`, then grep the generated trees.
- **Fonts in www.** Whether `@fontsource-variable/bricolage-grotesque`, `figtree` and `geist-mono` in `apps/www/package.json` are needed. Only `apps/preview/src/preset-fonts.ts` imports them; `scripts/www-previews/self-hosted-fonts.ts` may resolve them from `apps/www`. To settle: remove them in a branch and run `pnpm build:packages && pnpm generate:preview && pnpm --filter @ombelle/www build`.
- **Ignoring `generated.ts`.** Whether every path that reads `packages/catalog/src/generated.ts` runs `sync-catalog` first: `typecheck`, `test:unit` through the Vitest alias to `src`, and the Vercel build through `build-hosted-www.mjs`. `build-hosted-www.mjs:13` does run it. To settle: delete the file in a clean checkout and run `pnpm typecheck` and `pnpm test:unit` without building.
- **SQLite and Postgres parity.** I found no behavioural divergence between the two stores by reading. A parity test (the same contract run against both, which `publication-store-contract.ts` partly provides) would settle it. That needs the Postgres suite to run somewhere (TST-04).

## Looked at and found sound

- **HTTP layer.** `http.ts`, `recipe-http.ts` and `publication-http.ts` are already one generic handler with two thin wrappers. Nothing to merge.
- **Postgres store.** It is already kind-parameterised (`publishRecord`, `lookupRecord`, `changeWithdrawal`).
- **CLI snapshot cache.** It is already generic (`readPublicationCache`/`writePublicationCache`); `recipe-cache.ts` is an 8-line typed wrapper.
- **Get code dialog.** `get-code-dialog.tsx` is shared by the preset and recipe Get code components; their remaining difference is the per-kind install rules.
- **`bounded-map.ts`.** A worker pool with no equivalent elsewhere, used by two consumer scripts.
- **`write-atomic.ts`.** No equivalent in `packages/`. The CLI's transaction and cache writes have different semantics: journalled rename, and link-without-replace.
- **Component recipe schema.** The 5,205-line schema has no repeated subtrees large enough to factor; the branches differ by component content. A script found no repeated subtree over 200 characters more than three times.
- **CLI flags.** Every flag `main.ts` accepts is read.
- **Vitest configs.** The three configs are small. `vitest.integration.config.ts` only changes the worker env variable, which is cheap enough to keep.

### Deliberate isolation and deliberate twins — do not "fix"

- **Component-scoped recipes and presets vs global defaults.** Separate lock fields (`recipes`, `componentPresets`), separate output roots (`components/ui/recipes/…`, `components/ui/presets/…`), scoped CSS and the "saved global preset matches lock" check are required by the contract. DUP-03 and DUP-11 share the algorithm only. The data, paths and lock rows must stay apart.
- **The 1.0 Button recipe pipeline.** `compiler/src/recipe.ts`, `recipe-styles.ts`, `recipe-source.ts` and `contracts/src/recipe.ts` sit beside the 2.0 component recipes. Button is not a 2.0 component (its schema branch list has no `button`), and published `rc_…@1` codes with schema 1.0 must keep resolving (decision 0009). This is a real difference, not a copy.
- **`compileButtonPreset` vs `compileRecipe` vs `compile`.** These are three products with different scopes and identities; only the finalisation step in DUP-14 is shared.
- **Retired preset revisions** in `packages/catalog/src/presets/retired/` and the pinned-preset paths (`pinnedRecipePreset`, `storedPresetIdentity`), kept resolvable per decision 0009.
- **Radix and Base UI template editions.** These are 39 twin templates in `packages/catalog/src/templates/` and `templates/base/`. Some are near-identical: `code-block` 443 lines with 28 changed, `color-picker` 615/47, `sidebar` 271/43, `data-table` 322/66. Each installed file must be standalone and import only its edition's primitives. The cost is real (every fix lands twice, as wave 2 showed), and `edition-parity.spec.ts` is the guard. Do not merge them into shared runtime modules.
- **Per-family style sheets** (`packages/catalog/src/styles/*.css` and per-template `styles/<family>`). Each family is installed alone.
- **Two snapshot store backends.** SQLite (local and tests) and Postgres (production) are both needed. DUP-07 shares their rules, not their backends.
- **Separate per-kind SQLite tables vs one Postgres table with `kind`.** Changing either is a schema migration, which DUP-07 does not need.
