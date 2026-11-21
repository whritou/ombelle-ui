# 07 — Security

Date: 2026-11-21. Commit: `d162ab30586f57a2bd8b88dc8511e43fd5664bbf` (0.9.1, branch `docs/1-0-audits-wave-1`).

**Covered.**
- **Hosted service (`apps/www`).** All four route handlers under `src/app/api/v1`, every module in `src/snapshots/server`, the published preset and recipe pages, both preview iframes and their verifiers (`src/editor/preview-protocol.ts`, `src/editor/catalog-preview-protocol.ts`, `src/preset-editor/preview-protocol.ts`, `src/preset-editor/preview-receiver.ts`, `apps/preview/src/editor-preview.tsx`, `apps/preview/src/preset-preview.tsx`), `src/snapshots/preview-session.ts`, the inline preview, `next.config.ts`, `vercel.json` and the three operations docs.
- **Data contracts and generated code.** The preset and recipe schemas, traced from the request body through `normalizePublishedPreset` / `normalizePublishedInstallableRecipe` and the code generator (`packages/compiler/src/recipe-specimen.ts`, `component-recipe.ts`, `recipe-source.ts`) to the generated TSX.
- **CLI trust chain.** `packages/cli/src/snapshots/*`, plus how dependencies are derived.
- **Supply chain and release.** `.github/workflows/*`, the composite action, `dependabot.yml`, `CODEOWNERS`, `scripts/pack-cli.mjs`, `docs/cli-release.md`, the npm 0.9.0 evidence, `pnpm-workspace.yaml`, the audit policy test, the font registry, `SECURITY.md`, `/security` and `security.txt`.

**Path changes since the 0.7.8 draft.**
- Every path the prompt names still exists.
- There is no middleware, `proxy.ts` or header configuration other than `next.config.ts`.
- The prompt asks about "pnpm audit exceptions". These no longer exist: decision 0002's 15 November 2026 update removed `auditConfig.ignoreGhsas`, and `tests/integration/audit-policy.test.ts` forbids exclusions. The only dependency policy entry left is one `overrides` pin, judged below.

**Not covered, and why.**
- No request was sent to production. HSTS and the other platform-added headers were judged from configuration only (see Unverified).
- Path traversal and lifecycle scripts in the installer belong to audit 02. Rate limits and quotas belong to audit 08; I noted them only where they touch security.
- The Next.js dev server was not started. I proved the code-generation and URL-acceptance questions directly against the built compiler, which is the same normalizer the publish route calls, so the dev server was not needed.

Commands run:
- `corepack pnpm audit` (once): "No known vulnerabilities found".
- Two throwaway Node scripts in the session scratchpad, which import `packages/compiler/dist`.

## Summary

The hosted publication path is unusually well defended:
- Request bodies are size-, depth-, time- and media-type-bounded.
- The publish endpoint checks Origin.
- Every SQL statement is parameterized, and the schema identifier is regex-checked.
- Every stored response is re-validated and re-hashed on read.
- Withdrawal is enforced on every read and on idempotent replay.
- Errors are opaque.

The code generator puts all user text inside JSX expression containers as `JSON.stringify` literals, and closed schemas reject extra prop or content keys. A hostile recipe therefore cannot inject code into installed source (reproduced). The preview iframes are sandboxed with an opaque origin and recompile every message before rendering it.

The CLI compiles snapshot data locally against its bundled catalog. A server can therefore never supply code or dependencies, only schema-valid data.

I found no exploitable vulnerability that should block 1.0. What remains is hardening and release hygiene:
- The site sends no security headers (CSP, frame-ancestors, Referrer-Policy).
- Published navigation recipes can point preview links at arbitrary external sites, including plain `http://` and protocol-relative URLs.
- npm releases are packed and published from a workstation without provenance.
- The runtime appears to use the database owner role.

## Findings

### SEC-01 The site sends no Content-Security-Policy, frame-ancestors or Referrer-Policy header
- Severity: should-fix (hardening, not a current vulnerability)
- Where: `apps/www/next.config.ts:10-20` (the only `headers()` rule, which applies to `/ombelle-preview/:path*` only); `apps/www/vercel.json` (no headers); no `middleware.ts` / `proxy.ts`; `apps/www/src/app/layout.tsx:25` (inline theme script that a CSP would need to hash); `apps/preview/index.html` (no CSP meta)
- What happens:
  - No page carries `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`, `Referrer-Policy` or `Permissions-Policy`. HSTS is not configured in the repository and relies on the platform.
  - **Today's XSS risk is low.** All user data is rendered as React text, and the only `dangerouslySetInnerHTML` is a static string. But nothing would contain a future sink, and the service lets anonymous visitors store content that is rendered on the official origin.
  - **Clickjacking.** Any site can frame the editors and the code pages. The concrete clickjacking gain is small: "Get code" publishes the victim's own draft, and the resulting code is shown only to the victim.
  - **Unsandboxed framing of the preview pages.** Any site can also frame `/ombelle-preview/editor-preview/` and `/ombelle-preview/preset-preview/` without a sandbox. Those pages take their trusted parent origin from `document.referrer` (`apps/preview/src/editor-preview.tsx:80`, `apps/preview/src/preset-preview.tsx:40`). Framed that way they run on the main origin and accept renders from the attacker page. The recompile check (`verifyPreviewRender`, `verifyCatalogPreviewRender`, `verifyPresetTokens`) limits this to output the compiler itself produces, so I found no script path. CSP `frame-src 'self'` would also have stopped the external navigation in SEC-02.
- How verified: read end to end (every response path in `next.config.ts`, `vercel.json`, the route handlers and `publication-http.ts`/`errors.ts`, which set only Content-Type, nosniff, X-Request-ID, Cache-Control, ETag, Location and Allow)
- Suggested change: Add a site-wide header rule:
  - `Content-Security-Policy` with `default-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'`, and a nonce or hash for the theme script.
  - `frame-ancestors 'self'` (or `X-Frame-Options: SAMEORIGIN`) on `/ombelle-preview/*`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.

  Make the preview pages check `parentOrigin` against the configured public origin instead of trusting any referrer.
- Effort: M

### SEC-02 Published recipes can make preview links open arbitrary external, `http://` and protocol-relative URLs inside the official page
- Severity: should-fix
- Where: `schemas/component-recipe.schema.json:4637` and `:4665` (Navigation Menu `href`, pattern `^(/|#|https?://)`, unanchored); compare Breadcrumb at `:2183` (`^(?:$|/(?!/)|#…|https://)`); `packages/compiler/src/recipe-specimen.ts:245-251` (rendered as `NavigationMenuLink href`); `packages/catalog/src/templates/navigation-menu.tsx:51-53` (renders an `<a>`); `apps/www/src/editor/components/preview-frame.tsx:171` (`sandbox="allow-scripts"`, which still lets the frame navigate itself); `apps/www/src/app/recipes/[id]/[revision]/page.tsx` (public recipe page)
- What happens:
  - **The scenario.** An anonymous attacker publishes a Navigation Menu recipe whose "Sign in" link is `https://evil.example/login`, `http://evil.example/` or `//evil.example/login`, and sends someone the `rc_…` page link on `ombelle-ui.vercel.app`.
  - **What the victim sees.** Clicking the link in the published preview navigates the sandboxed preview frame to the attacker's page. That page then renders inside the official Ombelle page chrome. It cannot touch the parent, but it can show a fake login form or download prompt under the trusted domain.
  - **After install.** Installing the recipe writes the same links into the user's app as default content: a plain-HTTP link and a protocol-relative link that browsers resolve as external. `/\evil.example` style values also pass the unanchored pattern.
  - **Free text.** More broadly, recipe free-text fields (up to 4,000 characters, for example a Code Block "command" with a Copy button) let anyone publish arbitrary text under the official domain. Withdrawal is the only moderation, and it is reactive.
- How verified: reproduced. A scratchpad script (`href.mjs`) called `normalizePublishedInstallableRecipe` from `packages/compiler/dist`, the function the publish route uses (`recipe-service.ts:56`):
  - It accepted `//evil.example/login`, `http://evil.example/` and `https://evil.example/`, and emitted `NavigationMenuLink href={'//evil.example/login'}`.
  - It rejected `javascript:alert(1)`.

  I read the preview and template path end to end. I did not click through in a browser.
- Suggested change: Give Navigation Menu the Breadcrumb pattern: same-origin paths that do not start with `//`, fragments, or `https://` only, anchored. Add `frame-src 'self'` (SEC-01) so a preview frame cannot leave the origin. Consider showing external link targets in the published preview, or intercepting clicks there.
- Effort: S

### SEC-03 npm releases are packed and published from a workstation, without provenance or trusted publishing
- Severity: should-fix
- Where: `scripts/pack-cli.mjs:98-108` (packs and records `workingTreeDirty`, but does not refuse a dirty tree); `docs/cli-release.md:3-13` ("Publish first …", a manual step); `docs/evidence/npm-0.9.0-2026-11-19.md:3-21` (0.9.0 packed on Windows 11 with `workingTreeDirty: true`); `.github/workflows/*` (no publish workflow and no `id-token: write`)
- What happens:
  - **Pack and publish.** `@ombelle-ui/cli` is built and published from a developer machine, and npm records no build provenance. Users and `npx @ombelle-ui/cli@0.9.0` therefore cannot tell whether the tarball came from the tagged commit. A compromised workstation or npm token could ship a backdoored installer, and that installer writes code into user projects and runs package managers there.
  - **Dirty trees.** The packer records a dirty tree but still produces a candidate.
  - **Account protection.** Nothing in the repository records whether the publishing account enforces 2FA for publishes.
  - **What the evidence does and does not show.** The byte-for-byte registry comparison in the evidence file proves that the uploaded file matches the local candidate. It does not prove that the candidate matches the source.
- How verified: read end to end (packer, release doc, evidence file, all five workflows)
- Suggested change: Publish from a GitHub Actions job on a protected tag. Use npm trusted publishing (OIDC, `id-token: write`) with `--provenance`, gate it behind an environment with required reviewers, and fail `pack-cli.mjs` on a dirty tree. Record in `docs/cli-release.md` that 2FA is required for publishing.
- Effort: M

### SEC-04 The production runtime appears to connect as the database owner, so the immutability and withdrawal guarantees depend on application correctness
- Severity: should-fix
- Where: `apps/www/src/snapshots/server/config.ts:42-55` (uses `DATABASE_URL`); `docs/snapshot-service-operations.md:43` ("the integration's pooled `DATABASE_URL`"); `docs/production-operations.md:68` (tables owned by `neondb_owner`); `apps/www/src/snapshots/server/postgres-migrations.ts:52-56` (`publications_immutable` trigger); `scripts/snapshot-store.ts:24,35` (withdrawal uses the same `DATABASE_URL`)
- What happens:
  - **The setup.** The Vercel–Neon integration's `DATABASE_URL` is the branch owner role, and the docs and operator scripts use it for both the request runtime and initialization. Only the monitor and backup roles are least-privilege.
  - **The consequence.** Any future injection bug, a dependency compromise in the function, or a leaked Vercel environment variable gives full DDL. That access could drop `publications_immutable`, rewrite stored responses (re-hashing them so that read-time verification passes), or delete withdrawals. Bare install codes depend on exactly those guarantees (SEC-05).
  - **Exploitability today.** I found no injection today: every statement is parameterized.
- How verified: read end to end in code and docs. The actual production role was not inspected (see Unverified).
- Suggested change: Create an `ombelle_app` role with only `SELECT, INSERT` on `publications`, `SELECT, INSERT, DELETE` on `idempotency_keys` and `rate_buckets`, `SELECT` on `withdrawals`, and `SELECT, UPDATE` on `capacity`. Use it for `DATABASE_URL` and keep the owner credentials for `snapshots:init` and withdrawal only.
- Effort: M

### SEC-05 Bare official codes are trust-on-first-use: the CLI installs whatever the official origin returns for a code
- Severity: nice-to-have
- Where: `packages/cli/src/snapshots/input.ts:237-251,278-285` (official origin and no expected hash, so verification checks only internal consistency); `packages/cli/src/snapshots/recipe-input.ts` (same); `apps/www/src/snapshots/install-command.ts:297` (no `--preset-hash` for the official origin)
- What happens:
  - **The attack.** Someone who controls the Vercel deployment or the Neon database (see SEC-04) can serve different, schema-valid preset or recipe data for an existing `ps_…`/`rc_…` code to every new installer.
  - **The limits.** The impact is bounded, because snapshots carry data and not code. The CLI compiles locally against its bundled catalog, and dependencies come only from bundled templates and the pinned font registry (`packages/compiler/src/component-recipe.ts:126`). An attacker could still change colours, text content and links (SEC-02) in installed source.
  - **The lock.** The lock records the hash afterwards, but the first install is not pinned.
- How verified: read end to end
- Suggested change: Show `--preset-hash` / `--recipe-hash` in the official commands as well, or document the trust-on-first-use model on the code pages. The CLI already supports the flags.
- Effort: S

### SEC-06 The monitoring connection does not verify the database certificate
- Severity: nice-to-have
- Where: `docs/production-operations.md:33` (`?sslmode=require`); `scripts/monitor-production.sh:54` (passes `MONITOR_DATABASE_URL` to `psql` unchanged). Compare `scripts/pg-tools.sh:55` (`PGSSLMODE=verify-full PGSSLROOTCERT=system` for backups)
- What happens: libpq's `sslmode=require` encrypts but accepts any certificate. An on-path attacker could capture the read-only monitor password and feed false quota and capacity numbers to the monitor. The role is read-only and sees only `capacity` and `rate_buckets` (HMAC keys), so the gain is small.
- How verified: read end to end
- Suggested change: Document `sslmode=verify-full&sslrootcert=system` in the secret, or export `PGSSLMODE=verify-full PGSSLROOTCERT=system` in `monitor-production.sh`, as `pg-tools.sh` already does.
- Effort: S

### SEC-07 The audit decision says CI runs `pnpm audit` on every change; only the nightly Foundation workflow does
- Severity: nice-to-have
- Where: `docs/decisions/0002-registry-adapter.md:19` ("CI runs it after the frozen install"); `.github/workflows/ci.yml` (no audit step); `.github/workflows/foundation.yml:24-26` and `scripts/foundation-evidence.mjs:13` (audit runs inside `check:foundation:quality`, nightly at 03:00 or on demand)
- What happens: A dependency bump that introduces an advisory can merge, and deploy to production through the Vercel Git integration, up to a day before the audit flags it. Dependabot PRs are not audit-gated.
- How verified: read end to end
- Suggested change: Add `pnpm audit:workspace` to the `checks` job in `ci.yml`, which is the required `verify` path, or correct the decision text.
- Effort: S

### SEC-08 Production database identifiers are published in the repository
- Severity: nice-to-have
- Where: `docs/hosted-deployment.md:3` (Neon branch and endpoint `ep-bitter-meadow-b9plx52i`); `docs/production-operations.md:33,75` (full pooled and direct hostnames); `scripts/cleanup-neon-preview.sh:7` (Neon project id)
- What happens: The public repository names the internet-reachable production Postgres hosts. An attacker still needs a password. But the hosts make a ready target for credential stuffing and password spraying if a role password ever leaks or is weak. Neon Free has no IP allow-list.
- How verified: read end to end (only the placeholder `GENERATED_PASSWORD` appears in the connection strings; no secrets are committed)
- Suggested change: Replace concrete endpoints in the docs with placeholders, and keep the project id in a repository variable.
- Effort: S

## Unverified

- **HSTS and other platform headers in production.** Nothing in the repository sets HSTS. Vercel normally adds it on its own domains. To settle: read response headers from a preview deployment (not production).
- **GitHub private vulnerability reporting is enabled.** `docs/production-operations.md:132` claims it, and `SECURITY.md`, `/security` and `security.txt` all point to `/security/advisories/new`. A read-only `gh api repos/whritou/ombelle-ui/private-vulnerability-reporting` returned no output in this environment. To settle: run that call with an authenticated `gh`, or check the repository's Security settings.
- **Runtime database role (SEC-04).** To settle: run `SELECT current_user` from a preview deployment's function, or inspect the Vercel integration's role in the Neon console.
- **npm publishing account protection.** To settle: confirm in the npm account settings that 2FA is set to "authorization and writes", and list which tokens exist.
- **CODEOWNERS enforcement.** `.github/CODEOWNERS` names one owner for everything. To settle: check that the `main` ruleset requires code-owner review, and that the named account exists and has write access. Otherwise the file has no effect.
- **Preview deployment protection.** `docs/hosted-deployment.md` says previews sit behind Vercel Deployment Protection. To settle: check the Vercel project setting.

## Looked at and found sound

- **Request handling.**
  - `readPublishBody` (`apps/www/src/snapshots/server/body.ts`) enforces strict media type and identity encoding, a 64 KiB streaming cap, a 10 s deadline, fatal UTF-8 decoding and nesting depth 16 before `JSON.parse`.
  - Only exactly-`{preset}` or `{recipe}` bodies are accepted, with a UUID-v4 idempotency key.
  - `assertPublishOrigin` requires `Origin` to equal the public origin and rejects cross-site `Sec-Fetch-Site`, which is CSRF-safe.
  - API responses carry `nosniff` and an explicit JSON content type. Publish and error responses use `Cache-Control: no-store`; reads use `public, max-age=0, must-revalidate` with a SHA-256 ETag.
  - Error bodies use fixed messages only, and the operator script also suppresses exception text.
  - No API route sends CORS headers, so other origins cannot read responses (reads are public anyway).
- **SQL.** Every query in `postgres-store.ts` and `sqlite-store.ts` uses placeholders. The only interpolation is the schema name, gated by `^[a-z][a-z0-9_]{0,62}$` and quoted (`postgres-pool.ts:8-11`). Connection strings lose `sslmode`/`sslcert`/`sslkey`/`sslrootcert`, and the pool requires verified TLS with channel binding. Preview deployments cannot point at the production host (`config.ts:52-54`).
- **Storage integrity.** Publications are immutable (trigger). Each read re-checks size, response hash, canonical form, id/revision and payload hash before returning.
- **Withdrawal.** It goes through the operator CLI with database credentials only; there is no web route. Withdrawn items return 410 from reads, idempotent replays and both pages. The pages are `force-dynamic`. Caches and installed copies cannot be recalled, and the service says so to users.
- **Untrusted input in generated code (reproduced with `inject.mjs`).**
  - **Hostile text stays a string.** The test text held `"`, `</a>`, `{…execSync…}`, backticks, `${}`, `</script>`, `*/` and U+2028. It was emitted only as string literals inside `{…}` (via `JSON.stringify`, `recipe-specimen.ts:600-611`, and `recipe-source.ts:53,87,93`), and prettier parsed the output as valid TypeScript.
  - **Extra keys are rejected.** Extra `props` or `content` keys (for example `x={alert(1)} y`) are rejected with "must NOT have additional properties", so prop names, which are emitted raw, can come only from compiler code.
  - **Other user values are validated.**
    - `javascript:` hrefs are rejected.
    - Colours must match `#rrggbb` or a numeric-only `oklch(…)` pattern.
    - Design values are bounded numbers.
    - Font ids are enums, or are checked against the registry.
    - Part names are pattern-restricted.
    - Recipe ids are slugs.

    I found no CSS sink for free text: `url()`, `@import` and closing-brace breakouts are not reachable. Colour Picker free-text values are applied as a background only after `parseColor` succeeds (`templates/color-picker.tsx:398,541`).
- **Rendering on the site.** Published preset and recipe pages render all snapshot fields as React text. The only `dangerouslySetInnerHTML` is the static theme script. There are no server actions. `generateMetadata` uses only repository data.
- **Preview isolation.**
  - Both iframes use `sandbox="allow-scripts"` without `allow-same-origin`, so they have an opaque origin.
  - The parent accepts the handshake only from its own `contentWindow` with origin `"null"`, then talks over a private `MessageChannel`.
  - The iframe accepts init only from `window.parent` and recompiles every render, matrix and token message, rejecting it unless canonical output, CSS and hash match.
  - Gallery sources are hash-checked.
  - `NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN` accepts literal loopback only.
  - The inline previews (#180/#181) render built-in specimens and static stylesheets only. No user CSS reaches the main document.
- **Secrets and configuration.** No `.env` file is committed. `.env.example` lists only variable names:
  - `OMBELLE_SNAPSHOT_BACKEND`, `OMBELLE_SNAPSHOT_DB_PATH`, `OMBELLE_PUBLIC_ORIGIN`
  - `OMBELLE_SNAPSHOT_RATE_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`
  - `OMBELLE_SNAPSHOT_PRODUCTION_DB_HOST`, `OMBELLE_SNAPSHOT_CLIENT_IP_HEADER`, `NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN`

  The rate secret must be at least 32 bytes, and client IPs are stored only as HMACs. The server code has no `console.*` logging. The monitor role is read-only on two tables, and backups are age-encrypted before upload.
- **CLI trust chain.**
  - **Transport.** Codes must match exactly. Origins require HTTPS, with HTTP allowed only on literal loopback, and no credentials, `@`, backslashes or whitespace. The CLI follows no redirects, requires status 200 and a JSON content type with identity encoding, caps responses at 128 KiB, sets `rejectUnauthorized: true`, and has a 10 s deadline.
  - **Verification.** Custom origins require an explicit hash. The returned id and revision must match the request.
  - **Data only.** Snapshots carry data only, and generated files and dependencies come from the bundled catalog and font registry. Installs pass `--ignore-scripts` (or the equivalent) with exact versions.
  - **Windows cache check.** The ACL check passes its path through the environment, not the command string.
- **Fonts.** All 20 registry fonts are self-hosted through Fontsource packages pinned to exactly `5.3.0`, all OFL-1.1 (`packages/catalog/src/fonts.ts`). Nothing is fetched from a third-party host at runtime. The site's own fonts come from `next/font/google`, which downloads them at build time.
- **Dynamic code.** No `eval`, `new Function` or user-influenced dynamic import exists. `store-factory.ts` imports fixed paths. `editor-preview.tsx` loads precompiled defaults from an `import.meta.glob` map behind an `Object.hasOwn` check.
- **Workflows.**
  - Every third-party action is pinned by SHA, and every workflow has `permissions: contents: read` (plus `actions: read` for the monitor).
  - Nothing uses `pull_request_target`.
  - The Neon cleanup runs only for same-repository PRs or manual dispatch, passes the branch through `env`, and validates it against `[A-Za-z0-9._/-]` with no leading `-` and no `..`. It also refuses to delete default or protected branches.
  - Installs use `--frozen-lockfile --ignore-scripts`, and Dependabot covers both actions and npm.
- **Release package.** `pack-cli.mjs` bundles everything and fails on any external non-builtin import. It includes license notices, produces a manifest with no dependencies and no scripts, packs with `--ignore-scripts`, and cross-checks the integrity value. Website commands pin the exact published version (`npx @ombelle-ui/cli@0.9.0`). `snapshotInstallCommand` only displays origins it can quote safely.
- **Dependency policy.** `pnpm audit` is clean. The one override, `@vercel/cli-config@0.3.5>zod: 4.6.7` in `pnpm-workspace.yaml`, is narrowly scoped, states its removal condition, and moves to a newer, patched release. `allowBuilds` permits only esbuild.
- **Security reporting route.** `SECURITY.md`, `/security` and `security.txt` (expires 2027-11-02, monitored for renewal) agree on the private advisory route, the scope and the withdrawal process.
