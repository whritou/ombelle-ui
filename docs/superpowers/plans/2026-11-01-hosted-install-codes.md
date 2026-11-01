# Hosted Install Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish presets and Button recipes on the selected free Vercel/Neon services and install them on another machine using a code alone.

**Architecture:** Preserve the existing preset snapshot API and guarded installer. Add recipe snapshot contracts, awaitable SQLite/Postgres stores, official-origin code resolution, publication/share UI, production static previews, and a self-contained distributable CLI. Verify isolated storage and preview deployments before production.

**Tech Stack:** Existing TypeScript/React/Next.js/Vite compiler stack; Node 24.19.0; pnpm 11.25.0; `pg` 8.23.1 (MIT); `@vercel/functions` 3.10.5 (Apache-2.0). The two new package versions/engines/licenses were read from the official npm registry on 2026-11-01; inspect dependencies and lifecycle scripts before installing.

**Spec:** [Approved design](../specs/2026-11-01-hosted-install-codes-design.md).

## Global Constraints

- Work in the existing `feat/hosted-install-codes` branch from `acd7873`; use Conventional Commits and commit each completed task.
- Keep Node 24.19.0 and pnpm 11.25.0 for repository verification. The known local Node binary is `C:/Users/whrit/AppData/Local/nvm/v24.19.0/node.exe`; invoke pnpm's JS entry with that binary so the fallback launcher cannot select another Node.
- Install with lifecycle scripts disabled and frozen locks for verification; review intentional lock changes when adding the exactly pinned driver/helper dependencies.
- Official origin: `https://ombelle-ui.vercel.app`. Vercel project: `whritearthur-9467s-projects/ombelle-ui`. Existing Neon Free resource: `neon-carmine-cable`, project `delicate-tooth-65251690`. Never provision a substitute database or enable a paid plan.
- Keep preset format `ps_<32 lowercase hex>@1`; new recipe format `rc_<32 lowercase hex>@1`; random IDs have 128 bits, three collision retries, immutable embedded identities, and explicit publication.
- Publication limits: 65,536-byte input/normalized payload, depth 16, ten-second body deadline, 128 KiB envelope, 24-hour idempotency; shared quotas five attempts/client/minute, twenty publications/client/UTC day, 1,000 publications globally/UTC day; combined cap 100,000 records and 256 MiB canonical responses.
- Preserve `--yes`, dry-run, conflict/stale-plan checks, manager and lockfile preservation, transactional recovery, and disabled dependency lifecycle scripts.
- Local JSON and existing explicitly pinned custom-origin/offline preset installation remain supported. Code-only mode trusts the official HTTPS origin and has no automatic offline fallback.
- Runtime/builds never create or migrate databases. Migrations are explicit, reviewed, versioned, and tested on isolated branches. Preview deployments must not write production data.
- Read the relevant bundled Next.js guide under `apps/www/node_modules/next/dist/docs/` before framework changes. Edit source schemas under `schemas/` and regenerate bindings; relative package imports retain `.js`.
- No accounts, Auth, Realtime, arbitrary source execution, other scoped components, mutable aliases, listing/search, paid upgrades, or unrelated redesigns.

## Review Focus

1. A hostile registry envelope swaps its reference/kind or claims a different built-in preset: reject before planning (Tasks 1 and 5).
2. A rolling deployment or missing Neon environment silently sends preview writes to production or SQLite: fail closed (Tasks 3 and 6).
3. Concurrent cross-kind retries and mixed preset/recipe publications oversubscribe quotas or create duplicate identities: one atomic shared budget and content-bound retry (Tasks 2 and 3).
4. A late recipe response after edit/cancel/recovery revives stale install output, or HTTP 410 becomes retryable: ignore stale operations and keep withdrawal terminal (Task 7).
5. A packed CLI or hosted preview works only inside the monorepo/dev server: test unpacked distribution and actual nested production URLs with no repository dependencies (Tasks 6 and 8).

## File Structure and Boundaries

| Area | Files and responsibility |
| --- | --- |
| Contracts/compiler | `schemas/recipe-snapshot.schema.json`, `schemas/recipe-snapshot-source.schema.json`, generated bindings, `packages/contracts/src/recipe-snapshot.ts`, `packages/compiler/src/recipe-snapshot.ts`: shape, identity, normalization, integrity |
| Storage | Existing `snapshots/server/store.ts`, `sqlite-store.ts`, `service.ts`, `config.ts`; new `postgres-store.ts`, `postgres-migrations.ts`, `recipe-service.ts`: storage adapters, explicit migrations, request services |
| API | Existing preset routes and `http.ts`; new recipe route pair and `recipe-http.ts`: bounded HTTP publication/read semantics |
| CLI | Existing `snapshots/input.ts`, `source.ts`, `main.ts`, lock writers; new `snapshots/recipe-input.ts`, `recipe-source.ts`, `recipe-cache.ts`: resolve once, provenance, post-apply caching |
| Preview/deploy | New `apps/www/src/editor/preview-url.ts`, `scripts/build-hosted-preview.mjs`, `vercel.json`; existing frame components/package scripts: deterministic static runtime and production build |
| Recipe website | New `apps/www/src/recipe-snapshots/` controller/storage/components and share route; existing Button editor: explicit publish/recovery and exact compiled share output |
| Distribution | New `scripts/pack-cli.mjs`, release manifest/notice generation and packed-consumer test; existing install-command helper: tested artifact and honest versioned commands |
| Evidence | New `docs/evidence/hosted-install-codes.md`; updated operations/usage/status docs: measured results, deployed source, release identity and limits |

### Task 1: Recipe Snapshot Contracts and Integrity

**Files:** Create the two recipe snapshot source schemas, `packages/contracts/src/recipe-snapshot.ts`, `packages/contracts/test/recipe-snapshot.test.ts`, `packages/compiler/src/recipe-snapshot.ts`, and `packages/compiler/test/recipe-snapshot.test.ts`. Modify exports, `scripts/sync-schema.mjs`, and `packages/contracts/src/types.ts`.

**Interfaces:** `RecipeSnapshot` contains exact keys `{ snapshotVersion: '1.0', id, revision: 1, recipe, recipeHash, preset, presetHash, catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt, validationStatus: 'draft' }`. `RecipeSnapshotSource = { origin, reference, recipeHash }`. Produce `parseRecipeSnapshotReference(value: string): { id: string; revision: 1 }`, `validateRecipeSnapshot(input: unknown): RecipeSnapshot`, `validateRecipeSnapshotSource(input: unknown): RecipeSnapshotSource`, `normalizePublishedRecipe(input: unknown): Promise<RecipeCompileResult>`, and `verifyRecipeSnapshot(input: unknown, expected?: { reference: string; recipeHash: string }): Promise<RecipeSnapshot>`. Add optional `ProjectLock.recipeSources?: Record<string, RecipeSnapshotSource>` and `InstallPlan.recipeResolution?: { source: RecipeSnapshotSource; via: 'network' | 'cache' }`.

- [x] **Step 1: Add failing tests.** For the following core test, also cover wrong IDs/kinds, unknown keys, noncanonical recipes, wrong preset identity/content, unsupported releases, unsafe dates, wrong hashes, and both payload/envelope limits.

```ts
it('rejects a recipe envelope whose resolved preset differs from its builtin reference', async () => {
  await expect(verifyRecipeSnapshot(snapshotWithOtherPreset)).rejects.toThrow()
})
```

- [x] **Step 2: Run RED.** `pnpm exec vitest run packages/contracts/test/recipe-snapshot.test.ts packages/compiler/test/recipe-snapshot.test.ts`; expect the new contract/verification assertions to fail.
- [x] **Step 3: Implement.** Resolve through existing `compileRecipe`; store its normalized recipe/preset and hashes. Verify against recompilation and canonical payload equality, without changing existing artifact generation. Register external schema references correctly with Ajv.
- [x] **Step 4: Run GREEN.** Build packages, rerun these tests and existing snapshot/recipe compiler tests, then typecheck. Require all assertions to pass and inspect generated bindings alongside schemas.
- [x] **Step 5: Commit.** `feat(contracts): validate immutable recipe snapshots`.

### Task 2: Awaitable Local Store and Shared Publication Budgets

**Files:** Modify `apps/www/src/snapshots/server/store.ts`, `sqlite-store.ts`, `service.ts`, `scripts/snapshot-store.ts` and existing callers/tests. Create `tests/integration/recipe-snapshot-store.test.ts`, `apps/www/src/snapshots/server/recipe-service.ts`, and `tests/helpers/publication-store-contract.ts`.

**Interfaces:** Preserve preset methods and accept `Awaitable<T> = T | Promise<T>` on the `SnapshotStore` port. Add `publishRecipe(input: { compiled: RecipeCompileResult; idempotencyKey: string; clientKey: string; now: number }): Awaitable<{ snapshot: RecipeSnapshot; replayed: boolean }>`, `lookupRecipe(ref: { id: string; revision: 1 }): Awaitable<RecipeSnapshot>`, `withdrawRecipe(ref, reason: WithdrawalReason, now: number): Awaitable<void>`, and `unwithdrawRecipe(ref): Awaitable<void>`. Produce `createRecipeSnapshotService(config: SnapshotConfig, store: SnapshotStore): RecipeSnapshotService`, where `RecipeSnapshotService` has `publish(request: Request): Promise<{ snapshot: RecipeSnapshot; replayed: boolean }>` and `read(ref: { id: string; revision: 1 }): Promise<RecipeSnapshot>`.

- [x] **Step 1: Add failing store contract tests.** Reuse the contract for both adapters in Task 3. Cover five shared attempts/minute, twenty combined daily publications/client, cross-kind same-key conflict, retry without double daily consumption, immutable rows, bounded cleanup, 256 MiB/100,000-record capacity, three ID collisions, schema-version failure, withdrawal/replay, and concurrent connections.

```ts
it('shares the daily publication quota across presets and recipes', async () => {
  await publishNineteenPresets(store, client)
  await publishRecipe(store, client)
  await expect(publishPreset(store, client)).rejects.toMatchObject({ status: 429 })
})
```

- [x] **Step 2: Run RED.** `pnpm exec vitest run tests/integration/recipe-snapshot-store.test.ts tests/integration/snapshot-store.test.ts`; expect new recipe/shared-budget cases to fail.
- [x] **Step 3: Implement.** Await the port from service/operator code. Add an explicit SQLite v1-to-v2 migration for recipe records, kind-aware retry/withdrawal state, and shared capacity/quota bookkeeping. Migration preserves old snapshots and rejects an over-cap existing store without deleting data. Runtime opens verify schema only. Return controlled errors after rollback; immutable response content never changes.
- [x] **Step 4: Run GREEN.** Run both store suites and the existing snapshot API/operator tests. Require legacy preset semantics and atomic retry/rollback assertions to pass.
- [x] **Step 5: Commit.** `feat(snapshots): persist recipe snapshots with shared quotas`.

### Task 3: Neon Postgres Adapter and Explicit Operators

**Files:** Create `apps/www/src/snapshots/server/postgres-store.ts`, `postgres-migrations.ts`, `postgres-pool.ts`, `store-factory.ts`, `tests/hosted/postgres-snapshot-store.test.ts`, `tests/hosted/postgres-snapshot-operator.test.ts`, and `vitest.postgres.config.ts`. Modify app dependencies, config/service/operator code, `.gitignore`, and environment template. Real-Neon tests have a dedicated command so ordinary integration does not require cloud secrets; the hosted evidence run remains mandatory.

**Interfaces:** Produce `openPostgresSnapshotStore(connectionString: string): Promise<SnapshotStore>`, `initializePostgresSnapshotStore(directConnectionString: string): Promise<void>`, and `openConfiguredSnapshotStore(config: SnapshotConfig): Promise<SnapshotStore>`. Backend config is a discriminated union selected by `OMBELLE_SNAPSHOT_BACKEND=sqlite|postgres`; unselected existing local `OMBELLE_SNAPSHOT_DB_PATH` keeps documented SQLite behavior. Postgres uses server-only `DATABASE_URL`, explicit migrations use `DATABASE_URL_UNPOOLED`. Never silently switch backend. Keep one bounded pool per connection configuration and attach its Vercel lifecycle once.

- [x] **Step 1: Add failing tests.** Run Task 2's shared contract against an isolated Neon branch. Add missing/invalid backend settings, lazy imports, import/build without a database, no request-time DDL, pooled/direct distinction, timeout/rollback, transaction concurrency and preview isolation.

```ts
it('does not fall back to SQLite when postgres configuration is incomplete', () => {
  expect(() => readSnapshotConfig(postgresEnvWithoutUrl)).toThrow()
})
```

- [x] **Step 2: Run RED.** `pnpm test:hosted-storage` and focused `apps/www/src/snapshots/server/config.test.ts`; require evidence of missing adapter/config behavior before implementation.
- [x] **Step 3: Implement.** After inspecting package metadata/scripts and the exact lock delta, add `pg@8.23.1`, `@vercel/functions@3.10.5`, and a registry-verified pinned `@types/pg` version. Use parameterized SQL, transaction-scoped locks with consistent ordering, atomic quotas, immutable-row triggers, size/hash verification, bounded statements and cleanup. Versioned initialization is operator-only. Extend existing operator commands to both kinds and backends; document direct `pg_dump`/restore instead of pretending SQLite backup applies to Postgres.
- [x] **Step 4: Run GREEN.** Run shared storage/config/operator tests against real isolated storage. Apply migrations there twice and show idempotence; unknown/future schema fails. Inspect schema and prove production was not touched. Run typecheck and app build without DB credentials.
- [x] **Step 5: Commit.** `feat(snapshots): add Neon Postgres persistence`.

### Task 4: Recipe HTTP API and Read Page Boundary

**Files:** Create `apps/www/src/snapshots/server/recipe-http.ts`, `apps/www/src/app/api/v1/recipes/route.ts`, `apps/www/src/app/api/v1/recipes/[id]/[revision]/route.ts`, and `tests/integration/recipe-snapshot-api.test.ts`. Modify shared errors/body/request-service helpers only where needed.

**Interfaces:** Produce `handleRecipeSnapshotPublish(request: Request, service: RecipeSnapshotService): Promise<Response>` and `handleRecipeSnapshotRead(request: Request, params: { id: string; revision: string }, service: RecipeSnapshotService): Promise<Response>`. Raw path strings are validated before any storage access. POST takes exactly `{ recipe }`, matching Origin and UUID-v4 Idempotency-Key. GET/HEAD use exact recipe references and canonical envelope bytes.

- [x] **Step 1: Add failing tests.** Actual handler requests cover 201/200 retries, 409 content/kind conflicts, 403 origin, 413 size, 415 media/encoding, 422 releases, malformed references before I/O, unsupported methods/OPTIONS, 404/410, canonical ETags/304/HEAD, corrupt storage, and body deadline/depth. Share existing controlled error shape and never leak SQL, secrets, or payload on withdrawal.

```ts
it('checks withdrawal before conditional recipe reads', async () => {
  const response = await getWithdrawnRecipe({ ifNoneMatch: priorEtag })
  expect(response.status).toBe(410)
  expect(await response.text()).not.toContain(recipe.content)
})
```

- [x] **Step 2: Run RED.** `pnpm exec vitest run tests/integration/recipe-snapshot-api.test.ts`; expect absent handlers/service behavior to fail.
- [x] **Step 3: Implement.** Use Task 2's service and existing bounded body/identity policy; introduce no CORS/account API. Read and write share a controlled error boundary and verified canonical bytes.
- [x] **Step 4: Run GREEN.** Run new API tests plus existing preset API/body/client-key tests and typecheck.
- [x] **Step 5: Commit.** `feat(api): publish and resolve immutable recipe codes`.

### Task 5: Code-only CLI Resolution, Provenance and Cache

**Files:** Modify `packages/cli/src/snapshots/input.ts`, `source.ts`, `main.ts`, `format.ts`, project inspection and all lock writers. Create `snapshots/recipe-input.ts`, `recipe-source.ts`, `recipe-cache.ts`, `tests/integration/hosted-code-cli.test.ts`, and `recipe-snapshot-provenance.test.ts`; extend focused unit/cache tests.

**Interfaces:** Export shared `officialSnapshotOrigin = 'https://ombelle-ui.vercel.app'`. Preset inputs with no remote flags resolve only there; alternate origin still requires `--preset-hash`. Produce `resolveRecipeInput(value: string, options: { origin?: string; expectedHash?: string; offline?: boolean; cacheRoot: string }): Promise<{ recipe: Recipe; snapshot?: RecipeSnapshot; source?: RecipeSnapshotSource; resolution: 'local' | 'network' | 'cache'; networkAccess: boolean }>` and `applyRecipeSourceToPlan(plan, context, input): Promise<void>`. Introduce `--recipe-hash` only for explicitly pinned remote recipe inputs. Reuse existing safe-cache helpers without treating recipe envelopes as preset envelopes.

- [x] **Step 1: Add failing tests.** Code-only official requests, local paths beginning with similar prefixes, malformed IDs/kind swaps, required custom-origin pins, unavailable service without stale fallback, no body over 128 KiB, no redirects/TLS bypass, wrong hashes/releases/identity, code-only offline guidance, preserved explicit preset offline behavior, and resolution once per command.

```ts
it('plans a recipe code without changing global defaults', async () => {
  const result = await runCli(['add', '--recipe', recipeCode, '--dry-run', '--json'])
  expect(result.status).toBe('planned')
  expect(result.recipeResolution.source.reference).toBe(recipeCode)
  expect(await readProjectDefaults()).toEqual(beforeDefaults)
})
```

- [x] **Step 2: Run RED.** Build current packages first, then `pnpm exec vitest run tests/integration/hosted-code-cli.test.ts tests/integration/recipe-snapshot-provenance.test.ts`.
- [x] **Step 3: Implement.** Separate local/official/pinned-custom resolution before planning. Official mode verifies envelope identity and recomputed hashes, then records actual origin/reference/hash. Preserve existing explicit pinning tests and update only assertions intentionally adding official mode. Recipe sources are keyed by embedded `id@revision`, validated against installed normalized bytes without fetching, and copied by every unrelated lock writer. Identical installs preserve prior provenance; different content under the same identity conflicts. Cache only after successful apply/no-op; failed cache writes warn after success. No cache writes during dry-run/conflict/cancel/failure.
- [x] **Step 4: Run GREEN.** Build packages, run new and existing snapshot/recipe CLI, cache, provenance and editor-export integration suites, then typecheck. Verify later ordinary adds work with all network disabled and all supported manager metadata remains preserved.
- [x] **Step 5: Commit.** `feat(cli): install hosted presets and recipes by code`.

### Task 6: Hosted Preview Runtime and Vercel Build

**Files:** Create `apps/www/src/editor/preview-url.ts`, its test, `scripts/build-hosted-preview.mjs`, `tests/integration/hosted-preview-build.test.ts`, and `vercel.json`. Modify iframe components, Vite config, package build scripts, `.gitignore`, and deployment/environment documentation.

**Interfaces:** `previewFrameUrl(kind: 'editor' | 'preset', override?: string): string` defaults to static paths under `/ombelle-preview/` in production; validated explicit loopback override preserves fixture/dev behavior. The build script builds generated Vite preview output with that base into an owned staging directory and copies only its owned subtree to `apps/www/public/ombelle-preview`. It never removes other public assets or touches the database.

- [x] **Step 1: Add failing tests.** Production URLs contain no loopback or absolute local path; override validation rejects unsupported schemes/credentials; nested runtime asset URLs and compiler workers return usable JS. Force older iframe ACK/session messages to confirm the hosted path keeps existing fences.

```ts
it('uses hosted preview paths without weakening the iframe sandbox', () => {
  expect(previewFrameUrl('preset')).toBe('/ombelle-preview/preset-preview/')
  expect(renderedIframe.props.sandbox).toBe('allow-scripts')
})
```

- [x] **Step 2: Run RED.** `pnpm exec vitest run apps/www/src/editor/preview-url.test.ts tests/integration/hosted-preview-build.test.ts`.
- [x] **Step 3: Implement.** Read bundled Next static/public and deployment guidance. Build packages, generate exact preview sources, build Vite assets/worker bundles, then Next. Explicitly map the two existing runtime entry routes to generated static files if Vite's single entry output needs separate HTML wrappers. Keep protocol checks and generated modules intact. Configure Vercel's monorepo root/build commands and Node 24 runtime; install scripts remain disabled. Use documented Vercel ingress and validated deployment URLs for production/preview origin config, never request Host. Test protected preview access with Vercel tooling rather than disabling project protections.
- [x] **Step 4: Run GREEN.** Build preview and product with no database credentials, serve the production build, and run focused browser checks against both nested runtime URLs plus existing editor suites with explicit local override. Require ready acknowledgements, correct compiled output and asset MIME types, and no local-dev dependency.
- [x] **Step 5: Commit.** `feat(web): host isolated editor previews on Vercel`.

### Task 7: Recipe Publication, Recovery and Share UI

**Files:** Create `apps/www/src/recipe-snapshots/` with focused publication model/controller, bounded session storage, install-command helper, publish component and published-recipe view; add `apps/www/src/app/recipes/[id]/[revision]/page.tsx`. Modify Button editor and existing preset install-command choices. Create controller/storage/command tests and `tests/e2e/recipe-snapshots.spec.ts`.

**Interfaces:** Recipe attempts capture normalized recipe/hash, UUID-v4 key and timestamp with 24-hour/128 KiB recovery bounds. `createRecipePublicationController` and `useRecipePublication` mirror existing preset semantics with independent storage keys. `recipeSnapshotInstallCommand(source: RecipeSnapshotSource, release?: { packageName: string; version: string }): string` generates exact code-only official commands or explicitly pinned private/custom-origin commands. Preset `snapshotInstallCommand` gains the equivalent official-origin mode without dropping custom-origin pins. `PublishedRecipe({ snapshot, origin })` displays exact verified generated recipe artifacts using the existing isolated Button preview.

- [x] **Step 1: Add failing tests.** No background publication; consent before POST; successful publication/code; duplicate suppression; lost-response retry; explicit recovery after refresh; storage/clipboard denial; edits/cancel/reset retire stale results; a retired digest/ACK cannot update output; 410 terminal; unavailable API leaves local exports usable; share page does not overwrite saved drafts.

```ts
it('ignores a successful recipe response after the draft changes', async () => {
  const request = controller.publish()
  controller.setDraft(newRecipe)
  reply(oldSnapshot)
  await request
  expect(controller.getState().lastPublished).toBeNull()
})
```

- [x] **Step 2: Run RED.** Run new unit/controller tests and the authored feature browser cases; missing publication/share UI must fail meaningfully.
- [x] **Step 3: Implement.** Reuse existing patterns rather than rewriting preset publication. Expose publication only for a fresh successful compile, capture exact normalized input, and preserve ID/revision immutability guidance. The read-only share page verifies current availability and shows exact reference, hashes, releases, draft status, public retention/withdrawal limits, artifacts and install scope. Keyboard, narrow viewport, status announcements and copy/download fallback remain usable. Do not generate a public package runner until Task 8's release is real.
- [x] **Step 4: Run GREEN.** Run new unit/browser suites, existing preset publication regressions and typecheck. Compare installed recipe bytes, DOM and computed styles against published preview for flat/minimalist/neo-brutalism in light/dark. Exercise Vite/Next consumers and differently themed hosts without altering their defaults.
- [x] **Step 5: Commit.** `feat(editor): publish and share installable recipe codes`.

### Task 8: Self-contained CLI Distribution and Real Runner Commands

**Files:** Create `scripts/pack-cli.mjs`, `tests/integration/packed-cli.test.ts`, release metadata/third-party notice generation, and a release usage guide. Modify only the CLI manifest/build pipeline and website command helpers needed for the verified release.

**Interfaces:** `pnpm pack:cli` builds a standalone tarball and manifest under `.artifacts/cli-release/`; default candidate package is `@ombelle/cli@0.1.0` with `ombelle` bin. The packed manifest has no `workspace:*`, repository-only exports or install lifecycle scripts. Produce runner commands for npm/pnpm/Yarn/Bun referencing the same verified immutable version.

- [x] **Step 1: Add failing tests.** Inspect tarball contents and install it in a clean temporary project with scripts disabled and no monorepo resolution. Exercise help, code/local resolution, plan/apply and later offline additions. Check required license/notice contents and absence of secrets, `.env`, SQLite files, generated test consumers and source paths.

```ts
it('runs the packed ombelle bin without unpublished workspace packages', async () => {
  const packed = await installPackedCliOutsideRepo()
  expect(packed.manifest.dependencies).not.toHaveProperty('@ombelle/compiler', 'workspace:*')
  expect(await packed.run(['--help'])).toMatchObject({ exitCode: 0 })
})
```

- [x] **Step 2: Run RED.** `pnpm exec vitest run tests/integration/packed-cli.test.ts`; expect the current private/workspace package to fail isolation assertions.
- [ ] **Step 3: Implement.** Bundle internal code/data while preserving Node built-ins and tested third-party behavior, emit licenses, and pack the exact candidate. Verify npm namespace ownership and the authenticated publishing identity after the tarball is ready. Publish only under the existing approved namespace with verified access. If account action is required, finish all other authorized work and present the concrete artifact/account step. Until publication is confirmed, keep truthful private/local commands; do not silently mark a release available.
- [ ] **Step 4: Run GREEN.** Install the exact tarball independently under the supported runners, test Node/Bun entry behavior as applicable, and check bytes/provenance. After any real release, fetch the pinned registry version in a fresh project and compare its integrity to the prepared artifact before enabling public website commands.
- [x] **Step 5: Commit.** `build(cli): package a standalone public installer`.

**Account gate:** Standalone candidate and all ten local package/runner assertions pass. npm reports ENEEDAUTH; registry lookup is 404, which does not prove namespace access. Actual publication and post-publication integrity checks in Steps 3–4 remain pending. Continue Task 9's independent verification before requesting account action, as this task instructs.

### Task 9: Integrated Verification, Deployment and Measured Evidence

**Files:** Create `docs/evidence/hosted-install-codes.md`; update README, delivery status, local usage, CLI/editor contracts and snapshot operations. Add only missing journey tests under `tests/integration/hosted-code-journey.test.ts` and focused hosted browser configuration.

**Interfaces:** Consume the actual release manifest, committed source SHA, Vercel deployment ID, private preview connection and production URL. Produce measured evidence linking these identities, commands, tool versions and outcomes without secrets. No fabricated aggregate or merged partial pass.

- [x] **Step 1: Add failing journey assertions.** Publish a preset and recipe through real handlers, install by exact code from an independent CLI process, verify generated bytes/default preservation, restart/redeploy, read the same snapshots, withdraw, and verify later ordinary additions use saved defaults with the service unavailable. Tests use isolated Neon storage; only explicitly labelled public smoke publications are allowed on production after preview passes.
- [x] **Step 2: Run RED/GREEN for missing coverage.** `pnpm build:packages`, focused journey integration and the new feature browser suite; identify actual failures and fix within the owning task without weakening checks.
- [ ] **Step 3: Verify the branch.** Run package build, relevant full unit/integration checks, typecheck, preview/product production builds, packed-consumer checks, workspace audit, and the appropriate foundation evidence gate with the required pinned manager/browser toolchain. Use one integration/consumer worker on this host. Preserve failed attempts and generated evidence, and inspect source/generated diffs. Broad runs are not repeated without new changes, failures or unresolved concerns.
- [ ] **Step 4: Deploy and smoke-test.** Verify named project linkage and free plans, set server-only variables without logging values, apply the reviewed migration on a Neon preview branch, and deploy the exact committed implementation to an isolated Vercel preview. Verify publication/API/static runtime/installed parity and absence of production writes. Then initialize the empty production schema explicitly, deploy/promote to `https://ombelle-ui.vercel.app`, and smoke-test independent code installs and persistence across one redeployment. If auth/package publication blocks final launch, retain concrete preview/release artifacts and explain the exact remaining account step; never claim completion.
- [ ] **Step 5: Review and commit evidence.** Run a fresh whole-branch review, fix confirmed findings with focused regressions, and commit `docs(evidence): record hosted install-code verification`. Record public retention/withdrawal policy, origin trust, free-plan quotas, npm release identity and browser/manual-review limits. Require a clean tracked tree before reporting the actual completion status.

## Self-review

The plan maps the approved spec to Tasks 1–9: strict schemas and compiler parity (1), shared immutable local persistence and quotas (2), real hosted storage/migrations (3), recipe HTTP parity (4), CLI scope/provenance/cache (5), actual deployment/preview assets (6), usable publication/recovery/share experience (7), clean public distribution (8), and release/evidence (9). Review Focus cases are assigned to concrete tests. Interfaces retain preset/recipe distinctions, explicit custom-origin pinning, lock v1 compatibility and existing compiler bytes. Package ownership and final public-release access are gated at the prepared-artifact stage rather than blocking independent implementation work.

## Execution Review

The user approved this plan and selected native execution on 2026-11-01. Execute all tasks continuously, retain the progress ledger across compaction, and obtain the required fresh whole-branch review at the end.
