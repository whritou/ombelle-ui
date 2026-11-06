# Immutable preset snapshot service operations

This document describes the implementation and operator contract. The hosted service runs on the existing Ombelle Vercel project with Neon Free at `https://ombelle-ui.vercel.app`, and the installer is published as `@ombelle-ui/cli`. See [hosted deployment](hosted-deployment.md) and [CLI release](cli-release.md) for the deployment and release record. The operations listed at the end of this document remain open. The local SQLite adapter remains available for development.

## Implemented contract

The service accepts a normalized preset draft and returns an immutable snapshot envelope:

```json
{
  "snapshotVersion": "1.0",
  "id": "ps_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "revision": 1,
  "preset": { "schemaVersion": "1.0", "id": "existing-preset-id", "revision": 1 },
  "presetHash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "catalogRelease": "0.1.0",
  "compilerVersion": "0.1.0",
  "createdAt": "2026-10-28T12:00:00.000Z",
  "validationStatus": "draft"
}
```

The example is illustrative. The embedded preset ID and revision are retained and remain separate from the generated snapshot ID and revision. The snapshot is schema and semantic validated, normalized, and hashed using the existing canonical preset bytes. `validationStatus` is always `draft`; publishing does not claim quality or accessibility review.

- `POST /api/v1/presets` takes exactly `{ "preset": <preset> }`, JSON UTF-8 without compression, a matching `Origin`, and a UUID-v4 `Idempotency-Key`. A new intent returns `201`; an identical retry with the same key during its 24-hour window returns the same snapshot with `200`. Reusing the key for different content conflicts.
- `GET /api/v1/presets/{id}/{revision}` resolves only an exact immutable revision. Responses are canonical JSON with an ETag and `Cache-Control: public, max-age=0, must-revalidate`; matching validators may return `304` after a fresh availability and integrity check. `HEAD` returns no body. `OPTIONS` has `Allow` and `no-store`; it does not enable CORS.
- Errors use a controlled JSON body with `code`, `message`, `issues`, and `requestId`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and `X-Request-ID`. There is no public listing, alias, account, or revision ownership API.
- IDs use `ps_` plus 32 lowercase hexadecimal characters and revision `1`. Every new publication intent gets a new ID. Only a 24-hour idempotent retry reuses one.
- Public snapshots have no automatic expiration. Withdrawal prevents fresh reads and idempotent replays from returning the payload; it cannot recall downloaded cache files or installed source.

## Limits and quotas

The implementation enforces 65,536 UTF-8 bytes for both the incoming and normalized preset, JSON nesting depth 16, a ten-second request-body deadline, and a 128 KiB response/cache/session envelope maximum. Pending editor publication state expires after 24 hours.

Both adapters share 30 POST attempts per client per minute, 200 new publications per client per UTC day, and 5,000 new publications globally per UTC day across presets and recipes (`apps/www/src/snapshots/server/quotas.ts`). The editors publish automatically when a visitor opens Get code, so these budgets cover iterative editing. A client is the trusted ingress IP address; IPv6 clients are keyed on their /64 prefix, since one subscriber can rotate addresses within it. Combined store capacity is 100,000 records and 256 MiB of canonical response bytes. SQLite lock wait is 250 ms. Retry attempts count toward the minute attempt quota; idempotent replay does not consume a new-publication daily quota.

Recipe publication uses `POST /api/v1/recipes` with exactly `{ "recipe": <recipe> }` and the same request policy. Reads use `/api/v1/recipes/{id}/{revision}` with `rc_<32 lowercase hexadecimal digits>@1` references. The verified envelope contains the normalized recipe and resolved built-in preset, both canonical hashes, and pinned releases. Recipe and preset idempotency keys occupy one shared namespace; reusing a key across kinds conflicts. Withdrawal and conditional-read availability rules apply to both kinds.

## Runtime and environment

### Neon Postgres adapter

The hosted adapter uses `OMBELLE_SNAPSHOT_BACKEND=postgres` and the integration's pooled `DATABASE_URL`; operator initialization uses `DATABASE_URL_UNPOOLED`. Set the common public-origin/rate-secret settings below. On Vercel, client identity uses its trusted `x-vercel-forwarded-for` header. Preview origins come only from Vercel's deployment environment; `OMBELLE_SNAPSHOT_PRODUCTION_DB_HOST` is required on previews and prevents accidentally using the production endpoint (pooled/direct hostnames are normalized). There is no fallback to SQLite when hosted configuration is incomplete.

Run the existing `snapshots:init`, `snapshots:withdraw` and `snapshots:unwithdraw` commands with the selected backend. Withdrawal accepts exact preset or recipe references. Database initialization is explicit and idempotent; requests and builds do not run migrations. Both publication kinds share quotas and a 100,000-record/256 MiB canonical-response budget. The payload limit leaves database-overhead headroom and does not guarantee a precise physical database size.

Postgres backups use `pg_dump` with the direct connection and a verified restore on an isolated branch; the SQLite `snapshots:backup` file command is not a Postgres backup. Supply credentials through a protected environment or passfile, never command arguments or logs. Use the Neon provider's recovery window according to the actual plan and retain independent backups appropriate to the release's retention policy. No backup/restore drill or public deployment is claimed by the adapter implementation alone.

`pnpm test:hosted-storage` is a separate, real-Neon test command. It requires explicitly configured `dev-hosted-install-codes` branch credentials and fails if they are absent; default unit/integration tests remain cloud-independent. The development branch is disposable and tests use separately named owned schemas. Never use the production URL as its test connection.

### Local SQLite adapter

The SQLite request handlers require the Node runtime with built-in `node:sqlite`; Edge and ephemeral-only filesystems are unsupported by this adapter. Use a persistent local volume for `OMBELLE_SNAPSHOT_DB_PATH`. Keep the SQLite database on a single writable service instance. Use the Postgres adapter for Vercel rather than a temporary SQLite file.

Configure the service process with:

| Variable | Requirement |
| --- | --- |
| `OMBELLE_SNAPSHOT_DB_PATH` | Absolute path to the initialized SQLite database on persistent storage. |
| `OMBELLE_PUBLIC_ORIGIN` | Canonical service origin, including scheme and port where applicable; public origins use HTTPS. |
| `OMBELLE_SNAPSHOT_RATE_SECRET` | Secret of at least 32 UTF-8 bytes for HMAC-derived client rate keys. |
| `OMBELLE_SNAPSHOT_CLIENT_IP_HEADER` | Optional exact header name set only by trusted ingress. Required for non-loopback public origins. |

For a public origin, configure the reverse proxy to remove any client-supplied copy of the configured identity header and set exactly one validated client IP value. The service rejects missing, malformed, chained, or port-bearing values. It does not trust `X-Forwarded-For` or `Host`; it compares `Origin` to `OMBELLE_PUBLIC_ORIGIN`. Without the trusted header, configuration is accepted only for literal loopback development origins. Do not expose the origin directly to clients if this identity boundary is not enforced.

The private CLI accepts HTTPS snapshot origins. Literal loopback origins such as `http://127.0.0.1:3000` may use HTTP. TLS certificate verification is always enabled. Configure Node to trust the organization's approved CA store when required; never disable certificate verification.

## Initialize, withdraw, restore

Set `OMBELLE_SNAPSHOT_DB_PATH` to the same absolute file used by the service before running operator commands. The commands are repository-local pnpm scripts:

```powershell
$env:OMBELLE_SNAPSHOT_DB_PATH = 'D:\snapshot-data\snapshots.sqlite'
pnpm snapshots:init
pnpm snapshots:withdraw ps_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@1 --reason operator-request
pnpm snapshots:unwithdraw ps_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@1
pnpm snapshots:backup 'D:\snapshot-backups\snapshots-2026-10-28.sqlite'
```

Initialization and schema migrations are explicit. Importing code, building the application, or handling a request does not create or migrate the database. Backup uses SQLite's backup API and refuses to overwrite an existing destination; it produces a consistent standalone backup even when the live database is in WAL mode.

There is no restore subcommand. To restore, stop all service processes, preserve the current database separately, copy a verified backup to the configured database path, ensure ownership and access are restricted to the service operator, then start the service and verify a known exact reference. Do not copy or replace a live database while it is open. Reinitialize only an empty/uninitialized database; initialization will reject an unknown/future schema.

Withdrawal reasons are `abuse`, `security`, and `operator-request`. Withdrawal and unwithdrawal change only the operator status record; immutable snapshot bytes remain stored. There is no self-service delete or retention cleanup for public payloads. Monitor database file size, record count, remaining global/client quotas, service errors, lock contention, and backup age using operator-owned monitoring. The private implementation does not yet expose a metrics endpoint or public administration console.

## Private local use

Run the local website with the repository development server and initialized database. The local editor warns before public-style publication; a snapshot reference is readable by anyone who has it. Example CLI commands use an illustrative reference and local origin:

```powershell
pnpm exec node packages/cli/dist/main.js init --preset ps_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@1 --snapshot-origin http://127.0.0.1:3000 --preset-hash bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js init --preset ps_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@1 --snapshot-origin http://127.0.0.1:3000 --preset-hash bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb --cwd APP --yes
```

For an existing project use `theme add`; for the supported component-only path use `add button --preset`. Bare codes resolve against the official origin `https://ombelle-ui.vercel.app`; any other origin requires an exact reference with `--snapshot-origin` and `--preset-hash` (or `--recipe-hash`). It verifies the canonical hash and supported catalog/compiler releases before planning. `--yes` does not bypass conflicts or validation. Dry-run, cancellation, conflict, and failed apply do not write cache entries. A successful apply may cache the verified envelope; cache write failure warns after the install succeeds.

Later ordinary adds use the saved local project preset and do not fetch snapshots. `--offline` is explicit and requires a verified cached copy. An offline read cannot learn that an operator withdrew the remote snapshot. This section covers the repository checkout. The published installer accepts the same inputs: `npx @ombelle-ui/cli@0.5.0` resolves bare codes against the official origin without `--snapshot-origin` or a hash.

The CLI cache defaults to `%LOCALAPPDATA%\ombelle\cache\snapshots` on Windows, `~/Library/Caches/ombelle/snapshots` on macOS, and `$XDG_CACHE_HOME/ombelle/snapshots` (or `~/.cache/ombelle/snapshots`) on Unix. `OMBELLE_SNAPSHOT_CACHE_DIR` overrides the location and must be absolute. Reads do not create the directory. Cache writes require a private owned directory, validate entries before use, admit at most 100 entries/16 MiB, and read at most 128 KiB per envelope. Unknown or corrupt entries are left untouched. Unsupported hard-link filesystems cause a cache warning after a successful install; they do not undo it. Windows ACL inspection is read-only and fails closed if unavailable.

## Operations before public launch

In place as of 2026-11-02:

- an HTTPS origin on the Vercel domain;
- managed Neon Postgres storage instead of a persistent disk;
- client identity from Vercel's trusted `x-vercel-forwarded-for` header;
- an explicit operator withdrawal command;
- a publicly distributed CLI (`@ombelle-ui/cli`);
- `/privacy` and `/security` pages, `security.txt`, and GitHub private vulnerability reporting;
- hourly monitoring of the site, the API and quotas through a read-only database role;
- a verified Postgres backup and restore drill (first run 2026-11-02).

See [production operations](production-operations.md) for the runbook, backup cadence and drill log. Privacy requests have no dedicated email address: requesters open a GitHub issue asking for a private channel.
