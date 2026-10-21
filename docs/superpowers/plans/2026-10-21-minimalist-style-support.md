# Minimalist Style Family Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the minimalist family for Button, Dialog, and Input with deterministic artifacts, saved-preset installation, and measured parity/state coverage.

**Architecture:** Reuse the component templates and add a preset/slot stylesheet behind one implemented-family contract. Extend shared preview fixtures and the existing consumer gate, retaining all current cases and recording actual per-case outcomes rather than inferring success from preparation.

**Tech Stack:** TypeScript, React/ReactDOM 19.3.1, current Tailwind v4/Vite/Next.js pins, Node 24.19.0, pnpm 11.25.0, npm 11.19.0, Yarn 1.22.22/4.18.1, Bun 1.4.3, Vitest, Playwright Chromium, existing axe integration.

**Spec:** `docs/superpowers/specs/2026-10-21-minimalist-style-support.md` (written specification approved in chat).

## Global Constraints

- Keep the repository on pnpm and retain current toolchain/manager pins. No new runtime dependencies, public APIs, component implementations, or release publication.
- Catalog/compiler remain 0.1.0; preset schema remains 1.0. Preserve canonical artifact bytes for existing flat and neo-brutalism inputs.
- Copy all nineteen light/dark colors and exact design defaults from spec section 3. `minimalist` is implemented; `liquid-glass` remains unavailable despite schema acceptance.
- Default design: system-sans, radiusRem 0.375, comfortable density, borderWidthPx 1, zero shadow offsets, reduced motion/transparency; default Button variant/size remain default. Dialog default padding is 2rem.
- Use the `input` token for required control boundaries; `border` is decorative. Measure normal text at 4.5:1 and applicable enabled boundaries/focus at 3:1 against actual adjacent surfaces. Report exemptions and untested overrides accurately.
- Keep shared Button/Dialog/Input APIs, preset override semantics, manager ownership, binary Bun locks, Yarn PnP, script suppression, source transactions, and honest recovery.
- Retain nineteen consumers and add fifteen minimalist cases, for thirty-four prepared/build/audit rows. Browser coverage expands only for preview/npm/pnpm, not Yarn/Bun.
- Theme add merges tokens/defaults, preserves upstream components/configuration and manager locks, and repeats without changes. It does not restyle upstream shadcn source.
- Record local versus hosted evidence, exact runtime/browser versions, source revision, dirty-tree flag, failures/skips, and remaining manual review. Foundation support is not full alpha stability or accessibility certification.
- Native execution and a branch in the current folder are the user's preserved preferences. Review/approve this plan before implementation; integration is a later decision.

## Review Focus

1. Schema-admitted but unavailable families and lookalike routes must not fall through to another pack; pin availability and exact-route tests in Tasks 1–2.
2. Palette, compact-density, font, and design overrides must still flow through the compiler without changing existing-family bytes; pin override and baseline tests in Task 1.
3. A nominal token contrast calculation can conceal failed rendered hover/focus/dialog states or text that did not actually enlarge; pin rendered-surface and measured text-scaling tests in Task 4.
4. A larger matrix can collide ports, overwrite legacy IDs, mislabel family/runtime, or omit a successful build/audit; pin identity/port tests in Task 3 and completeness rejection in Task 5.
5. Theme-only use in an existing shadcn app, including custom dark selectors, must preserve source and manager locks and avoid dependencies; pin actual CLI and planner regressions in Task 3.

## File map and ordering

- Task 1 owns `packages/contracts/src/style-families.ts`, catalog preset/CSS/registration, canonical generation, and existing-family baselines.
- Task 2 owns preview selection, generated entry dispatch, reusable state fixtures, and consistent copying into consumers.
- Task 3 owns `scripts/consumer-matrix.ts`, manager-specific preparation, CLI/theme regressions, and thirty-four real consumer builds/audits.
- Task 4 owns browser state/contrast/reflow verification and scoped styling corrections required by those checks.
- Task 5 owns complete measured evidence, CI artifacts, documentation, and the final acceptance run.

Tasks are sequential. Tasks 2–5 consume Task 1's family contract; Tasks 3–4 consume Task 2's fixture writer; Task 5 consumes Task 3's descriptors and actual Task 4 measurements. Use explicit repository path `D:/Documents/GitHub/ombelle-ui`; the ambient starter-docs folder is not this checkout.

## Execution setup

After plan approval, create a feature branch from this clean documentation branch in the current folder, retaining the approved spec/plan commits. Read the selected execution/TDD/verification skills. Capture the existing-family baseline before product changes; use source commit `b44048f94ed0c6e0c3964e2c142800a3f460035a` as the production-code baseline.

Use the repository Node/pnpm setup. An available local Node 24.21.0 instead of the 24.19.0 pin must be identified in evidence. Local overrides already documented by the repository include `OMBELLE_BUN_EXECUTABLE`, `COREPACK_HOME`, and `OMBELLE_BROWSER_CHANNEL`; do not assume the previous day's paths or browser are still available. Prime Corepack outside the pnpm repository. Read-only hosted timing from the prior Bun PR was about five minutes; thirty-four builds plus state checks have headroom under the existing 25-minute job allowance, but this is an estimate to verify, not measured new support.

### Task 1: Register and compile the minimalist pack without changing old artifacts

**Files:** Create `packages/contracts/src/style-families.ts`, `packages/catalog/src/presets/minimalist.json`, `packages/catalog/src/styles/minimalist.css`, `packages/compiler/test/fixtures/style-baseline.json`, and `packages/compiler/test/minimalist.test.ts`. Modify `packages/contracts/src/types.ts`, `packages/contracts/src/index.ts`, `packages/catalog/src/index.ts`, `scripts/sync-catalog.mjs`, `packages/compiler/src/compile.ts`, `packages/compiler/test/compile.test.ts`, and `packages/catalog/test/catalog.test.ts`. Regenerate `packages/catalog/src/generated.ts` through the script only.

**Interfaces:** Produce `supportedStyleFamilies = ['flat', 'minimalist', 'neo-brutalism'] as const`, `StyleFamily = typeof supportedStyleFamilies[number]`, and `isStyleFamily(value: unknown): value is StyleFamily`. The new module has no runtime imports, so Node's native TypeScript support can load it from sync-catalog.mjs. Re-export through contracts without a duplicate StyleFamily declaration. Existing `getCatalog(release: string): Catalog`, `resolvePreset`, and `compile` signatures remain unchanged.

- [ ] **Step 1: Capture baseline and write failing contract/compiler tests.** Before changing product code, run the current compiler for each existing built-in preset with all three IDs. Save the source revision, resolved preset hash, and ordered `{logicalPath, sha256}` artifact arrays in style-baseline.json; generate hashes from actual baseline output, never by hand. Write named tests `registers the exact implemented families`, `compiles minimalist deterministically`, `preserves legacy artifact hashes`, and `preserves minimalist overrides`. Assert:

```ts
expect(supportedStyleFamilies).toEqual(['flat', 'minimalist', 'neo-brutalism'])
expect(isStyleFamily('minimalist')).toBe(true)
for (const name of ['liquid-glass','constructor','__proto__']) expect(isStyleFamily(name)).toBe(false)
expect(getCatalog('0.1.0').presets.minimalist).toMatchObject({id:'builtin-minimalist', revision:1, styleFamily:'minimalist', design:{radiusRem:0.375,borderWidthPx:1}})
expect(secondCompile).toEqual(firstCompile) // reorder/duplicate component requests
expect(actualLegacyHashes).toEqual(savedBaselineHashes)
expect(overridden.theme.light['--control-height']).toBe('2.25rem')
expect(overridden.theme.light['--font-family']).toBe('monospace')
expect(overridden.theme.light['--primary']).toBe('#2563eb')
expect(overridden.theme.light['--motion-duration']).toBe('150ms') // motion: full
```

Also assert all nineteen token defaults match the spec in both modes, every stylesheet variable is supplied, CSS uses the required input/focus/invalid slots, and liquid-glass still yields INVALID_DATA at /styleFamily. Change the old compiler negative case from minimalist to liquid-glass when implementing availability, not before observing the new positive test fail.
- [ ] **Step 2: Observe RED.** Run `pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/minimalist.test.ts`; expect missing family export/pack or an unavailable-style failure. Save the output before implementation.
- [ ] **Step 3: Implement the pack and authoritative family contract.** Use the exact palette/defaults from spec section 3, existing tokens and slots, all six Button variants/four sizes, visible hover/pressed/invalid/focus states, opaque Dialog, and reduced-motion/forced-colors rules. Keep the component templates untouched. Use the family list in generation/catalog and the StyleFamily type in compiler dispatch; reject unavailable styles explicitly rather than using an unsafe cast/fallback. Preserve existing style files and formatting inputs.
- [ ] **Step 4: Verify GREEN.** Run `pnpm build:packages`, then `pnpm exec vitest run packages/catalog packages/compiler packages/contracts`. All pass, including unchanged saved legacy hashes, override behavior, and unavailable-style diagnostics. No contrast-success claim is made from CSS source assertions.
- [ ] **Step 5: Commit.** Stage only Task 1 files and commit `feat: add the minimalist style pack and family contract`.

### Task 2: Generate the explicit preview route and reusable state fixture

**Files:** Create `fixtures/shared/state-fixture.tsx`, `fixtures/shared/state-fixture.css`, `tests/helpers/scenario-fixture.ts`, `tests/integration/preview-routing.test.ts`, and `tests/integration/scenario-fixture.test.ts`. Modify `fixtures/shared/scenario.tsx`, `scripts/generate-preview.ts`, `apps/preview/src/scenarios.tsx`, `apps/preview/src/main.tsx`, `scripts/prepare-consumers.ts`, `tests/helpers/yarn-project.ts`, and `tests/helpers/bun-project.ts`. Do not commit ignored generated preview files.

**Interfaces:** Change `selectFamily(pathname: string): StyleFamily | null`; `/` keeps the current neo-brutalism landing behavior, exact family paths accept an optional trailing slash, unknown paths return null. Produce `writeScenarioFixture(root: string, family: StyleFamily): Promise<void>`, writing src/index.css, src/scenario.tsx, and both state-fixture assets from the shared sources. Extend `createYarnProject(id: YarnFixtureId, family: StyleFamily = 'flat')`, `prepareBunTemplate(framework, format, family: StyleFamily = 'flat')`, and `createBunProject(framework, format, family: StyleFamily = 'flat')`; retain existing return types and default behavior.

- [ ] **Step 1: Write failing routing/fixture tests.** Name tests `selects exact implemented preview routes` and `copies state fixtures without changing the default specimen`. Assert:

```ts
expect(selectFamily('/minimalist/')).toBe('minimalist')
expect(selectFamily('/minimalist')).toBe('minimalist')
expect(selectFamily('/')).toBe('neo-brutalism')
for (const p of ['/minimalist-extra/','/x/minimalist/','/liquid-glass/']) expect(selectFamily(p)).toBeNull()
expect(copiedScenario).toContain('minimalist')
expect(copiedStateFixture).toContain('@/components/ui/button')
```

Test the helper in an owned temporary root: all referenced fixture assets exist, only STYLE_FAMILY is substituted for consumers, and preview alias transformations match the existing documented rule. Assert that state controls are behind `?states=1`, leaving the default specimen DOM unchanged.
- [ ] **Step 2: Observe RED.** Run `pnpm exec vitest run tests/integration/preview-routing.test.ts tests/integration/scenario-fixture.test.ts`; expect the old fallback or missing helper/assets.
- [ ] **Step 3: Implement explicit dispatch and fixture copying.** Use an exhaustive entry map for the three generated preview entries, with a visible unknown-route diagnostic and no family fallback. Generate every supported family from Task 1's list. In the shared scenario, preserve the existing specimen and expose the extra state section only with states=1. StateFixture imports the installed local components and has stable test IDs for all Button variants/sizes; empty, filled, invalid-with-associated-error, and disabled Input; and Dialog with long content. Its CSS is scoped to the state section and imported by the shared wrapper. Copy the same assets into preview (with alias rewrites) and all existing consumer preparation paths, so intermediate Yarn/Bun builds cannot import a missing file. Avoid global fixture changes that alter old desktop screenshots.
- [ ] **Step 4: Verify GREEN.** Run `pnpm build:packages`, `pnpm generate:preview`, the two focused tests, `pnpm typecheck`, and `pnpm build:preview`. Verify that the generated minimalist manifest contains the same canonical hashes as direct compilation and the state fixture uses those generated component files.
- [ ] **Step 5: Commit.** Commit `feat: add minimalist preview routing and shared state fixtures`.

### Task 3: Exercise the fifteen minimalist consumers and existing-shadcn CLI safety

**Files:** Create `scripts/consumer-matrix.ts`, `scripts/prepare-node-consumer.ts`, `tests/integration/consumer-matrix.test.ts`, and `tests/integration/minimalist-cli.test.ts`. Modify `scripts/prepare-consumers.ts`, `scripts/prepare-bun-consumers.ts`, `scripts/build-consumers.ts`, and the fixture helpers from Task 2 where needed. Keep extraction limited to preparation code touched by the matrix expansion.

**Interfaces:** Export `ConsumerCase = { id: string; family: StyleFamily; framework: 'vite'|'next'; manager: 'npm'|'pnpm'|'yarn'|'bun'; cliRuntime: 'node'|'bun'; yarnFixtureId?: YarnFixtureId; bunFormat?: 'text'|'binary' }`, `consumerCases(): readonly ConsumerCase[]`, and `assignConsumerPorts(cases: readonly ConsumerCase[], start?: number): Record<string, number>` (default start 4174). Validate manager-specific required fields before creating fixtures. Export `ArtifactProof = {path:string; logicalPath:string; sha256:string}` and `prepareNodeConsumer(spec: ConsumerCase): Promise<{root:string; version:string; linker?:string; cliRuntime:RuntimeIdentity; artifacts:ArtifactProof[]; audit:{code:number;output:string;scope:'production'}}>`, rejecting Bun descriptors. Extend `prepareBunConsumer(framework, format, runtime, family: StyleFamily = 'flat')`, retaining its existing return shape.

- [ ] **Step 1: Write failing matrix and CLI regressions.** `retains nineteen IDs and adds fifteen minimalist cases` asserts length 34, exactly 15 minimalist rows matching the spec table, unchanged legacy IDs, unique IDs, and the expected manager/framework/runtime/lock/linker combinations. Keep legacy npm/pnpm names; append `-minimalist` to the legacy Yarn/Bun ID for new rows. `allocates unique ports across all manager groups` asserts 34 unique ports, none 4173. Write parameterized real built-CLI tests for each manager: theme add on an existing shadcn fixture without Ombelle initialization, same theme repeated, dry-run with no tree changes, then Button and fresh-process Input using the saved preset. Save CSS/imports, components.json, an unrelated component, package.json, and raw manager lock bytes; compare preservation where no dependency work is planned. Pin these assertions:

```ts
expect(theme.data.dependencyPlan).toEqual([])
expect(repeat.data.changes.every(c => c.action === 'noop')).toBe(true)
expect(afterThemeManagerLock).toEqual(beforeThemeManagerLock)
expect(later.data.presetHash).toBe(theme.data.presetHash)
expect(editedSourceResult.code).toBe(4)
expect(afterConflictTree).toEqual(beforeConflictTree)
```

Add a planner regression for `.theme-dark` selector merging, preserving unrelated declarations and repeating without duplicates. Reuse existing transaction/failure tests rather than adding new installer behavior. For theme/no-op paths, also assert no dependency port invocation at planner/apply level; retain the native Bun-unavailable CLI case.
- [ ] **Step 2: Observe RED.** Rebuild packages, then run `pnpm exec vitest run tests/integration/consumer-matrix.test.ts tests/integration/minimalist-cli.test.ts`. Expect absent descriptors/ports or failed minimalist preset/fixture assertions. Do not treat environment/tool setup failures as the required feature failure.
- [ ] **Step 3: Implement descriptor-driven preparation.** Use supported families for npm/pnpm's Vite/Next.js cases; retain flat and add minimalist for each existing Yarn layout and all eight Bun combinations. Use one port allocation across all groups; remove the separate npm counter. Extract the existing Node-manager preparation body into prepare-node-consumer.ts, retaining frozen/script-free setup, explicit Yarn entries, exact dependencies, source proof, and correct audit behavior. Measure each manager version through the actual selected executable/entry and require its existing pin; return that observed version. Pass family through every preset path, scenario, canonical reference, and proof. Use shell-free built-CLI execution and per-child environment arguments rather than leaking Yarn overrides across cases. Owned temporary markers/cleanup remain mandatory. Do not regenerate dependency locks for a stylesheet-only change.
- [ ] **Step 4: Verify GREEN with real outcomes.** Run the focused tests, then `pnpm generate:preview`, `pnpm prepare:consumers`, and `pnpm build:consumers`. Expect 34 unique prepared rows and 34 successful production builds/audits, including 15 actual minimalist rows with native runtime identities, exclusive owned locks, physical exact dependencies, preset reuse, and canonical source hashes. Build Yarn PnP through Yarn and Bun-managed framework apps under verified Node. Audits run after component additions; use the existing production audit policy for npm/pnpm/Yarn and whole-graph Bun policy. Read every failure before changing code.
- [ ] **Step 5: Commit.** Commit `test: verify minimalist installation across all package managers`.

### Task 4: Prove rendered states, contrast, motion, and reflow

**Files:** Create `tests/helpers/contrast.ts`, `tests/helpers/text-enlargement.ts`, `tests/integration/contrast.test.ts`, and `tests/e2e/minimalist-states.spec.ts`. Modify `tests/e2e/parity.spec.ts`, `tests/e2e/keyboard.spec.ts`, `playwright.config.ts`, and the minimalist/state fixture CSS only where failing rendered tests require it. Keep the legacy artifact baselines unchanged.

**Interfaces:** Export `contrastRatio(foreground: readonly [number,number,number], background: readonly [number,number,number]): number` for opaque 0–255 sRGB samples, rejecting unsupported input. Export `enlargeFixtureText(page: Page, factor: number): Promise<{selector:string; before:number; after:number}[]>`; this is a deliberately labeled test-side text-enlargement simulation, not native browser zoom. Browser tests read/composite actual rendered colors before invoking the opaque-pair helper; forced-colors checks use system-color behavior rather than default-palette ratios.

- [ ] **Step 1: Write failing browser and measurement tests.** Name unit tests `computes opaque contrast accurately` and `rejects invalid contrast samples`; assert black/white contrast 21, identical colors 1, symmetry, and invalid samples rejected. Add the third family to existing preview/npm/pnpm parity and keyboard loops, retaining old cases. New state tests cover both modes on preview and the four minimalist npm/pnpm consumers. Name the parameterized test `$app $mode minimalist rendered states and resizing`. Assert every variant and size, native disabled suppression, associated invalid Input error, initial/trapped/returned Dialog focus, hover/pressed feedback, no hit-target translation, visible un-clipped focus, and opaque popup surfaces. Compare screenshots, DOM, computed styles, and canonical hashes across apps, including at least the open Dialog and invalid Input states. Pin these assertions:

```ts
expect(contrastRatio([0,0,0],[255,255,255])).toBe(21)
expect(contrastRatio([128,128,128],[128,128,128])).toBe(1)
expect(await page.getByTestId('invalid-input').getAttribute('aria-describedby')).toBe('invalid-input-error')
expect(measuredInputBorderContrast).toBeGreaterThanOrEqual(3)
expect(textSamples.every(s => Math.abs(s.after / s.before - 2) < 0.02)).toBe(true)
```
- [ ] **Step 2: Observe RED.** With Task 3 apps built, run `pnpm exec playwright test tests/e2e/minimalist-states.spec.ts`. Expect at least the new missing measurement helper or a concrete required state/layout assertion to fail before the corresponding implementation. A new assertion that already passes verifies existing behavior but is not a claimed red/green fix. Run contrast unit tests and record their initial missing-helper failure.
- [ ] **Step 3: Implement measurement and focused style fixes.** Normalize each channel by 255. Contrast uses linearized sRGB (channel <=0.04045: channel/12.92; otherwise ((channel+0.055)/1.055)^2.4), luminance weights 0.2126/0.7152/0.0722, and (lighter+0.05)/(darker+0.05); measure primary, secondary, destructive, muted/error text, input borders, and focus against actual adjacent page/card/popover surfaces, including rendered hover/active states. Require 4.5 or 3 as appropriate without rounding a failing value upward. Exercise reducedMotion reduce/no-preference and forcedColors active/none using fresh contexts or reset emulation. Include a motion positive control: apply the compiler-verified full-motion token of 150ms, observe a nonzero transition with no-preference, then require suppression under reduce. The default reduced preset alone cannot prove preference handling. Check system-color focus and enabled boundaries, not just the presence of an @media rule.

For 200 percent text enlargement, first snapshot computed font sizes for visible fixture text and text-bearing controls, then apply exactly twice those sizes with non-clipping line heights. Assert measured enlargement for labels, Button text, Input text, and Dialog text before judging layout. For the Dialog scenario, open its portal before collecting sizes in a fresh page; do not double-apply scaling to the same elements. Never substitute deviceScaleFactor, a narrower viewport, or CSS root size alone. Test at 320 CSS pixels and separately at desktop width; operate the Dialog, keep close/actions reachable, and reject clipped/obscured essential text or page-wide horizontal overflow. A scrollable long Dialog must remain usable. Record this as synthetic text enlargement plus reflow coverage; native browser text-zoom and human review remain explicitly pending. This method refines the spec's representative text-resizing check without claiming complete WCAG verification. Scope responsive fixture corrections to this state mode so old default screenshots remain comparable.
- [ ] **Step 4: Verify GREEN.** Run `pnpm exec vitest run tests/integration/contrast.test.ts`, `pnpm generate:preview`, `pnpm prepare:consumers`, `pnpm build:consumers`, and `pnpm test:e2e`. All old/new checks pass; saved legacy artifact hashes still match. Save actual per-case/per-mode contrast ratios, text-size measurements, and emulation settings to `.artifacts/minimalist-measurements.json`; attach state screenshots through Playwright test.info. Inspect light/dark minimalist screenshots beside flat with the image viewer; label that review agent-operated. Record exact browser version and any default-token correction.
- [ ] **Step 5: Commit.** Commit `test: cover minimalist states contrast and accessible layouts`.

### Task 5: Integrate complete evidence and run the acceptance gate

**Files:** Create `scripts/consumer-evidence.ts`, `tests/integration/consumer-evidence.test.ts`, `docs/evidence/minimalist-style-support.md`, and retained `docs/evidence/minimalist-style-run.json` after success. Modify `scripts/prepare-consumers.ts`, `scripts/build-consumers.ts`, `scripts/check-foundation.mjs`, `.github/workflows/foundation.yml`, `README.md`, and `docs/03-components-styles-accessibility.md` as needed for precise support labels.

**Interfaces:** `ConsumerEvidence = {family:StyleFamily; manager:PackageManager; managerVersion:string; cliRuntime:RuntimeIdentity; buildRuntime:RuntimeIdentity; sourceHashes:Record<string,string>; audit:{exitCode:number;scope:'production'|'all'}; build:{exitCode:number}}`; export `finalizeConsumerEvidence(cases: readonly ConsumerCase[], measured: Record<string,ConsumerEvidence>): Record<string,ConsumerEvidence>`. Validate identities against the descriptors, observed pinned manager versions, actual nonempty hashes, Node framework-build runtime, successful measured audits/builds, and the exact expected row set. Preparation writes pending records separately; the finalizer cannot invent build success. Persist `.artifacts/consumer-matrix.json`, retain existing manager reports, and include the finalized consumer matrix and actual minimalist measurements in foundation-report.json.

- [ ] **Step 1: Write failing evidence tests.** `rejects incomplete or mislabeled consumer evidence` exercises a missing row, duplicate descriptor ID, extra row, absent runtime/hash, wrong minimalist family, wrong Bun CLI runtime, failed audit, pending/missing build, and non-Node build runtime. Assert the valid result contains 34 rows and exactly 15 minimalist rows; fixture success values in this unit test are structural test data, never retained as a real run report.

```ts
expect(Object.keys(finalizeConsumerEvidence(cases, valid))).toHaveLength(34)
expect(Object.values(finalizeConsumerEvidence(cases, valid)).filter(r => r.family === 'minimalist')).toHaveLength(15)
expect(() => finalizeConsumerEvidence(cases, missingRow)).toThrow()
expect(() => finalizeConsumerEvidence(cases, wrongRuntime)).toThrow()
expect(() => finalizeConsumerEvidence(cases, pendingBuild)).toThrow()
```
- [ ] **Step 2: Observe RED.** Run `pnpm exec vitest run tests/integration/consumer-evidence.test.ts`; expect the missing validator or acceptance of a forbidden incomplete outcome.
- [ ] **Step 3: Integrate measured reporting and CI.** Wire actual preparation/audit/build/runtime values into the finalizer after all 34 builds. Add matrix/state/contrast/text-enlargement artifacts to CI uploads and keep existing evidence. Preserve the existing 25-minute budget initially; measure runtime before changing it, and never drop rows or skip tests to obtain green. README documents the minimalist route, current pins, exact tested scope, and the state preview. Support docs distinguish three foundation-supported components from the twelve-component alpha matrix and keep pending human/browser/screen-reader checks visible.
- [ ] **Step 4: Verify the complete tree.** Run the evidence test, then `pnpm check:foundation` with the required native tools and chosen installed browser. Expect all nine stages green, all 34 consumer audit/build outcomes present, 15 minimalist rows, all three families in browser parity/keyboard coverage, and successful state/contrast/reflow assertions. Inspect reports for failures, skips, mislabeled rows, missing source proof, or synthetic measurements presented as native zoom. Record actual test counts rather than forecasting them. Run `git diff --check`.
- [ ] **Step 5: Retain honest results and commit.** After success, write the evidence Markdown and sanitized machine report, preserving source revision, dirty-tree flag, platform/runtime/browser versions, statuses/counts, scope, hashes, and relative log locations; remove temporary absolute paths. Include keyboard review steps, agent/human attribution, default-token adjustments, and pending native text-zoom/NVDA/VoiceOver/broader-browser work. Commit `ci: retain minimalist support verification evidence`. Do not claim hosted success until an authorized push and observed final hosted run.
- [ ] **Step 6: Final review and integration handoff.** Use the selected execution skill's required whole-branch review, including the five Review Focus risks and baseline/spec paths. Resolve important findings with observed regression tests and required full verification. Present integration choices through finishing-a-development-branch; this plan approval does not authorize push, PR, merge, or publication.

## Plan self-review and execution handoff

Coverage: M01–M02 map to Task 1; M03 to Tasks 2/4; M04–M07 to Task 3; M08 to Tasks 2/4; M09 to Task 5. Every Review Focus item has an explicit owning regression. Old catalog/style bytes, legacy consumer identities, existing manager/runtime behavior, and default specimen behavior have preservation checks.

The shared interfaces above are the task boundaries: family contract → scenario copying → consumer descriptors/preparation → rendered measurements → validated measured report. Synthetic text enlargement is explicitly separated from native browser zoom and manual certification. The 25-minute CI allowance is a starting constraint, not a claimed performance result.

Native execution is the user's previously selected method: implement inline, then one fresh whole-branch reviewer. The user must review this written plan before that execution begins.

## Verification references checked during planning

- [Playwright emulation source](https://github.com/microsoft/playwright/blob/main/docs/src/emulation.md): forced-colors and reduced-motion emulation. Keep actual results bound to the project's installed version.
- [W3C Contrast (Minimum) understanding](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): contrast thresholds, non-rounding, and relative luminance definitions.
- [W3C Resize Text understanding](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html): enlarged text and controls must remain usable; the fixture simulation is not a full conformance claim.
