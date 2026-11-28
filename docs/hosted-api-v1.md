# Hosted API v1

The hosted snapshot service at `https://ombelle-ui.com` stores immutable presets and component recipes under
exact codes. This page specifies the **read routes**, which are the public contract. The publish routes exist for the
site's own editors and are not a public API.

Operators: see [snapshot service operations](snapshot-service-operations.md) and
[production operations](production-operations.md).

## Codes

| Kind | Code | Read route |
| --- | --- | --- |
| Preset | `ps_` + 32 lowercase hex characters + `@1` | `/api/v1/presets/{id}/{revision}` |
| Recipe | `rc_` + 32 lowercase hex characters + `@1` | `/api/v1/recipes/{id}/{revision}` |

- The revision is always `1`. The identifier is random: every publication intent gets a new one. Only a retry of the
  same intent within 24 hours (same idempotency key) returns the same code.
- A published payload never changes. Withdrawal stops the service returning it; it cannot recall copies a CLI cached or
  source already installed.
- Published payloads are `draft`: publishing is not a review of quality or accessibility.
- Payloads are public to anyone who has the code. There is no listing, search, alias or account.

## Read: `GET` and `HEAD /api/v1/{presets,recipes}/{id}/{revision}`

Returns the canonical JSON of the snapshot (preset snapshot 1.0, recipe snapshot 1.0 or 2.0) with its content hash,
`catalogRelease`, `compilerVersion`, `createdAt` and `validationStatus: "draft"`. Schemas: `schemas/` in the repository.

Response headers:

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json; charset=utf-8` |
| `ETag` | Strong, `"<sha256 of the body>"`. `If-None-Match` (including `*`) returns `304` with no body. |
| `Cache-Control` | `public, max-age=0, must-revalidate`. Every read re-checks availability and integrity, so a withdrawal applies on the next request. |
| `X-Request-ID` | A UUID for support requests |
| `X-Content-Type-Options` | `nosniff` |

`HEAD` returns the same headers with no body. `OPTIONS` answers `204` with `Allow` and `Cache-Control: no-store`; it does
not enable CORS. Other methods answer `405` with `Allow`.

## Read: `GET /api/v1/catalog`

Returns the agent catalog as JSON (`application/json; charset=utf-8`): the catalog every coding agent reads before it
installs anything. The response is static and built with the site.
The response carries `Access-Control-Allow-Origin: *` (as do `/llms.txt`, `/llms-full.txt` and the `.md` pages), so any origin may read it.

| Field | Meaning |
| --- | --- |
| `catalogVersion` | `1` |
| `cliPackage`, `cliVersion`, `installCommand` | The published installer, for example `npx @ombelle-ui/cli@<version>` |
| `docs` | Absolute URLs of `llms.txt`, `llms-full.txt` and the agents guide |
| `skills.install` | The command that installs the Ombelle agent skill |
| `families` | Each offered style family with its `accessibilityCaveat` (`null` unless the family carries one, as liquid glass does) |
| `components`, `blocks` | One entry per item: `id`, `kind`, `name`, `description`, `installable`, `minimumCli` (when set), `glass`, `docs.html` and `docs.markdown`; components add `category`, blocks add `components` and `exampleOnly` |
| `rules` | The install rules every agent follows, in order: `{ id, text }` with code in backticks. The same list `llms.txt` and the agents guide show |

`installable` is `false` when the published installer is older than the item's `minimumCli` (blocks need 1.1.0).
This is not a shadcn registry: there are no registry item routes.

## Errors

Every error is JSON with `Cache-Control: no-store`:

```json
{ "code": "SNAPSHOT_NOT_FOUND", "message": "The snapshot was not found.", "issues": [], "requestId": "…" }
```

`issues` is a list of `{ "path": "<JSON pointer>", "message": "…" }`. Messages are controlled text; do not parse them.

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REFERENCE` | The id or revision is not a valid code |
| 400 | `INVALID_DATA`, `INVALID_IDEMPOTENCY_KEY` | Publish only: malformed body or key |
| 403 | `ORIGIN_NOT_ALLOWED` | Publish only: the `Origin` is not the site's own |
| 404 | `SNAPSHOT_NOT_FOUND` | No such code. A recipe read also answers 404 while catalog recipes are disabled |
| 405 | `METHOD_NOT_ALLOWED` | Method not supported; see `Allow` |
| 409 | `IDEMPOTENCY_CONFLICT` | Publish only: the key was used for different content |
| 410 | `SNAPSHOT_WITHDRAWN` | The publication was withdrawn by the operator |
| 413 | `PAYLOAD_TOO_LARGE` | Publish only: the whole request body (not just the preset or recipe) exceeds 65,536 bytes |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Publish only: use `application/json`, UTF-8, no compression |
| 422 | `UNSUPPORTED_RELEASE` | Publish only: the document needs a catalog/compiler release the service does not support |
| 429 | `RATE_LIMITED` | Publish only; `Retry-After` gives seconds. `issues[].path` is `/rateLimit/<budget>` |
| 503 | `SNAPSHOT_SERVICE_UNAVAILABLE` | Storage or configuration problem, or a stored row failed its read-time integrity checks |
| 503 | `SNAPSHOT_CAPACITY_REACHED` | Publish only: the service's storage budget is full |

Status codes and `code` values above are stable at 1.0. New codes may be added for new conditions; clients should treat
an unknown `code` by its HTTP status.

## Publish (editors only)

`POST /api/v1/presets` takes exactly `{ "preset": … }` and `POST /api/v1/recipes` exactly `{ "recipe": … }`. Both need
a matching site `Origin` and a UUID-v4 `Idempotency-Key`, and answer `201` (new) or `200` (an identical retry within 24
hours). Quotas apply per client, per network and globally per UTC day ([operations](snapshot-service-operations.md#limits-and-quotas)).
Third-party tools cannot publish, by design. Quotas, capacity and uptime are not promised.

## Using codes

The CLI accepts a bare code and resolves it against the official origin: `ombelle init --preset ps_<hex>@1`. An
alternative origin needs `--snapshot-origin` together with the expected `--preset-hash`/`--recipe-hash`. The CLI makes one
read per code (HTTPS only, no redirects, a 128 KiB limit and a 10 second deadline), verifies the stored hash, and caches
the result for `--offline` installs.
