# Immutable preset snapshot service operations

This document describes the private repository implementation. It is not a deployment guide for a live public service. No public endpoint, hosted persistent volume, support contact, or published CLI package is configured.

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
- Errors use a controlled JSON body with `code`, `message`, `issues`, and `requestId`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and `X-Request-ID`. There is no public listing, alias, recipe publication, account, or revision ownership API.
- IDs use `ps_` plus 32 lowercase hexadecimal characters and revision `1`. Every new publication intent gets a new ID. Only a 24-hour idempotent retry reuses one.
- Public snapshots have no automatic expiration. Withdrawal prevents fresh reads and idempotent replays from returning the payload; it cannot recall downloaded cache files or installed source.

## Limits and quotas

The implementation enforces 65,536 UTF-8 bytes for both the incoming and normalized preset, JSON nesting depth 16, a ten-second request-body deadline, and a 128 KiB response/cache/session envelope maximum. Pending editor publication state expires after 24 hours.

The SQLite service allows five POST attempts per client per minute, twenty new snapshots per client per UTC day, and 1,000 new snapshots globally per UTC day. Store capacity is 100,000 snapshot records and 512 MiB of canonical response bytes. SQLite lock wait is 250 ms. Retry attempts count toward the minute attempt quota; idempotent replay does not consume a new-publication daily quota.

## Runtime and environment

The request handlers require the Node runtime with built-in `node:sqlite`; Edge and ephemeral-only hosts are unsupported. Use a persistent local volume for `OMBELLE_SNAPSHOT_DB_PATH`. Keep the SQLite database on a single writable service instance unless a deployment design supplies a supported shared-database strategy. These deployment assumptions have not been exercised against a hosted platform.

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

For an existing project use `theme add`; for the supported component-only path use `add button --preset`. The private CLI resolves snapshots only when an exact reference, `--snapshot-origin`, and `--preset-hash` are all supplied. It verifies the canonical hash and supported catalog/compiler releases before planning. `--yes` does not bypass conflicts or validation. Dry-run, cancellation, conflict, and failed apply do not write cache entries. A successful apply may cache the verified envelope; cache write failure warns after the install succeeds.

Later ordinary adds use the saved local project preset and do not fetch snapshots. `--offline` is explicit and requires a verified cached copy. An offline read cannot learn that an operator withdrew the remote snapshot. Remote resolution and publishing are private repository implementation details; no public CLI package or public distribution is available.

The CLI cache defaults to `%LOCALAPPDATA%\ombelle\cache\snapshots` on Windows, `~/Library/Caches/ombelle/snapshots` on macOS, and `$XDG_CACHE_HOME/ombelle/snapshots` (or `~/.cache/ombelle/snapshots`) on Unix. `OMBELLE_SNAPSHOT_CACHE_DIR` overrides the location and must be absolute. Reads do not create the directory. Cache writes require a private owned directory, validate entries before use, admit at most 100 entries/16 MiB, and read at most 128 KiB per envelope. Unknown or corrupt entries are left untouched. Unsupported hard-link filesystems cause a cache warning after a successful install; they do not undo it. Windows ACL inspection is read-only and fails closed if unavailable.

## Operations still required before public launch

A real launch requires a selected domain and HTTPS certificate, persistent-disk hosting and backup/restore drills, trusted-proxy client identity configuration, service monitoring and quota/capacity alerting, a public support/security contact, privacy/retention policy, operational withdrawal process, and a publicly distributed CLI workflow. None is claimed complete by this repository implementation or its local verification.
