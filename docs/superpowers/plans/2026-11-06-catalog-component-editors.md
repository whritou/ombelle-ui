# Catalog Component Editors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal**

Give every catalog component a dedicated editor and a recipe that installs from JSON or an immutable code in one public release.

**Architecture**

Keep Button on its existing 1.0 path. Add a versioned path for the other components and share the validated specimen between preview and compilation. The existing CLI transaction and snapshot service consume the new format through version-aware entry points.

**Tech stack**

TypeScript, JSON Schema 2020-12, Ajv, Next.js, React, Radix, Vite, Vitest, Playwright, SQLite, and PostgreSQL.

**Spec**

[Catalog component editors and recipes](../specs/2026-11-06-catalog-component-editors-design.md)

## Global constraints

- Use Node 24.19.0 and pnpm 11.25.0. Install with `pnpm install --frozen-lockfile --ignore-scripts`. Build packages before testing imports from `dist` or the built CLI.
- Keep Button 1.0 draft and recovery keys, normalized bytes, hashes, snapshot bytes, import paths, and installation behavior. Keep existing API URLs, public recipe references, and the `add --recipe` grammar.
- Keep exact preset references and validate every component and style pair. The four stable families follow the catalog support table. Keep the experimental Liquid Glass label, fallbacks, and advisory contrast behavior.
- Reject extra keys. Limit individual text fields to 200 characters, body or initial text fields to 1,000, option and item lists to 12, and tables to 8 columns and 12 rows. Preserve the existing 64 KiB recipe and 128 KiB snapshot limits.
- Keep each editor's draft, undo history, and recovery separate. Keep transient view state out of identity. Accept only reviewed components, props, and supporting elements. Treat all user text as literal data.
- Install privately scoped artifacts through the existing transaction. Preserve saved presets, global CSS, ordinary components, and other recipes. Use Conventional Commits.
- Develop on the current feature branch or a suitable attached worktree. Make new catalog recipes public only when all 23 editors and the verified compatible CLI can ship together.
- Before browser work, generate the preview and prepare and build fresh consumers with `pnpm generate:preview`, `pnpm prepare:consumers`, and `pnpm build:consumers`. Use the manager versions and browser setup in `docs/foundation-local-usage.md`. Keep the browser evidence inventory current in the same commit that adds cases.

## Review focus

- A previously published Button snapshot stays byte-identical after the server starts publishing 2.0 snapshots. Task 3 verifies the old response body and ETag.
- Reinstalling a recipe ID and revision with a different component fails before any write, including on case-insensitive paths. Task 2 exercises both collisions.
- An old worker response arriving after a route switch cannot enable export for the new component. Task 4 asserts the selected draft, preview, and export state.
- Removing a selected option cannot save a dangling reference or silently retarget another option. Task 6 covers the edit and the independently supplied JSON.
- Portalled content in two Liquid Glass recipes retains its own style and filter when the ordinary host component is present. Task 8 compares the scoped mounts and focus return.

## Milestone 1 · Badge through the full stack

### Task 1 · Versioned validation and deterministic Badge artifacts

**Files**

- Create `schemas/component-recipe.schema.json`, `packages/contracts/src/component-recipe.ts`, `packages/compiler/src/component-recipe.ts`, `packages/compiler/src/recipe-specimen.ts`, `packages/compiler/src/component-recipe-styles.ts`, and `examples/component-recipe.badge.json`.
- Modify `scripts/sync-schema.mjs`, `packages/contracts/src/index.ts`, `packages/contracts/src/types.ts`, and `packages/compiler/src/index.ts`. Generate `packages/contracts/src/component-recipe-schema.ts`.
- Test in `packages/contracts/test/component-recipe.test.ts` and `packages/compiler/test/component-recipe.test.ts`.

**Interfaces**

- `ComponentRecipe` is the 2.0 discriminated union inferred from the new schema. `InstallableRecipe = Recipe | ComponentRecipe`.
- `validateComponentRecipe(input: unknown): ComponentRecipe` validates and clones 2.0 input. `validateInstallableRecipe(input: unknown): InstallableRecipe` dispatches on `schemaVersion` and rejects unsupported versions.
- `describeComponentRecipe(recipe: ComponentRecipe): RecipeSpecimen` returns a typed tree of reviewed catalog exports, fixed native tags, literal props, and text. Keep internal accessibility identifiers separate from literal text. Resolve paired IDs per rendered instance with React's `useId`.
- `ComponentRecipeCompileResult` carries the same envelope fields as `RecipeCompileResult` with normalized 2.0 data. `InstallableRecipeCompileResult` is their union. Define both types in contracts.
- `compileComponentRecipe(input: { recipe: unknown; darkSelector?: string }): Promise<ComponentRecipeCompileResult>` compiles 2.0 data. `compileInstallableRecipe(input: { recipe: unknown; darkSelector?: string }): Promise<InstallableRecipeCompileResult>` dispatches to it or the unchanged 1.0 compiler. Preserve the existing `compileRecipe` signature for Button callers.

- [ ] Add failing tests for `catalog_badge@1`, using the exact Flat reference from the existing preset resolver, `props.variant = 'outline'` and `content.label = 'Ready <now> & later'`. Assert 2.0 normalization, paths `recipes/catalog_badge/r1/badge.tsx`, `recipes/catalog_badge/r1/badge.css` and `examples/recipes/catalog_badge/r1.tsx`, named `RecipeBadge` export, exact Badge dependencies, and identical bytes for equivalent field order. Assert rejection for blank or 201-character labels, unknown props or variants, and unsupported release references. Check that dispatch of an existing Button fixture returns its original compile result.
- [ ] Run `pnpm exec vitest run packages/contracts/test/component-recipe.test.ts packages/compiler/test/component-recipe.test.ts`. Expect failures for the missing 2.0 path.
- [ ] Implement the validation, specimen, and compile entry points. Seed the Badge editor with `variant: 'default'` and label `'Badge'`. Normalize before hashing and use the existing canonicalization, preset resolution, and formatting. Generate a scoped primitive from the reviewed template and family styles, using private `recipe-<slot>` names plus the recipe scope. Rewrite each participating slot in compound selectors and emit scoped tokens and dark-mode rules. Keep the transformation structural. Reject style rules the compiler cannot scope safely. Generate the usage example from the same specimen that the preview will consume.
- [ ] Run `pnpm build:packages`, then the focused command above plus `packages/compiler/test/recipe.test.ts`. Expect the 2.0 tests and Button regressions to pass.
- [ ] Commit with `feat(compiler): compile versioned Badge recipes`.

### Task 2 · Install local Badge JSON through the existing transaction

**Files**

- Modify `packages/contracts/src/types.ts`, `packages/cli/src/main.ts`, `packages/cli/src/recipe-file.ts`, `packages/cli/src/plan/recipe.ts`, `packages/cli/src/project/recipe-transform.ts`, `packages/cli/src/project/recipes.ts`, and `packages/cli/src/snapshots/recipe-input.ts`.
- Test in `packages/cli/test/component-recipe-plan.test.ts` and `tests/integration/component-recipe-cli.test.ts`.

**Interfaces**

- `readRecipeFile(file: string): Promise<InstallableRecipe>` retains the existing bounded file read.
- `planRecipe(context: ProjectContext, result: InstallableRecipeCompileResult): Promise<InstallPlan>` uses the verified entry artifact and accepts only the exact revision directory, exact usage path, and approved shared utility path.
- Existing installed recipe records carry either format. Their identity keys remain `id@revision`. Recompile with the recorded dark selector when validating a lock.

- [ ] Add failing tests in an initialized consumer with a host Button and custom UI alias. Assert `add --recipe <badge.json> --dry-run --json` resolves the Badge import path and writes zero files. Apply with `--yes`, verify installed bytes and dependencies, then assert a repeat is a no-op. Verify global files and Button bytes by hash. Test a same-ID conflict against an installed Button and a forged differently cased destination. Both leave the lock and source untouched.
- [ ] Run `pnpm build:packages`, `pnpm exec vitest run packages/cli/test/component-recipe-plan.test.ts`, and `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/component-recipe-cli.test.ts`. Expect 2.0 rejection before implementation.
- [ ] Thread the union through the resolver and plan, and dispatch at compile and lock validation boundaries. Match one entry artifact to the expected component and identity. Validate nested helper destinations and relative imports. Keep version-specific contrast inputs in the CLI notice path. Reuse existing no-op, conflict, dependency, and rollback logic.
- [ ] Rebuild packages and rerun both focused commands plus `pnpm exec vitest run packages/cli/test/recipe-lock.test.ts packages/cli/test/recipe-plan.test.ts`. Expect all to pass.
- [ ] Commit with `feat(cli): install versioned component recipes`.

### Task 3 · Publish and resolve both snapshot formats

**Files**

- Create `schemas/component-recipe-snapshot.schema.json` and `tests/integration/component-recipe-snapshot.test.ts`. Generate the schema binding through `scripts/sync-schema.mjs`.
- Modify `packages/contracts/src/recipe-snapshot.ts`, `packages/compiler/src/recipe-snapshot.ts`, `packages/cli/src/snapshots/recipe-input.ts`, `packages/cli/src/snapshots/recipe-cache.ts`, `packages/cli/src/snapshots/recipe-source.ts`, and the recipe paths in `apps/www/src/snapshots/server/{recipe-service,recipe-http,store,sqlite-store,postgres-store}.ts`.
- Extend `tests/hosted/postgres-snapshot-store.test.ts` with a mixed-format read. Update the unsupported-version input in `tests/integration/recipe-snapshot-api.test.ts` to `3.0`.

**Interfaces**

- `InstallableRecipeSnapshot = RecipeSnapshot | ComponentRecipeSnapshot`. Version 2.0 embeds a 2.0 recipe. Existing validators still accept and type their 1.0 inputs.
- `normalizePublishedInstallableRecipe(input: unknown): Promise<InstallableRecipeCompileResult>` enforces both input and normalized byte limits. `verifyInstallableRecipeSnapshot(input: unknown, expected?: { reference: string; recipeHash: string }): Promise<InstallableRecipeSnapshot>` dispatches by envelope version and checks identity, normalization, and both hashes.

- [ ] Add failing tests that publish Badge, repeat the same idempotency key, read by exact code, and install through the CLI using the returned hash. Assert a forged version pairing, tampered hash, unsupported version, and withdrawn reference are refused. Preseed a 1.0 Button response and assert byte and ETag equality after the Badge publication. Confirm a retry uses its original reference and a supported offline cache read revalidates the bytes.
- [ ] Run `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/component-recipe-snapshot.test.ts`. Expect 2.0 publication to fail.
- [ ] Extend existing publication, storage, cache, and CLI source verification paths. Choose snapshot version from validated recipe version when creating a response. Keep the same endpoints, `rc_` namespace, and stored JSON columns. Preserve limits, quota accounting, idempotency, and withdrawal. Preserve the existing behavior of 1.0 helper functions and fixtures.
- [ ] Rebuild packages. Run the focused command plus `tests/integration/recipe-snapshot-api.test.ts` and `tests/integration/recipe-snapshot-provenance.test.ts`. Run `pnpm test:hosted-storage` with the disposable development environment in `docs/snapshot-service-operations.md` before release. Expect both snapshot versions to pass.
- [ ] Commit with `feat(snapshots): publish and resolve catalog recipes`.

### Task 4 · Badge route, editor, and published preview

**Files**

- Create `apps/www/src/app/editor/component/[id]/page.tsx`, `apps/www/src/editor/catalog-draft.ts`, `apps/www/src/editor/catalog-preview-protocol.ts`, `apps/www/src/editor/components/catalog-component-editor.tsx`, `apps/www/src/editor/components/catalog-preview-frame.tsx`, `apps/www/src/editor/components/catalog-properties.tsx`, and `apps/preview/src/catalog-recipe-preview.tsx`.
- Modify `apps/www/src/editor/{editable-components,compile-protocol,use-compiler}.ts`, `apps/www/src/editor/components/{component-navigation,artifact-panel}.tsx`, `apps/www/src/app/components/[id]/page.tsx`, `apps/www/src/recipe-snapshots/{publication,publication-storage,use-publication}.ts`, `apps/www/src/recipe-snapshots/components/{recipe-get-code,published-recipe}.tsx`, `apps/www/src/snapshots/install-command.ts`, `apps/preview/src/{main,editor-preview}.tsx`, and `scripts/generate-preview.ts`.
- Test in `apps/www/src/editor/catalog-draft.test.ts`, `apps/www/src/editor/catalog-preview-protocol.test.ts`, and `tests/e2e/catalog-editors.spec.ts`.
- Update browser counts in `scripts/foundation-evidence.mjs` and `tests/integration/foundation-groups.test.ts` in this task and every subsequent browser batch.

**Interfaces**

- `createCatalogDraft(component: ComponentRecipe['component']): CatalogDraft` uses reviewed defaults and the Flat reference. `catalogDraftKey(component: ComponentRecipe['component']): string` returns `ombelle.component-editor.<id>.draft`. Use the existing storage envelope and recovery behavior with component-specific keys.
- `verifyCatalogPreviewRender(input: unknown, activeComponent: ComponentRecipe['component'], previousRequestId: number): Promise<CatalogPreviewRender | null>` verifies the component, schema, request order, and provenance. Recompile the normalized recipe in the frame before applying styles and compare its scope and CSS to the message. Reconstruct the specimen from verified data.
- Worker replies include `component` and `requestId`. The host enables export only when the reply matches the active draft. Generate lazy imports for reviewed scope-aware primitives from the same template transformation as the installed modules. Use the existing deployed editor preview URL and MessagePort handshake with a separate 2.0 render message.

- [ ] Add failing tests for Badge label and variant edits, draft reload and undo, a stale result after navigation, corrupt draft recovery, and publication failure with JSON still downloadable. Add a browser case that edits Badge, compares the preview and generated artifact output, publishes, and opens its correctly titled read-only page using the local built-CLI configuration. Confirm the exact Button route still restores its 1.0 draft. Unknown IDs return 404.
- [ ] Run focused Vitest on the two new editor tests and Playwright on the Badge case in `catalog-editors.spec.ts`. Expect the Badge route and 2.0 preview path to be unavailable.
- [ ] Implement the shared workspace around the existing shell, view controls, history behavior, and export surfaces. Keep the static Button route and its storage behavior. Serve Badge through the dynamic route and add it to the chooser and Customize links in the local development path. Render only reviewed modules in the iframe and mount their portals inside it. Render the same current artifacts in the read-only page. Keep the new public routes and install commands gated. Enable the built CLI path for the existing local development and browser servers through an explicit opt-in.
- [ ] Run `pnpm typecheck`, `pnpm generate:preview`, the focused editor tests, and `pnpm exec playwright test tests/e2e/catalog-editors.spec.ts tests/e2e/editor.spec.ts`. Expect Badge and Button to pass against the configured local preview and consumer servers.
- [ ] Commit with `feat(www): add the Badge editor and recipe preview`.

## Milestone 2 · Complete the component matrix

### Tasks 5–8 · Add reviewed component definitions in four batches

**Shared files**

- Modify `schemas/component-recipe.schema.json`, `packages/contracts/src/component-recipe.ts`, `packages/compiler/src/recipe-specimen.ts`, `packages/compiler/src/component-recipe-styles.ts`, `apps/www/src/editor/catalog-draft.ts`, `apps/www/src/editor/components/catalog-properties.tsx`, and `apps/www/src/editor/editable-components.ts`.
- Create `tests/helpers/catalog-recipe-fixtures.ts` in Task 5 and extend it in each batch. Export `catalogRecipeFixtures(): readonly ComponentRecipe[]` with one edited recipe per implemented ID, separate from the default draft. Extend the contract, compiler, CLI integration, and browser tests from Tasks 1–4 using these fixtures.

| Task | Components | Required batch-specific assertions | Commit |
| --- | --- | --- | --- |
| 5 | Alert, Avatar, Card, Progress, Separator, Skeleton | Changing Alert variant updates preview and installed state. Progress at 25 of 50 shows half filled, indeterminate omits `aria-valuenow`, and 51 of 50 is rejected. Avatar has the chosen accessible name, and Separator honors its semantic setting. | `feat(editor): add display component recipes` |
| 6 | Checkbox, Input, Label, Native Select, Radio Group, Select, Switch, Textarea | Label targets its generated input. Two instances of one recipe have distinct IDs. Checkbox preserves indeterminate state. Selecting an option changes the preview interaction only. Removing the active item requires an explicit new selection or clearing it where supported. JSON with an absent ID or duplicate option IDs is rejected. | `feat(editor): add form control recipes` |
| 7 | Accordion, Table, Tabs | Single Accordion rejects two initial item IDs. Tabs starts on the selected panel and arrow keys switch panels. Table rejects nonrectangular rows and unknown numeric columns. Reordering a list keeps the same selected stable ID. | `feat(editor): add layout component recipes` |
| 8 | Dialog, Dropdown Menu, Popover, Tooltip | Keyboard opens and dismisses each widget according to its primitive and returns focus where applicable. Two Glass recipes with different scopes and an ordinary host instance retain distinct scoped parts and filter references. Check computed overlay and content styles against installed output and confirm portal placement stays inside the preview iframe. | `feat(editor): add overlay component recipes` |

For each task in order

- [ ] Add one fixture per ID with the approved fields from the spec. Add a browser case for each route that changes a field, confirms the preview and export, and reloads the saved edit. Add the batch-specific assertions above to the existing focused files. Assert accepted options through real semantics and exact exported data. Assert rejected inputs at the validation boundary before artifacts are produced.
- [ ] Run `pnpm exec vitest run packages/contracts/test/component-recipe.test.ts packages/compiler/test/component-recipe.test.ts` and the new browser cases by component name. Expect the new IDs to fail validation or route resolution.
- [ ] Add the schema branch, deterministic defaults, accessible specimen, component-specific control group, and chooser entry for each ID. Read variant enums from the reviewed API and follow the field limits in the spec. Generate only the styled parts and support modules each specimen uses. Treat transient preview interactions as independent of initial props. Keep new routes behind the release gate until Task 9.
- [ ] Run `pnpm build:packages`, `pnpm typecheck`, `pnpm generate:preview`, both focused Vitest files, the local and snapshot CLI integration files, and `pnpm exec playwright test tests/e2e/catalog-editors.spec.ts`. Expect all implemented IDs to pass. Commit with the batch message above.

## Milestone 3 · Verify and coordinate the release

### Task 9 · Cross-catalog coverage and compatible installer gate

**Files**

- Modify `tests/e2e/catalog-editors.spec.ts`, `tests/integration/{www-route,component-recipe-cli,component-recipe-snapshot,foundation-groups}.test.ts`, `scripts/foundation-evidence.mjs`, `apps/www/src/editor/editable-components.ts`, `apps/www/src/snapshots/install-command.ts`, `docs/06-online-editor.md`, and `docs/cli-release.md`.
- Extend `scripts/prepare-recipe-consumer.ts` for catalog parity fixtures and `tests/helpers/recipe-browser.ts` for their browser comparison. Update browser counts in `README.md` and `docs/foundation-local-usage.md`.

**Interfaces**

- `catalogRecipeMinimumCli` is the exact package version from the verified compatible candidate. The public route and command gate compares it with the configured published installer. Use the local built installer for parity and keep the local test override out of public builds.

- [ ] Add final failing checks for exact equality between chooser IDs and `supportedComponentIds`, Customize links for all 23, and the installer gate with `0.5.0` versus the compatible candidate. Assert the published page and editor never advertise an incompatible install command. Record the new exact browser inventory in the evidence validator and its synthetic test report.
- [ ] Add matrix checks that compile each component in every supported family, install downloaded JSON and a code from the local snapshot service for each component, and compare normalized DOM and computed styles in light and dark with matching viewport and dark selector. Use prepared Vite consumers for the all-component comparison and a Next.js consumer for Badge, a native control, and a portalled overlay. Keep the existing Button cases in the foundation suite.
- [ ] Run the focused route, recipe integration, and catalog browser specs. Expect the final release-gate and cross-catalog fixture checks to expose the missing production wiring.
- [ ] Wire the prepared fixtures into browser parity and use one production availability check for the route, chooser, Customize action, and installer command. Use the compatible candidate's version in gate tests. Keep public configuration on the currently published CLI until the release step. Update the local usage and release documentation with the verified inventory and enablement order.
- [ ] Run `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, the documented hosted-storage tests, and `pnpm check:foundation`. Pack and smoke-test the candidate with lifecycle scripts disabled per the release docs. Record actual browser and manager coverage and any failed gates. Require all release gates before enabling the public feature.
- [ ] Commit the coverage and gate with `test(editor): verify catalog recipe parity and release gating`. Follow the repository release process to make the verified compatible CLI available before enabling the 23 editors and switching public commands. Commit any website version pointer separately with `chore(release): point editor commands at the catalog recipe installer`.
