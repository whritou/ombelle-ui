# Local Button Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install a local Button recipe with its own pinned appearance while preserving project defaults, existing components, and source ownership.

**Architecture:** Add recipe contracts and a pure scoped compiler, then a dedicated planner that reuses the existing transaction and manager adapters. Generate a separate native `RecipeButton` and colocated CSS; keep recipe provenance separate from global preset state. Extend existing preview/consumer fixtures to exercise actual generated output.

**Tech Stack:** Existing TypeScript/React TSX, JSON Schema/Ajv, Vitest, Playwright/axe, Tailwind v4, pnpm repository tooling; direct compiler CSS parser dependencies pinned to existing lockfile versions.

**Spec:** [Approved design](../specs/2026-10-21-local-button-recipes-design.md). Read it before executing this plan.

## Global Constraints

- Local JSON only; `add --recipe <local-json-path>` requires an initialized standalone project. No remote snapshots, preset bundles, editor UI, portals, or component `--preset` implementation.
- Three families: flat, minimalist, neo-brutalism; built-in revision 1; catalog/compiler 0.1.0; exact built-in identities must match.
- Require a regular UTF-8 JSON file and a 64 KiB actual-byte limit; reject unsafe integer revisions and non-finite values. Source paths resolve relative to the invoking directory.
- Recipe props/content become component defaults. Native effective disabled is `disabled || loading`; loading exposes busy state and retains visible text. Exclude `asChild` from this recipe API.
- Scope on the actual native button using `data-slot="recipe-button"` plus full SHA-256 `data-ombelle-recipe`; materialize complete light/dark values locally. Preserve ordinary compiler bytes and interfaces.
- Support only a validated single ASCII dark class (`.dark`, `.night`, `.theme-dark` are valid). Reject complex selectors and explicitly configured `paths.recipeOutput` in this slice.
- Preserve global preset/config/CSS/style bytes, ordinary source, top-level preset provenance, managed declarations, and earlier recipe records. Additive lock version 1 `recipes` field; absent means none.
- Use existing native subprocess manager adapters, path containment, operation lock, source hashes, metadata preconditions, and recovery records; `--yes` cannot bypass conflicts.
- Repository pins: Node 24.19.0 and pnpm 11.25.0; verified Node 24 versions at or above 24.19.0 may run locally under existing checks. Consumers retain npm 11.19.0, Yarn 1.22.22/4.18.1, Bun 1.4.3, React/ReactDOM 19.3.1. No unrelated upgrades.
- Browser evidence is preview plus npm/pnpm; Yarn/Bun receive source/install/audit/build coverage. Framework builds use Node. Preserve declared manual review limits.

## Review Focus

1. A legitimate utility edited locally must conflict instead of being adopted or overwritten (Task 4).
2. Theme/add operations after recipe install must preserve recipe provenance and files, including legacy locks (Task 4).
3. Ordinary size rules must not defeat saved minimum height, and icon-size text must remain visible under enlargement (Tasks 2, 3, 7).
4. Changed dark-selector context and changed content under one immutable ID/revision must conflict even when ordinary project state is otherwise valid (Tasks 4, 5).
5. Coexisting recipe revisions, case-only ID differences, escaped text, and caller-supplied scope attributes must not collide, execute code, or defeat isolation (Tasks 3, 4, 7).

## File and interface map

| Unit | Files and responsibility |
| --- | --- |
| Contracts | New `packages/contracts/src/recipe.ts`, generated `recipe-schema.ts`, and `recipe.test.ts`; extend types/exports; schema remains authoritative |
| Catalog resolution | New `packages/catalog/src/recipe-preset.ts` and test; exact built-in lookup, exported via index |
| Scoped compiler | New `packages/compiler/src/recipe.ts`, `recipe-styles.ts`, `recipe-source.ts` and matching tests; export via index; direct parser pins in package/lock |
| Lock validation | New `packages/cli/src/project/recipes.ts`; inspect validates stored recipes; ordinary planners preserve records |
| Recipe planner | New `packages/cli/src/plan/recipe.ts`, `project/recipe-transform.ts`, and planner tests; existing apply engine stays shared |
| CLI input/output | New `packages/cli/src/recipe-file.ts`; update main/format; subprocess and recovery regressions |
| Fixture integration | New shared recipe fixtures/helpers; extend generation, consumer preparation, evidence validation, browser checks |
| Evidence/docs | Update foundation gate/report/archive and current usage/status docs only after implementation and measured verification |

## Shared data contracts

Define these names in Task 1; subsequent tasks consume them without inventing alternate shapes:

```ts
type Recipe = FromSchema<typeof recipeSchema>
type NormalizedRecipe = Omit<Recipe, 'props'> & {
  props: Required<Recipe['props']>
}
type RecipeCompileResult = {
  artifacts: Artifact[]
  dependencies: Dependency[]
  recipe: { data: NormalizedRecipe; hash: string }
  preset: ResolvedPreset
  scope: string
  darkSelector: string
  provenance: { catalogRelease: string; compilerVersion: string }
}
type InstalledRecipe = Omit<RecipeCompileResult, 'dependencies' | 'artifacts'> & {
  artifacts: Record<string, InstalledArtifact>
}
// ProjectLock: recipes?: Record<string, InstalledRecipe>, key `${id}@${revision}`
// InstallPlan: recipe?: Omit<InstalledRecipe, 'artifacts'> & {
//   importPath: string; examplePath: string
// }
```

`InstallPlan.preset` and `provenance` continue describing global project state. Optional `recipe` describes only this scoped operation. Normal artifact records continue owning all written files, including the shared utility. Scoped records list only their component/CSS/example artifacts; shared utility ownership stays in the ordinary map. Preserve snapshots by deep clone when planning.

### Task 1: Validate recipes and resolve exact built-ins

**Files:** Create contract/catalog units from the map; modify `scripts/sync-schema.mjs`, `packages/contracts/src/types.ts`, `packages/contracts/src/index.ts`, and `packages/catalog/src/index.ts`. Test `packages/contracts/test/recipe.test.ts`, `packages/catalog/test/recipe-preset.test.ts`.

**Interfaces:** `validateRecipe(input: unknown): Recipe`; `resolveRecipePreset(ref: Recipe['presetRef']): Preset`; shared types above. Export from their package roots. The catalog lookup uses `getCatalog` and compares all reference fields.

- [ ] Write failing tests `validates_and_clones_recipe`, `rejects_unsafe_recipe_fields`, `resolves_only_exact_builtin_reference`: validate the committed example, mutations for unknown fields/URL IDs/invalid enums/out-of-bounds and non-finite values/unsafe revisions/content length 201; assert clone independence; match all three exact built-ins and reject unknown ID or revision. Unsupported releases retain `UNSUPPORTED_RELEASE`; missing ID/revision uses `RESOLUTION_FAILURE`.
  Assertion anchors: `expect(validateRecipe(example)).toEqual(example)`; `expect(validateRecipe(example)).not.toBe(example)`; `expect(() => validateRecipe({ ...example, content: 'x'.repeat(201) })).toThrow()`; `expect(() => resolveRecipePreset({ ...example.presetRef, revision: 2 })).toThrow()`.
- [ ] Run `pnpm exec vitest run packages/contracts/test/recipe.test.ts packages/catalog/test/recipe-preset.test.ts`; observe missing exports/failed assertions.
- [ ] Extend schema synchronization without changing preset output; add runtime validation and types, exact catalog resolution, and additive optional recipe state types. Keep schema validation plus semantic integer checks; do not mutate caller input.
- [ ] Run the two tests and `pnpm build:packages`; require passing tests and successful standalone package builds.
- [ ] Commit affected files with `feat: validate local Button recipe contracts`.

### Task 2: Compile isolated Button styles

**Files:** Create `packages/compiler/src/recipe-styles.ts`, `packages/compiler/test/recipe-styles.test.ts`; modify `packages/compiler/package.json`, `pnpm-lock.yaml` only for exact direct parser dependencies.

**Interfaces:** `validateRecipeDarkSelector(value: string): string`; `compileRecipeStyles(input: { familyCss: string; preset: ResolvedPreset; overrides: Recipe['overrides']; scope: string; darkSelector: string }): string`. It returns raw CSS for Task 3's common formatting/hash stage.

- [ ] Write failing tests `isolates_every_selector_and_token`, `preserves_button_media_and_order`, `override_height_wins_over_large_size`, `rejects_unsupported_selector_constructs`. Assert no root/theme blocks, no ordinary Button/Input/Dialog matches, complete light/dark local variables, same-element and ancestor dark class support, preserved reduced-motion/forced-colors rules, applicable shadow offsets, and min-height override after size rules. Parse resulting CSS to check selectors structurally.
  Assertion anchors: `expect(css).not.toContain(':root')`; `expect(css).not.toContain('@theme')`; `expect(validateRecipeDarkSelector('.theme-dark')).toBe('.theme-dark')`; `expect(() => validateRecipeDarkSelector('.dark, body')).toThrow()`; assert every retained rule has both required attributes in its parsed selector.
- [ ] Run `pnpm exec vitest run packages/compiler/test/recipe-styles.test.ts`; observe failure before implementation.
- [ ] Declare `postcss` 8.5.31 and `postcss-selector-parser` 7.1.6 directly; inspect existing lock metadata and follow applicable dependency audit instructions before installing with scripts disabled. Update only their compiler importer/direct dependency requirements. Implement AST filtering/transformation of reviewed selectors: map Button-specific selectors and generic `[data-slot]` motion branches to the scoped native recipe element, discard unrelated slots, fail closed on unsupported patterns. Validate dark class using `^\.[A-Za-z_][A-Za-z0-9_-]*$` before CSS construction.
- [ ] Run the stylesheet tests, `pnpm typecheck`, and `pnpm exec esbuild packages/compiler/src/recipe-styles.ts --bundle --platform=browser --format=esm --outfile=.artifacts/recipe-styles-browser.js`; require passing checks and a browser bundle with no Node builtin requirement. Do not silently add Node polyfills or turn the shared compiler into a Node-only service. Add recipe-only wrapping/growth/box sizing as needed for text and icon-size footprint; ordinary styles stay untouched.
- [ ] Commit with `feat: compile isolated Button recipe styles`.

### Task 3: Compile deterministic recipe source and artifacts

**Files:** Create `packages/compiler/src/recipe.ts`, `recipe-source.ts`, `packages/compiler/test/recipe.test.ts`; modify compiler index. Consume Tasks 1–2. Do not alter ordinary Button template bytes.

**Interfaces:** `compileRecipe(input: { recipe: unknown; darkSelector?: string }): Promise<RecipeCompileResult>` (default `.dark`); `renderRecipeButton(input: { template: string; recipe: NormalizedRecipe; scope: string }): string`. Resolve from the catalog, derive reviewed source, format with existing pinned plugins.

- [ ] Write failing tests `normalizes_defaults_and_stable_identity`, `pins_recipe_source_and_style_artifacts`, `escapes_content_and_preserves_native_loading`, and `ordinary_compile_baselines_are_unchanged`. Assert exact logical paths `recipes/ID/rREVISION/button.tsx`, `recipes/ID/rREVISION/button.css`, `examples/recipes/ID/rREVISION.tsx`, and `lib/utils.ts`; canonical content hashes; no global theme artifacts; key-order/default equivalence; class-context changes CSS but not portable recipe hash/scope.
  Assertion anchors: `expect(explicit.recipe.hash).toBe(omitted.recipe.hash)`; `expect(night.scope).toBe(dark.scope)`; `expect(night.artifacts.find(a => a.kind === 'style')?.sha256).not.toBe(dark.artifacts.find(a => a.kind === 'style')?.sha256)`; `expect(result.artifacts.some(a => a.logicalPath === 'styles/ui-tokens.css')).toBe(false)`.
- [ ] Run `pnpm exec vitest run packages/compiler/test/recipe.test.ts`; observe missing compiler/failed assertions.
- [ ] Normalize props from the resolved preset and native defaults. Compute recipe hash from canonical normalized data; scope is SHA-256 of canonical `{ recipeHash, presetHash, catalogRelease, compilerVersion }`. Generate `RecipeButton`, native defaults/content, colocated `./button.css` import, safe string expressions, own fixed scope markers, and `disabled || loading`/busy attributes after caller spread. Omit `asChild` from the type and discard it if supplied at runtime. Materialize recipe styles via Task 2, then format/sort/hash artifacts. Include native button growth and `type="button"` safety; consumers may override supported props/children.
- [ ] Run `pnpm exec vitest run packages/compiler` and `pnpm build:packages`; require unchanged ordinary style baseline hashes, successful compilation of hostile-looking text as literal content, and correct recipe imports. Browser behavior is proved in Task 7, not claimed by source-string checks.
- [ ] Commit with `feat: generate deterministic local Button recipes`.

### Task 4: Plan recipe installation and preserve provenance

**Files:** Create `packages/cli/src/project/recipes.ts`, `project/recipe-transform.ts`, `plan/recipe.ts`, `packages/cli/test/recipe-plan.test.ts`, `recipe-lock.test.ts`; modify inspect and `plan/components.ts` preservation. Extend transaction tests for recipe plans.

**Interfaces:** `validateInstalledRecipes(root: string, value: unknown, artifacts: ProjectLock['artifacts']): Promise<Record<string, InstalledRecipe>>`; `transformRecipeArtifact(context: ProjectContext, artifact: Artifact): { path: string; content: string }`; `planRecipe(context: ProjectContext, result: RecipeCompileResult): Promise<InstallPlan>`.

- [ ] Write failing tests `recipe_plan_preserves_global_bytes`, `repeat_is_noop_and_revision_is_immutable`, `later_add_and_theme_retain_recipes`, `edited_utility_conflicts`, `recipe_destinations_cannot_collide`, `stale_plan_and_failure_restore_recipe_state`. Use initialized project helpers; test unchanged presets/config/global CSS/style/ordinary source, higher revisions coexisting, missing owned artifact recreation, untracked/edited destinations (even identical untracked bytes), legacy locks, locally edited utility, changed dark class, case-only IDs, unsafe/reserved/custom roots, symlink escapes, operation lock, injected mid-write and dependency failures.
  Assertion anchors: `expect(repeat.changes.every(c => c.action === 'noop')).toBe(true)`; `expect(afterLock.recipes).toEqual(beforeLock.recipes)` after ordinary add/theme; `expect(conflict.changes.some(c => c.action === 'conflict')).toBe(true)` for edited utility; `expect(await readFile(presetPath)).toEqual(originalPresetBytes)` after recipe application.
- [ ] Run `pnpm exec vitest run packages/cli/test/recipe-plan.test.ts packages/cli/test/recipe-lock.test.ts`; verify regressions fail against current planning.
- [ ] Implement deterministic nested mapping and exact UI/utils alias replacement. Reject explicit `paths.recipeOutput`, duplicate state/artifact paths, incompatible utility/source ownership, or changed same-ID/revision normalized data. Validate stored recipe shape, identity key, normalized hashes/scope, releases, dark class, safe paths, and consistency with ordinary ownership records before trust. Build `InstallPlan` with global preset/provenance plus separate recipe metadata; write only recipe files, missing utility, and updated lock. Copy existing lock fields/records deeply; ordinary `baseLock` must retain the additive recipe map. Preserve snapshots through theme changes; do not call global `appendState` for recipes. Use manager dependency semantics already implemented, including Bun production-group rejection.
- [ ] Run targeted planner/lock/transaction/theme tests and `pnpm typecheck`; require exact preservation assertions and source rollback evidence. Test changed global themes only through existing compatible merge behavior; dark-selector changes require migration.
- [ ] Commit with `feat: plan safe recipe installs with persistent provenance`.

### Task 5: Expose local recipe CLI and clear output

**Files:** Create `packages/cli/src/recipe-file.ts`, `packages/cli/test/recipe-file.test.ts`, `tests/integration/recipe-cli.test.ts`, `recipe-recovery.test.ts`; modify main/format and `packages/cli/test/plan.test.ts` only where new output needs coverage. Reuse `tests/helpers/cli-runtime.ts` and existing manager/project helpers.

**Interfaces:** `readRecipeFile(file: string): Promise<Recipe>`; existing `runCli` routes recipe adds through Task 3/4. `planOutput` conditionally adds `recipe` with component scope/import/example fields while its top-level preset/release fields remain global.

- [ ] Write failing file/CLI tests: 65,536 bytes accepted if otherwise valid, 65,537 rejected; malformed JSON/invalid UTF-8/directories/nonregular inputs; invocation-relative path with explicit target `--cwd`; unknown/repeated/missing flags; recipe combined with positional items or preset; uninitialized project; unresolved built-in revision exit 5; immutable revision conflict exit 4; same-file mutation after input snapshot does not alter reviewed plan. Assert JSON/human output distinguishes global and recipe identities and includes import/usage paths.
  Assertion anchors: `expect(dry.code).toBe(0)`; `expect(await snapshotTree(root)).toEqual(before)`; `expect(unknownRevision.code).toBe(5)`; `expect(changedRevision.code).toBe(4)`; `expect(jsonRecord(success.data).presetHash).toBe(globalPresetHash)`. Construct boundary JSON using trailing whitespace so the schema-valid content stays within its 200-character limit.
- [ ] Run `pnpm exec vitest run packages/cli/test/recipe-file.test.ts tests/integration/recipe-cli.test.ts tests/integration/recipe-recovery.test.ts`; observe failure before routing implementation.
- [ ] Read at most 65,537 bytes using an opened regular file and fatal UTF-8 decoding; reject oversize before JSON parsing. Validate recipes and routes before planning, with explicit recipe syntax in help. Preserve existing confirmation/dry-run/conflict behavior and stable exits. Do not resolve remote-looking values over the network. Route actual installation through shared `applyPlan` and expose separate recipe metadata.
- [ ] Run `pnpm build:packages` then the targeted tests; prove dry-run tree equality, repeat no-op without manager calls, `--yes` conflicts, dependency recovery exit 6, preserved ordinary CLI routes, and actual Node/Bun runtime identities for recipe subprocesses.
- [ ] Commit with `feat: install local Button recipes through the CLI`.

### Task 6: Generate shared recipe fixtures and independent consumers

**Files:** Create `fixtures/shared/recipes.ts`, `fixtures/shared/recipe-fixture.tsx`, `tests/helpers/recipe-fixture.ts`, `scripts/prepare-recipe-consumer.ts`, `tests/integration/recipe-fixture.test.ts`; modify `scripts/generate-preview.ts`, `scripts/prepare-node-consumer.ts`, `scripts/prepare-bun-consumers.ts`, `scripts/prepare-consumers.ts`, `scripts/build-consumers.ts`, `tests/helpers/scenario-fixture.ts`, `fixtures/shared/scenario.tsx`, and `apps/preview/src/vite-env.d.ts` if generated imports need declarations.

**Interfaces:** `recipeFixtures(): readonly Recipe[]` returns revision-1 recipes `rc_flat_button`, `rc_minimalist_button`, and `rc_neo_brutalism_button`, each referencing its exact built-in (content `Recipe action`, variant `default`, size `lg`, radius 0, border 2, minimum height 44, shadow offsets 6); `prepareRecipeConsumer(input: { root: string; cliRuntime: 'node' | 'bun'; env?: NodeJS.ProcessEnv; family: StyleFamily }): Promise<{ recipes: Record<string, InstalledRecipe>; protectedHashes: Record<string, string> }>` installs all three through built CLI and checks canonical output/preservation. `RecipeFixture` renders actual generated components and a fixed, isolated screenshot surface.

- [ ] Write failing integration tests `recipe_fixture_uses_generated_modules`, `consumer_compares_recipe_artifacts_to_correct_manifest`, `recipe_appears_without_global_css_import`, `recipe_fixture_preserves_existing_default_view`. Assert separate ordinary/recipe reference banks, dependency verification, native state controls, and no Ombelle runtime imports.
  Assertion anchors: `expect(recipeFixtures()).toHaveLength(3)`; `expect(Object.keys(installed.recipes)).toHaveLength(3)`; `expect(protectedAfter).toEqual(protectedBefore)`; `expect(componentSource).toContain("import './button.css'")`; `expect(componentSource).not.toContain('@ombelle/')`.
- [ ] Run `pnpm exec vitest run tests/integration/recipe-fixture.test.ts`; observe missing helper/generated data failures.
- [ ] Generate all three recipe artifacts/manifests inside each preview host family; use relative local utility/UI import transforms with explicit canonical/transformed hash records. Install all three into each existing consumer after ordinary initialization/add flows, through the descriptor's actual CLI runtime. Add a query-controlled `recipes=1` fixture view; preserve existing default/state specimens and route CSS loading deliberately. Update source-parity loops that currently assume every lock artifact belongs to the ordinary compile manifest; select exact recipe/ordinary reference by logical identity. Compare scoped outputs to the canonical bank after deterministic alias transforms. Keep the existing 34 app descriptors, frozen fixture locks, native dependency checks, foreign-lock detection, audits, and Node builds. Snapshot protected files before recipe installs. Exercise theme/add after recipes with Task 4/5 tests as well.
  Preparation writes `.artifacts/recipe-consumers.json` keyed by consumer descriptor ID, with `{ recipes, protectedHashes, cliRuntime, build: { status: 'pending' } }`; remove stale evidence at the start of a run. Build finalization replaces `build` with `{ status: 'passed', exitCode: 0 }` only after that app's successful Node build, recording its build runtime and actual audit result. Require exactly 34 rows with three recipe records each in Task 8.
- [ ] Run fixture integration tests, `pnpm generate:preview`, `pnpm prepare:consumers`, `pnpm typecheck`, `pnpm build:preview`, and `pnpm build:consumers`; require 34 successful apps, each carrying three recipes, validated source hashes, and actual audits. Do not mark build success during preparation.
- [ ] Commit with `test: verify recipes in standalone consumer applications`.

### Task 7: Prove browser parity, isolation, and native behavior

**Files:** Create `tests/e2e/recipes.spec.ts`, `tests/helpers/recipe-measurements.ts`, `scripts/recipe-evidence.ts`, `tests/integration/recipe-evidence.test.ts`; extend recipe fixture for test controls, custom dark mode, variants/sizes, and escaped/long text. Keep original parity/state tests intact.

**Interfaces:** `recipeMeasurementKeys(): readonly string[]` enumerates `${hostFamily}/${recipeId}/${mode}/${app}` for all three hosts, Task 6 recipe IDs, two modes, and apps `preview`, `vite`, `next`, `npm-vite`, `npm-next`; `validateRecipeMeasurements(value: unknown): RecipeMeasurement[]` requires every key once, matching identities/hashes and successful checks. Define/export `RecipeMeasurement` in the same evidence module with fields `hostFamily`, `recipeId`, `recipeHash`, `app`, `mode`, `computedStyles`, `canonicalHashes`, `transformedHashes`, and `checks`. Its `checks` object requires boolean `parity`, `isolation`, `activation`, `disabled`, `loading`, `focus`, `text`, `overrideHeight`, `reducedMotion`, `forcedColors`, `axe`, and `enlargement`; reject missing or false outcomes. Retain detailed samples as separate attributable data, not these booleans alone.

- [ ] Write failing browser tests for every recipe family in each of three host families, light/dark, preview plus npm/pnpm Vite/Next (90 measured app/family/mode outcomes). Compare canonical/export hashes, installed hashes, normalized recipe DOM, computed styles, and isolated specimen pixels. Require exact image bytes first; investigate and explicitly document any narrowly justified tolerance rather than silently masking differences. Validate adjacent ordinary Button/Input/Dialog computed styles before/after recipe rendering.
  Assertion anchors: `expect(recipeMeasurementKeys()).toHaveLength(90)`; `expect(actualComputed).toEqual(referenceComputed)`; `expect(actualDom).toEqual(referenceDom)`; `expect(actualImage.equals(referenceImage)).toBe(true)`; `await expect(loadingButton).toBeDisabled()`; `await expect(loadingButton).toHaveAttribute('aria-busy', 'true')`.
- [ ] Run `pnpm exec playwright test tests/e2e/recipes.spec.ts` after fixtures/builds; observe missing recipe behavior/measurement assertions before adding required fixture controls. Do not equate no collected tests with pass.
- [ ] Add actual generated-source interactions: Enter/Space/click activation, disabled/loading blocking with busy name retained, caller marker override resistance, all variants/sizes, icon text growth, escaped/long text, min-height precedence, forced colors, reduced motion positive control, focus/axe, and synthetic 200% enlargement at 1100/320 CSS pixels. Use independent fixture pages for extra revision/custom-dark/host-theme-change scenarios. Prove same-element and ancestor dark activation; keep custom-selector results separate from portable hash identity. Reuse existing enlargement helpers and retain measured font-size samples.
- [ ] Run recipe browser tests and evidence-validator integration tests. Validator negatives must reject absent, duplicate, wrong-hash, failed-behavior, and incomplete host/mode/app records. Persist `.artifacts/recipe-measurements.json` only with attributable outcomes; do not let concurrent tests overwrite results (existing one-worker configuration still requires explicit collection/finalization).
- [ ] Commit with `test: prove recipe parity isolation and accessible states`.

### Task 8: Gate, review, and retain measured evidence

**Files:** Modify `scripts/check-foundation.mjs`, `.github/workflows/foundation.yml`, README, `docs/foundation-local-usage.md`, `docs/04-presets-and-contracts.md`, `docs/05-cli-specification.md`; create `docs/evidence/local-button-recipes.md` and compact machine-readable `local-button-recipes-run.json`. Extend existing gate/evidence integration tests or add `tests/integration/recipe-gate.test.ts`.

**Interfaces:** Gate imports Task 7's `validateRecipeMeasurements`, includes validated recipe measurements in its report, and archives `.artifacts/recipe-measurements.json` plus `.artifacts/recipe-consumers.json` (the Task 6 installation records, enriched after actual builds). Missing recipe install/build/audit/measurement outcomes make the gate fail. Existing minimalist and consumer validation stays required.

- [ ] Write failing gate tests `rejects_missing_recipe_evidence` and `rejects_preparation_only_recipe_build`: remove a required app/recipe record, substitute a pending build, or tamper with source hash; expect failure. Attribute all 102 consumer recipe installations to the same 34 descriptors, runtime identities, audit results, and completed builds used by the existing matrix; never infer success solely from a directory existing.
  Assertion anchors: `expect(() => validateRecipeMeasurements(rows.slice(1))).toThrow()`; `expect(Object.keys(recipeConsumers)).toHaveLength(34)`; `expect(Object.values(recipeConsumers).reduce((n, row) => n + Object.keys(row.recipes).length, 0)).toBe(102)`; fixture gate subprocesses with pending builds must exit nonzero.
- [ ] Run `pnpm exec vitest run tests/integration/recipe-gate.test.ts tests/integration/recipe-evidence.test.ts`; observe missing validation before gate integration.
- [ ] Integrate evidence finalization and CI archive paths; update documentation with real local commands, defaults/preservation, importing recipe CSS through the component, output paths, revision conflicts, prerequisites, custom dark-class limits, and recovery instructions. Keep remote codes/component `--preset` explicitly planned. Document actual test scope and manual-review limits; do not publish speculative counts or a successful run before completion. Preserve existing CI time budget unless measured hosted evidence warrants a separate change.
- [ ] Run targeted checks, then `pnpm check:foundation` using existing pinned tools and `OMBELLE_BROWSER_CHANNEL=msedge` only where needed locally. Require all nine stages, all existing cases, 34 independent builds/audits with 102 recipe installs, and complete recipe measurements to pass without skips/flakies. Inspect rendered recipe pages in light/dark and loading/long-text states. Record actual source revision/runtime/browser/timing/hashes; never claim hosted CI from a local run.
- [ ] Commit functional/doc changes, obtain a fresh whole-branch review, reproduce/fix actionable findings with targeted regressions, rerun affected checks and the full gate after material fixes, then commit attributable compact evidence. Use conventional commits such as `ci: retain local Button recipe verification evidence` and `docs: record verified local recipe support`. Keep full reports/screenshots/traces as local/CI artifacts, with hashes and a compact committed summary.

## Execution and review handoff

The written spec is approved; this plan awaits user review and execution-method selection. At execution time, inspect the checkout/attached worktrees and applicable instructions before choosing isolation; preserve existing documentation PR ancestry and local changes. Do not create a public PR or publish packages merely because the plan is complete.

Tasks 1–5 share contracts and state ownership; Tasks 6–8 depend on the installed artifact shape. Native execution is recommended for continuity across those interfaces, followed by one fresh whole-branch review. Subagent-driven execution remains an option with per-task implementer/reviewer handoffs using the exact interfaces above. No execution method has yet been selected for this feature.
