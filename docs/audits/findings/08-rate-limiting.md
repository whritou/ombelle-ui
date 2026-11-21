# 08 — Rate limiting, quotas and abuse resistance

Date: 2026-11-21. Commit: `d162ab30586f57a2bd8b88dc8511e43fd5664bbf` (0.9.1, branch `docs/1-0-audits-wave-1`). Environment: Windows 11, Node 24.19.0, local SQLite store only.

**Covered:** every file in `apps/www/src/snapshots/server/` (including `postgres-migrations.ts`, `store.ts` and `store-factory.ts`, which the prompt does not name), the four `apps/www/src/app/api/v1/**/route.ts` handlers, the two published-code pages (`apps/www/src/app/presets/[id]/[revision]/page.tsx`, `apps/www/src/app/recipes/[id]/[revision]/page.tsx`), the editor publication clients (`apps/www/src/snapshots/use-publication.ts`, `apps/www/src/recipe-snapshots/use-publication.ts`, both `*-get-code.tsx`), the CLI transport (`packages/cli/src/snapshots/transport.ts`), `apps/www/next.config.ts`, `apps/www/vercel.json`, `scripts/monitor-production.sh`, `docs/snapshot-service-operations.md`, `docs/production-operations.md`, `docs/hosted-deployment.md`, the `/privacy` and `/security` pages, `tests/hosted/*`, `tests/helpers/publication-store-contract.ts` and `tests/integration/snapshot-*.test.ts` / `recipe-snapshot-*.test.ts`.

**Path changes since the prompt was written:** `vercel.json` is now `apps/www/vercel.json` (there is no root file). `scripts/bounded-map.ts` and `scripts/worker-budget.ts` still exist, but they are build and consumer-matrix concurrency helpers (`scripts/build-consumers.ts`, `scripts/prepare-consumers.ts`, `playwright.config.ts`). The hosted service never uses them, so they are out of scope for this audit.

**Not covered, and why:** the Postgres adapter was read but not run. `pnpm test:hosted-storage` was not run, because it reads `.env.hosted.local` and may reach a real database. Nothing was sent to production. The Vercel dashboard (firewall, WAF, spend limits) cannot be seen from the repository. Throwaway reproduction scripts and databases are in the session scratchpad (`audit-08/global-cap.mts`, `contention.mts`, `read-cost.mts`), not in the repository.

### Endpoint and limit table (from the code)

| Endpoint | Method | R/W | Limit | Window | Key | Counter lives in |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/presets` | POST | write | 30 attempts | fixed minute (`floor(now/60000)`) | HMAC(trusted IP; IPv6 → /64) | `rate_buckets` kind `attempt` (Postgres `ombelle.rate_buckets` / SQLite `rate_buckets`) |
| | | | 200 new publications | fixed UTC day | same | `rate_buckets` kind `client` |
| | | | 5,000 new publications, all clients | fixed UTC day | `''` (global) | `rate_buckets` kind `global` |
| | | | 100,000 records / 256 MiB, all time | none, permanent | global | `capacity` singleton (trigger-maintained) |
| | | | 64 KiB body, depth 16, 10 s body deadline, no compression | per request | none | in memory |
| `/api/v1/recipes` | POST | write | same budgets, **shared** with presets | same | same | same rows |
| `/api/v1/presets/{id}/{rev}` | GET, HEAD | read (DB query + re-verification) | **none** | — | — | — |
| `/api/v1/recipes/{id}/{rev}` | GET, HEAD | read (DB query + full recipe compile) | **none** | — | — | — |
| `/presets/{id}/{rev}` page | GET | read (same service read, SSR) | **none** | — | — | — |
| `/recipes/{id}/{rev}` page | GET | read (same service read with compile, SSR) | **none** | — | — | — |
| All `api/v1` routes | OPTIONS, PUT, PATCH, DELETE, GET on collection | none (405/204 without store) | none | — | — | — |
| `/ombelle-preview/*`, compiler workers | GET | static | none (CDN) | — | — | — |

The `Origin` check (`config.ts:64-74`) is a CSRF control, not an abuse control: a non-browser caller can set any `Origin` header. Every POST check before `consumeAttempt` is free for the caller: origin, media type, body read, identity.

## Summary

The limiter is well built where it applies. In both stores the check and the increment run in one serialized transaction, so the limit holds under concurrency: six processes racing on one key got exactly 30 counted attempts. The client key is an HMAC of a validated single-IP header and fails closed when that header is missing. Counters expire and are indexed. The weak point is the shape of the budget. The only ceiling on writes is a global 5,000-per-day counter. One machine with an ordinary residential IPv6 /56 reached it in 37 seconds in a local reproduction, and every other visitor's "Get code" then returns 429 for the rest of the UTC day. Repeated, the same lever fills the permanent 100,000-record capacity in about 20 days. Recovery from that is undocumented and blocked by the immutability trigger. Reads have no limit and cost a database query plus re-verification each time; a recipe read recompiles the component, about 40 ms of CPU locally. No document says what Vercel's platform layer does about volume. I would not ship 1.0 with RL-01 as it is. The other findings are shippable but should be scheduled.

## Findings

### RL-01 One client can exhaust the global daily publication cap and lock everyone out of Get code
- Severity: blocker
- Where: `apps/www/src/snapshots/server/quotas.ts:6-13`; `apps/www/src/snapshots/server/client-key.ts:9-15,26-33`; `apps/www/src/snapshots/server/postgres-store.ts:137-138`; `apps/www/src/snapshots/server/sqlite-store.ts:277-278,349-350`; `docs/snapshot-service-operations.md:35`
- What happens: the per-client budget is 200 a day per key. IPv6 is keyed on /64, so a single subscriber with a typical /56 delegation holds 256 keys, and a /48 holds 65,536. With 25 /64s (or 25 IPv4 addresses) the caller spends the whole 5,000-a-day global budget. Every later publication then gets `429 RATE_LIMITED` with `Retry-After` until 00:00 UTC, from any client, presets and recipes alike. The error body does not say the limit is global, so a visitor cannot tell whether they caused it (see RL-08). The hourly monitor (`scripts/monitor-production.sh`, 80% threshold) fires only after the budget is gone. Repeated daily, this fills the 100,000-record capacity in about 20 days (RL-03).
- How verified: reproduced with `node --import tsx audit-08/global-cap.mts` (run from `apps/www`). Through `handleSnapshotPublish` → `createSnapshotService` → SQLite store, 5,100 sequential POSTs of `examples/preset.example.json` rotated over 256 /64s inside `2001:db8:abcd:ff00::/56`. Result: 5,000 × 201 then 100 × 429, in 37.3 s from one process. A fresh IPv4 victim (`198.51.100.7`) then got `429`, `Retry-After: 18987`. The Postgres store applies the same quotas (read end to end).
- Suggested change: add a per-network-aggregate budget (for example IPv6 /48 and IPv4 /24) and a global *rate* (per minute or hour) that sits well below the daily cap, so one actor cannot spend the day in a minute. Also put a platform rate-limit rule on `POST /api/v1/*` (RL-05). Consider holding back part of the global budget for clients that have never been limited.
- Effort: M

### RL-02 Over-limit and rejected attempts still take the single global write lock, so one caller can starve all publishing
- Severity: should-fix
- Where: `apps/www/src/snapshots/server/postgres-store.ts:55-73` (`SELECT … capacity … FOR UPDATE` before any work), `:91-97` (`consumeAttempt` runs inside that transaction); `apps/www/src/snapshots/server/sqlite-store.ts:202-214,244-250` (`BEGIN IMMEDIATE`, 250 ms busy timeout); `apps/www/src/snapshots/server/postgres-pool.ts:26-30` (`max: 3`, `connectionTimeoutMillis: 10_000`); `apps/www/src/snapshots/server/service.ts:32`, `recipe-service.ts:35`
- What happens: every POST takes the one-row `capacity` lock before it checks its own minute budget. That includes a key that is already over limit, whose answer is a 429. The transaction also runs two cleanup `DELETE`s. So 429 responses are not cheap. A single IP flooding POSTs makes all publications from all clients queue on one row. In Postgres, `lock_timeout` is 2 s and each instance has three connections, so legitimate publishes fail with 503, and reads on the same instance wait for a pool connection behind blocked writers.
- How verified: Postgres read end to end. The SQLite analogue was reproduced with `node --import tsx audit-08/contention.mts`. Victim publishes (distinct IPv4s, a fresh connection per request as the route does) managed 419 × 201 in 8 s alone. With six processes hammering `consumeAttempt` on **one** already-exhausted key, the victim managed 73 × 201 and 14 × 503 in 8 s, an 80% throughput loss with 16% failures, while the attackers received about 29,600 429s. The Postgres throughput ceiling was not measured (see Unverified).
- Suggested change: check the minute budget before taking the capacity lock. For example, run an atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING count` on the attempt row outside the capacity lock, and lock `capacity` only for a new publication. Answer an already-exhausted key from a short in-memory negative cache per instance.
- Effort: M

### RL-03 Capacity exhaustion is permanent, has no runbook, and cannot be raised without a schema migration
- Severity: should-fix
- Where: `apps/www/src/snapshots/server/postgres-migrations.ts:225-226` (`CHECK(records<=100000)`, `bytes<=268435456`), `:247-248` (`publications_immutable` blocks `DELETE`); `apps/www/src/snapshots/server/sqlite-store.ts:118-121,85-86`; `postgres-store.ts:146-147`; `docs/snapshot-service-operations.md:84`; `docs/production-operations.md:16`
- What happens: once `capacity.records` reaches 100,000, every new publication returns `503 SNAPSHOT_CAPACITY_REACHED` indefinitely. Withdrawal does not free capacity, and no retention or cleanup exists. Deleting rows needs the immutability trigger dropped, and raising the cap needs the table `CHECK` changed as well as the code constants. Both are schema changes that `snapshots:init` will not make. The docs say what to monitor but not what to do when the 80% alert fires. The editor tells the user to "retry this attempt within 24 hours" (`use-publication.ts:47-49`), which will not help. With automatic publication on Get code (RL-06) and RL-01, the 100,000 records are within reach: about 1,714 bytes per preset record were measured, so the record count is reached long before the 256 MiB byte cap.
- How verified: read end to end. In the RL-01 run, 5,000 records used 8,570,000 bytes.
- Suggested change: write the runbook: what to do at 80%, how to raise the cap through a versioned migration, and whether and how unreferenced drafts may be expired. Decide a retention policy for drafts that were never fetched before 1.0, since every changed draft opening is stored for good.
- Effort: M

### RL-04 Reads are unlimited and each one costs a database query and full re-verification; recipe reads recompile the component
- Severity: should-fix
- Where: `apps/www/src/snapshots/server/publication-http.ts:33-41` (re-verify before the 304; `Cache-Control: public, max-age=0, must-revalidate`); `apps/www/src/snapshots/server/service.ts:64`, `recipe-service.ts:65-70`; `packages/compiler/src/snapshot.ts:65`, `packages/compiler/src/recipe-snapshot.ts:57` (`compileInstallableRecipe` per read); `apps/www/src/snapshots/server/postgres-store.ts:33` (schema-verification catalog query on every store open, so every request); both published-code pages (`force-dynamic`)
- What happens: any caller can loop on GETs or published pages, including random `ps_…`/`rc_…` IDs that answer 404. Each request opens the store, which on Postgres runs a catalog query against `information_schema` and `pg_trigger`. It then runs the lookup and the integrity checks. A conditional request that ends in 304 does the same work, and with `max-age=0` the CDN absorbs nothing. Measured locally per request, including the store open: preset 200 6.2 ms, preset 304 6.5 ms, **recipe 200 42.7 ms, recipe 304 40.0 ms**, 404 probe 3.7 ms. Under sustained traffic this costs function CPU and keeps the Neon Free compute awake. Running out of compute hours would take the whole service down, reads included.
- How verified: reproduced with `node --import tsx audit-08/read-cost.mts`, 200 timed iterations each against the local SQLite store. Code path read end to end.
- Suggested change: cache verified envelopes in memory per instance, keyed by `id@revision` and response hash, and re-check only withdrawal. Run the schema check once per pool, not per request. Consider a short `s-maxage` with purge on withdrawal, and a platform rate rule for GETs.
- Effort: M

### RL-05 Nothing documents or configures the platform layer; the docs never say which layer owns volume abuse
- Severity: should-fix
- Where: `apps/www/vercel.json:1-7` (no firewall or rate rules); `apps/www/next.config.ts`; `docs/snapshot-service-operations.md:31-35,84,101-114`; `docs/production-operations.md`; `docs/hosted-deployment.md:15`
- What happens: no file in the repository mentions Vercel Firewall, WAF rules, Attack Challenge Mode, bot protection or spend limits. The application quotas are the only volume control described anywhere. Its 30-per-minute budget is applied only after the body is read and inside a database transaction (RL-02, RL-10). The operations doc also asks the operator to "monitor … service errors, lock contention", but `scripts/monitor-production.sh` checks only capacity, the global counter and database size.
- How verified: read end to end (grep for firewall, WAF, attack challenge, bot protection and DDoS across `docs/` and `apps/www/` finds only the audit prompt).
- Suggested change: write down the intended split, for example "Vercel WAF rate-limits `/api/v1/*` per IP at N per minute; the application enforces per-client and global publication budgets", configure it, and record it in `production-operations.md`. Either add error-rate monitoring or remove the claim.
- Effort: S

### RL-06 Automatic publication on Get code spends the shared daily budget and permanent capacity on throwaway drafts
- Severity: should-fix
- Where: `apps/www/src/snapshots/components/preset-get-code.tsx:71`; `apps/www/src/recipe-snapshots/components/recipe-get-code.tsx:51`; `apps/www/src/snapshots/use-publication.ts:336-345`; `docs/snapshot-service-operations.md:35`
- What happens: opening Get code after any change to a draft creates a new immutable record. A visitor who adjusts and checks five times stores five records for good. Ordinary traffic of about 1,000 such visitors a day reaches the 5,000 global cap without any abuse, and that rate fills the 100,000 records in about 20 days. The docs present the budgets as sized for iterative editing, but they do not address the permanent capacity cost.
- How verified: read end to end (the dialog's open effect calls `publication.generate()`, which confirms a new attempt for a changed hash and POSTs it).
- Suggested change: publish on an explicit action, or debounce so only the draft that was copied or kept open is published. Alternatively, store unconfirmed drafts with an expiry (ties to RL-03).
- Effort: M

### RL-07 Shared IPv4 addresses (offices, classrooms, mobile CGNAT) share one 30-per-minute and 200-per-day budget
- Severity: should-fix
- Where: `apps/www/src/snapshots/server/client-key.ts:17-37`; `quotas.ts:8-10`
- What happens: IPv4 clients are keyed on the full address, so everyone behind one NAT shares a single budget. A workshop of 30 people behind one office NAT, each opening Get code seven times after edits (RL-06), exhausts 200 a day before lunch. A mobile carrier NAT shares far more. The limit is generous for one IPv6 subscriber and strict for a shared IPv4 address, which is the reverse of the risk (RL-01).
- How verified: read end to end; the keying is asserted by `client-key.test.ts:25-38`.
- Suggested change: once the network-aggregate and global-rate controls from RL-01 exist, raise the per-address daily budget for IPv4, or key the daily budget on a coarser bucket with a higher limit. Document the expected behaviour for shared networks.
- Effort: S

### RL-08 The client contract on 429 and 503 is too vague for users to act on
- Severity: nice-to-have
- Where: `apps/www/src/snapshots/server/errors.ts:13-15`; `apps/www/src/snapshots/use-publication.ts:36-49`; `apps/www/src/recipe-snapshots/use-publication.ts:38-52`; `packages/cli/src/snapshots/transport.ts:25-26,86-94`
- What happens: the server sends a correct `Retry-After` (seconds to the end of the window, tested), but the same `RATE_LIMITED` code and message serve the minute, client-day and global-day limits. The editors ignore `Retry-After` and say only "Wait before retrying the same attempt", whether the wait is one second or five hours. `SNAPSHOT_CAPACITY_REACHED` and lock-contention 503s fall into "retry this attempt within 24 hours". The CLI turns 404, 410, 429 and 503 into `Snapshot request failed (HTTP nnn)` with a generic hint, so a withdrawn code (410) reads like an outage.
- How verified: read end to end; `Retry-After` was observed (`18987`) in the RL-01 run.
- Suggested change: add a machine-readable `issues` entry or distinct codes for the scope (`minute`, `client-day`, `global-day`), show the editor wait time from `Retry-After`, word capacity as "publishing is paused; use the JSON export", and give the CLI a specific message for 410 and 429.
- Effort: S

### RL-09 Fixed windows allow double bursts at boundaries, and the daily cap resets for everyone at 00:00 UTC
- Severity: nice-to-have
- Where: `postgres-store.ts:81-90`; `sqlite-store.ts:229-242`
- What happens: a client can make 30 attempts at hh:mm:59 and 30 more at hh:mm+1:00, or 200 publications at 23:59 UTC and 200 at 00:00. An attacker can spend the global 5,000 at 23:59 and again at 00:00, which doubles the RL-01 capacity burn per attack.
- How verified: read end to end; boundary `Retry-After` behaviour is covered by `tests/integration/snapshot-store.test.ts:178-193`.
- Suggested change: once RL-01's global rate exists this matters little. Otherwise use a sliding or two-bucket window for the global counter.
- Effort: S

### RL-10 The attempt budget is spent only after the body is read and identity derived, so rejected requests are uncounted
- Severity: nice-to-have
- Where: `apps/www/src/snapshots/server/service.ts:26-32`; `recipe-service.ts:32-35`; `body.ts:23-61`
- What happens: requests that fail the origin check (403), media type (415), size (413), the 10 s body deadline (400) or identity (503) never touch a counter. Each still costs a function invocation, and a slow-drip body can hold one for up to 10 s. The 64 KiB cap is enforced while streaming (good), but the platform's own body handling decides whether a slow body ever reaches the function (see Unverified).
- How verified: read end to end.
- Suggested change: leave this to a platform rule (RL-05), or keep a cheap per-instance in-memory counter of rejected requests per client key.
- Effort: S

### RL-11 Published-code pages show user-chosen text on the official domain and can be indexed
- Severity: nice-to-have
- Where: `apps/www/src/snapshots/components/published-preset.tsx:95` (`<h1>{snapshot.preset.name}</h1>`, up to 80 characters, `schemas/preset.schema.json:11`); recipe `content` up to 200 characters (`schemas/recipe.schema.json:35`); `apps/www/src/app/presets/[id]/[revision]/page.tsx`, `apps/www/src/app/recipes/[id]/[revision]/page.tsx` (no `robots` metadata; only `/demo` sets `index: false`)
- What happens: anyone can publish a page on `ombelle-ui.vercel.app` whose heading is arbitrary text, then share the link. Search engines may index it. Withdrawal exists, but it is an operator CLI step behind a GitHub private-report channel, so the reaction time is manual.
- How verified: read end to end.
- Suggested change: set `robots: { index: false }` on both published-code routes. Consider showing user text with a clear "user-published" label.
- Effort: S

## Unverified

- **Spoofability of `x-vercel-forwarded-for`.** The code trusts it on `VERCEL=1` (`config.ts:27`). Vercel documents that it sets this header. Whether a client-supplied copy is always overwritten, including for requests rewritten or proxied from another Vercel project, was not tested. To settle it, send a request with a forged header to an isolated preview deployment and compare the derived key or the logged header.
- **Postgres lock-hold time and throughput ceiling for RL-02.** The magnitude was not measured; I was told not to run `pnpm test:hosted-storage`. To settle it, run a concurrency load test on a disposable Neon branch with the attempt flood from `audit-08/contention.mts` aimed at `openPostgresSnapshotStore`.
- **Hosted atomicity test.** `tests/hosted/postgres-snapshot-store.test.ts:107-123` asserts that exactly one of two racing publishes succeeds at the global boundary. I read it but did not run it. The `FOR UPDATE` serialization makes the claim correct by construction.
- **Vercel body buffering.** Whether Vercel buffers the request body (up to its 4.5 MB function payload limit) before invoking the function, which would make slow-drip bodies harmless to the function, was not tested.
- **Vercel dashboard configuration.** Firewall rules, WAF custom rules, Attack Challenge Mode and spend management may already exist outside the repository. If so, RL-05 shrinks to a documentation gap.
- **Neon Free compute exhaustion** under sustained read traffic (RL-04) depends on the plan's current compute-hour allowance and autosuspend settings. It was not measured.

## Looked at and found sound

- **Atomic check-then-increment.** Postgres serializes every write on the `capacity` row (`postgres-store.ts:64`). SQLite uses `BEGIN IMMEDIATE` (`sqlite-store.ts:204`). Reproduced: six processes racing on one key recorded exactly 30 counted attempts (`audit-08/contention.mts`). Limits hold across serverless instances because the counters live in the shared database, not in memory.
- **Client key.** One operator-chosen header. Chains, ports, zone IDs and missing values fail closed with 503 (`client-key.ts:20-24`). IPv6 spellings and IPv4-mapped addresses normalize correctly. Only an HMAC keyed with a secret of at least 32 bytes is stored. `X-Forwarded-For` and `Forwarded` are ignored (`client-key.test.ts`).
- **Failure mode.** Store, configuration or identity failure fails closed with an opaque 503 (`errors.ts:44-62`, `config.ts:59-61`), which matches the spec's 503 row. There is no fallback to SQLite on Vercel (`config.ts:14`).
- **Body limit.** It is enforced while streaming, before the body is fully buffered (`body.ts:41-48`). Chunked bodies are counted the same way, any `Content-Encoding` other than `identity` gets 415, nesting depth is checked before `JSON.parse`, and there is a 10 s deadline. The check applies to both write routes through the shared `readPublishBody`.
- **`Retry-After`.** It is computed to the end of the current window and clamped (`errors.ts:54-55`). Tested at the minute and day boundaries.
- **Idempotent replay.** A replay does not consume the daily budget but does count as an attempt. Keys are shared across kinds and conflict across kinds (contract test).
- **Limiter state growth.** Expired `rate_buckets` and idempotency rows are deleted 100 at a time on each write transaction. Both tables have expiry indexes (`postgres-migrations.ts:234,239`; `sqlite-store.ts:98,106`). With at most one new attempt row per request, cleanup keeps pace. The `/privacy` description ("deleted after their window ends, during later publication requests") matches the code.
- **Code entropy and enumeration.** IDs are `ps_`/`rc_` plus 128 bits from `randomBytes(16)`. There is no listing or alias API, and collisions are retried at most three times. Enumeration is infeasible; the only cost of probing is RL-04.
- **Error bodies.** Controlled codes and messages only; storage errors never leak (`errors.ts:21-22`; asserted in `snapshot-api.test.ts`).
- **Known gaps list.** `docs/web-alpha-readiness.md` lists no rate-limiting or quota gap, so none of the findings above restates a known gap.
