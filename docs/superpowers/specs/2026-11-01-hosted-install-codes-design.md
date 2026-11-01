# Hosted install codes on Vercel

**Status:** Approved by the user on 2026-11-01; implementation planning authorized.
**Date:** 2026-11-01
**Baseline:** `acd7873` on `origin/main`.
**Branch:** `feat/hosted-install-codes`.
**Builder check:** A fresh read-only review on 2026-11-01 reported "nothing important left" before implementation planning.

## Intent and agreed constraints

Let a developer customize Ombelle on the website, explicitly publish the result, and copy an install command containing one opaque code. Installing must not require downloading JSON, pasting JSON, providing a service URL, or copying a separate hash. The same published preset can initialize a project, apply project styling, or style one supported Button. A published Button recipe additionally preserves its props, content, and local overrides.

The user chose hosted sharing across machines, then selected the existing Vercel project and its free plan. The user provisioned Neon Free through Vercel. On 1 November, the database `neon-carmine-cable` (Neon project `delicate-tooth-65251690`) was connected to `whritearthur-9467s-projects/ombelle-ui`. Production and Preview were selected, with database branching enabled for Preview. The Vercel dashboard confirms Available, Free, and the connected project. No application schema has been created. The supplied production URL currently returns `DEPLOYMENT_NOT_FOUND`.

Use `https://ombelle-ui.vercel.app` as the initial official origin. Keep Node 24.19.0 and pnpm 11.25.0 for repository verification. Vercel runs the supported Node 24 runtime; hosted patch versions are recorded rather than assumed identical to the local pin. Auth, Realtime, accounts, and billing features are outside this work. Keep both service plans free and do not enable paid resources.

## Approaches

| Approach | Benefit | Cost | Outcome |
| --- | --- | --- | --- |
| Existing Next.js app on Vercel, backed by Neon Postgres | Preserves the app, API, compiler, and installer; real persistence across requests and deployments | An asynchronous storage adapter and deployment setup | Selected through the user's hosting choice and completed Neon provisioning |
| Persistent Node host with the current SQLite store | Smallest storage change | Requires a different host with a durable filesystem | Does not fit the selected Vercel host |
| Encode all customization data into a self-contained string | No hosted lookup | Arbitrary colors, names, text, and overrides produce long strings | Does not fit the requested hosted sharing experience |

Retain the existing SQLite development path. Do not replace production persistence with `/tmp`, Blob files, or in-memory maps. Postgres transactions are needed for immutable records, idempotency, shared quotas, and concurrent publication.

## User experience and code identity

Keep existing preset references: `ps_` plus 32 random lowercase hexadecimal characters, followed by `@1`. They already contain 128 random bits and identify an exact immutable publication. Introduce the parallel recipe format `rc_` plus 32 random lowercase hexadecimal characters and `@1`. These are random references, rather than shadcn's encoding of a fixed set of configuration choices. Shorter aliases are not necessary to remove JSON from installation and are deferred.

Target command shapes, after installing the real CLI release:

```sh
ombelle init --preset PRESET_CODE
ombelle theme add PRESET_CODE
ombelle add button --preset PRESET_CODE
ombelle add --recipe RECIPE_CODE
ombelle add input
```

`PRESET_CODE` and `RECIPE_CODE` above are placeholders, not live codes. The website will show the actual code, a pinned package-runner command, its scope, and dry-run/apply instructions. Ordinary component additions use component names and the project's saved preset; they do not need new random codes or a service request. Only Button supports an independently scoped preset/recipe in this slice.

Publication remains explicit and confirms public visibility and retention. Edits after publication are unpublished until the user publishes again. New publication intents get new random IDs; retries of one intent reuse its result. Existing draft recovery, bounded undo/redo, clipboard/download fallback, stale-result fencing, and local JSON exports remain available. Preset and recipe drafts stay separate. New recipe publication must not implicitly publish a project preset.

## Hosted storage and operations

Add a Neon Postgres adapter behind the existing snapshot service boundary. Make storage operations awaitable and retain equivalent SQLite behavior for local development and the existing regression suite. The hosted backend is explicitly selected; a bad or missing Postgres configuration must return a controlled unavailable error, never fall back to a local file or another database.

Author proposal: use `pg` with a bounded, reused pool and Vercel's `attachDatabasePool`, following the current Neon guidance for Vercel Fluid Compute. Use the pooled `DATABASE_URL` for requests and direct `DATABASE_URL_UNPOOLED` for explicit operator migrations. Resolve and pin exact compatible package versions during planning; no ORM is needed for this small existing SQL store.

Store immutable canonical snapshot responses, their hashes and byte lengths, publication identity, idempotency records, rate buckets, withdrawals, capacity, and an explicit schema version. Recipe records contain the normalized Button recipe, normalized resolved built-in preset, their hashes, and exact catalog/compiler versions. They never contain executable remote source. Use constraints and immutable-row protections plus parameterized SQL. Retain embedded preset/recipe identity independently of publication identity so publishing cannot bypass installed-file conflicts.

Provide versioned migrations and operator commands for initialization, withdrawal, unwithdrawal, and backup/export guidance. Runtime requests, imports, and builds never run DDL. Verify unknown schema versions fail closed. Test migrations on an isolated Neon branch before applying the reviewed migration to the initially empty production database. Do not destructively import or reset existing data. Existing SQLite files are not automatically uploaded.

Publication transactions must atomically enforce idempotency, record creation, capacity, and daily quota consumption. Concurrent same-key requests produce one record. Reusing a key across kinds or different content conflicts. ID collisions retry at most three times. Expired retry keys and rate buckets have bounded cleanup. Use consistent lock ordering and short transaction deadlines; hashing and compilation occur outside write transactions.

Presets and recipes share the current publication budget: five attempts per client per minute, twenty new publications per client per UTC day, and 1,000 new publications globally per UTC day. A retry consumes the attempt budget but not a second daily publication. Start with a combined 256 MiB canonical-payload cap and 100,000 records, leaving headroom within Neon's 1 GB free storage for indexes, bookkeeping, and provider overhead. Document that this payload cap is not a precise database-size guarantee. Keep the existing 65,536-byte payload, depth-16, ten-second body deadline, and 128 KiB envelope limits.

Use a server-only HMAC rate secret and the client IP supplied by Vercel's documented trusted ingress. Do not trust an arbitrary forwarded header or request Host. Configure allowed origins explicitly for production and verified preview deployments. Preview publication must point to its preview database, not production. Keep secrets out of source, client bundles, screenshots, and logs. Provision only the variables the implementation uses.

## API and trust

Preserve `POST /api/v1/presets` and exact GET/HEAD reads, canonical responses, ETags, withdrawal checks, controlled errors, and current validation. Add matching recipe publish/read routes under `/api/v1/recipes`. Add source schemas for recipe snapshot envelopes in `schemas/` and generate their contract bindings.

The new code-only CLI mode uses the compiled-in official HTTPS origin. It fetches the exact reference, validates the strict envelope, confirms its identity, release and size limits, and recomputes normalized payload hashes before planning. It trusts the official service over verified HTTPS to associate a random reference with its payload. This differs from an externally supplied expected hash: an unguessable reference is not a cryptographic commitment to content. State that trust model explicitly; do not claim recomputation authenticates the publisher or independently detects a compromised official registry.

Preserve the current explicit `--snapshot-origin` plus `--preset-hash` path and its pinning guarantees for presets. Supplying an alternate origin still requires an explicit expected hash. Recipe remote inputs use an equivalent explicitly pinned custom-origin path, with a clearly named recipe hash flag. No redirects, arbitrary URL inputs, TLS bypass, or automatic fallback to stale cache. Exact origin/reference/hash provenance is recorded in planned locks and shown in dry-run output.

Local files keep their current behavior. Existing explicitly pinned preset offline mode stays intact. Code-only installation initially resolves online; later ordinary additions remain offline through saved local project defaults. A code-only `--offline` request must give a clear action rather than silently choose an unpinned cached record. Extending offline cache discovery can follow separately.

Recipe resolution returns one in-memory validated input before planning and reuses the existing recipe compiler and installer. Add optional per-recipe remote provenance without changing lock v1 identity rules. Preserve unrelated source maps in every lock writer. Dry-run, cancellation, conflicts, stale plans, or failed transactions must not cache a new remote input. Cache failure after a successful apply warns without undoing the install. Withdrawal blocks new online resolution and idempotent publication replay but cannot recall downloaded/installed artifacts.

## Hosted previews and deployment

Both current editor iframes hardcode a loopback preview server. Replace that assumption with a shared validated preview-base configuration. Build the existing generated Vite preview runtime for the editor and preset-gallery paths, copy its static output into a dedicated directory served by Next.js, and use correctly based asset URLs. Keep the generated component modules and existing compiler/frame protocols; do not hand-author replacement previews.

Retain `sandbox="allow-scripts"` without same-origin privilege. The existing opaque-origin handshake, source-window checks, request/session fences, and acknowledgement after verified rendering still apply when serving static files from the same deployment. Test the production build's nested paths and worker assets. Keep local development and existing browser fixtures working with an explicit loopback preview override.

Configure the monorepo install/build commands, app root, shared packages, workers, preview generation, static output, and Node runtime for the named Vercel project. Runtime builds must not need database access. Add server-only snapshot config, trusted ingress identity, and the official origin. Use an isolated preview deployment first, then deploy/promote the verified implementation to the supplied production domain. Smoke-test from outside the repository and record exact deployment/source identity.

## CLI distribution

Prepare a self-contained CLI npm tarball with the actual `ombelle` bin. Bundle internal compiler/catalog/contracts code so consumers do not need unpublished `workspace:*` packages, repository source, or install scripts. Retain required third-party license notices and audit the packed runtime contents. Pin the released CLI version in generated npm/pnpm/Yarn/Bun commands.

`@ombelle/cli` is the private workspace manifest name. The public package is `@ombelle-ui/cli`: the user reserved npm organization `ombelle-ui` on 2026-11-01 after finding `ombelle` taken. Authenticated membership and publish credentials still need verification. First prepare and test the exact tarball in a clean project. Verify namespace ownership, package availability, license metadata, and the user's authenticated publishing identity before any public publication. Do not publish under another identity or invent a successful public release. If npm access requires the user, retain the tested release artifact and ask for that final account step. Website commands may use the tested local/private invocation until the package is actually available, with clear status. Public distribution remains required for the final copy-and-run experience.

## Verification and acceptance

1. Contract/compiler tests reject malformed preset/recipe references, wrong envelope identity, unknown keys, unsupported releases, excessive data, and mismatched hashes. Existing local compiler outputs stay byte-identical.
2. Run shared real-storage contract tests against SQLite and an isolated Neon branch: initialization, immutability, concurrent retries, collision rollback, quotas, capacity, withdrawal, conditional reads, and schema failures. No test writes production data.
3. Exercise built-CLI code-only init, theme merge, scoped Button preset, and recipe installs, plus the explicitly pinned custom-origin and legacy local/offline paths. Preserve edited-file conflicts, project defaults, manager/lock formats, transactional recovery, source-map survival, and no cache writes on unsuccessful operations.
4. Browser tests cover explicit preset/recipe publication, retries, refresh recovery, stale response fencing, copied code/command identity, published pages, unavailable service with working local exports, keyboard and narrow-screen behavior, and installed-byte/style parity across the three families and both modes. Include real hosted-static previews and worker assets rather than only the development preview server.
5. Build packages before built CLI/consumer checks. Run TypeScript, relevant unit and integration suites, product/preview production builds, packed-CLI clean-consumer tests, and the appropriate foundation evidence gate after implementation. Preserve failed attempts and distinguish focused runs from full-matrix evidence.
6. Verify the deployed website, POST/GET/HEAD and withdrawal behavior, independent code-only installs, persistence after redeployment, and a later component add with the service unavailable. Use explicitly labelled non-sensitive smoke-test publications on production only after isolated preview tests pass; these immutable examples are intentionally public.

Completion requires working website publication and copied code-only install commands through an actually available CLI distribution. A connected database, passing local tests, or a deployment URL alone is not completion. Record remaining platform/free-plan/browser/manual-review limits honestly.

## Builder discretion and release boundaries

The builder chooses file organization, pool size within small free-plan limits, SQL lock implementation, precise migration tooling, cache-helper reuse, and focused test placement. Maintain existing package/module conventions and avoid unrelated catalog/UI redesigns. A database backup is not a retention/deletion policy; publish the service's public-payload/withdrawal policy before exposing publication generally. Reuse the repository's existing operator withdrawal reasons and do not introduce anonymous ownership APIs.

Public npm identity may need one final user account step after the artifact is ready; no package name outside the existing namespace is implicitly approved. No paid upgrades, accounts/Auth, Realtime, other scoped components, arbitrary code execution, listing/search, mutable aliases, or revision ownership are included.

## References checked

- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby): personal/non-commercial use and free usage limits.
- [SQLite on Vercel](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel): no shared persistent local database file.
- [Neon pricing](https://neon.com/pricing): Free storage/compute limits, checked 1 November 2026; the actual connected resource also displays Free.
- [Neon Vercel-managed integration](https://neon.com/docs/guides/vercel-managed-integration): project connections and preview branches.
- [Node connections to Neon](https://neon.com/docs/guides/node) and [Vercel database-pool lifecycle](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#attachdatabasepool).
- Existing immutable preset snapshot design, operations guide, and foundation evidence in this repository.
