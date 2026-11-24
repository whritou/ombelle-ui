# 13 — Hosted operations and performance

22 November 2026, branch `docs/1-0-audits-wave-3` at `9317458a` (0.9.1 plus the wave 1 fixes from PR #189 and liquid glass from PR #190; the wave 2 fixes from PR #191 are not in this tree).

**Covered.** I read the code end to end for:

- the hosting setup: `apps/www/next.config.ts`, `vercel.json`, `src/security-headers.ts`, the four `api/v1` route handlers and both published-code pages;
- the snapshot server: `src/snapshots/server/{service,config,postgres-pool,postgres-store,postgres-migrations,store-factory,publication-http}.ts` and `scripts/snapshot-store.ts`;
- the build scripts: `scripts/build-hosted-www.mjs`, `build-hosted-preview.mjs`, `build-editor-worker.mjs`, `measure-www-first-load.mjs` and `worker-budget.ts`;
- the operator scripts: `backup-production.sh`, `restore-drill.sh`, `monitor-production.sh`, `cleanup-neon-preview.sh` and `pg-tools.sh`;
- the workflows: `ci.yml`, `backup-production.yml`, `monitor-production.yml`, `cleanup-neon-preview.yml` and `dependabot.yml`;
- the editors' worker hooks, the Sidebar template and the CLI snapshot transport;
- the docs: `docs/production-operations.md`, `hosted-deployment.md`, `snapshot-service-operations.md`, `evidence/foundation-performance.md` and `cli-release.md`.

GitHub Actions run history was read with `gh run list` and `gh api …/runs/<id>`, which are read-only.

**Measured against production.** Only GETs of public pages and static files on `https://ombelle-ui.vercel.app`, plus one GET of an existing published code and of an unknown code; no write endpoint was called.

- Response headers and timings: `curl`.
- Throttled page loads: a Playwright script driving system Edge 158, at a 412×823 mobile viewport, with 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up and 4× CPU slowdown, cache disabled, three runs per route, medians reported.
- Layout-shift attribution: a second Playwright script.
- Worker and chunk sizes: the in-app browser's Resource Timing.
- The published CLI: `npx -y @ombelle-ui/cli@0.9.1 --help` with an empty npm cache in the scratchpad, on Windows 11 with a Ryzen 7 2700X.

The scripts and raw output are in the session scratchpad (`audit-13/vitals.mjs`, `cls.mjs`, `editor-resp.mjs`, `prod-vitals.json`, `monitor-runs.txt`).

**Not covered, and why.**

- **No local site build.** Partway through the audit the session's shell and write tools started refusing every command and write under this worktree ("This session is isolated in the worktree … glass-stable"). I was not allowed to work in another worktree, so I ran no local build. Without it there is no local `next build` route table, no `measure-www-first-load.mjs` output, no esbuild metafile breakdown of the workers, and no scripted editor-responsiveness or memory run. Production measurements stand in for the first three. The editor round trips and long-session memory are listed under Unverified.
- **No dashboards or databases.** The Vercel and Neon dashboards, plan limits and usage are not visible from the repository. No database was queried.
- **No operator scripts run.** Backup, restore, monitor and cleanup were read, not run.
- **Out of scope.** Security (audit 07) and rate limiting (audit 08) findings are referenced, not repeated.

## Summary

Production is up, and the parts that exist are carefully built:

- explicit, transactional and idempotent schema initialization;
- a production-host guard on previews;
- encrypted monthly dumps with two recorded restore drills;
- read-only monitor and backup roles.

The operational gaps are around the edges.

- **Preview cleanup leaks database branches.** It misses Dependabot PRs and transient API errors. This is what filled Neon Free's 10-branch limit today and broke every PR preview.
- **The "hourly" monitor is not hourly.** It actually runs about 3.5 times a day, with gaps of up to 10.8 hours. It mails one person and watches neither errors, latency nor platform usage.
- **Up to a month of publications can be lost.** Backups are monthly, against a 6-hour provider history.
- **Schema changes have no safe path.** There is no forward migration path, so any schema change is an outage.
- **Most incidents have no runbook.** Rollback, a bad CLI release, credential rotation and an abusive publisher are all unwritten. Every credential and alert sits with one person.

On performance:

- Static pages are prerendered and served from the CDN with about 0.25 s TTFB.
- The component pages, editors and published-code pages ship the entire catalog stylesheet (3.8 MB of JavaScript, 347 KB brotli) and a 1.6 MB compiler chunk to the browser. On a throttled phone that is 4 to 8 s of blocking time on most routes and 21 s on a published-code page.
- Component pages shift layout by **CLS 0.92** on phones.
- The editors start two or three copies of a 5.5 MB compiler worker.
- No bundle budget exists anywhere.

None of this makes 1.0 ship wrong output or lose data today, so I found **no blockers**. OPS-01 to OPS-04 and OPS-08 to OPS-10 should be fixed before or soon after 1.0.

### Key measurements (production, throttled mobile profile, medians of three)

| Route | FCP | LCP | CLS | TBT | Transfer | JS transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 2.8 s | 2.8 s | 0.04 | 5.9 s | 1,020 KB (fonts 624 KB) | 241 KB |
| `/components` | 1.7 s | 2.7 s | **0.92** | 5.1 s | 842 KB | 606 KB |
| `/components/button` | 1.8 s | 3.1 s | **0.92** | 7.3 s | 1,799 KB (fonts 560 KB) | 1,037 KB |
| `/editor/preset` | 1.8 s | **12.4 s** | 0.08 | 7.8 s | 1,362 KB + preview frame | 1,107 KB |
| `/editor/component/button` | 1.8 s | 1.8 s | 0.00 | 7.4 s | 1,345 KB + workers | 1,091 KB |
| `/presets/ps_7cca…/1` | 3.8 s | 3.8 s | 0.00 | **21.2 s** | 1,185 KB | 979 KB |

Other numbers:

- **Server.** Static HTML TTFB is 0.20–0.38 s, from a CDN hit or prerender. A warm API GET takes 0.14–0.31 s. The first API or published-page request after idle takes **3.0–3.5 s** (OPS-14).
- **Compiler workers.** `editor-compiler.worker.js` is 5,560,807 bytes raw and 814 KB brotli; `preset-compiler.worker.js` is 5,502,291 bytes raw and 796 KB brotli.
- **Preview frame bundle.** `/ombelle-preview/assets/dist-*.js` transfers 783 KB.
- **CLI.** `@ombelle-ui/cli@0.9.1` unpacks to 6.1 MB, with a 5.67 MB `main.js`. `npx` takes 19.6 s with a cold cache and 9.1 s warm. `node main.js --help` takes 1.5–1.9 s against 0.13 s for bare Node.

## Findings

### OPS-01 Preview database branches leak: cleanup misses Dependabot PRs and transient errors, so Neon Free's 10-branch limit fills and every PR preview fails
- Severity: should-fix
- Where: `.github/workflows/cleanup-neon-preview.yml:2-4,15,23-26`; `scripts/cleanup-neon-preview.sh:18-20,24,39`; `docs/production-operations.md` "Preview database branches"; `.github/dependabot.yml`
- What happens: the Vercel Neon integration creates a Neon branch `preview/<git branch>` for every preview deployment and never deletes it. The only cleanup is a `pull_request: closed` job that makes one Neon API call. It leaks in three verified ways:
  1. **Dependabot closes.** Dependabot closed its own superseded PRs on 2026-11-17. A run that Dependabot triggers gets no repository secrets. All three cleanup runs that day failed with `NEON_API_KEY is not set`, and `gh api …/actions/runs/44064221527` shows `actor=dependabot[bot]`. The `head.repo == repository` condition does not exclude these runs, because Dependabot branches live in the repository.
  2. **Transient API errors.** The 2026-11-09 cleanup for `feat/forms-navigation-overlays` failed with `curl: (28) Operation timed out after 30002 milliseconds`. The script has no retry, and nothing runs it again.
  3. **Branches without a PR.** Previews built for pushed branches that never get a PR, or that are deleted without one, are never cleaned at all. Nothing triggers on branch deletion and nothing sweeps.

  **How it fills up.** Dependabot's weekly npm updates allow up to 5 open PRs, the Actions group adds more, and security updates add more again (those three fixture PRs were outside `dependabot.yml`'s `/` directory). The 10 branches are shared with `main`, the `dev-hosted-install-codes` test branch and any restore-drill branch.

  **Today's result.** All four open PR previews failed with "Resource provisioning failed". Nine manual dispatches on 2026-11-22 were needed to clear the leftovers. Previews are where the docs say to verify CSP and the editors before release (wave-1-fixes "Not verified"), so a full branch budget also blocks release verification.

  **Cost exposure.** On Neon Free the ceiling is the branch count, not money, so the failure mode is broken previews. On a paid plan, each leaked branch would add storage and compute.
- How verified: workflow and script read end to end. Reproduced from the run history with `gh run list --workflow cleanup-neon-preview.yml`, `gh run view <id> --log-failed` and `gh api repos/{owner}/{repo}/actions/runs/<id>`.
- Suggested change: Three changes together.
  - **Trigger.** Run the close handler on `pull_request_target: [closed]`, which gets repository secrets for Dependabot PRs too. It stays safe because the job only sparse-checks out the base branch's script and validates the head ref.
  - **Retry.** Retry the curl calls (`--retry 3 --retry-all-errors`).
  - **Sweep.** Add a daily `schedule` job. It lists `preview/*` Neon branches and deletes each one whose git branch no longer exists and has no open PR.

  Optionally, stop building Vercel previews for `dependabot/*` branches through the Ignored Build Step, since CI already covers them.
- Effort: S

### OPS-02 The "hourly" production monitor actually runs about 3.5 times a day, mails one person, and has no dead-man's switch
- Severity: should-fix
- Where: `.github/workflows/monitor-production.yml:3-5`; `scripts/monitor-production.sh:2-3`; `docs/production-operations.md` "Monitoring" ("every hour at minute 17")
- What happens: the run history shows 70 scheduled runs between 2026-11-03 and 2026-11-22. That is 3–5 a day against the 24 the cron asks for. The gaps between runs had a minimum of 3.5 h, a median of 7.3 h and a maximum of **10.8 h**. GitHub's scheduler drops and delays scheduled runs under load. So a production outage, a full quota or an expired backup can go unnoticed for most of a working day.

  **Alerting.** The only alert is GitHub's failed-workflow email to the account that last edited the cron. Nothing notices if the monitor itself stops running, for example if GitHub disables schedules after 60 days without repository activity or Actions has an incident. Every run so far succeeded, so the alert path has never been exercised.
- How verified: reproduced with `gh run list --workflow monitor-production.yml -L 200 --json createdAt,event` and a gap computation (`audit-13/monitor-runs.txt`). Workflow and script read end to end.
- Suggested change: Move availability checks to an external uptime service that probes `/`, the unknown-code API path and a known-code read every 1–5 minutes and pages more than one channel. Keep the Actions job for the quota and backup-age checks, and correct the documented frequency. Add a heartbeat (a monitor run pings a dead-man's-switch URL) so that a stopped monitor alerts too.
- Effort: S

### OPS-03 Monitoring does not watch errors, latency, real snapshot reads, npm availability or platform usage
- Severity: should-fix
- Where: `scripts/monitor-production.sh:20-75`; `docs/snapshot-service-operations.md` "Initialize, withdraw, restore" (asks to monitor "service errors, lock contention, … backup age"); `docs/production-operations.md` "Monitoring"
- What happens: each run checks five static URLs for 200, an unknown code for `SNAPSHOT_NOT_FOUND`, the `security.txt` expiry, four capacity ratios and backup age. Several things are not watched:
  - **Errors and latency.** There is no 5xx rate, no latency, no Vercel log drain (Hobby has none) and no Next.js error capture.
  - **Real reads.** No existing code is read. A row that fails the read-time integrity checks (503) or a verification regression after a deploy (as CMP-01 was) passes the monitor, because only the 404 path is probed.
  - **The published CLI.** Nothing checks that `npx @ombelle-ui/cli@<published>` resolves, or that the `minimumCli` gates match the published version.
  - **Platform usage.** Nothing watches Vercel Hobby usage or Neon Free compute hours and egress. Both free tiers stop the service rather than bill when a limit is reached, so the cost ceiling is an outage that also stops CLI code resolution. RL-04 notes reads keep the Neon compute awake.
  - **Connections.** Database connection counts are not watched.

  The database size check assumes a 1 GiB allowance (see Unverified). Certificate and domain expiry are not relevant on `*.vercel.app`.
- How verified: read end to end.
- Suggested change: Add three probes to the monitor: a known code read with a hash comparison, `npm view @ombelle-ui/cli version` compared with `apps/www`'s published version, and the 5xx count over the last hour from Vercel's API. Record in `production-operations.md` where Vercel and Neon usage alerts are configured. Usage alerts are dashboard settings; RL-05 covers the platform rate rules.
- Effort: M

### OPS-04 Backups are monthly, so up to a month of "immutable" publications can be lost; off-GitHub copies are a manual, unrecorded step
- Severity: should-fix
- Where: `.github/workflows/backup-production.yml:3-4,52-56`; `docs/production-operations.md` "Backups" (6-hour Neon history, 90-day artifacts, "Keep a copy of at least one backup per quarter outside GitHub")
- What happens: the independent copy is taken on the 1st of each month. Neon's own history covers only the last 6 hours, and Neon snapshots live in the same project. So any loss outside that window costs every code published since the last dump, up to about 31 days:
  - an operator restore to the wrong point;
  - deleting the project or branch;
  - account loss;
  - a compromise through the owner-role runtime (SEC-04).

  Those codes are in users' READMEs and scripts, and the product promises they never change.

  **Cost of a dump.** The recorded dump is 13 KB, so daily backups cost nothing. Only one backup run has ever happened (manual, 2026-11-02); the first scheduled run is 2026-12-01. GitHub's scheduler is unreliable (OPS-02), but the 35-day freshness check would catch a missed month.

  **Retention.** Artifacts expire after 90 days. The quarterly off-GitHub copy has no log entry or checklist. If it is forgotten, at most three months of history exist, all inside one GitHub account.
- How verified: read end to end; backup run history from `gh run list --workflow backup-production.yml`.
- Suggested change: Run the backup daily, or at least weekly, and tighten the freshness check to match. Add a row to the drill table each quarter for the off-GitHub copy, or push the encrypted artifact to a second store (for example an R2 or S3 bucket with object lock) from the workflow.
- Effort: S

### OPS-05 There is no forward schema migration path, and the exact version check means any schema change takes the service down
- Severity: should-fix
- Where: `apps/www/src/snapshots/server/postgres-migrations.ts:4,12,79-84`; `postgres-store.ts:159` (schema verified on every store open); `docs/hosted-deployment.md` ("performs no database initialization or migration"); `docs/snapshot-service-operations.md` "Runtime and environment"
- What happens: `initializePostgresSnapshotStore` creates schema version 1 when the schema is empty, and otherwise only verifies it. There is no step from version 1 to version 2. `verifyPostgresSnapshotSchema` requires `version === 1` exactly, six tables and both triggers, and runs before every request. So any future change has a forced sequence:
  - raising the capacity `CHECK` (RL-03);
  - adding an index or column;
  - moving to a least-privilege role (SEC-04 needs grants, not a version bump, but the same procedure applies).

  The new code answers 503 until the migration runs, and the old code answers 503 as soon as it does. Vercel Instant Rollback to a pre-migration deployment would also 503 every snapshot read and published-code page. Initialization itself is sound: one transaction, an advisory lock and lock/statement timeouts, so it cannot half-run and is safe to repeat.
- How verified: read end to end.
- Suggested change: Before 1.0, add numbered, transactional migrations to `snapshots:init`. Have the runtime accept a range (for example `version >= minimumSupported`), so that code can be deployed first, the schema migrated second, and the previous deployment still works for rollback. Document the order in `hosted-deployment.md`.
- Effort: M

### OPS-06 Most plausible incidents have no written procedure: rollback, a bad CLI release, credential compromise, Neon outage, an abusive publisher
- Severity: should-fix
- Where: `docs/production-operations.md` (only monitoring, backups, restore drill, preview branches and contacts); `docs/snapshot-service-operations.md` "Initialize, withdraw, restore" (examples use SQLite and PowerShell only); `docs/cli-release.md`; `scripts/snapshot-store.ts:23-24,46-50`
- What happens:
  - **Bad deploy.** Every merge to `main` deploys production, gated only by the PR's `verify` check. No post-deploy smoke runs except the irregular monitor (OPS-02), and Vercel Instant Rollback is never mentioned. After a schema change, rollback is unsafe (OPS-05).
  - **Bad CLI release.** No procedure covers `npm deprecate`, moving `latest` back with `npm dist-tag`, or reverting the site's `--published` version so that install commands point at a working CLI. The 0.2.0 deprecation shows it was done once, ad hoc.
  - **Compromised credentials.** No rotation steps exist for any of them:
    - `NEON_API_KEY`;
    - the database passwords (owner, `ombelle_monitor`, `ombelle_backup`);
    - `OMBELLE_SNAPSHOT_RATE_SECRET` (rotation resets every rate counter);
    - the npm publish token, which SEC-03 notes lives on a workstation;
    - the age private key.
  - **Database or quota store down.** The quota store is the same Neon database, so this is one incident: publishing and reads both return 503. Nothing says what users see, what to check (Neon status, compute suspended, compute-hour quota) or how to communicate.
  - **Abusive publisher.** Withdrawal is documented, but the Postgres invocation is not:
    - the command needs `OMBELLE_SNAPSHOT_BACKEND=postgres` and the owner `DATABASE_URL`, and the example shows SQLite;
    - on failure the command prints only "Snapshot store operation failed", by design;
    - the server logs nothing and keys clients only by HMAC, so a repeat publisher cannot be identified or blocked except by a platform rule (RL-05).
- How verified: read end to end; searched the docs for rollback, deprecate, dist-tag and rotate.
- Suggested change: Add an "Incidents" section to `production-operations.md` with one short, tested procedure per case above. Include the exact Postgres withdrawal command and a credential inventory saying where each secret lives and how to rotate it.
- Effort: M

### OPS-07 Single-person dependency: every account, credential and alert sits with one maintainer
- Severity: should-fix
- Where: `docs/hosted-deployment.md:3,5` (personal Vercel Hobby project, Neon Free); `docs/production-operations.md` (alert email to whoever last edited the cron; age private key on the operator's machine with an "offline copy"); `.github/backup-recipients.txt`; `docs/cli-release.md` (local publish); `.github/CODEOWNERS` (one owner, see audit 07 Unverified)
- What happens: the following can only be done by the author:
  - deploying, rolling back or setting environment variables (Vercel Hobby is a personal account with no team members);
  - any Neon action (restore, branches, roles);
  - publishing or deprecating the CLI;
  - decrypting backups;
  - receiving alerts.

  If that person is unavailable, a production incident, a leaked token or a full branch budget (OPS-01) cannot be handled by anyone else, and encrypted backups cannot be read. Vercel's Hobby plan is also described as personal and non-commercial (see Unverified), which matters if 1.0 has commercial users or sponsors.
- How verified: read end to end (docs and config); platform account membership could not be inspected.
- Suggested change: For 1.0, add a second age recipient and a second maintainer with access to Vercel, Neon and npm (team or organization accounts). Send alerts to a shared channel. List who can do what in `production-operations.md`.
- Effort: M

### OPS-08 Component pages shift by CLS 0.92 on phones when the Sidebar hydrates
- Severity: should-fix
- Where: `apps/www/src/app/components/layout.tsx:9-14`; the Sidebar the site generates from `packages/catalog/src/templates/sidebar.tsx:31-42,60-63,102-122`
- What happens: on a 412 px viewport, `/components` and every `/components/<id>` page record one layout shift of **0.921** about 2 s after load. That is "poor" by Core Web Vitals, where the threshold is 0.25. The only source is the `SidebarInset` `<main>`, which moves from a zero-height rectangle at y=0 to y=65, height 758. The same pages at 1440 px record 0. `useIsMobile` returns `false` until an effect runs. The template intends the first render to match a CSS-only phone layout, but on the site the main column is not laid out until hydration switches the Sidebar to its phone sheet.

  The same template ships to users as the catalog Sidebar. Whether consumer apps shift the same way was not checked (audit 04 or 05 territory).
- How verified: reproduced with `node cls.mjs https://ombelle-ui.vercel.app/components 412` (PerformanceObserver `layout-shift` with sources) and in all three throttled runs of `/components` and `/components/button`; template read.
- Suggested change: Make the pre-hydration CSS give the inset its final phone layout below 768 px (the `data-hydrated`-absent state), so that hydration changes no geometry. Add a CLS assertion at a phone width to the components page's browser test.
- Effort: S

### OPS-09 Component pages, editors and published-code pages ship the whole catalog stylesheet and the compiler to the browser
- Severity: should-fix
- Where: client components that import runtime values from the package barrels:
  - `apps/www/src/site/components/playground.tsx:8` (`defaultGlassPresetId`);
  - `snapshots/components/published-preset.tsx:3` (`canonicalize`, `glassContrastReport`);
  - `recipe-snapshots/components/published-recipe.tsx:4`;
  - `editor/components/{catalog-component-editor,catalog-properties,catalog-appearance,properties-panel,artifact-panel}.tsx`;
  - `preset-editor/components/{preset-controls,glass-starting-points,preset-editor}.tsx`.

  The routes that load them are `app/components/**`, `app/editor/**`, `app/presets/**` and `app/recipes/**`.
- What happens: these routes load chunk `1v211br6suge8.js`, which is **3,830,127 characters** (347 KB brotli). It contains 21,117 `[data-slot=` selectors and 184 `retro-futurism` mentions, which is every family's component stylesheet. `/components/button`, both editors and the published-code pages also load `2z5-ipl6xihia.js`, 1,575,126 characters (415 KB brotli), which contains the compiler. The home page loads neither.

  On the throttled phone profile:
  - `/components/button` transfers 1.0 MB of JavaScript, with 7.3 s total blocking time;
  - the published preset page has **21 s** of blocking time and a 3.8 s LCP;
  - the preset editor's LCP is 12.4 s, because its largest paint is a status line that appears only after this work and the preview frame (783 KB `dist-*.js`) are done.

  A published-code page is the landing page for every shared install code, and it is the heaviest page on the site.
- How verified: reproduced with `vitals.mjs` (three runs per route, see the table above). Chunk contents inspected through the in-app browser (`fetch` of each chunk, string counts). Imports read. Which import pulls which module was not attributed with a bundle analyzer, because the local build was not possible.
- Suggested change: Import constants and types from small leaf modules, or add deep exports such as `@ombelle/catalog/presets`, instead of the barrels. Compute `glassContrastReport` and `canonicalize` on the server for the published pages. Load each family's CSS on demand. Then re-measure with OPS-11's budget.
- Effort: M

### OPS-10 The compiler workers are 5.5 MB each, and the editors start two or three copies at load
- Severity: should-fix
- Where: `scripts/build-editor-worker.mjs:6-26` (bundles all of `@ombelle/compiler` and the catalog into each worker); `apps/www/src/editor/use-compiler.ts:62`, `use-recipe-batch.ts:35`, `use-catalog-compiler.ts:16` (each hook creates its own `new Worker('/editor-compiler.worker.js')`); `apps/www/src/preset-editor/use-preset-compiler.ts:192`
- What happens: `editor-compiler.worker.js` is 5,560,807 bytes and `preset-compiler.worker.js` is 5,502,291 bytes (814 KB and 796 KB brotli). The two are almost the same content. On production, Resource Timing on `/editor/component/button` shows **three** fetches of the editor worker within 5 s of load: one full transfer and two cache hits. Each starts a separate worker that parses and initializes 5.5 MB. `/editor/preset` starts **two** preset workers. On a phone that means extra seconds of CPU and tens of MB of memory per copy (the main page heap alone was 71 MB). The editor budget in `docs/06-online-editor.md` ("simple visual token feedback within 100 ms") has never been measured against this.
- How verified: reproduced in the in-app browser (`performance.getEntriesByType('resource')` after load on both editor routes); hooks and the build script read.
- Suggested change: Share one worker per page between `useCompiler`, `useRecipeBatch` and `useCatalogCompiler`. Fix the preset editor's second start, which looks like an effect restart. Split per-family CSS out of the worker bundle so that a compile loads only the family it needs.
- Effort: M

### OPS-11 No performance budget exists; the first-load script is not wired anywhere, and `worker-budget.ts` is about test parallelism
- Severity: should-fix
- Where: `scripts/measure-www-first-load.mjs` (prints sizes and asserts nothing; not referenced by `package.json`, `ci.yml` or `foundation.yml`); `scripts/worker-budget.ts` (validates `OMBELLE_*_WORKERS` counts, not bundle size); `docs/06-online-editor.md:114-118` ("Establish concrete bundle and device budgets in M0"); `docs/evidence/foundation-performance.md` (test-suite timing only)
- What happens: no check fails when a route's JavaScript, the workers or the preview bundle grow. OPS-09 and OPS-10 landed that way: a 3.8 MB stylesheet chunk on documentation pages and two 5.5 MB workers. The proposed editor budgets were never turned into numbers. The script also covers only prerendered HTML routes, so the dynamic published-code pages, the workers and `/ombelle-preview/assets` are outside it.
- How verified: read end to end; searched the repository for every reference to the script and to "budget".
- Suggested change: Give `measure-www-first-load.mjs` thresholds per route, plus the workers and the preview bundle. Run it in CI's shard that already builds the hosted preview, and record the numbers in `docs/evidence/`.
- Effort: S

### OPS-12 Content-hashed preview assets are served with `max-age=0, must-revalidate`
- Severity: nice-to-have
- Where: `apps/www/src/security-headers.ts:28-40` (the `/ombelle-preview/:path*` rule sets CORS but no `Cache-Control`); `scripts/build-hosted-preview.mjs` (Vite emits hashed `assets/*-<hash>.js` and fonts)
- What happens: `/ombelle-preview/assets/index-CvTb01h7.js` and the other hashed preview assets answer `Cache-Control: public, max-age=0, must-revalidate`. So does each preview font. Every editor and component-page visit revalidates each of these files with a round trip, which costs about 150 ms each on the throttled profile, and each revalidation counts as an edge request. Next's own `/_next/static/immutable/*` correctly answers `public,max-age=31536000,immutable`. The unhashed worker URLs must stay revalidated, which is fine.
- How verified: reproduced with `curl -D -` against production.
- Suggested change: Add a `headers()` rule for `/ombelle-preview/assets/:path*` with `Cache-Control: public, max-age=31536000, immutable`. Optionally, content-hash the worker file names too.
- Effort: S

### OPS-13 The home page downloads 624 KB of fonts on first visit and preloads both logo variants
- Severity: nice-to-have
- Where: `apps/www/src/site/home/style-tiles.tsx`, `src/inline-preview/family-fonts.ts` (family fonts for the landing tiles); `src/site/header.tsx` / `logo.tsx` (two preloaded logo images)
- What happens: on the throttled profile, `/` transfers 1,020 KB, of which 624 KB is fonts, against 241 KB of JavaScript. `/components/button` transfers 560 KB of fonts. Both `ombelle-logo-dark.png` and `ombelle-logo-white.png` (35 KB each) are `<link rel=preload as=image>` on every page, though one is hidden by the colour scheme. On `/components` the hidden-in-dark logo is the LCP element. Fonts compete with the LCP text on slow links (FCP and LCP are 2.8 s).
- How verified: reproduced with `vitals.mjs` (per-type transfer) and `curl` of the home HTML (preload links). Which code loads each font file was not traced.
- Suggested change: Load a family's fonts only when its tile scrolls into view or is selected. Preload only the logo that matches the current scheme, or use one SVG logo with `currentColor`.
- Effort: S

### OPS-14 The first request after idle takes 3 to 3.5 s, and the CLI makes one attempt with a 10 s timeout
- Severity: nice-to-have
- Where: `apps/www/src/snapshots/server/postgres-pool.ts:116-120` (`connectionTimeoutMillis: 10_000`); `postgres-store.ts:149-160`; `packages/cli/src/snapshots/transport.ts:6-7,25-33`
- What happens: after a few idle minutes, the first `GET /api/v1/presets/<unknown>/1` took **3.31 s** to first byte and the first published-page request 3.0–3.55 s. Repeats took 0.14–0.20 s. The delay is a function cold start plus the Neon Free compute resuming from scale-to-zero. Most CLI installs by code will be the first request in a while, so users usually wait about 3 s. The CLI aborts at 10 s and does not retry. A slower resume, or a resume during a Neon incident, fails the install with "Snapshot request failed", where a single retry would have succeeded.
- How verified: reproduced with repeated `curl -w '%{time_starttransfer}'`; transport read.
- Suggested change: Retry once on connection errors and 503 in `fetchPublication`, with a short backoff, and keep the total under about 20 s. Consider Neon's scale-to-zero delay, or a keep-warm ping, once traffic justifies it.
- Effort: S

### OPS-15 The published CLI starts slowly: 19.6 s via a cold `npx`, 1.5–1.9 s for `--help` once installed
- Severity: nice-to-have
- Where: `scripts/pack-cli.mjs:29-30` (a single minified bundle including the catalog); the published `@ombelle-ui/cli@0.9.1` (`dist/main.js` 5,672,330 bytes, `THIRD_PARTY_NOTICES.txt` 427 KB, 6.1 MB unpacked)
- What happens: with an empty npm cache, `npx -y @ombelle-ui/cli@0.9.1 --help` took 19.6 s, and 9.1 s with the package cached (npx still resolves registry metadata). Running `node dist/main.js --help` directly took 1.52–1.94 s over four runs, against 0.13 s for bare Node. That is parse and initialization of the 5.7 MB bundle, and no compile cache is enabled (`enableCompileCache` absent). On the network side the CLI behaves well: `init` with a code makes one snapshot GET, `add` makes none (it reuses the saved preset), and the rest is the package manager's own install.
- How verified: reproduced with PowerShell `Measure-Command` on Windows 11 with Defender active, which inflates absolute times; bundle inspected; transport read.
- Suggested change: Call `module.enableCompileCache()` at the bundle's entry. Load per-family styles and templates lazily so that `--help` and planning avoid initializing the whole catalog. Track the package size in OPS-11's budget.
- Effort: M

## Unverified

- **Editor responsiveness over a long session.** Compile time per control change, worker round trips, iframe reloads and memory growth over hundreds of edits were not measured. The script is written (`audit-13/editor-resp.mjs`), but the shell became unavailable before the local build. To settle: build the site locally, run `node editor-resp.mjs http://127.0.0.1:3100 /editor/preset 200` and the same for `/editor/component/button`, and compare round-trip p95 with the 100 ms target in `docs/06-online-editor.md`.
- **JavaScript per route from a local build.** `node scripts/measure-www-first-load.mjs` after `next build`, and an esbuild metafile for both workers, would attribute OPS-09 and OPS-10 to exact modules.
- **The Neon Free storage allowance.** The monitor assumes 1 GiB (`monitor-production.sh:63`). If the plan's per-project allowance is lower (Neon has advertised 0.5 GB), the 80% alarm fires only after the real limit is reached. To settle: read the plan limits in the Neon console and set the constant from them.
- **Vercel Hobby limits and terms.** The function-invocation, CPU, edge-request and transfer limits, the behaviour when they are exceeded (pausing), and the plan's non-commercial-use terms decide the real cost ceiling and OPS-07's urgency. To settle: check the project's usage page and current plan terms.
- **Neon restore and the branch budget.** I believe Neon keeps the pre-restore state as an extra branch when a branch is restored from history. If so, a production restore during a full branch budget (OPS-01) would fail just when it is needed. The runbook also offers "Restore from history" without saying it discards every publication made after the restore point. To settle: check Neon's restore documentation and add the warning.
- **Previews of branches without a PR.** Whether the Vercel Neon integration creates `preview/<branch>` for every pushed branch, or only for branches with a PR, decides how much the OPS-01 sweep matters. To settle: list the Neon branches against `git ls-remote --heads` and open PRs.
- **The integration's own cleanup option.** Some versions of the Neon–Vercel integration offer automatic deletion of obsolete preview branches. Whether this project's integration has it was not checked in the dashboard.
- **Database round trips per publish.** Reading the code, a new publication makes about 27 sequential queries: schema verification, the attempt read and transaction, and the publish transaction. A read makes 2. Both run in `fra1` against `eu-central-1`, which suits them. The latency under load was not measured; audit 08 lists the throughput question.

## Looked at and found sound

- **Region alignment.** `vercel.json` pins functions to `fra1`, and the Neon endpoint is in `eu-central-1` (Frankfurt), so the per-query round trips stay in-region.
- **Initialization safety.** Schema initialization is explicit (never on build or request), runs in one transaction with an advisory lock and `lock_timeout`/`statement_timeout`, and is safe to repeat. A partially created schema is rejected.
- **Preview isolation.** On Vercel previews, `OMBELLE_SNAPSHOT_PRODUCTION_DB_HOST` is required and compared after normalizing `-pooler`. A missing or malformed value, or a match, fails closed with 503 (`config.ts:198-235`). Previews accept publications only from their own deployment URL.
- **Pool settings.** The pool has `max: 3`, a 5 s idle timeout, statement and idle-in-transaction timeouts and `attachDatabasePool` for Fluid compute. Idle errors are swallowed, and at most four pools exist per instance. Indexes cover every lookup: `publications` by primary key, `rate_buckets` by primary key plus `(kind, window_start)` for cleanup, and `idempotency_keys(expires_at)`.
- **Rendering and caching.**
  - Home, components, docs and both editors are prerendered and served from the CDN (`X-Vercel-Cache: HIT`/`PRERENDER`, `X-Nextjs-Prerender: 1`).
  - `/_next/static/immutable/*` is cached for a year as immutable.
  - Published-code pages are dynamic with `private, no-store`.
  - API reads use `public, max-age=0, must-revalidate` with a strong SHA-256 ETag, so a withdrawal takes effect on the next request. Not caching immutable snapshots at the edge is a deliberate trade-off for withdrawal; RL-04 (deferred) covers the cost.
- **Snapshot immutability.** The trigger blocks `UPDATE` and `DELETE`, and the runtime refuses to serve when either trigger is disabled. That it can be bypassed by the owner role is SEC-04 (deferred), not repeated here.
- **Backup handling.** The dump is age-encrypted before upload and the plaintext shredded. Two restore drills are recorded, including one from the automated artifact. The restore script verifies the SHA-256, refuses the production host and non-empty databases, restores in one transaction and compares counts and a fingerprint. The monitor checks that the latest backup is under 35 days old.
- **Monitor role and TLS.** The monitor role is read-only on two tables, and the TLS verification fix (SEC-06) is in place.
- **Cleanup script guards.** The cleanup script refuses names outside `preview/`, default and protected branches, and unexpected branch characters. The problem is coverage (OPS-01), not safety.
- **CLI transport.** One GET per code with a 10 s timeout, a 128 KiB cap, strict content-type, no redirects and explicit TLS verification. `add` with a saved preset makes no snapshot request.
- **Certificates and policy pages.** `*.vercel.app` certificates and the domain are managed by Vercel. The `security.txt` expiry is monitored, valid until 2027-11-02.
- **`docs/web-alpha-readiness.md`** lists no hosted-operations gaps, so none of these findings restate a known gap.
