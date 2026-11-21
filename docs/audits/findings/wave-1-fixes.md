# Wave 1 fixes

21 November 2026, branch `feat/1-0-wave-1-blockers-272b76`, on top of `7045d93d` (0.9.1 plus the audit findings). Windows 11, Node 24.19.0, pnpm 11.25.0 through corepack. This file records what happened to each finding in `01-contracts-compiler.md`, `02-cli-installer.md`, `07-security.md` and `08-rate-limiting.md`. Every fix re-read the code first. Each code fix has a focused test that passes after it; for the blockers, CMP-04/05, SEC-02, RL-02, CLI-03, CLI-04 and CLI-06 the test was also run against the previous source and failed. Documentation and CI fixes (CMP-07, CMP-08, CLI-07, CLI-13, SEC-06, SEC-07) have no fail-before test; CMP-08's enum test passes on both, since the copies agree today.

Verification run at the end: `pnpm build:packages` and `pnpm typecheck` pass. The new and touched test files pass (82 files, 1,325 tests), except `packages/cli/test/transaction.test.ts` › "writes artifacts and final hashes, and rejects stale source", which fails here before and after these changes because this machine has no standalone `pnpm` JavaScript entry on PATH (`prepareManager`: "Cannot locate a pnpm JavaScript entry without shell evaluation"; corepack's `pnpm.CMD` shim is refused by design). `pnpm check:foundation`, the consumer matrix, browser suites and the hosted Postgres tests were not run.

## Status per finding

| ID | Severity | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| CMP-01 | blocker | Fixed | `d9addd36` | Snapshots verify against their stored bytes; recipe codes compile with their stored preset; lock recipe rows are checked with the preset they stored. Decision 0009. |
| CMP-02 | blocker | Fixed | `d9addd36` | `catalogRelease`/`compilerVersion` defined as the contract version (one constant, `supportedContractReleases`); docs 02, 04 and PR6 corrected; built-in presets frozen per `id@revision` by a hash test. The producing CLI version is still not recorded (see Deferred). |
| CMP-03 | should-fix | Guarded, not fixed | `d9addd36` | Defaults are still written into hashed recipe data. A test now fails when an existing component's prop defaults change, so it must be handled as a contract change. Hashing the authored form would change every recipe hash. |
| CMP-04 | should-fix | Fixed | `ef2e6256` | Every named font id is checked by role in `validateComponentRecipe`, whatever slots the component has. |
| CMP-05 | should-fix | Fixed | `ef2e6256` | `validateRecipe` checks the override font; pointers are `/overrides/fontFamilyId` and `/appearance/fonts/<field>`; the codifying test was corrected; dark-selector errors point at `/darkSelector`. |
| CMP-06 | should-fix | Deferred | — | Choosing the real `$id` base URL and titles is an owner decision about a public identifier, and it changes every `$ref` and the generated types. Do it before 1.0. |
| CMP-07 | nice-to-have | Fixed | `a905265d` | docs/10 component-preset families and hosted codes; docs/04 component count. |
| CMP-08 | nice-to-have | Fixed | `6daedfed` | CI fails on stale generated copies; a test keeps the schema `styleFamily` enum equal to `styleFamilies`. CI itself was not run. |
| CLI-01 | blocker | Fixed | `74cb0b1e` | A declared range at or above the catalog version is kept; newer majors and unrecognized specifiers are kept with a notice; only older declarations are raised, shown as `(replaces …)` and `current` in JSON. |
| CLI-02 | blocker | Fixed | `1186f323` | Signals roll back; `plan.json` is the journal; the lock names its owner; a stale lock is recovered on the next apply. Documented in `docs/foundation-local-usage.md` → "Interrupted operations". Tested at three kill points (before any write, between writes, during the install), after completion, a legacy empty lock, a live owner, and Ctrl-C during the install. |
| CLI-03 | should-fix | Fixed | `77368546` | CRLF copies of managed files are recognized by their LF hash and left untouched when current. |
| CLI-04 | should-fix | Fixed | `38f51e76` | `add` and recipe plans conflict when a created file's directory differs only in case. `theme add` (style file) does not check yet. |
| CLI-05 | should-fix | Deferred | — | A per-declaration before/after list in both plan outputs is a new output contract; worth doing, but larger than the other should-fixes. |
| CLI-06 | should-fix | Fixed | `55057924` | Layered `:root`/`.dark` are edited in place; both layered and unlayered is refused. |
| CLI-07 | should-fix | Fixed (docs) | `a905265d` | docs/05, docs/10 and foundation-local-usage now state the strict rule the inspector enforces. The code is unchanged. |
| CLI-08 | should-fix | Fixed | `1186f323` | No fixed limit; `OMBELLE_DEPENDENCY_TIMEOUT_SECONDS` sets one and the error names it. |
| CLI-09 | nice-to-have | Deferred | — | Exit-code and JSON-shape alignment for failure paths; should be settled with the 1.0 CLI contract review. |
| CLI-10 | nice-to-have | Deferred | — | Non-UTF-8 targets still report "File changed after planning". |
| CLI-11 | nice-to-have | Deferred | — | `@import url(...)` detection and insertion after `@charset`. |
| CLI-12 | nice-to-have | Deferred | — | Orphaned `--glass-*` declarations after a family switch. |
| CLI-13 | nice-to-have | Fixed | `a905265d`, `b228321d` | docs/10 and the usage string name hosted codes; the help test follows. |
| CLI-14 | nice-to-have | Deferred | — | Back up `package.json` and the manager lockfile with the other `.bak` files. |
| CLI-15 | nice-to-have | Partly fixed | `1186f323` | A failed `recovery.json` write no longer hides the original error. Created directories are still left after a rollback. |
| CLI-16 | nice-to-have | Deferred | — | JSONC `tsconfig.json` and `extends`. |
| SEC-01 | should-fix | Fixed (partial) | `d89f14ef` | `frame-ancestors`, `frame-src`, `object-src`, `base-uri`, `form-action`, XFO, Referrer-Policy, Permissions-Policy. No `script-src` (needs nonces); preview pages still derive their parent from `document.referrer`, now only from this origin. Not verified in a browser (see below). |
| SEC-02 | should-fix | Fixed | `cfd460df` | Navigation Menu links take the Breadcrumb rule; both refuse `/\`. |
| SEC-03 | should-fix | Deferred | — | Trusted publishing with provenance needs npm and GitHub account settings and a release workflow; out of scope here. |
| SEC-04 | should-fix | Deferred | — | A least-privilege runtime role needs production database access. |
| SEC-05 | nice-to-have | Deferred | — | Showing `--preset-hash`/`--recipe-hash` in official commands, or documenting trust on first use on the code pages, is a product wording decision. |
| SEC-06 | nice-to-have | Fixed | `6daedfed` | The monitor strips `sslmode` from the URL and uses `verify-full` with system roots; only the URL rewriting was exercised. |
| SEC-07 | nice-to-have | Fixed | `6daedfed` | `pnpm audit:workspace` runs in the required `checks` job. |
| SEC-08 | nice-to-have | Deferred | — | Replacing production hostnames in operator docs is an operator decision (the hosts stay in Neon and Vercel). |
| RL-01 | blocker | Fixed | `bf63e286` | 1,000 publications per network (IPv4 address or IPv6 /48) per UTC day, and the last 1,000 of the global 5,000 held for networks with fewer than 50 that day. The audit's /56 reproduction now stops at 1,000 and others can still publish. No schema change. |
| RL-02 | should-fix | Fixed | `f3abbfc1` | An exhausted key is answered without the write lock; Postgres attempts are counted outside the capacity lock. |
| RL-03 | should-fix | Deferred | — | Capacity runbook, cap migration and draft retention need an operator and product decision. |
| RL-04 | should-fix | Deferred | — | Read caching and the per-request schema check. Verification no longer recompiles recipes on read (a side effect of CMP-01), which removes most of the 40 ms recipe read cost; the store-open catalog query remains. Not re-measured. |
| RL-05 | should-fix | Deferred | — | Platform (Vercel firewall/WAF) rules need dashboard access. |
| RL-06 | should-fix | Deferred | — | Publishing only on an explicit action changes the editor flow; a product decision. |
| RL-07 | should-fix | Deferred | — | Raising the shared-IPv4 budget now that RL-01's network and reserve budgets exist is a product decision; RL-01 did not lower it. |
| RL-08 | nice-to-have | Fixed | `bf63e286`, `382c5c2a` | 429 bodies name the exhausted budget; editors show the wait and whose limit it is and word capacity as paused; the CLI names 404, 410 and 429. |
| RL-09 | nice-to-have | Deferred | — | Fixed windows; the RL-01 reserve limits what a boundary burst can take. |
| RL-10 | nice-to-have | Deferred | — | Belongs with the platform rule (RL-05). |
| RL-11 | nice-to-have | Fixed | `b4b476b2` | Published preset and recipe pages are `noindex, nofollow`. |
| Doc: PR11 / gap 3 | — | Fixed | `a905265d` | No longer says the first `add` conflicts on shadcn's `lib/utils.ts`. |
| Doc: PR6 | — | Fixed | `d9addd36` | "Met within one package release", with the contract-version meaning. |

No finding was marked "not reproduced": each one fixed here was confirmed in the code, and the code fixes listed above were reproduced by a failing test first.

## Public behaviour changes

- **Snapshot identity (CMP-01/02).** No snapshot, lock, hash or schema format changes. Snapshots that failed verification because a built-in changed verify again. Installing a recipe code whose built-in changed after publication now compiles the stored preset's tokens and scope, so those artifact bytes differ from what 0.9.1 produced for the same code.
- **Stricter validation.** Published component recipes naming an unknown or wrong-role font (CMP-04), and Navigation Menu or Breadcrumb recipes with `http://`, `//`, `/\` or bare-host links (SEC-02), no longer verify or install. Navigation Menu shipped two days before this change.
- **Dependency plans (CLI-01).** Fewer installs are planned; JSON `dependencyPlan` entries can carry `current`; plans carry notices for kept dependencies.
- **Lock file and exit codes (CLI-02).** `.ombelle-operation.lock` changes from an empty file to a JSON owner record. A recovered interrupted operation exits 4 with a recovery record. `recovery.json` gains `restoredPaths` and `interrupted`. Dependency installs no longer stop after 120 s by default.
- **Rate limits (RL-01, RL-08).** New 429 conditions (network day, light-network reserve). 429 bodies carry an `issues` entry naming the budget.
- **Headers (SEC-01).** Every page sends the new CSP and framing headers.
- **Docs.** The package-manager rule is now documented as the strict rule the code enforces.

## Not verified

- **SEC-01 in a browser.** The dev server served the headers on pages and `/ombelle-preview/*`, but the in-app browser blocks the sandboxed preview iframe on localhost (`net::ERR_BLOCKED_BY_CLIENT`) with or without the headers, so the editors' preview frames, workers and the inline theme script were not exercised under the policy. Check both editors on a preview deployment before release.
- **Postgres.** RL-01 and RL-02 change both stores; only SQLite ran. The Postgres code was type-checked and read. Run `pnpm test:hosted-storage` on a disposable branch.
- **CI changes.** The stale-generated-sources step and the audit step were not run in CI.
- **Monitor TLS.** The `psql` call with `verify-full` was not run against Neon.
- **Real package managers.** CLI-02 recovery and CLI-08 were tested with stub dependency ports and a stub manager script, not a real npm/pnpm/Yarn/Bun install.
- **Already-published production data.** No production request was made. Whether `rc_b511…@1` now verifies (it fits CMP-01) was not checked against the stored row.
