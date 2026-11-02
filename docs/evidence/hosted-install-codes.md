# Hosted install codes: release evidence

Record of the public release of hosted preset and recipe codes on 2 November 2026: what was measured, on which identities, and what remains unverified. Commands and outcomes come from the release session; no values here are estimated.

## Identities

- **Source:** feature merged to `main` through #23 (`8a97c8b`), #24 (`5a50327`) and #25 (`b588dda`). Review fixes and these records are on #26.
- **npm:** identity `ombelle`, owner of organization `ombelle-ui`. Tarballs were packed by `pnpm pack:cli` with npm 11.19.0 and published from Windows with Node 24.19.0 and its bundled npm 11.17.0, with browser security-key confirmation.
  - `@ombelle-ui/cli@0.2.0`: integrity `sha512-ikzam7qNpfvNB8Ai5JvbDOI0o9/lPTiVcK34JA9LpyH30FXFef3HTptonq+kbJASebxYbyfSv8uUVs4OSXlfhQ==`, published from `6c6eb5f`. Deprecated: exits 0 without output through POSIX bin symlinks.
  - `@ombelle-ui/cli@0.2.1`: integrity `sha512-TAkxY7UEnLOJl/aHS8x0mpIJatLcdtv5DYiXAyVfZlw3MwY7PLku0VUSKOixpfGHNIehxMn63itKxrrBDJFxJQ==`, shasum `f0be0279b3be02829baec8721451fdceed153555`, published 2026-11-02T17:19:12Z from `c9ba4c1`, clean tree, tag `latest`.
  - `0.0.0-stage`: two-file placeholder without bin or scripts, created by npm during the first staged publication.
- **Hosting:** Vercel project `whritearthur-9467s-projects/ombelle-ui` (Hobby, region fra1), production from `main`, origin `https://ombelle-ui.vercel.app`.
- **Storage:** Neon project `neon-carmine-cable` (`delicate-tooth-65251690`, Free, AWS eu-central-1). Production branch `main`, endpoint `ep-bitter-meadow-b9plx52i`. The schema was initialized explicitly with `snapshots:init` over the direct connection.

## Verification

**Before release:** the complete local gate passed on `6c6eb5f`: 727 unit, 477 integration and 362 browser tests. The workspace audit reported two already-accepted advisories, one low and one moderate.

**CI on Linux, after release fixes:** CI exposed four problems that the Windows gate had not.
- POSIX npm and Corepack prefixes were not found.
- `apps/www/public/` is missing in a clean checkout.
- The CLI exited silently through bin symlinks.
- Integration workers raced on in-place package rebuilds.

Each was fixed and verified by Foundation CI on #23 and #25. No new full local gate was run. One #25 run failed on runner disk quota (`EDQUOT` during `bun install`) and passed on rerun; the push run of the same commit passed.

**Registry:** the 0.2.1 tarball downloaded anonymously from the registry is byte-identical to the candidate.

**Runners:** measured on Linux (WSL Ubuntu 22.04, Node 24.19.0) from an empty directory. Each ran `--help` and a production dry-run `init --preset ps_7cca4bd460bbbd996abcf47cb07aa643@1 --dry-run --json`; every dry run returned `planned` with no writes.

| Runner | Result |
| --- | --- |
| `npx` (npm 11.17.0) | passed |
| `pnpm dlx` (pnpm 11.25.0) | passed |
| `bun x` (Bun 1.4.3) | passed |
| `yarn dlx --quiet` (Yarn 4.18.1) | passed with a scoped preapproval; Yarn quarantines versions younger than 24 hours |

On the same host, `npx @ombelle-ui/cli@0.2.0 --help` produced no output.

**Production smoke:** published preset `ps_7cca4bd460bbbd996abcf47cb07aa643@1` (hash `a2f53a7015e34907b1b142c2ad42e3804bb1d8d959afa357d59a33b44589d0b9`, named "Production smoke test 2026-11-02") and recipe `rc_b511c3b46cf3293bf58491e0839ddf48@1` (hash `5cdc6b3a7e4413114215f62d52465f384070de5cf90122a5d98f6a88db660fd3`).
- In a fresh npm Vite-shaped project on Linux, `npx @ombelle-ui/cli@0.2.1` planned without writes, applied `init` and `add --recipe` by code, and a later `add input` left `ui-preset.json` unchanged. The lock records the official origin, both codes and both hashes.
- After a production redeploy of the same commit, both API responses were byte-identical and both code pages returned 200.
- An unknown code returns `404 SNAPSHOT_NOT_FOUND`.

**Site:** code pages and editor export panels show `npx @ombelle-ui/cli@0.2.1` commands and no checkout path. Checked live in a browser after #24 and #25.

## Incidents during release

**Production 503:** the first production deployment answered every snapshot read with `503 SNAPSHOT_SERVICE_UNAVAILABLE`. The schema had been initialized on a different Neon branch's endpoint (`ep-plain-field-b9uvygm1`), and a first retry used a pooled host, which `snapshots:init` rejects. Initializing `main` through its direct endpoint fixed it. [Hosted deployment](../hosted-deployment.md) now documents the per-branch and direct-connection requirement.

**Local TLS interception:** Avast Web Shield intercepted TLS to the npm registry and GitHub. Publication required an exclusion for `registry.npmjs.org`, and git used the Windows certificate store (`http.sslBackend=schannel`). Certificate verification stayed enabled throughout.

## Whole-branch review

An independent read-only review of `acd7873..b588dda` found no high-severity defect. It found these:

| Finding | Severity | Resolution |
| --- | --- | --- |
| IPv6 clients could rotate addresses within a /64 to bypass per-client limits and exhaust the 1,000/day global budget | medium | fixed in `276e054`: per-client keys use the /64 prefix |
| A malformed `OMBELLE_SNAPSHOT_PRODUCTION_DB_HOST` silently disabled the preview database guard | low | fixed in `276e054`: previews require a bare hostname and fail closed |
| Preview publishing works only from the deployment URL, not the branch alias | low | documented in [hosted deployment](../hosted-deployment.md) |
| README, CLI specification, local usage and operations docs still described the CLI as unpublished | medium (docs) | fixed in `aa28246` and `1ea3861` |

The review found these areas sound:
- Postgres transactions, locking and quota accounting.
- Idempotency and replay after withdrawal.
- Read-time hash and schema verification.
- Origin and `Sec-Fetch-Site` checks, and fail-closed hosted configuration.
- TLS on the database pool and in the CLI transport.
- Cache keying and verification.
- Shell-safe displayed commands and install path guards.
- The late release fixes.

## Policy and trust

- **Retention:** publications have no automatic expiry and cannot be edited or deleted anonymously. Withdrawal (`abuse`, `security`, `operator-request`) stops service responses but cannot recall downloaded, cached or installed copies.
- **Abuse protection:** only an HMAC of the trusted ingress IP (or IPv6 /64) is stored, in per-minute and per-day counters. Retry keys last 24 hours. See [snapshot service operations](../snapshot-service-operations.md).
- **Origin trust:** TLS and the canonical content hash detect mismatched content; neither authenticates a publisher. Bare codes trust only `https://ombelle-ui.vercel.app`; other origins need explicit hash pins.
- **Plans and quotas:** Vercel Hobby and Neon Free (1 GiB storage, 100 CU-hours per project). Application limits:
  - 5 attempts per client per minute;
  - 20 publications per client per day;
  - 1,000 publications globally per day;
  - 100,000 records and 256 MiB of responses.

## Not verified

- **Platforms:** macOS was not exercised; Linux coverage is WSL and GitHub-hosted Ubuntu runners.
- **Accessibility:** no manual screen-reader or keyboard review was done for the code pages and editor panel changes. Automated browser suites ran in CI.
- **Yarn:** `yarn dlx` without preapproval works only 24 hours after each publication.
- **Operations before launch:** backups and a restore drill, monitoring, and published privacy and security pages were not in place at release. They are tracked separately in the launch operations work.
