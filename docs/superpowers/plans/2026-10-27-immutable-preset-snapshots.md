# Immutable Preset Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an immutable preset from the local editor and install the same verified data globally or for one Button, preserving offline future additions.

**Architecture:** Extend the existing Next.js app with Node route handlers and a transactional SQLite storage port. Share snapshot contracts and canonical verification across app/CLI; keep persistence and transport outside the compiler. Add publication state, read-only sharing, explicit remote resolution, and optional offline cache to existing flows.

**Tech Stack:** Node 24.19.0, pnpm 11.25.0, TypeScript ESM, existing Next.js 16.4.3 and React 19.3.1, built-in `node:sqlite`, AJV, Vitest, Playwright/axe. No new npm dependencies.

**Spec:** [Approved design](../specs/2026-10-27-immutable-preset-snapshots-design.md), approved on 2026-10-27. Baseline `6fbce75`; design commit `d37e962`; branch `feat/immutable-preset-snapshots`.

## Global Constraints

- Use the existing clean branch; do not reset or overwrite user work. Conventional commits and `type/short-kebab-case` branches apply.
- Preset schema `1.0`, catalog/compiler `0.1.0`, current flat/minimalist/neo-brutalism only; existing normalized/compiler bytes and local file semantics remain unchanged.
- Snapshot `ps_` plus 32 lowercase hex characters, exactly `@1`; embedded preset ID/revision stay unchanged. Every new intent creates an ID; only a 24-hour idempotent retry reuses one.
- Input/normalized preset limits: 65,536 bytes each; nesting 16; body deadline ten seconds. Response/cache/session-envelope limit: 128 KiB; pending session expiry: 24 hours.
- Quotas: five POST attempts/client/minute; twenty new snapshots/client/UTC day; 1,000 new snapshots/global/UTC day. Capacity: 100,000 records and 512 MiB canonical response bytes. DB lock wait: 250 ms.
- SQLite uses a persistent local volume and Node runtime; no Edge/ephemeral-hosting claim. Initialize/migrate explicitly; importing/building/request handling never creates or migrates a database.
- Public payloads do not expire automatically; operator withdrawal affects fresh reads/replays; no account, revision ownership, aliases, recipe publication, or public listing.
- Remote CLI needs `--snapshot-origin` and `--preset-hash`; literal loopback alone may use HTTP. Never follow redirects or disable TLS verification. `--offline` is explicit.
- Dry-run/cancel/conflict/failed apply performs no cache writes. Later ordinary adds never fetch. `--yes` preserves all existing validation/conflict/transaction rules; dependency scripts stay disabled.
- Public CLI packages, runner tabs, provisioning, deployment, and actual public preset publication are outside execution scope. Retain honest private-repository commands.
- Package `.js` imports and existing app extensionless imports stay consistent. Edit schemas/catalog sources and regenerate bindings; never hand-edit generated outputs.
- Read `apps/www/AGENTS.md` and installed Next.js docs before app changes. Relevant local guides already located: `apps/www/node_modules/next/dist/docs/01-app/01-getting-started/{03-layouts-and-pages,15-route-handlers}.md`.

## Review Focus

1. A committed publish whose response is lost, then withdrawn before retry, must return 410 without leaking the stored payload (Task 4).
2. Two public codes with the same embedded preset ID/revision must preserve existing scoped byte conflicts and deterministic paths (Task 7).
3. An old browser response arriving after an edit/reset/unmount must not label a newer draft published (Task 8).
4. A user-owned cache path replaced by a symlink/junction, or eviction racing another process, must not write/delete outside the cache root (Task 5).
5. SQLite/proxy configuration absent during a build or local-only editor visit must not initialize storage or break offline exports (Tasks 2, 4, 10).

## File and dependency map

| Owner | Files and responsibility |
| --- | --- |
| Task 1 | `schemas/snapshot.schema.json`, `schemas/snapshot-source.schema.json`, `scripts/sync-schema.mjs`; generated `packages/contracts/src/{snapshot-schema,snapshot-source-schema}.ts`; authored `snapshot.ts` and exports; `packages/compiler/src/snapshot.ts` and exports: pure contracts, normalization and integrity |
| Tasks 2–4 | `apps/www/src/snapshots/server/{config,body,client-key,errors,store,sqlite-store,service,http}.ts`; corresponding small unit files under that directory; API route files; real SQLite/API integration tests; initialization/maintenance scripts |
| Tasks 5–7 | `packages/cli/src/snapshots/{cache,input,source}.ts` with package tests; existing `main.ts`, `format.ts`, planners and project inspector; additive shared lock/plan types; CLI integration tests |
| Tasks 8–9 | `apps/www/src/snapshots/{publication,publication-storage,use-publication,install-command}.ts`, unit tests, `components/{publish-preset,published-preset}.tsx`; existing preset export panel; shared preset page |
| Tasks 10–11 | Snapshot browser/integration helpers and specs; Playwright configuration; source-evidence contracts; operations/usage/evidence docs and README/delivery status |

Task order is 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11. Each task includes its own RED/GREEN and commit. Commands below assume the pinned runtime is active; record actual executable/version rather than substituting an unverified launcher.

## Task 1: Shared immutable snapshot contracts and integrity

**Files:** Create schema/binding/authored/compiler files listed above; tests `packages/contracts/test/snapshot.test.ts` and `packages/compiler/test/snapshot.test.ts`. Modify both package `src/index.ts` exports.

**Interfaces:** Contracts export `SnapshotReference = { id: string; revision: 1 }`, `PresetSnapshot` exactly as the spec, `SnapshotSource = { origin: string; reference: string; presetHash: string }`, `parseSnapshotReference(value: string): SnapshotReference`, `validatePresetSnapshot(input: unknown): PresetSnapshot`, `validateSnapshotSource(input: unknown): SnapshotSource`, and `normalizeSnapshotOrigin(input: string): string`. Compiler exports `normalizePublishedPreset(input: unknown): Promise<ResolvedPreset>` and `verifyPresetSnapshot(input: unknown, expected?: { reference: string; presetHash: string }): Promise<PresetSnapshot>`. Canonical verification rejects a server payload that still needs normalization. Schemas reference the existing preset schema through registered AJV/FromSchema references; source schema remains separate from compiler metadata.

- [ ] **Step 1: Add failing tests.** Name the primary regression `keeps embedded identity and the existing canonical preset hash`; assert:
  ```ts
  const normalized = await normalizePublishedPreset(preset)
  expect(normalized).toEqual(await resolvePreset(preset, getCatalog('0.1.0')))
  expect((await verifyPresetSnapshot(envelope)).preset).toEqual(normalized.data)
  expect(() => parseSnapshotReference(envelope.id + '@01')).toThrow()
  ```
  Use a real built-in preset and fully specified envelope fixture. Parameterize malformed/unknown fields, unsafe revisions, invalid timestamps/hashes, different request identity, non-normalized colors/defaults, unsupported versions/family, and normalized UTF-8 byte overflow. Test origin credentials/path/query/fragment and loopback/IPv6 rules.
- [ ] **Step 2: Run RED.** `pnpm exec vitest run packages/contracts/test/snapshot.test.ts packages/compiler/test/snapshot.test.ts`; new imports/behavior must fail for the intended reason.
- [ ] **Step 3: Implement pure interfaces and schema generation.** Preserve preset identity; hash the existing canonical preset with no newline. Enforce exact snapshot version/release/status values. Bindings are generated using `scripts/sync-schema.mjs`, including registered external references. No filesystem/network/SQLite imports enter contracts/compiler.
- [ ] **Step 4: Run GREEN.** `pnpm build:packages`, the focused tests, and `pnpm typecheck`; confirm existing compiler regression tests still pass.
- [ ] **Step 5: Commit** `feat(snapshots): define canonical preset snapshot contracts`.

## Task 2: Bounded request parsing and trusted configuration

**Files:** Create `apps/www/src/snapshots/server/{config,body,client-key,errors}.ts` and matching `.test.ts` files.

**Interfaces:** `SnapshotConfig = { dbPath: string; publicOrigin: string; rateSecret: string; clientIdentity: { mode: 'development' } | { mode: 'trusted-header'; header: string } }`; `readSnapshotConfig(env: NodeJS.ProcessEnv): SnapshotConfig`; `readPublishBody(request: Request): Promise<unknown>`; `clientRateKey(headers: Headers, config: SnapshotConfig): string`; `snapshotErrorResponse(error: unknown, requestId: string, head?: boolean): Response`. Config reads `OMBELLE_SNAPSHOT_DB_PATH`, `OMBELLE_PUBLIC_ORIGIN`, `OMBELLE_SNAPSHOT_RATE_SECRET`, and optional `OMBELLE_SNAPSHOT_CLIENT_IP_HEADER`. Require a secret of at least 32 UTF-8 bytes; development identity is permitted only for a loopback public origin. Transport errors use `SnapshotServiceError` with `status`, `code`, `issues`, optional `retryAfter`.

- [ ] **Step 1: Add failing tests.** `bounds actual chunked bytes and cancels a slow stream` checks 65,537 bytes → 413, a ten-second body deadline, fatal UTF-8, JSON strings containing escaped braces, and 17 nested containers → 400. `ignores spoofable forwarding headers` rejects a configured header containing a comma/multiple IPs, missing/invalid IP, and ensures arbitrary X-Forwarded-For cannot override the trusted header. `configuration has no storage side effects` compares an untouched temporary tree before/after valid/invalid config reads.
  ```ts
  await expect(readPublishBody(oversizedRequest)).rejects.toMatchObject({ status: 413 })
  expect(await snapshotTree(configRoot)).toEqual(beforeConfigRead)
  ```
- [ ] **Step 2: Run RED.** `pnpm exec vitest run apps/www/src/snapshots/server/body.test.ts apps/www/src/snapshots/server/client-key.test.ts apps/www/src/snapshots/server/config.test.ts apps/www/src/snapshots/server/errors.test.ts`.
- [ ] **Step 3: Implement the interfaces.** Check JSON type/charset/encoding, stream/depth bounds before JSON.parse; use quote/escape-aware depth scanning. Validate absolute DB path and canonical origin; compare Origin against configuration, never Host. HMAC normalized IP using the configured secret; use one shared development bucket. Return safe request-ID errors and no-store headers, including empty HEAD errors.
- [ ] **Step 4: Run GREEN** with the same selection and `pnpm typecheck`. Test error mappings and Retry-After rather than relying on framework defaults.
- [ ] **Step 5: Commit** `feat(snapshots): guard publish requests and trusted ingress`.

## Task 3: Durable atomic store and operator commands

**Files:** Create `server/{store,sqlite-store}.ts`; `tests/integration/snapshot-store.test.ts`; `scripts/snapshot-store.ts`; `tests/integration/snapshot-store-command.test.ts`; add root scripts `snapshots:init`, `snapshots:withdraw`, `snapshots:unwithdraw`, `snapshots:backup` invoking that script through the existing tsx toolchain.

**Interfaces:** `SnapshotStore` methods: `consumeAttempt(clientKey: string, now: number): void`; `publish(input: { preset: ResolvedPreset; idempotencyKey: string; clientKey: string; now: number }): { snapshot: PresetSnapshot; replayed: boolean }`; `lookup(ref: SnapshotReference): PresetSnapshot`; `withdraw(ref: SnapshotReference, reason: WithdrawalReason, now: number): void`; `unwithdraw(ref: SnapshotReference): void`; `close(): void`. `WithdrawalReason = 'abuse' | 'security' | 'operator-request'`. `openSnapshotStore(path: string): SnapshotStore` never creates/migrates; `initializeSnapshotStore(path: string): void` is the explicit initializer. Expose `backupSnapshotStore(source: string, destination: string): Promise<void>` to the script. Inject clock/random ID only through test constructor options, not public request input.

- [ ] **Step 1: Add failing integration tests.** `one intent commits once across independent connections` sends the same key/content from two child processes, asserts one stored record and identical immutable responses after reopening. Cover conflicting key, expiry, boundary quotas and Retry-After, replay exempt from daily quota, capacity refusal with unchanged counters, unique-ID retries, transaction rollback, DB contention, unsupported schema, SQL UPDATE/DELETE rejection, withdrawal/replay, corrupt stored bytes, and consistent backup/restore. Assert WAL/SHM data is included by the backup mechanism. Seed capacity near limits directly in an owned fixture; do not create 100,000 slow publications in the test.
  ```ts
  expect(second.snapshot).toEqual(first.snapshot)
  expect(reopened.lookup(parseSnapshotReference(reference))).toEqual(first.snapshot)
  expect(second.replayed).toBe(true)
  ```
- [ ] **Step 2: Run RED.** Build packages, then `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/snapshot-store.test.ts tests/integration/snapshot-store-command.test.ts`.
- [ ] **Step 3: Implement transactions and commands.** Use built-in SQLite, parameterized statements, immutable-row triggers, separate withdrawal rows, unique retry keys, atomic daily counters/capacity, bounded expiry cleanup, WAL/full synchronization and 250 ms busy timeout. Normalize before entering transactions; commit mapping and record together. Persist rate buckets across restarts. Commands refuse existing backup destinations and unknown/future schema versions; never print bodies, keys, secrets, or raw IPs. Requests open only an initialized schema.
- [ ] **Step 4: Run GREEN** for store/command integration tests and typecheck. Confirm no tests share writable DB paths.
- [ ] **Step 5: Commit** `feat(snapshots): persist immutable presets transactionally`.

## Task 4: Next.js publish/read API

**Files:** Create `server/{service,http}.ts`, `apps/www/src/app/api/v1/presets/route.ts`, `apps/www/src/app/api/v1/presets/[id]/[revision]/route.ts`, `tests/integration/snapshot-api.test.ts`, `tests/helpers/snapshot-service.ts`.

**Interfaces:** `SnapshotService` exposes `publish(request: Request): Promise<{ snapshot: PresetSnapshot; replayed: boolean }>` and `read(ref: SnapshotReference): Promise<PresetSnapshot>`; `createSnapshotService(config: SnapshotConfig, store: SnapshotStore): SnapshotService`. HTTP exports `handleSnapshotPublish(request: Request, service: SnapshotService): Promise<Response>` and `handleSnapshotRead(request: Request, params: { id: string; revision: string }, service: SnapshotService): Promise<Response>`. Route wrappers lazily load config/open initialized store inside each request boundary; dynamic params are awaited. Use `runtime = 'nodejs'` and request-time rendering per installed Next docs. The test helper creates an initialized private DB and loopback HTTP bridge to these exact handlers, returning `{ origin, dbPath, close }`; it is not a replacement implementation.

- [ ] **Step 1: Add failing tests.** `lost response followed by withdrawal cannot replay payload` publishes, discards the response, withdraws, repeats the same key and expects 410 with no preset. Check 201/200 stable bytes, relative Location, Origin/Fetch Metadata rejection, all spec statuses and safe errors, HEAD, ETag/304 only after availability/integrity checks, malformed-path no lookup, no listing, and request-ID headers. An unconfigured import/build/request must create no DB and leave preset exports usable.
  ```ts
  expect(retry.status).toBe(410)
  expect(await retry.text()).not.toContain(originalSnapshot.presetHash)
  expect(head.headers.get('etag')).toBe(get.headers.get('etag'))
  ```
- [ ] **Step 2: Run RED.** `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/snapshot-api.test.ts`.
- [ ] **Step 3: Implement routing/service.** Perform cheap body/media/origin checks, consume attempt quota, normalize, then atomic publish. Require UUID-v4 retry keys. Read checks stored integrity and withdrawal before returning canonical JSON or 304. Apply spec caching/content-type/nosniff/Retry-After headers; route wrappers catch initialization/config errors safely.
- [ ] **Step 4: Run GREEN.** API/store selections, `pnpm typecheck`, and `pnpm build:www` with snapshot env unset. Confirm build creates no SQLite files. Test real Next routing in Task 10; handler bridge tests alone do not establish route registration.
- [ ] **Step 5: Commit** `feat(snapshots): expose preset publish and read endpoints`.

## Task 5: Verified cache with explicit offline reads

**Files:** Create `packages/cli/src/snapshots/cache.ts`, `packages/cli/test/snapshot-cache.test.ts`, `tests/integration/snapshot-cache-filesystem.test.ts`.

**Interfaces:** `SnapshotCacheKey = SnapshotSource`; `snapshotCacheDirectory(env: NodeJS.ProcessEnv): string`; `readSnapshotCache(root: string, key: SnapshotCacheKey): Promise<PresetSnapshot | null>`; `writeSnapshotCache(root: string, key: SnapshotCacheKey, snapshot: PresetSnapshot): Promise<void>`. Default platform locations: Windows LOCALAPPDATA/ombelle/cache/snapshots; macOS ~/Library/Caches/ombelle/snapshots; Unix absolute XDG_CACHE_HOME/ombelle/snapshots or ~/.cache/ombelle/snapshots. Require the explicit override to be absolute. No directory creation occurs on read.

- [ ] **Step 1: Add failing tests.** `read miss leaves cache root absent` asserts null and ENOENT. `cache substitution cannot escape owned root` substitutes symlinks/junctions at directory/file boundaries and asserts external sentinel bytes survive reads/writes/eviction. Test a corrupt/oversized/non-regular entry, mismatched envelope/hash, identical concurrent writes, differing envelope refusal, interrupted temp writes, Windows rename behavior, and limits of 100 entries/16 MiB with bounded eviction.
  ```ts
  expect(await readSnapshotCache(absentRoot, key)).toBeNull()
  await expect(fs.lstat(absentRoot)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await snapshotTree(outsideRoot)).toEqual(outsideBefore)
  ```
- [ ] **Step 2: Run RED.** Focused package test plus `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/snapshot-cache-filesystem.test.ts`.
- [ ] **Step 3: Implement cache boundaries.** Hash canonical origin/reference/expected hash into paths; validate every read through Task 1. Use owner-controlled directories, lstat/handle identity checks, exclusive random temp files, atomic publish, and containment validation before cleanup. Treat corruption as unusable; offline resolution will report a miss/corruption. Evict only validated owned entries during writes; safely abandon eviction if ownership changes. Do not follow junctions or recursively remove computed paths.
- [ ] **Step 4: Run GREEN** for both tests and typecheck on the supported host; record any filesystem permission requirement rather than relaxing tests.
- [ ] **Step 5: Commit** `feat(cli): add verified immutable snapshot cache`.

## Task 6: Remote preset inputs and guarded command flags

**Files:** Create `packages/cli/src/snapshots/input.ts`, `packages/cli/test/snapshot-input.test.ts`, `tests/integration/snapshot-cli.test.ts`; modify `main.ts`, `format.ts`, shared `types.ts`, and package CLI tests for parsing/help/output.

**Interfaces:** `PresetInputOptions = { origin?: string; expectedHash?: string; offline?: boolean; cacheRoot: string }`; `ResolvedPresetInput = { preset: Preset; snapshot?: PresetSnapshot; source?: SnapshotSource; resolution: 'local' | 'network' | 'cache'; networkAccess: boolean }`; `resolvePresetInput(value: string, options: PresetInputOptions): Promise<ResolvedPresetInput>`. Keep `readPresetFile` unchanged for local paths. `InstallPlan` gains optional `presetResolution: { source: SnapshotSource; via: 'network' | 'cache' }`; `networkAccess` becomes boolean. Existing planner defaults remain false.

- [ ] **Step 1: Add failing tests.** `dry remote plan writes neither app nor cache` snapshots project and cache-parent trees, invokes built CLI, expects correct code/hash/source/networkAccess and unchanged trees. Parameterize redirects, oversize chunked response, stalled body, wrong JSON/UTF-8/envelope/reference/hash/releases, HTTPS configuration, and ordinary/local/recipe flag rejection. Warm cache then return online 410: expect exit 5, never success. Explicit offline hit performs zero requests; miss is actionable. Check local file named like a code via `./` still works.
  ```ts
  expect(dry.code, dry.output).toBe(0)
  expect(await snapshotTree(root)).toEqual(projectBefore)
  expect(await snapshotTree(cacheParent)).toEqual(cacheBefore)
  expect(withdrawn.code, withdrawn.output).toBe(5)
  ```
- [ ] **Step 2: Run RED.** Package parsing/input tests and built-CLI `snapshot-cli.test.ts`, building packages first.
- [ ] **Step 3: Implement resolution/dispatch.** Recognize only exact bare codes. Require both remote flags; add boolean `--offline` with the spec restrictions. Construct exact GET, reject redirects, stream at most 128 KiB under one ten-second deadline, verify normalized data and required hash. Resolve once before planning and reuse in memory. Online never silently falls back. Add text/JSON source/via fields without overwriting compiler/global hash fields, particularly for component-scoped plans. No cache write yet; Task 7 wires successful apply.
- [ ] **Step 4: Run GREEN.** Package tests, built CLI selection, typecheck; assert exit 2 syntax/3 unsupported release/4 conflict/5 resolution behavior, and unchanged local help/examples except truthful added options.
- [ ] **Step 5: Commit** `feat(cli): resolve pinned remote preset inputs`.

## Task 7: Persist source provenance and cache only after apply

**Files:** Create `packages/cli/src/snapshots/source.ts`, `packages/cli/test/snapshot-source.test.ts`, `tests/integration/snapshot-provenance.test.ts`; modify shared `ProjectLock`, project `inspect.ts`, planners `components.ts`, `theme.ts`, `component-preset.ts`, `recipe.ts`, and `main.ts`.

**Interfaces:** Lock optional `presetSource?: SnapshotSource` and `componentPresetSources?: Record<string, SnapshotSource>`. `validateSnapshotSources(lock: ProjectLock, globalPreset: Preset | undefined): Promise<void>` validates shapes and resolved hashes without fetching. `applyPresetSourceToPlan(plan: InstallPlan, context: ProjectContext, input: ResolvedPresetInput, scope: 'global' | 'component'): Promise<void>` updates the planned lock change, never writes directly. Ordinary additions copy validated source fields through `baseLock`; recipe/scoped writers preserve unrelated maps. Successful apply then best-effort calls Task 5; failure produces an explicit warning while keeping success.

- [ ] **Step 1: Add failing tests.** `two codes with one embedded identity do not bypass scoped conflict` publishes two different hashes under one preset ID/revision, installs first, and asserts second conflicts with byte-identical global/scoped trees. Cover remote global source retained by fresh-process add and recipes, scoped source retained by global theme changes, orphan/wrong-hash source rejection, explicit local global clearing only global source, matching local scoped no-op, another matching code preserving prior scoped source, adding missing metadata changing lock only, cancellation/conflict/stale/dependency failure leaving cache absent, and cache-write failure warning after successful install.
  ```ts
  expect(secondInstall.code, secondInstall.output).toBe(4)
  expect(await snapshotTree(root)).toEqual(beforeConflictingInstall)
  expect(afterOrdinaryAdd.presetSource).toEqual(beforeOrdinaryAdd.presetSource)
  ```
- [ ] **Step 2: Run RED.** `pnpm exec vitest run packages/cli/test/snapshot-source.test.ts` and built provenance integration tests.
- [ ] **Step 3: Implement additive provenance.** Keep remote metadata outside existing compiler/scoped identity comparisons; validate before planners use the lock. Regenerate the planned lock content/hash using existing canonical/file-change machinery. Never relax an existing conflict or transaction precondition. Cache only after `applyPlan` returns success, including a safe no-op apply.
- [ ] **Step 4: Run GREEN.** Rebuild packages; run `pnpm exec vitest run packages/cli/test` and `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/snapshot-cli.test.ts tests/integration/snapshot-provenance.test.ts`, then typecheck. Exercise pnpm/npm/Yarn/Bun project metadata without dependency installs by seeding exact catalog dependencies.
- [ ] **Step 5: Commit** `feat(cli): preserve snapshot provenance through safe installs`.

## Task 8: Explicit editor publication with recoverable retries

**Files:** Create app snapshot `publication.ts`, `publication-storage.ts`, `use-publication.ts` with corresponding unit tests, `components/publish-preset.tsx`; modify the existing preset export panel/editor only where required.

**Interfaces:** `PublishAttempt = { storageVersion: 1; key: string; createdAt: number; preset: Preset; presetHash: string }`; `PublicationState` uses a `status` discriminant with idle/validating/publishing/published/failed and retains the attempt/last verified snapshot as appropriate. Pure `reducePublication(state, action): PublicationState` fences operation ID and draft hash. `createPublishAttempt(preset: ResolvedPreset, now: number): PublishAttempt`; `readPublishAttempt(storage: Storage, now: number): PublishAttempt | null`; `writePublishAttempt(storage: Storage, attempt: PublishAttempt): void`. `usePublication({ preset: ResolvedPreset | null; current: boolean; announce: (text: string) => void })` returns `{ state: PublicationState; confirm(): void; cancel(): void; publish(): Promise<void>; retry(): Promise<void> }`; only explicit events call POST.

- [ ] **Step 1: Add failing tests.** `new draft ignores an older successful response` dispatches a publish, changes/reset draft, resolves old response, and asserts no current-published state. Also fence asynchronous verification/unmount callbacks. Check same captured content reuses UUID key, changed content replaces it, session restore never submits, expiry/budget/malformed record rejection, denied storage retaining in-memory retry, mismatched server response rejection, and absent service leaving local export available.
  ```ts
  expect(stateAfterOldResponse.status).not.toBe('published')
  expect(retryAttempt.key).toBe(originalAttempt.key)
  expect(postsAfterSessionRestore).toBe(0)
  ```
- [ ] **Step 2: Run RED.** `pnpm exec vitest run apps/www/src/snapshots/publication.test.ts apps/www/src/snapshots/publication-storage.test.ts apps/www/src/snapshots/use-publication.test.ts`.
- [ ] **Step 3: Implement state/hook/UI.** Reuse current compiled-export guard. Add explicit public-read/retention confirmation with affirmative checkbox and publish action; cancel makes no request. Capture data/key before POST; validate response via Task 1 before success. Preserve retry intent in bounded session storage for 24 hours, request no credentials beyond same-origin defaults, keep local downloads available, and label prior published hash/current unpublished edits clearly. Use existing labels/focus/live-region patterns.
- [ ] **Step 4: Run GREEN** for app units/typecheck/product build; real browser interactions and axe are Task 10. Do not substitute mocked hook results for transport tests.
- [ ] **Step 5: Commit** `feat(editor): publish immutable presets with explicit confirmation`.

## Task 9: Shared preset page and precise installation commands

**Files:** Create `apps/www/src/app/presets/[id]/[revision]/page.tsx`, snapshot `install-command.ts`/test, `components/published-preset.tsx`, and `tests/integration/snapshot-page.test.ts`; reuse `PresetPreviewFrame` and existing generated gallery.

**Interfaces:** `snapshotInstallCommand(source: SnapshotSource, scope: 'new' | 'theme' | 'button'): string` produces the private repository command, exact reference/hash/origin, APP placeholder, dry-run/json flags. `PublishedPreset({ snapshot, origin }: { snapshot: PresetSnapshot; origin: string })` compiles through existing shared compiler/browser-safe path and uses the reviewed iframe/gallery protocol. Server page awaits params, reads service at request time, and renders available/unavailable/withdrawn states without persisting an editor draft.

- [ ] **Step 1: Add failing tests.** `all scopes use one immutable source` asserts three commands contain the same source/hash and correct init/theme/component scope. Test safe HTTPS/IPv6/loopback origin argument quoting and malicious origin rejection, no invented package runner, no request-Host origin. Page integration asserts text-escaped name, draft status, no body leakage on 410, JSON canonical content, and no local-storage draft overwrite instruction.
  ```ts
  expect(snapshotInstallCommand(source, 'button')).toContain('add button --preset ')
  expect(snapshotInstallCommand(source, 'theme')).toContain('--preset-hash ' + source.presetHash)
  expect(snapshotInstallCommand(source, 'new')).toContain(source.reference)
  ```
- [ ] **Step 2: Run RED.** Command unit and `snapshot-page.test.ts` integration selection.
- [ ] **Step 3: Implement read page.** Disable framework prerender/data caching for request-time availability using installed Next conventions. Render error states without claiming the withdrawn gallery is available. Include JSON copy/download, hash/releases, private invocation prerequisites, scope explanation, explicit retention/withdrawal text, and existing-theme copy from the spec. Share read-only view settings do not enter payload hashes. Do not create a hand-written component gallery or preset import flow.
- [ ] **Step 4: Run GREEN.** Focused tests, typecheck, product build with/without service configuration. Check no server-only/SQLite module enters client bundles.
- [ ] **Step 5: Commit** `feat(editor): share immutable preset pages and install commands`.

## Task 10: Real browser-to-CLI journey and evidence inventory

**Files:** Create `tests/e2e/snapshot-presets.spec.ts`, `tests/helpers/snapshot-browser.ts`, `tests/integration/snapshot-journey.test.ts`, `scripts/serve-snapshot-www.ts`; modify Playwright web-server configuration, `tests/helpers/editor-preset-consumer.ts`, `scripts/foundation-evidence.mjs`, `tests/integration/foundation-groups.test.ts`. Extract existing parity helpers into `tests/helpers/preset-gallery-parity.ts` only as needed, preserving old assertions/counts.

**Interfaces:** Keep existing `withEditorPresetConsumer` behavior by default; add an optional discriminated input `{ kind: 'snapshot'; source: SnapshotSource }` which installs through built CLI instead of a file and verifies installed hash. `serve-snapshot-www.ts` creates a fresh owned development DB through the operator initializer, starts the actual existing www dev entry, supplies loopback origin/secret/development identity, and forwards termination to its child. It changes no inherited production env and clears only its owned fixture. Integration services use independent roots/ports; the browser DB is per suite run.

- [ ] **Step 1: Add failing integration/browser tests.** `published preset persists across fresh offline additions` exercises actual POST/GET, built init/theme/scoped commands and later offline add; parameterize Vite/Next × four manager metadata paths, preseed dependencies, and compare frozen local/export/remote hashes. Browser suite has exactly 22 authored cases: twelve installed-gallery comparisons (three families × two modes × Vite/Next), one scoped Button in a differently themed host, and nine named behaviors: explicit confirmation/no background requests; retry after lost response; refresh recovery without submission; stale success after edit/reset; unavailable service with working local exports; clipboard/storage denial; share-page text/hash/download and safe draft; withdrawal/replay/conditional read; keyboard/320-pixel reflow/axe. Each behavioral case may use test.step for related assertions; do not duplicate titles.
  ```ts
  expect(downloadedPreset).toEqual(publishedSnapshot.preset)
  expect(jsonRecord(laterAdd.data).presetHash).toBe(publishedSnapshot.presetHash)
  expect(snapshotServiceRequestsAfterOrdinaryAdd).toBe(0)
  ```
- [ ] **Step 2: Run RED.** Built journey integration tests and `pnpm exec playwright test tests/e2e/snapshot-presets.spec.ts --workers=1` after documented consumer/preview preparation. Failures must exercise the unimplemented journey, not missing unrelated fixtures.
- [ ] **Step 3: Wire real service and parity.** Configure Playwright's www web server through the fresh DB launcher; retain preview/consumer servers and existing editor cases. Browser publication must hit actual Next route handlers/SQLite, not route.fulfill. Use existing DOM/computed-style/file/PNG and portal assertions at matching viewport/font positions. Keep all old source inventories and add `'snapshot-presets.spec.ts': 22` to the independent browser contracts. Add omission regressions for missing snapshot suite/file/assertions even if headline counts are adjusted.
- [ ] **Step 4: Run GREEN.** Focused journey, all 22 browser cases, existing 26 preset-editor and nine Button editor cases, evidence omission regression, and product build. Capture exact browser/runtime/source metadata. Native SQLite must stay server-side when CLI runs under the supported Bun runtime. No skipped/flaky/retried tests count as a passing strict matrix.
- [ ] **Step 5: Commit** `test(snapshots): prove publication and installed preset parity`.

## Task 11: Operations documentation and final verification

**Files:** Create `docs/snapshot-service-operations.md`, `docs/evidence/immutable-preset-snapshots.md`; update README, `docs/{04-presets-and-contracts,05-cli-specification,06-online-editor,07-delivery-plan,foundation-local-usage}.md`, and approved spec/plan status only to match observed implementation.

**Interfaces:** Document the exact implemented API/source/cache fields, root scripts/flags, environment variables and proxy trust prerequisite. Operations include explicit initialize, consistent backup/restore, withdrawal/unwithdrawal, quota/capacity monitoring, persistent-disk deployment requirement, no self-service deletion, cache limitations after withdrawal, and missing domain/contact/public CLI launch tasks. Examples use literal loopback and illustrative references; never invent a live endpoint or claim public distribution.

- [ ] **Step 1: Run final checks on committed implementation.** `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm build:www`, `pnpm audit:workspace`, then the documented `pnpm check:foundation` or official quality/consumer/aggregate workflow on the same clean source commit. Reuse already passing exact-source outputs only where the evidence runner permits; record new edits as a new source. Do not repeatedly rerun broad checks without a change/failure requiring it.
- [ ] **Step 2: Inspect recorded outputs.** Confirm the full 34-consumer evidence and new 22-case suite were actually collected, strict omissions fail, configuration-free product build works, successful cache/DB filesystem safety checks used unchanged assertions, and every claimed check has an exit code and environment. Distinguish focused parity, separate group passes, failed combined runs, and deployment/human-review limits.
- [ ] **Step 3: Write measured docs.** State implemented behavior and failures honestly; keep schema-valid snapshots labelled draft. Note SQLite's pinned runtime constraint and adapter boundary. Preserve local JSON instructions and distinguish global/scoped/recipe installation. Mark public launch pending until its real infrastructure/contact/distribution gates exist.
- [ ] **Step 4: Verify documentation and diff.** `git diff --check`; inspect changed documentation links/commands against help and operator scripts, generated schema diffs against source, and staged files for secrets/DB/cache artifacts. This task adds no mirror tests for prose.
- [ ] **Step 5: Commit** `docs(snapshots): record operations and measured verification`; complete the execution workflow's fresh whole-branch review and resolve actionable findings before reporting implementation complete.

## Plan self-review and handoff

Spec coverage: identity/hash/version limits → Task 1; body/config/ingress → Task 2; durability/quotas/idempotency/operation → Task 3; HTTP/errors/withdrawal → Task 4; cache/offline filesystem bounds → Task 5; transport/commands/dry-run → Task 6; all lock writers/ownership → Task 7; publication races/recovery → Task 8; read-only sharing/private commands → Task 9; real Next route registration/installed parity/evidence omissions → Task 10; full gates/retention/deployment limits → Task 11. Each Review Focus item has an owning regression above.

Self-review checks signatures and property names across tasks, rejects undefined helpers, and keeps SQLite out of neutral/browser/CLI imports. No implementation step, dependency install, new runtime test, or deployment has been performed while authoring this plan. Checkboxes remain unchecked until execution produces evidence.

Recommended execution method: subagent-driven, because storage transactions, untrusted transport, and installer provenance have different failure modes and deserve independent review at each boundary. Native execution is also available; the tasks share the signatures above and must remain sequential at integration boundaries. Await the user's plan review and execution-method selection before implementation, as required by the writing-plans workflow.
