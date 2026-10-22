# Component-scoped Button Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `add button --preset <local-json>` to install a Button styled by one local preset while preserving the project's saved defaults and existing components.

**Architecture:** Compile an isolated Button artifact set using the same scoped token/style rules as recipes, without requiring recipe props or content. Store separate component-preset provenance in the project lock, plan the writes through the existing transaction safeguards, and route local JSON selection through the CLI.

**Tech Stack:** TypeScript, Node.js 24.19.0, pnpm 11.25.0, Vitest, Playwright, Prettier, PostCSS, AJV.

**Spec:** `docs/04-presets-and-contracts.md#component-scoped-preset-selection`; supporting interface and acceptance requirements in `docs/05-cli-specification.md` and `docs/07-delivery-plan.md`.

## Global Constraints

- Support exactly one component per command, beginning with Button; reject multiple component arguments and simultaneous `--preset` and `--recipe`.
- Accept a local JSON preset in this slice; saved-code resolution remains pending until immutable snapshot resolution exists.
- Preserve `ui-preset.json`, global theme defaults, the style pack, ordinary installed components, and existing usage files.
- Never overwrite locally edited source or shared utilities; report conflicts and migration guidance.
- Dry-run performs no writes or dependency operations; `--yes` does not bypass conflicts or validation.
- Preserve the selected package manager and lockfile format; disable lifecycle scripts for dependency installs.
- Keep existing recipe output and behavior stable while sharing scoped compiler logic.
- Verify the declared Vite/Next.js and npm/pnpm/Yarn/Bun consumer matrix; do not imply portal or arbitrary consumer CSS support.

## Review Focus

- Malformed, oversized, or schema-invalid preset files and invalid `add` grammar must fail before writes; pin in the local-preset and CLI grammar tests.
- A stale or tampered `componentPresets` lock record must be rejected before planning writes; pin in the lock validation tests.
- Reusing a preset ID/revision with different content or dark-mode configuration must conflict instead of changing installed bytes; pin in planner tests.
- Case-insensitive path collisions, edited generated files, or an edited shared utility must stop the plan without replacing user data; pin in planner tests.
- Host theme changes and caller-supplied attributes must not change the scoped Button's light/dark appearance or scope marker; pin in compiler and browser parity tests.

---

### Task 1: Compile isolated Button preset artifacts

**Files:**
- Modify: `packages/contracts/src/types.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/recipe-styles.ts`
- Modify: `packages/compiler/src/recipe-source.ts`
- Create: `packages/compiler/src/component-preset.ts`
- Create: `packages/compiler/test/component-preset.test.ts`
- Modify: `packages/compiler/test/recipe.test.ts`
- Modify: `packages/compiler/test/recipe-styles.test.ts`

**Interfaces:**
- Produce `ComponentPresetCompileResult = { artifacts: Artifact[]; dependencies: Dependency[]; preset: ResolvedPreset; scope: string; darkSelector: string; provenance: { catalogRelease: string; compilerVersion: string } }`.
- Produce `compileButtonPreset(input: { preset: unknown; darkSelector?: string }): Promise<ComponentPresetCompileResult>` and export it from `@ombelle/compiler`.
- Emit logical paths `scoped-presets/<preset-id>/r<preset-revision>/button.tsx`, `button.css`, and `examples/scoped-presets/<preset-id>/r<preset-revision>.tsx`; emit the existing shared utility artifact when required.
- The generated native Button uses `data-slot="scoped-button"` and a compiler-derived `data-ombelle-scope`; its default variant and size come from the resolved preset's Button defaults.

- [x] **Step 1: Write failing compiler tests.** Cover resolved flat/minimalist/neo-brutalism presets, full light/dark local tokens, isolated selectors, stable scope hashes, default variant/size, usage imports, and rejection of unsupported preset/compiler releases or dark selectors. Add a regression asserting the existing recipe CSS/source outputs remain unchanged.
- [x] **Step 2: Run the focused tests and confirm the new API/behavior fails.** Run `pnpm exec vitest run packages/compiler/test/component-preset.test.ts packages/compiler/test/recipe.test.ts packages/compiler/test/recipe-styles.test.ts`. Expected: the new test module/API is missing or the scoped artifact assertions fail; existing recipe assertions pass.
- [x] **Step 3: Implement `compileButtonPreset` and share the scoped style/source helpers.** Generalize the recipe helpers with explicit slot and scope-attribute inputs; keep the recipe wrapper's current inputs and generated bytes unchanged. Resolve and hash the preset using existing compiler/catalog functions.
- [x] **Step 4: Re-run the focused tests and compiler typecheck.** Expected: new preset tests pass and recipe tests remain unchanged.
- [x] **Step 5: Commit.** Use `feat(compiler): compile scoped button presets`.

### Task 2: Persist and validate component-preset provenance

**Files:**
- Modify: `packages/contracts/src/types.ts`
- Create: `packages/cli/src/project/component-presets.ts`
- Modify: `packages/cli/src/project/inspect.ts`
- Create: `packages/cli/test/component-preset-lock.test.ts`

**Interfaces:**
- Produce `InstalledComponentPreset = Omit<ComponentPresetCompileResult, 'artifacts' | 'dependencies'> & { artifacts: Record<string, InstalledArtifact> }`.
- Add optional `ProjectLock.componentPresets?: Record<string, InstalledComponentPreset>`; key records by `<preset-id>@<revision>`.
- Produce `validateInstalledComponentPresets(root, value, artifacts): Promise<Record<string, InstalledComponentPreset>>` and call it from `inspectProject` when the lock contains the field.

- [x] **Step 1: Write failing lock tests.** Verify legacy locks without `componentPresets` remain valid; valid records recompile; altered preset data, scope, dark selector, key, or artifact hashes fail as `UNSUPPORTED_PROJECT` before planning.
- [x] **Step 2: Run the focused lock tests and confirm they fail.** Run `pnpm exec vitest run packages/cli/test/component-preset-lock.test.ts`. Expected: the validation API is missing and tampered records are not yet rejected.
- [x] **Step 3: Add the optional lock type and validator.** Recompile each stored preset using Task 1, compare canonical metadata and artifact identities against the global artifact ownership map, validate paths with `safePath`, and preserve absent legacy state as an empty map.
- [x] **Step 4: Re-run the focused tests and existing recipe-lock tests.** Run `pnpm exec vitest run packages/cli/test/component-preset-lock.test.ts packages/cli/test/recipe-lock.test.ts`. Expected: valid legacy/current locks pass; tampering fails.
- [x] **Step 5: Commit.** Use `feat(contracts): track component preset provenance`.

### Task 3: Plan and transform scoped preset writes

**Files:**
- Create: `packages/cli/src/project/component-preset-transform.ts`
- Create: `packages/cli/src/plan/component-preset.ts`
- Create: `packages/cli/test/component-preset-plan.test.ts`
- Modify: `packages/contracts/src/types.ts`

**Interfaces:**
- Produce `transformComponentPresetArtifact(context: ProjectContext, artifact: Artifact): Promise<{ path: string; content: string }>`; map generated component/CSS under `<componentsDir>/presets/<id>/r<revision>/`, examples under `<sourceDir>/ombelle-examples/presets/<id>/r<revision>.tsx`, and utility output to `context.utilsFile`.
- Produce `planComponentPreset(context: ProjectContext, result: ComponentPresetCompileResult): Promise<InstallPlan>`.
- Add `InstallPlan.componentPreset?: Omit<InstalledComponentPreset, 'artifacts'> & { importPath: string; examplePath: string }`.

- [x] **Step 1: Write failing planner tests.** Cover dry planning with custom aliases; no global preset/theme/style-pack/ordinary-component changes; correct component and example destinations; exact dependencies; same-input no-op; changed same-revision and dark-selector conflicts; edited/untracked utility conflicts; case-insensitive duplicate destinations; transaction rollback after an injected write failure; and unsupported upstream primitive or uninitialized project errors.
- [x] **Step 2: Run the focused planner tests and confirm they fail.** Run `pnpm exec vitest run packages/cli/test/component-preset-plan.test.ts`. Expected: the transformer and planner are missing.
- [x] **Step 3: Implement transformation and planning.** Reuse `fileChange`, `safePath`, lock artifact ownership, dependency selection, diagnostics, and the transaction plan shape. Preserve existing recipe records and managed declarations; do not add component files to ordinary Button destinations.
- [x] **Step 4: Re-run planner and recipe-plan tests.** Run `pnpm exec vitest run packages/cli/test/component-preset-plan.test.ts packages/cli/test/recipe-plan.test.ts packages/cli/test/plan.test.ts`. Expected: all pass and the existing recipe plan behavior is unchanged.
- [x] **Step 5: Commit.** Use `feat(cli): plan scoped button preset installs`.

### Task 4: Add local preset-file loading and CLI command routing

**Files:**
- Create: `packages/cli/src/preset-file.ts`
- Create: `packages/cli/test/preset-file.test.ts`
- Modify: `packages/cli/src/main.ts`
- Modify: `packages/cli/src/format.ts`
- Create: `tests/integration/component-preset-cli.test.ts`
- Modify: `tests/integration/cli.test.ts`

**Interfaces:**
- Produce `readPresetFile(file: string): Promise<Preset>`; resolve relative to the invoking working directory, require a regular UTF-8 JSON file no larger than 256 KiB, and apply `validatePreset`.
- Route exactly `add button --preset <local-json>` through `compileButtonPreset` and `planComponentPreset`; retain existing `init --preset`, `theme add`, and `add --recipe` behavior.
- Include component-preset identity, scope, import path, and example path in both JSON and human-readable plans, labelled as component-only.

- [x] **Step 1: Write failing file and CLI tests.** Cover valid/malformed/oversized/non-regular/invalid-schema files; caller-relative file resolution independent of `--cwd`; valid `add button --preset`; rejection of missing preset, non-Button or multiple components, remote-looking values, repeated flags, and `--recipe` combination; no mutation on invalid input; and later ordinary `add input` still using the saved global preset.
- [x] **Step 2: Build packages and run the focused tests to confirm failures.** Run `pnpm build:packages`, then `pnpm exec vitest run packages/cli/test/preset-file.test.ts tests/integration/component-preset-cli.test.ts`. Expected: loader and command path are missing; recipe and ordinary add behavior remain passing.
- [x] **Step 3: Implement file loading, CLI routing, and output formatting.** Extract the existing `init --preset` read/validate path into `readPresetFile` without changing its 256 KiB limit or diagnostics. Remove only the blanket `add --preset` rejection and enforce the documented Button-only grammar.
- [x] **Step 4: Rebuild and run the focused CLI and recipe integration tests.** Run `pnpm build:packages`, then `pnpm exec vitest run packages/cli/test/preset-file.test.ts tests/integration/component-preset-cli.test.ts tests/integration/recipe-cli.test.ts tests/integration/cli.test.ts`. Expected: Node and Bun command cases pass, dry-run leaves the tree unchanged, repeated install is a no-op, edited outputs conflict, and recipe support is unchanged.
- [x] **Step 5: Commit.** Use `feat(cli): support local button preset installs`.

### Task 5: Verify preview, consumer, and manager parity

**Files:**
- Create: `tests/e2e/component-presets.spec.ts`
- Create: `tests/helpers/component-preset-fixture.ts`
- Create: `scripts/prepare-component-preset-consumer.ts`
- Create: `scripts/component-preset-evidence.ts`
- Modify: `scripts/prepare-node-consumer.ts`
- Modify: `scripts/prepare-bun-consumers.ts`
- Modify: `scripts/prepare-consumers.ts`
- Modify: `scripts/build-consumers.ts`
- Modify: `scripts/check-foundation.mjs`
- Create: `tests/integration/component-preset-evidence.test.ts`
- Modify: `tests/integration/consumer-evidence.test.ts`

**Interfaces:**
- Consumer preparation installs each of the three supported preset families in each of the 34 existing consumer descriptors, for 102 attributable component-preset installs; each record includes preset/scope hashes, transformed source hashes, manager/runtime identity, and build status. For every descriptor, prove dry-run non-mutation, successful install, repeat no-op, same-revision tamper conflict, and preservation of global defaults and ordinary components.
- Browser coverage compares preview plus npm/pnpm Vite/Next.js for three host families × three selected preset families × light/dark, and checks component behavior, focus, forced colors, reduced motion, and host-style isolation.
- Evidence validation rejects missing, duplicate, mismatched, failed, or incomplete component-preset rows before the foundation gate can pass.

- [x] **Step 1: Add failing evidence-validator and browser assertions.** Require the full descriptor/preset matrix, correct lock provenance and transformed hashes, unchanged project defaults and ordinary Button, and rendered parity in both modes.
- [x] **Step 2: Run focused tests and the browser suite to confirm missing coverage.** Run `pnpm build:packages`, then `pnpm exec vitest run tests/integration/component-preset-evidence.test.ts`; run `pnpm exec playwright test tests/e2e/component-presets.spec.ts`. Expected: missing evidence or fixture behavior fails.
- [x] **Step 3: Add consumer preparation and evidence collection.** Reuse the existing 34 descriptors and manager-specific audit/build rules; prepare local preset JSON inputs and run the built CLI without converting project managers or lockfiles.
- [x] **Step 4: Complete browser and evidence tests.** Assert 90 app/host/preset/mode measurements and 102 consumer installs with successful production builds/audits; verify the four managers and declared framework/linker combinations through the consumer descriptors; keep Yarn/Bun browser behavior outside claims unless directly measured.
- [x] **Step 5: Commit.** Use `test(cli): verify component preset consumer parity`.

### Task 6: Document the supported slice and record final evidence

**Files:**
- Modify: `README.md`
- Modify: `docs/05-cli-specification.md`
- Modify: `docs/07-delivery-plan.md`
- Modify: `docs/10-installation-and-theme-merging.md`
- Modify: `docs/foundation-local-usage.md`
- Create: `docs/evidence/component-scoped-button-presets.md`
- Create: `docs/evidence/component-scoped-button-presets-run.json`

- [x] **Step 1: Update user-facing documentation after implementation behavior is verified.** Add the local JSON command and usage example; state that it preserves project defaults and installs a separate scoped Button; document the exact conflict, manager, style, and portal boundaries; mark only this local Button scope implemented and leave remote codes pending.
- [x] **Step 2: Run the complete repository checks and evidence gate.** Run `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, then the full `pnpm check:foundation` with documented manager/browser prerequisites. Expected: all nine stages pass with complete 34-consumer, 102-install, and browser measurement evidence and no unreported skips/failures.
- [x] **Step 3: Record actual results.** Save source revision, clean/dirty state, runtime/browser versions, statuses/counts, hashes, and evidence paths. Do not claim hosted CI or unperformed manual/screen-reader/browser coverage.
- [x] **Step 4: Review the docs and evidence for scope accuracy and run `git diff --check`.** Expected: documentation describes only the measured local Button workflow and leaves saved-code, editor, portal, and arbitrary-CSS boundaries explicit.
- [x] **Step 5: Commit.** Use `docs: document component-scoped button presets`.
