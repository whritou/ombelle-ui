# 11 — Tests and evidence integrity

Date: 22 November 2026. Commit: `9317458ab81a8afe9ab95a1402e2bc81cc908e9f`, branch `docs/1-0-audits-wave-3`. This tree is 0.9.1 plus the wave 1 fixes (PR #189) and the liquid glass change (PR #190). The wave 2 fixes (PR #191) are **not** in this tree; where I judge them I read them from branch `feat/1-0-wave-2-findings-fce8bb` (`d410f53d`, `9428e5ca`).

**Covered.**
- **Configuration.** `vitest.config.ts`, `vitest.integration.config.ts`, `vitest.postgres.config.ts` and all ten `playwright*.config.ts`.
- **Gate and evidence scripts.** `scripts/check-foundation.mjs`, `foundation-runner.mjs`, `foundation-evidence.mjs`, `stage-foundation-evidence.mjs` and the `*-evidence.ts` scripts.
- **Workflows.** `.github/workflows/ci.yml` and `foundation.yml`.
- **Test files.** Every spec under `tests/e2e` was classified by the config that runs it. Every `skip`, `only`, `fixme`, `runIf`, retry, raised timeout, self-writing fixture and snapshot in `packages/`, `apps/www/src`, `tests/` was read. The tests behind each risk in the coverage map were read end to end.
- **Evidence and claims.** `docs/evidence/` (how it is produced, the gate, specimen audit, liquid glass and run records). The claims in `README.md`, `AGENTS.md`, `docs/07-delivery-plan.md`, `docs/web-alpha-readiness.md`, `docs/foundation-local-usage.md`, `docs/components/liquid-glass.md` and the site copy under `apps/www/src/site` and `apps/www/src/app`.
- **CI history** (read-only, `gh run list` / `gh run view --log`). Every nightly Foundation run since 8 November. The latest CI runs, including the dependabot runs from 22 November.

**Not covered, and why.**
- No suite was run, as the prompt instructs. An install and a build were running in this worktree.
- `test-results/`, `playwright-report/` and `.artifacts/` do not exist in this worktree. Flakiness signals come from CI logs and the evidence docs instead.
- Site copy was checked only for test, verification and count claims. Wording belongs to audit 12.

**Commands run.**
- Two throwaway Node scripts in the session scratchpad: one classifies the e2e specs by config, one loads the live counts from `packages/contracts` and `scripts/consumer-matrix.ts`.
- One parser for CI log durations.
- `gh run list` / `gh run view` on `whritou/ombelle-ui`.

**Live counts used below (from the code):**
- 63 components and 8 families. Every one of the 504 cells is `stable`, and none is `unavailable`.
- 54 consumer cases: pnpm 18, npm 14, Yarn 6, Bun 16.
- 21 browser spec files with 1,185 cases in the gate inventory (`browserSpecCounts`).
- 32 specimen audit configurations.
- 5,953 unit tests in CI, 6 of them skipped. 749 integration tests over 4 shards.

## Summary

The test code is mostly honest:
- Assertions are real.
- Snapshots are committed.
- The vitest and Playwright result validators reject skips, retries, duplicates and missing files.
- The risky installer paths (conflicts, stale plans, path escape, rollback) have direct tests that run on every PR.

The evidence system around the tests has failed. The full Foundation gate is the only place any browser test, consumer install or specimen audit runs. It has not passed since 8 November: 14 consecutive nightly failures across 548 commits, the 40 components added since, both 0.9 releases and the three newest families. Both groups are now structurally unable to pass:
- **Quality group.** Unit tests run before the generated preview sources exist, and the validator rejects six `runIf` skips.
- **Consumers group.** The 32-configuration specimen audit runs serially in one worker at 3.6 to 5.2 minutes per configuration, inside a 60-minute step that consumer preparation already uses 42 minutes of.

Meanwhile PRs merge green, because PR CI runs no browser test at all. The docs state that "release or evidence claims still require a passing Foundation run". The evidence the docs cite is hand-written, often weeks stale, and in places contradicts the code. **This blocks 1.0**: today no automated check shows that any component added after 8 November installs and renders in a real consumer. Three findings are blockers (TST-01 to TST-03).

## Findings

### TST-01 The Foundation gate has not passed since 8 November, and releases shipped without it
- Severity: blocker
- Where: `.github/workflows/foundation.yml` (whole file); `.github/workflows/ci.yml:1-4,77-87`; `docs/foundation-local-usage.md:70`; `docs/web-alpha-readiness.md:9`.
- What happens:
  - **The record.** `gh run list --workflow foundation.yml` shows 14 consecutive scheduled failures, from 9 to 22 November. The last success was run 42468940434 on `8e61954c` (8 November), when the catalog had 23 components. Since then:
    - 548 commits;
    - 40 components, from the 0.7.3 batch to the 0.9 app shell;
    - the papier, organic and retro-futurism families;
    - npm releases 0.8.0 to 0.9.0, with 0.9.1 recorded on `main`.
    None of this has passed a gate run.
  - **Why PRs stay green.** Branch protection requires only `ci.yml`'s `verify`. That workflow runs build, audit, typecheck, unit and integration tests, but **no Playwright spec**, so every PR merged green throughout.
  - **The project's own rule.** `docs/foundation-local-usage.md:70` says "release or evidence claims still require a passing Foundation run". The 0.9.0 npm evidence lists `pnpm check:foundation` under "Not run" (`docs/evidence/npm-0.9.0-2026-11-19.md:37`).
  - **What the readiness table cites.** The newest full gate pass it cites is local, from 31 October on `84f2189` (34 consumers, 355 browser cases), against 54 and 1,185 today.
- How verified: reproduced from CI history (`gh run list --workflow foundation.yml --limit 15`; `gh run view 45013687113`, `42604562351`, `43409559949`, `44291832411`), read end to end for the workflows.
- Suggested change:
  - Fix TST-02 and TST-03, get one green Foundation run on `main` and record its run ID in the evidence.
  - Until the gate is green, either make a scheduled failure block releases (a release checklist step or a required check on release PRs), or withdraw the "verified" wording that depends on it.
- Effort: M (after TST-02/03)

### TST-02 The quality group cannot pass: unit tests run before preview generation, and the validator rejects the suite's six skips
- Severity: blocker
- Where: `scripts/foundation-evidence.mjs:13` (stage order), `:84` and `:97` (skip rejection); `apps/www/src/preset-editor/schemes.test.ts:50,118`; `tests/integration/foundation-groups.test.ts:13-16`.
- What happens: there are two independent defects. Either one alone fails the group.
  1. **Stage order.**
     - `foundationSteps.quality` is `['build:packages', 'test:unit', 'test:integration', 'generate:preview', …]`, but many `apps/www/src` tests import `apps/www/src/generated/**` and `apps/preview/src/generated/**`, which `generate:preview` creates.
     - On a clean runner, `test:unit` fails with `Cannot find module '../generated/ui/components/ui/sheet'` and `Failed to resolve import "../generated/previews/fonts.css"`, plus a dozen more. `precompiled-defaults.test.ts` and `support-matrix.test.tsx` fail too (nightly run 45013687113, job 137181317002; the same errors appear on 13 and 18 November).
     - `ci.yml` runs `generate:preview` before unit tests, which is why PR CI passes.
  2. **Skips are fatal.**
     - `schemes.test.ts` puts `it.runIf(family === 'minimalist')` inside `describe.each` over seven families, so every run reports 6 skipped tests (the CI log for run 45065942051 shows "5947 passed | 6 skipped").
     - `validateTestResults` fails on any assertion whose status is not `passed` and on `numPendingTests !== 0`. Even with the order fixed, quality evidence can never validate. This has been true since `33bf481a` (14 November).
  3. **The test that should catch this cannot.** `foundation-groups.test.ts` copies the stage list verbatim and feeds the validator hand-made results. It can never catch an order that cannot run, or a skip that the real suite produces.
- How verified: read end to end; the first defect is reproduced in CI logs, the second follows from the CI unit output and validator lines 84 and 97.
- Suggested change:
  - Move `generate:preview` before `test:unit` in `quality` and `all`, as `ci.yml` does.
  - Replace the `runIf` with a separate `it` outside the `describe.each`, or call it only for minimalist.
  - Have `foundation-groups.test.ts` import `foundationSteps` instead of copying it.
- Effort: S

### TST-03 The consumers group cannot finish: the specimen audit is serial and over its timeout, and two browser specs fail in CI
- Severity: blocker
- Where:
  - `playwright.specimen-audit.config.ts:11` (`timeout: 300000`, `workers: 4`, no `fullyParallel`);
  - `tests/e2e/specimen-audit.spec.ts:63-67` (32 tests in one file, no `describe.configure`);
  - `.github/workflows/foundation.yml:75-78` (60-minute step), `:47` (80-minute job);
  - `tests/e2e/code-block-075.spec.ts:180`; `tests/e2e/components-076.spec.ts:200`.
- What happens:
  - **The time budget.** Playwright runs one file's tests in one worker. All 32 family × edition × mode configurations therefore run one after another. In the 22 November nightly they took 3.6 minutes (`flat/radix/dark`) and 5.2 minutes (`flat/radix/light`, which **failed on the 300 s test timeout**). That is about two hours for the audit alone. The step's 60 minutes were already 42 minutes down after `prepare:consumers` (2,542 s), so the step was killed during the specimen audit. `build:consumers` and `test:e2e` never ran.
  - **Real failures.** The same run failed four specimen-config tests that are real or flaky failures. Both editions failed "the code scrolls from the keyboard inside its height and the page does not" (Code Block) and "Toolbar items overflow into More in order, come back and keep focus".
  - **The cold-server symptom.** The local evidence records the same first-configuration timeout as a cold-server problem fixed by rerunning (`docs/evidence/editor-inputs-075.md:39`).
- How verified: reproduced from CI log (`gh run view 45013687113 --job 137181317122 --log`); read end to end for the config and spec.
- Suggested change:
  - Make the audit parallel per configuration (`test.describe.configure({ mode: 'parallel' })`, or one file per family), warm the preview server in `globalSetup`, and size the per-test timeout to a measured configuration.
  - Split `test:specimen-audit` into its own Foundation job.
  - Triage the Code Block and Toolbar failures on bundled Chromium.
- Effort: M

### TST-04 Eleven browser specs, the hosted browser suite, the Postgres store suite and the Base UI consumers run in no CI and no gate
- Severity: should-fix
- Where: `playwright.config.ts:12` (`testIgnore`); `playwright.catalog-expansion.config.ts:12` (defaults to the `msedge` channel); `playwright.editors.config.ts`, `playwright.site.config.ts`, `playwright.usage-examples.config.ts`, `playwright.base-consumers.config.ts`, `playwright.hosted.config.ts`; `vitest.postgres.config.ts`; `docs/decisions/0005-base-ui-edition.md:27`; `docs/evidence/app-shell-09.md:96`.
- What happens:
  - **Specs nobody runs.** The gate runs the default config (21 files) and the specimen config (16 files). These 11 spec files are run by nothing automated:
    - `base-consumers`
    - `catalog-expansion`
    - `catalog-recipe-appearances`
    - `component-editor-instant`
    - `editors-glass`
    - `editors-matrix`
    - `editors-responsive`
    - `inline-previews`
    - `preset-editor-instant`
    - `site-shell`
    - `usage-example-layout`
  - **Suites nobody runs.** Neither are `tests/hosted-browser/*` and `tests/hosted/*`. The latter is the only suite that exercises the production Postgres store: concurrent quota, immutability trigger, lock timeout.
  - **Base UI consumers.** `base-consumers.spec.ts` was last changed on 7 November. The Base UI edition of the 40 newer components has never been installed into a consumer by any test.
  - **Without Edge.** `catalog-expansion` cannot run on a machine without Edge unless `OMBELLE_BROWSER_CHANNEL` is set.
  - **Recorded as accepted.** The evidence notes the exclusion as accepted ("not in `pnpm check:foundation` or CI").
- How verified: read end to end (spec classification script over the ten configs).
- Suggested change:
  - Add a Foundation job that runs the editors, site and base-consumers configs.
  - Run `test:hosted-storage` against a disposable Neon branch on a schedule.
  - Default `catalog-expansion` to bundled Chromium.
- Effort: M

### TST-05 Evidence is hand-written, carries no run identity, and stale files read as current
- Severity: should-fix
- Where: `docs/evidence/` (no script writes there: `git grep docs/evidence -- scripts tests` finds only a comment in `scripts/set-version.mjs:20`); `docs/evidence/latest-run.json`; `docs/evidence/specimen-audit.md:9-13,80`; `docs/evidence/app-shell-09.md:72`; `scripts/stage-foundation-evidence.mjs`; `tests/e2e/specimen-audit.spec.ts:209-216`.
- What happens:
  - **No provenance.** Every `.md` and `*-run.json` under `docs/evidence` is authored by hand. Nothing links one to the CI run or artifact that produced it, so any number can be edited without detection. The machine-made files (`foundation-report.json` with `sourceCommit` and `workingTreeDirty`, `browser-version.json`) live only in CI artifacts with finite retention, and no doc cites a run ID.
  - **Stale files read as current:**
    - `latest-run.json` is from 20 October (`3c4093f`, 9 stages, a 49 s e2e run).
    - `specimen-audit.md`, which README links as the gate's specimen evidence, records 20 configurations, 580 specimens and "Liquid glass is experimental … only page errors fail it". Today there are 32 configurations and 2,016 specimens, and the code holds glass to every check but contrast.
  - **Red recorded as pass.** `app-shell-09.md:72` records `pnpm test:integration` as "Pass for this work", listing the remaining failures as environment (no Bun, pnpm only through corepack, Windows `tar`, shared snapshot cache). Several evidence files record "timed out, rerun: passed".
  - **No identity in the specimen file.** `specimen-audit.json` itself records no commit, no time and no working-tree state.
- How verified: read end to end.
- Suggested change:
  - Have `stage-foundation-evidence.mjs` (or a small `record-evidence` script) write the summary and the run ID into `docs/evidence/<topic>-run.json` from a passing Foundation run only, and keep prose separate from numbers.
  - Rename or delete `latest-run.json`.
  - Add `sourceCommit`, `workingTreeDirty` and `measuredAt` to `specimen-audit.json`.
- Effort: M

### TST-06 Count, family and version claims are stale or contradictory
- Severity: should-fix
- Where: `README.md:1-8,46,93,95`; `AGENTS.md:20`; `.github/workflows/foundation.yml:2,53,76`; `docs/foundation-local-usage.md:72`; `docs/07-delivery-plan.md:55,61`; `docs/web-alpha-readiness.md:9,23,32,39,56`; `docs/cli-release.md:138`.
- What happens (each checked against the code):
  - **Published CLI version.** README line 6 says 0.9 "needs CLI 0.9.0, which is not published yet". Line 46 and `apps/www/src/snapshots/install-command.ts:6` say 0.9.0 is published. `docs/cli-release.md:138` says "The published installer is `@ombelle-ui/cli@0.8.3`".
  - **Specimen audit families.** README:95 says the specimen audit covers "all five families"; the validator demands eight (`foundation-evidence.mjs:126-129`).
  - **Ombelle coverage.** README:93 says "ombelle's full browser and consumer coverage is pending the foundation gate". Ombelle has been in the consumer matrix since before 8 November.
  - **Consumer count.** AGENTS.md, `foundation.yml` and `foundation-local-usage.md` say 40 consumers and a "676-case browser matrix". The code has 54 consumers and 1,185 cases. README's 54 is right.
  - **Delivery plan.** It says glass is "experimental … all twenty-three components" (line 61), and line 55 cites the 34-consumer gate as current.
  - **Readiness.** It says "the four stable families" (line 39), "48 stable entries" (line 56) and "All 34 consumers" (lines 23 and 32). The code has 8 families × 63 components and 54 consumers.
  - **`docs/components/liquid-glass.md`.** The prompt flagged it. It is now consistent: "all 63 components" (line 3) and "63 components × 8 families, … every cell is `stable`" (line 35), which match `style-families.ts`. Its older counts were corrected by PR #190.
  - **Site copy** makes no test-count or "verified" claims. "The CLI supports npm, pnpm, Yarn, and Bun projects" (`apps/www/src/site/docs/guides.tsx:19`) is worth reading against TST-09.
- How verified: read end to end; counts from `supportedComponentIds`, `styleFamilies`, `styleSupport` and `consumerCases()`.
- Suggested change: generate the counts in README, AGENTS.md and readiness from the contracts (or drop them), and fix the version contradiction before 1.0. This overlaps audit 12, which owns the wording.
- Effort: S

### TST-07 The liquid glass contrast exemption is unbounded and excuses more than backdrop-dependent contrast
- Severity: should-fix
- Where: `tests/e2e/specimen-audit.spec.ts:16-18` (`backdropDependent`), `:177-188`, `:213-214`; `scripts/foundation-evidence.mjs:126-144` (`validateSpecimenAudit`); `packages/contracts/src/style-families.ts:94-98`.
- What happens: holding glass to overflow, clipping, spacing, target size, forced colours, non-contrast axe rules and focus presence is sound, and so is excusing contrast that depends on what is behind a translucent surface. The implementation goes further in three ways.
  1. **Every contrast finding is excused.** All axe `color-contrast` findings and all focus-ring 3:1 findings in the family are excused, including text on surfaces the docs call opaque: Badge "solid fill … no translucency", Alert "solid card surface … no blur", and the opaque fallbacks. A real contrast regression on an opaque glass surface fails nothing.
  2. **The count is unchecked.** `contrastAdvisoryFindings` is written to the evidence, but `validateSpecimenAudit` never reads it. Going from 0 to 500 advisory findings is invisible, and the test-fixture evidence in `foundation-groups.test.ts` omits the field entirely.
  3. **The one rendered guarantee is unmeasured.** The caveat text promises that `design.transparency: "reduced"` "restores the full guarantee". No audit configuration renders glass with reduced transparency (or `prefers-reduced-transparency`) and holds it to contrast. The only check is the compiler-side model (`glass-contrast.test.ts` "reduced transparency evaluates covered surfaces opaque").
- How verified: read end to end.
- Suggested change:
  - Excuse a contrast finding only when the failing node's background is translucent.
  - Add a glass configuration with reduced transparency held to every check.
  - Fail when advisory findings exceed a recorded per-configuration baseline.
- Effort: M

### TST-08 The decision-0009 freeze tests write their own fixture when it is missing and ignore removed entries
- Severity: should-fix
- Where: `packages/catalog/test/builtin-preset-revisions.test.ts:23-29`; `packages/compiler/test/component-recipe-defaults.test.ts:13-20`.
- What happens: both tests do `if (OMBELLE_WRITE_FIXTURES === '1' || !existsSync(fixture)) writeFileSync(fixture, actual)` and then compare only keys present in both.
  - **Deleted fixture.** Deleting the fixture makes the test pass and regenerate it.
  - **Removed entry.** Removing a retired preset revision from the catalog, or a component from `componentRecipeComponents`, passes, because the loop iterates `actual` and skips keys missing from it. That is exactly what decision 0009 forbids ("keeping the old revision resolvable") and what published `id@revision` references need.
  - **Wave 1 relies on these.** Wave 1 cites the first test as the CMP-02 guard ("built-in presets frozen per `id@revision` by a hash test"), so that guard covers changed content but not deleted revisions.
- How verified: read end to end.
- Suggested change: never write when the file is missing (fail instead), and assert that every pinned key still exists in `actual`. Keep `OMBELLE_WRITE_FIXTURES` for deliberate re-recording only.
- Effort: S

### TST-09 `transaction.test.ts` "rejects stale source" depends on how pnpm is installed, and now fails in CI too
- Severity: should-fix
- Where: `packages/cli/test/transaction.test.ts:28-48` (second `applyPlan(next)` has no `dependencies` port); `packages/cli/src/apply/transaction.ts:65-68` (`prepareManager` runs before the stale-file check at `:97-103`); `packages/cli/src/apply/manager.ts:240-295`.
- What happens:
  - **Why it fails.** The test's second apply omits the dependency stub, so `applyPlan` calls the real `prepareManager` before it reaches the `beforeHash` comparison. Where pnpm has no locatable JavaScript entry, the test gets `UNSUPPORTED_PROJECT` ("Cannot locate a pnpm JavaScript entry without shell evaluation") instead of `FILE_CONFLICT`. That covers the maintainers' Windows machine with corepack's `pnpm.CMD` (wave 1 and wave 2 hand-overs).
  - **Now in CI.** The same failure now appears in CI: the dependabot PR bumping `pnpm/action-setup` 6.1.0 → 6.1.1 fails `checks` on exactly this test (runs 44999510295 and 44999505257). As written the test checks the runner's pnpm layout as much as stale-plan rejection, and it would attempt a real install if the conflict check ever regressed.
  - **Coverage is not lost.** The stale-plan risk itself stays covered by environment-independent tests: `theme.test.ts:205-222` (a file edited during planning), `recipe-lock.test.ts:79-86`, `transaction.test.ts:85-91`, `npm.test.ts:62-77` and `bun-metadata.test.ts:14-28`.
  - **A product question beyond the test.** The CLI refuses a pnpm that has no JS entry. If action-setup 6.1.1 installs pnpm the way pnpm's own standalone installer does, real users hit this too (see Unverified).
- How verified: read end to end; reproduced from CI logs of the dependabot runs.
- Suggested change: pass `{ dependencies: async () => {} }` to the second `applyPlan`, and assert the `File changed after planning` message rather than only the code.
- Effort: S

### TST-10 `reuseExistingServer: true` lets a local run, including the local gate, test another checkout
- Severity: should-fix
- Where: `playwright.specimen-audit.config.ts:26`; `playwright.catalog-expansion.config.ts:24`; `playwright.edition.config.ts:23`; `playwright.usage-examples.config.ts:25`; `playwright.editors.config.ts:25,31` and `playwright.site.config.ts:25,31` (`!process.env.CI`).
- What happens:
  - **The problem.** These configs attach to whatever already listens on the fixed port (4185, 4184, 4173, 4186, 3000). With several worktrees of this repository open, which is the normal way of working here, a run measures the other checkout's generated pages and reports a pass for this one.
  - **It has happened.** Wave 2 hit it: "another checkout's preview held 4185, and `reuseExistingServer: true` made the first run test that checkout instead of this branch" (`wave-2-fixes.md`, Verification).
  - **The gate is exposed.** `test:specimen-audit` is a stage of the local `check:foundation`, so a local gate can write `specimen-audit.json` from the wrong source.
- How verified: read end to end; reproduction recorded by wave 2.
- Suggested change: set `reuseExistingServer: false` (as `playwright.config.ts` does), or take the port from an environment variable with a per-worktree default and check a build marker on the page.
- Effort: S

### TST-11 Wave 2 dropped the right-to-left Sheet pointer-drag assertion instead of marking it as a known failure
- Severity: should-fix
- Where: branch `feat/1-0-wave-2-findings-fce8bb`: `d410f53d` (adds the RTL test, including the drag to `aria-valuenow` 400), `9428e5ca` ("assert only the keyboard half"), `tests/e2e/variants-more.spec.ts` around line 400.
- What happens:
  - **The fix claim.** `d410f53d`'s message says the drag direction "went the wrong way" and is now read from the computed direction "when a key or drag starts".
  - **The evidence.** The drag half of its own test never passed, and the cause ("hit target or sign") was not found.
  - **The deletion.** `9428e5ca` then deleted the drag lines. The commit therefore claims a pointer fix that no test or run has shown, and the suite now has no record that RTL pointer resizing may still be wrong.
  - **What the gap means.** A pointer user in an RTL page may still drag the inline-end Sheet the wrong way. CAT-04 is marked "Fixed for keys; pointer drag not verified", but that note lives only in a findings file.
- How verified: read end to end (`git show d410f53d -- tests/e2e/variants-more.spec.ts`, `git log` on the branch).
- Suggested change: restore the drag as a separate `test.fixme('… pointer drag in RTL (CAT-04)')` with the open question in its body, and fix or retract the drag claim before 1.0.
- Effort: S (test), M (cause)

### TST-12 Timeouts were raised to absorb a growing suite, and the slowest tests buy little coverage
- Severity: should-fix
- Where:
  - `tests/integration/hosted-preview-build.test.ts:6-8,58` (480 s);
  - `tests/integration/foundation-groups.test.ts:45,159,168,200` (900 s and 420 s);
  - `tests/integration/audit-page-generation.test.ts:20` (480 s);
  - `.github/workflows/ci.yml:45-49` (30-minute integration job);
  - `vitest.config.ts:33-34` (60 s global);
  - `scripts/foundation-evidence.mjs:36-38` (360 s `vitest list`);
  - `playwright.specimen-audit.config.ts:11` (300 s).
- What happens:
  - **Hosted preview build.** The comment says the build "took 150 to 236 s … so allow twice that". On 22 November it **timed out at 480 s** in CI integration shard 4 on two dependabot runs (44999860826, 44999811413), and took 385 s on the passing run 45065942051. The test is a build smoke test that checks string presence in the output. It also writes into the repository's own `apps/www/public`.
  - **Foundation groups test.** `foundation-groups.test.ts` spends 469 s of CI time re-collecting the entire unit and integration inventory with `vitest list` to feed the validator. The gate's own `expectedTestInventory` does the same again (bounded at 360 s, "close to 200 s on CI runners").
  - **Shard imbalance.** Shard 4 runs 713 s against 297 to 426 s for the others. `component-recipe-cli.test.ts` (594 s), `foundation-groups.test.ts` (469 s), `hosted-preview-build.test.ts` (385 s) and `foundation-consumers.test.ts` (373 s) all land there, so the job sits at a third of its 30-minute limit with one slow file from failure.
  - **Hidden slowness.** Local evidence repeatedly records unit tests that "timed out under the combined run and passed alone" (`preview-protocol.test.ts`, `snapshot-cache.test.ts`, the latter 51 s alone against a 60 s limit). Each timeout raise hides real growth, not a race. No raise was found that hides a race.
- How verified: read end to end; durations reproduced from the CI log of run 45065942051 (parsed in the scratchpad).
- Suggested change:
  - Build the hosted preview once in a dedicated CI step and assert on its output, instead of inside a vitest timeout.
  - Test the evidence validator against a small checked-in inventory instead of re-listing the suite.
  - Balance shards by measured duration.
- Effort: M

### TST-13 The consumer matrix installs 12 of 63 components in one edition, so install-vs-preview divergence is untested for the rest
- Severity: should-fix
- Where: `scripts/consumer-components.ts:5-18`; `tests/e2e/parity.spec.ts:20-22`; `tests/e2e/base-consumers.spec.ts` (outside the gate, TST-04).
- What happens:
  - **What is checked.** Every real consumer installs the same 12 components (6 in liquid glass), Radix only. `parity.spec.ts`, `liquid-glass.spec.ts` and the editor comparisons check those against the preview.
  - **What is not.** The other 51 components, and every Base UI install, are only ever rendered from compiler output inside the preview app: by the specimen audit, the edition parity specs and the variant specs. A defect that appears only in an installed project goes unseen: an import path rewrite, a missing dependency, CSS order in a consumer's global sheet, or a Next.js server/client boundary such as CAT-01. CAT-01 itself was found by reading and proven with a Flight unit test, not by a consumer.
- How verified: read end to end.
- Suggested change: add one consumer per edition that installs all 63 components and renders the audit page from installed source. Diff its DOM and computed styles against the preview audit page, reusing `compareSlotStyles`.
- Effort: M

### TST-14 Specimen audit evidence is merged from a parts directory that is never cleared
- Severity: nice-to-have
- Where: `tests/e2e/specimen-audit.spec.ts:191-195,201-217`; `scripts/check-foundation.mjs:29-30` (clears only `.artifacts/specimen-audit.json`).
- What happens:
  - **Stale parts.** Each configuration writes `.artifacts/specimen-audit/parts/<config>.json`, and every worker's `afterAll` merges whatever parts exist. Nothing deletes old parts. A configuration that crashes or times out before writing its part leaves the previous run's part, possibly with `failures: 0`, in the merged file.
  - **Where it matters.** In the gate the failing test still fails the stage, so this matters only for manual runs whose `specimen-audit.json` is quoted in evidence. Combined with TST-05, nothing in the file shows which run each part came from.
- How verified: read end to end.
- Suggested change: delete `parts/` in a `globalSetup`, and stamp each part with a run ID that the merge requires to match.
- Effort: S

## Risk coverage map

| Risk | Test that would catch a regression | Runs where | Verdict |
| --- | --- | --- | --- |
| Nondeterministic compiler output | `expectStandaloneArtifacts` (`packages/compiler/test/new-component-artifacts.ts:59-61`) and the per-component "compiles deterministically" tests, which compile twice in one process. `stable-families.test.ts` pins artifact hashes across processes and platforms (fixture from Windows, checked on Linux CI). `preview-styles.test.ts` snapshot hashes. `audit-page-generation.test.ts` regenerates and compares | PR CI | Covered |
| Overwriting a user-modified file | `plan.test.ts:47` (locally changed owned file is a conflict), `transaction.test.ts:28-48`, `component-preset-conflicts.test.ts`, `crlf-checkout.test.ts` (CLI-03, wave 1), `case-mismatch.test.ts` (CLI-04, wave 1) | PR CI | Covered |
| Writing outside the project | `transaction.test.ts:92-108` (replaced parent junction), `component-preset-lock.test.ts:132,266` (`../outside` in lock records), `safePath` on every change (`transaction.ts:63`) | PR CI | Covered |
| A stale plan being applied | `theme.test.ts:205-222`, `recipe-lock.test.ts:79-86`, `transaction.test.ts:85-91`, `npm.test.ts:62-77`, `bun-metadata.test.ts:14-28`; `transaction.test.ts:28` too, but it depends on the pnpm layout (TST-09) | PR CI | Covered (one test fragile) |
| Recovery after an interrupted apply | `interrupted-apply.test.ts` (CLI-02, wave 1): kills before, between and during install, a live owner, a legacy lock, Ctrl-C | PR CI | Partly covered: kills are simulated by copying the project with stub dependency ports, so the damage a real partial `npm`/`pnpm` install does to `package.json` and the lockfile is never exercised (`packageStateMayHaveChanged` is asserted as a flag only; CLI-14 deferred) |
| A lifecycle script running | `npm.test.ts:94` (project `preinstall` sentinel from `tests/helpers/npm-project.ts:20`), `font-pairs-cli.test.ts:78-94` (pnpm project `postinstall`), `bun-manager.test.ts:39-60` (dependency and project scripts, trusted dependency) | PR CI (integration) | Covered for npm, pnpm and Bun. Yarn only by argument capture against a stub manager (`yarn-manager.test.ts:93`) |
| A quota being exceeded under concurrency | `tests/hosted/postgres-snapshot-store.test.ts:63-80,110-123` (concurrent publishes against the global limit and idempotency); `snapshot-network-budget.test.ts` covers RL-01/RL-02 sequentially on SQLite only | Postgres suite: **nowhere** (opt-in `test:hosted-storage`, TST-04) | **No running regression test.** The production store's concurrent quota path, including the wave 1 network budget, is tested only by a suite no CI runs |
| An invalid snapshot being stored | `snapshot-api.test.ts:129-156` (unknown fields, unsupported versions as 422, glass below bound), `recipe-snapshot-api.test.ts:72-118`, corrupt-storage fail-closed reads; CMP-04 and SEC-02 validation tests (wave 1) | PR CI (SQLite); Postgres immutability trigger only in the opt-in suite | Covered on SQLite |
| Preview and installed output diverging | `parity.spec.ts` (7 families × 2 modes, 12 components), `liquid-glass.spec.ts` consumer cases, `preset-editor.spec.ts` / `recipes.spec.ts` / `component-presets.spec.ts` installed comparisons; `base-consumers.spec.ts` for Base UI | Foundation gate only, red since 8 November (TST-01 to TST-03); Base UI in no gate (TST-04) | **No running regression test.** Even when green, it covers only 12 of 63 components in Radix (TST-13) |

Wave fixes that now cover their risk with a test in this tree: CLI-02 (interrupted apply), CLI-03 (CRLF), CLI-04 (case), CLI-06 (layered theme), CMP-01/02 (stored-byte verification, preset freeze, but see TST-08), CMP-04/05 (font roles), SEC-02 (link schemes), RL-01/RL-02 (SQLite only).

Wave 2 fixes add tests that live on branch `feat/1-0-wave-2-findings-fce8bb` only: CAT-01 Flight render, CAT-02 slot order, the A11Y-01 combobox key, and the RTL keyboard specs. They are not in this tree. Their browser parts (`components-076`, `variants-more`, `form-controls`, `overlays-search`) run only in the specimen config, so only in the red gate.

## Unverified

- **pnpm installed without a JavaScript entry (product, for audit 03).** CI started failing TST-09's test after `pnpm/action-setup` 6.1.1. That suggests 6.1.1 installs pnpm as a native executable (as `@pnpm/exe` and pnpm's standalone installer do), which `manager.ts` refuses. If so, users who installed pnpm that way, or through corepack on Windows, cannot add a component that has dependencies. To settle it: read the action-setup 6.1.1 changelog, then run `add button --yes` in a pnpm project with `@pnpm/exe` on PATH.
- **The Code Block and Toolbar failures in TST-03 may be real defects or CI-only flakes** (bundled Chromium, a loaded runner). To settle it: run `components-076.spec.ts:200` and `code-block-075.spec.ts:180` with bundled Chromium locally and on a fresh CI run.
- **Whether the 31 October gate evidence was reproducible on CI at the time.** Its run notes pnpm "came through corepack", while today the same corepack layout fails TST-09's test, so the manager-discovery code may have tightened since. This does not change any finding.

## Looked at and found sound

- **Result validators.** `validateTestResults` collects expected test identities independently with `vitest list`, so a report cannot shrink its own expectations. It rejects missing files, duplicate or unexpected names, skips, todos and retries. `validateBrowserResults` pins per-file counts (1,185) and rejects flaky, retried and skipped results. `aggregateFoundationEvidence` requires both groups on the same commit with every stage passing. A downloaded or hand-edited CI report cannot pass this aggregate.
- **No `.only`, no `.skip` in vitest, no Playwright retries anywhere** (`retries: 0` in all ten configs). The single `test.skip` (`editors-matrix.spec.ts:94`) is unconditional and documented, and its cap is pinned by `matrix.test.ts`. No `try/catch` swallows an assertion. The `.catch(() => …)` sites are teardown or polling.
- **Snapshots** (`glass-contrast.test.ts.snap`, `preview-styles.test.ts.snap`, `preset-gallery.html`, `export-before.json`) are committed. Vitest on CI (`CI=true`) fails on a missing snapshot instead of writing it.
- **Mocks.** None mocks the module under test. The `vi.mock` sites stub generated modules, `react-dom`, `node:readline` or `child_process` for the code that calls them.
- **Edition parity.** `allowedDifferences` is empty, so the 196 edition-parity cases compare every slot style with no exemptions.
- **The specimen audit's non-glass checks.** All seven checks, page errors and the specimen count are enforced for every family, and partial runs (`OMBELLE_AUDIT_COMPONENTS`, families, fonts) never write the evidence part.
- **The glass split in principle.** Exempting only rendered contrast that depends on the backdrop is defensible. TST-07 is about its breadth and the missing bound, not the idea.
- **Earlier findings.** None from 01, 02, 04 to 09 or the two fix records is repeated here. `docs/web-alpha-readiness.md`'s own gap list (manual AT review, cross-browser range) still holds and is not restated.
