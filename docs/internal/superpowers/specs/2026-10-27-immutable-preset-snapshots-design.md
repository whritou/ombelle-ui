# Immutable Preset Snapshots Design

**Status:** Approved by the user on 2026-10-27; implementation planning authorized.
**Date:** 2026-10-27
**Baseline:** `6fbce75` on `main`; work branch `feat/immutable-preset-snapshots`.

## Intent and decisions

Complete the next M4 journey: explicitly publish a preset from the existing editor, share an immutable reference, install it globally or for one Button, and add another ordinary component later without depending on the service. Preserve the exact normalized preset and generated artifacts already produced by local export.

The user selected extending the existing Next.js app after considering a separate snapshot service, then approved this complete document. The storage implementation, limits, identity policy, and CLI details originated as author proposals and are included in that approval.

### Approaches considered

| Approach | Benefit | Cost | Decision |
| --- | --- | --- | --- |
| Add publish/read endpoints and sharing to `apps/www` | Follows the documented architecture; reuses compiler and editor; one application | Storage must suit the app's deployment | Selected by the user |
| Create a separately deployed snapshot service | Independent scaling and deployment | Another application, configuration, and cross-origin boundary | Deferred |

Within the selected app, propose a transactional SQLite store on a persistent local volume, behind a small storage interface. Store bounded canonical payloads and metadata together instead of introducing object storage plus a database for payloads of at most 64 KiB. This deliberately narrows the architecture document's proposed storage combination. A later remote adapter can preserve the public contract.

Node 24.19.0 includes `node:sqlite` with file-backed databases and prepared statements; its API is synchronous and classified as release candidate. Keep database transactions short, use only APIs present in the pinned version, and cover real concurrent connections. See the [pinned Node documentation](https://nodejs.org/download/release/v24.19.0/docs/api/sqlite.html). This choice adds no npm runtime dependency but commits this adapter to a Node server with durable disk. Ephemeral serverless filesystems and Edge runtimes are outside this adapter's deployment support.

## Scope and success

Implement preset publication, exact-reference resolution, a public read page, editor publication state, CLI integrity/provenance, and a validated cache. Support the three existing families and pinned catalog/compiler `0.1.0`, with the current React TSX consumer matrix. Continue using the existing normalization and compiler implementation without changing bytes for existing inputs.

Success means that an editor export, a published snapshot, a global installation, and a component-only Button installation all agree on the preset hash and relevant compiled artifact bytes. Global installation persists a complete local preset so later ordinary additions need no network. Scoped installation preserves the saved global preset, root theme, ordinary components, recipes, and other scoped installations.

Exclude recipe publication/resolution, accounts, owner-managed revision histories, aliases such as latest, listing/search of public snapshots, mutable display metadata, arbitrary remote URLs as preset input, remote source/dependency execution, new component editors, new catalog releases, public npm distribution, and infrastructure provisioning/deployment. The private CLI remains private; generated commands must say so. This implements a runnable snapshot journey, not a public-launch claim. Production domain, infrastructure, and release operation remain explicit launch tasks.

## Snapshot identity and canonical data

Publishing creates an opaque `ps_` plus 32 lowercase hexadecimal digits generated from 128 random bits, with snapshot revision `1`. Example reference: `ps_0123456789abcdef0123456789abcdef@1`. The example is illustrative, not a live code. Parse exactly this format in this increment; reject unrevisioned IDs, other revisions, leading-zero revisions, encoded separators, and malformed references before I/O.

Every new publish intent creates a new snapshot ID, even when content matches another snapshot. Retrying one intent uses its idempotency key and returns the same snapshot. There is no cross-user hash lookup or deduplication oracle. Without accounts or ownership proofs, nobody can append revision 2 to another person's ID. Future revision allocation needs a separate ownership design.

The snapshot reference is distribution identity. Preserve `preset.id`, `preset.name`, and `preset.revision` exactly as validated and normalized; never replace them with the snapshot ID. Scoped output paths continue using the embedded preset identity, preserving download parity and existing conflict rules. Different published content carrying the same embedded identity/revision still conflicts on an existing scoped installation; tell the developer to increment the preset revision or migrate explicitly.

Normalize through the shared resolver and validate supported releases/families. Canonical preset bytes are UTF-8 `canonicalize(normalizedPreset)` with no trailing newline. `presetHash` is the existing lowercase SHA-256 over those bytes. JSON downloads may append one newline; that newline is outside the preset hash. Require canonical preset bytes to fit within 65,536 bytes after normalization as well as bounding the incoming request. Reject rather than truncate.

The immutable response record has exactly these fields:

```ts
type PresetSnapshot = {
  snapshotVersion: '1.0'
  id: string
  revision: 1
  preset: Preset
  presetHash: string
  catalogRelease: '0.1.0'
  compilerVersion: '0.1.0'
  createdAt: string // server UTC ISO timestamp
  validationStatus: 'draft'
}
```

Release metadata must equal the embedded preset fields. Validation status means schema/semantic/release validation only; it never certifies contrast, browser parity, or accessibility of an arbitrary user preset. Timestamps and snapshot IDs do not enter `presetHash`. Store and return canonical response bytes; the strong ETag is SHA-256 of those complete response bytes. Moderation state is separate from the immutable record.

Add source schemas under `schemas/` and generated contract bindings through the existing generation process. Validate exact keys, bounded strings, safe integers, timestamp shape, lowercase hashes, identity, and pinned versions in every received envelope. Browser and CLI must recompute normalization and hashes rather than trust server metadata.

## API behavior

Use Node-runtime Next.js route handlers and a server-only snapshot service. Reuse the shared resolver, not a browser worker or arbitrary compilation service. All responses include `X-Request-ID`; errors have `{ code, message, issues: [{ path, message }], requestId }`, with JSON-pointer paths and no stack traces, SQL text, filesystem paths, or body echoes.

### Publish

`POST /api/v1/presets` accepts exactly `{ preset: Preset }`, `Content-Type: application/json` with optional UTF-8 charset, and a required UUID-v4 `Idempotency-Key`. Accept sparse valid presets but normalize them server-side. Read the body as a bounded stream: at most 65,536 actual bytes, fatal UTF-8 decoding, at most 16 JSON nesting levels, and no unsupported content encoding. Do not trust Content-Length or parse an unbounded `request.json()` body. Enforce the nesting bound before full parsing with a string/escape-aware scan. Reject unknown fields throughout.

Same-origin browser publication requires `Origin` equal to the configured public origin; reject missing, `null`, or foreign origins. Also reject a present cross-site Fetch Metadata value. Do not use wildcard CORS or forwarded Host to establish trust. This endpoint serves the website; a future headless publishing client needs an explicit policy. GET resolution is available to the CLI without Origin.

On a new successful intent return `201`, the immutable snapshot JSON, and a relative Location identifying its exact GET route. A completed retry returns `200` with the same record. POST success and errors are `Cache-Control: no-store`.

Bind an idempotency key globally to the canonical normalized preset hash for 24 hours. A valid repeated request with the same key and hash returns the original snapshot, including timestamp; different content returns `409 IDEMPOTENCY_CONFLICT`. Check withdrawal before a replay: a withdrawn record returns 410 without its payload, just like GET. Hashing includes the preset's metadata. Treat UUID keys as unguessable retry tokens; do not log them or render them publicly. Expiry permits a new publication, never mutation of the previous record. Document that browser retries are guaranteed only within 24 hours.

Perform normalization outside the transaction. Inside one short transaction, recheck idempotency, consume publication quotas, generate/insert a unique ID, and insert the retry mapping. A primary-key collision retries random generation at most three times, then fails without partial state. Concurrent requests with one key must produce one record. No successful response precedes commit. A crash after commit is recovered by replaying the key.

### Resolve

`GET /api/v1/presets/{id}/{revision}` returns the immutable record, JSON content type, `X-Content-Type-Options: nosniff`, and its strong ETag. Verify stored envelope shape, canonical bytes, and hashes on reads; storage corruption returns 503 without a payload or a 304. A matching If-None-Match returns `304` only after checking that the record remains available. Support HEAD with the same status/headers and no body. Unknown valid references return `404 SNAPSHOT_NOT_FOUND`; withdrawn snapshots return `410 SNAPSHOT_WITHDRAWN` with no payload. Malformed path values return `400 INVALID_REFERENCE` without database lookup.

Use `Cache-Control: public, max-age=0, must-revalidate` for available records and `no-store` for errors. The bytes are immutable but withdrawal must remain observable on subsequent network resolutions; do not promise a year of unconditional CDN caching. The CLI's explicitly offline cache behavior is a separate guarantee.

### Errors and bounds

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_DATA`, `INVALID_REFERENCE`, `INVALID_IDEMPOTENCY_KEY` | Malformed input or invalid schema/semantics |
| 403 | `ORIGIN_NOT_ALLOWED` | Publication origin policy failed |
| 404 | `SNAPSHOT_NOT_FOUND` | No such immutable reference |
| 409 | `IDEMPOTENCY_CONFLICT` | Key reused for different normalized content |
| 410 | `SNAPSHOT_WITHDRAWN` | Operator withdrew public resolution |
| 413 | `PAYLOAD_TOO_LARGE` | Raw or normalized byte limit exceeded |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Unsupported JSON type, charset, or encoding |
| 422 | `UNSUPPORTED_RELEASE` | Unavailable schema/catalog/compiler/family |
| 429 | `RATE_LIMITED` | Retry-After gives seconds to the next usable window |
| 503 | `SNAPSHOT_SERVICE_UNAVAILABLE`, `SNAPSHOT_CAPACITY_REACHED` | Storage, identity configuration, contention, or capacity failure |

Use a server deadline of ten seconds for request-body consumption; cancel slow or oversized streams. Keep DB lock waiting bounded to 250 ms and map exhaustion to 503. Limits are enforced in the service, not solely by a deployment proxy.

## Storage, quotas, and operation

Define a `SnapshotStore` interface for atomic publish/replay, exact lookup, quota consumption, and withdrawal. Implement it in `apps/www/src/snapshots/server/` using SQLite. Avoid a speculative shared package; public contracts belong in `packages/contracts`, canonicalization in `packages/compiler`, and filesystem/network ports outside the compiler.

Use an operator-configured absolute `OMBELLE_SNAPSHOT_DB_PATH`, an absolute `OMBELLE_PUBLIC_ORIGIN`, and a strong `OMBELLE_SNAPSHOT_RATE_SECRET`. Nothing is derived from user input. The origin must be HTTPS except for literal loopback development. Missing/incompatible configuration disables publishing and returns 503; local editing and downloads still work. Import/build must not create or open the database. Integration tests create private temporary databases. Document a development configuration under `.artifacts/`; never commit database/WAL/SHM files or secrets.

Tables hold immutable records, unique idempotency keys with expiry, fixed-window rate buckets, and separate withdrawal records. Store payload text and hash with identity uniqueness and byte-length checks. Protect snapshot records against SQL UPDATE/DELETE through database triggers; operational withdrawal inserts a separate record. Use prepared parameters, foreign keys, WAL, and full synchronous durability. Run small versioned schema migrations at first service initialization, serializing migration across connections; reject unknown future versions. Do not execute an unbounded migration during a request. A documented initialization command performs first creation/migration before serving traffic; requests only verify/open the expected schema. Back up through SQLite's consistent backup mechanism, not a live main-file-only copy.

Default quotas are five POST attempts per client per minute, twenty newly published snapshots per client per UTC day, and 1,000 newly published snapshots globally per UTC day. Body/media/origin checks precede expensive normalization. Count retry requests toward the minute attempt limit; successful replay does not consume daily new-record quotas. The quota and mapping updates for new publication are transactional. Fixed windows and UTC boundaries must be tested with an injected clock. Expired minute/day/key rows are removed in bounded batches. Snapshot records never expire automatically.

Identify clients by the normalized socket/proxy-derived IP only through an explicitly configured trusted ingress policy. Next route handlers cannot assume untrusted forwarding headers provide a real IP. For local development, use a documented single shared client bucket. Production publication requires the operator to configure the trusted ingress header and ensure that the ingress strips any incoming copy and writes exactly one canonical client IP; never select the first address from an arbitrary forwarded chain. Without that assurance, fail closed for public publication. Persist only HMAC-SHA-256(client IP, rate secret), not raw IPs. Secret rotation may reset client quotas; retain the global cap. Tests cover spoofed/missing/multiple header values and shared-bucket development behavior.

Set a hard cap of 100,000 snapshots and 512 MiB of total canonical snapshot response bytes, checked transactionally. When full, refuse new publications while reads and local exports work. This bounds accepted payload storage, not total database/WAL size; operators also monitor disk space and backups. An exhausted database must not corrupt records or return an incomplete success.

Retention proposal: published data remains available without automatic TTL while the service operates. There is no anonymous self-service edit or delete capability in this slice. The confirmation explains public readability, retention, and possible operator withdrawal. An offline maintenance command withdraws an exact reference with a bounded reason code; it never rewrites its bytes. It can also unwithdraw a record explicitly. No unauthenticated administrative HTTP endpoint exists. Cached copies and installed source cannot be recalled. Publish concise retention/withdrawal documentation before exposing the action to external users.

Ship local tests, development/run/backup/restore/withdraw instructions, and deployment prerequisites. Do not provision infrastructure, change a live service, invent a domain/contact address, or claim availability on ephemeral hosting. A documented contact route and a deployed durable-volume setup are public-launch requirements, not assumptions hidden by this feature.

## CLI resolution and trust

Introduce a shared CLI preset-input resolver used by `init --preset`, `theme add`, and `add button --preset`. Existing local files retain their current parsing and 256 KiB limit. A bare exact snapshot reference selects remote resolution; path-prefixed values such as `./ps_...@1` remain local files. Reject remote-looking malformed codes and arbitrary URLs with actionable diagnostics rather than treating them as trusted fetch targets.

Because no public origin or CLI distribution exists, remote inputs require two explicit flags:

- `--snapshot-origin <origin>`: HTTPS origin with no credentials, path other than `/`, query, or fragment; literal `127.0.0.1`, `[::1]`, or `localhost` may use HTTP for local testing. Canonicalize once. Do not reuse `registryBase`, which has a different responsibility.
- `--preset-hash <64-lowercase-hex>`: required expected hash copied from the published result. Compare against the locally normalized payload. Reject these flags with local files, ordinary additions, recipes, and other commands.

Construct the GET route from the parsed ID/revision; never accept a supplied path or follow redirects. Use normal TLS verification, JSON content type checks, fatal UTF-8 decoding, a 128 KiB response limit enforced while streaming, and one ten-second deadline covering connection and body. The response must have exact keys, match the requested ID/revision and supported releases, and contain an already normalized preset: re-resolving must reproduce the canonical payload and hash. Verify both returned hash and required expected hash. No server-supplied packages, templates, script, imports, or URLs reach the installation compiler.

A hash copied from the service plus TLS checks detects mismatched/changed content; it does not constitute independent publisher authentication or a signed release. Do not label it as such. Reuse existing `RESOLUTION_FAILURE`/exit 5 for transport, timeout, integrity, withdrawal, and cache failures; include specific stable diagnostic detail and a next action. Unsupported releases retain exit 3. Invalid CLI syntax remains exit 2; normal installer conflicts remain exit 4.

Resolve once into memory before planning; apply uses those reviewed bytes without a second fetch. Inspection, existing conflicts, dependencies, stale-plan preconditions, and transaction recovery remain unchanged. `--yes` never bypasses integrity or conflict checks. A remote dry run may perform GET and read an existing cache, but creates no cache directory/file and performs no project writes or dependency operations. Add source information to both JSON and text plans: origin, exact reference, expected/actual hash, and resolution via network/cache. Change `InstallPlan.networkAccess` from the literal `false` to a boolean accurately reflecting network use for preset resolution; distinguish dependency work using the existing dependency plan.

### Provenance without compiler identity changes

Extend lock v1 additively with optional `presetSource` and `componentPresetSources`, leaving old locks valid. A source contains exactly `{ origin, reference, presetHash }`; component sources are keyed by the existing embedded preset `id@revision`. Only a successful explicit remote global operation updates global `presetSource`. Later ordinary `add` preserves it without fetching. Explicit local global theme/init clears global remote source, even for identical bytes. Component-only installation preserves global source; it records remote source for its own scoped entry only.

Keep these fields outside compiled preset/recipe/scoped identity comparisons. A repeat install of identical bytes is a no-op: preserve an existing matching scoped source even when reached through a local file or another code; attaching missing remote provenance may update only the lock. Never replace source metadata for different bytes under one embedded identity/revision. Existing recipe and component source maps survive every unrelated lock writer. Validate origin/reference/hash shapes and require each source hash to match the relevant resolved global/scoped hash without fetching. Orphaned scoped-source keys fail project validation.

## Cache and offline behavior

Cache immutable response envelopes under the user's platform cache directory, with an explicit `OMBELLE_SNAPSHOT_CACHE_DIR` override for tests. Key paths by SHA-256 of canonical origin plus reference plus expected hash; do not concatenate remote input into filesystem paths. Read at most 128 KiB from a regular non-symlink file, and run the full envelope/normalization/hash validation on each hit. Treat corrupt/mismatched cache entries as unusable; do not silently trust them or apply partial data.

Normal remote resolution fetches fresh availability. After successful apply, best-effort atomic cache write uses a private owner-controlled directory, exclusive random temporary file, and rename, with no symlink following. Cache-write failure warns but does not convert a completed installation into failure. Dry runs, canceled/conflicting plans, and failed applies never populate it. Valid cache survives concurrent writes because bytes are immutable; reject a different envelope for an already existing key. Bound the cache to 100 entries/16 MiB using best-effort eviction only during successful-apply cache writes; eviction never deletes outside the owned cache root.

Add `--offline` only for explicit snapshot resolution, requiring the same origin/reference/hash. It performs no network and fails clearly on a cache miss or corrupt entry. Network timeouts/unavailability never silently fall back; show the explicit offline retry option. A fresh online 404/410 is authoritative for that invocation and cannot be hidden by a warm cache. Explain that explicitly offline resolution cannot learn later withdrawals. Ordinary additions and installed app runtime remain service-independent without needing this flag.

## Editor publication and public read

Extend the existing preset export area with an explicit publish intent requiring affirmative public-read/retention confirmation. Do not publish on edits, recovery, refresh, navigation, or merely opening the page. Keep download/copy actions available when publication is unavailable. The server never receives draft history, view state, stored recovery bytes, or transient preview interactions.

Track idle, validating, publishing, published, and failed states separately from compiler state. Only a fresh current compiled result is publishable. Capture that normalized preset/hash and a UUID retry key on confirmation. Disable duplicate submission while pending. Preserve that key for retries of the same captured content; a new edit/new intent gets a new key. Retain the pending attempt in a versioned session-storage record of at most 128 KiB UTF-8 for up to 24 hours so refresh can offer an explicit retry. Validate it before use; never auto-submit. Storage denial leaves in-session retries and exports usable.

Validate the returned envelope locally, recompute its hash, and check it against the captured content before showing success. Ignore stale UI responses using both operation and draft identity; editing during a request does not allow a returned reference to claim to describe the newer draft. Keep the last successful reference explicitly attached to its published hash and mark current edits as unpublished. A response lost after commit can be retried with the same key. Errors retain the current draft and download path. Announce outcomes through the existing live region without moving focus unexpectedly.

`/presets/[id]/[revision]` reads through the server service, revalidates availability on each request, and displays draft validation status, exact reference, releases, preset hash, public-read semantics, a JSON download/copy path, and installation instructions. Use the existing reviewed generated gallery and isolated preview protocol from a locally compiled snapshot, avoiding a second hand-written rendering path. Stored names are text. Do not load arbitrary external resources or overwrite another editor's saved draft when following a share link. Editing/importing published presets is deferred; the read page is read-only.

Generated installation choices cover new setup, existing shadcn theme merge, and component-only Button. Each uses the same snapshot reference and required hash. Source the origin from validated server configuration, not request Host. Continue showing a private repository command such as `pnpm exec node packages/cli/dist/main.js ... --snapshot-origin ORIGIN --preset-hash HASH --cwd APP --dry-run --json`; explain building packages, replacing APP, reviewing the plan, and applying with `--yes`. Keep runner-tab/public npm command work deferred until a real published CLI release exists. Quotes/arguments must be generated safely and use the allowed origin/reference/hash grammar. No website action executes a local install.

Publication controls, confirmation, retry, statuses, code selection, and read-page navigation need keyboard access, visible focus, labels, restrained announcements, and 320 CSS pixel reflow. Public-read confirmation is accessible and explicit. No visual redesign is required; reuse the current export panel and styles. Human visual/assistive-technology review remains a separate recorded check.

## Verification and evidence

The implementation plan must assign meaningful tests at each boundary:

| Area | Required coverage |
| --- | --- |
| Shared contracts | Unknown/extra fields, exact references, release mismatches, normalization, unsafe revisions, timestamp/hash bounds, embedded identity preservation |
| API and storage | Bounded chunked/slow bodies, byte/nesting/media limits, origin/header policy, real database restart, independent concurrent connections, idempotency replay/conflict/expiry, transaction rollback and crash-after-commit retry, quota boundaries, storage cap/contention/config errors, immutable bytes, ETag/HEAD, withdrawal and recovery |
| CLI | Three command paths, required origin/hash flags, no redirects, body/time bounds, malformed/wrong/mismatched responses, TLS policy, unsupported releases, exact source display, dry-run no writes anywhere, cancellation/conflicts/stale plans, cache tampering/symlinks/concurrency/eviction, explicit offline and authoritative online errors |
| Ownership | Later process uses saved defaults without service; scoped install preserves global bytes/source; remote maps survive ordinary adds/theme/recipe/scoped writers; local global selection clears only its own source; embedded ID collisions stay conflicts; no-op behavior |
| Browser | Explicit confirmation, no background publication, retries and refresh recovery, stale responses while editing, service/clipboard/storage failure, shared page availability/withdrawal, draft status, keyboard/reflow/axe, gallery iframe integrity |
| Journey | Actual editor publish through real Next handlers and SQLite, GET by code, CLI dry-run/apply, later ordinary add in a fresh offline process, installed global/scoped bytes equal local compiler/export |

Use local loopback services and preseeded/frozen consumer dependencies for focused tests; do not depend on a deployed API. Cover Vite and Next.js and the four declared managers at the installation boundary, retaining lock format and lifecycle-script safeguards. Reuse the existing installed-browser parity fixtures to compare the published preset gallery in light/dark across all three families, and a scoped Button against a differently themed host. Package build precedes built-CLI and consumer checks.

Run package generation/build, TypeScript, focused unit/integration/API/browser tests, product build, and workspace audit as appropriate. Then use the documented complete foundation gate or its official quality/consumer/aggregate workflow with recorded environment and source commit. Add authored tests to the independent evidence inventories and omission regressions. A focused snapshot journey is not the 34-consumer gate, and a local API is not a production deployment. Record failures, separate reruns, browser versions, and unperformed human review without converting them into passes.

## Builder latitude and approval boundary

The Superpowers builder check reviewed this document against the repository on 2026-10-27 and reported "nothing important left". This is a design-readiness review, not implementation verification or user approval.

The builder may choose internal filenames, small port interfaces, SQL table/index details, fixture layout, and accessible confirmation mechanics within these contracts. The builder must check the installed Next.js guides before route/page implementation and use the pinned repository toolchain. Do not add a general backend framework, new infrastructure provider, or new npm dependency without updating the design rationale.

The user's approval authorizes implementation planning for the proposed behavior and SQLite deployment constraint. It does not authorize public publication of user presets, package release, infrastructure provisioning, deployment, or claims that M4's public service is already live.
