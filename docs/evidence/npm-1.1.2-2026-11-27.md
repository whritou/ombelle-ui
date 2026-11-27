# npm release 1.1.2

Published `@ombelle-ui/cli@1.1.2` on 27 November 2026 with the `latest` tag. npm records publication at `2026-11-27T08:52:19.419Z`.
- **Published by:** the `Publish CLI` workflow ([run 45968367691](https://github.com/whritou/ombelle-ui/actions/runs/45968367691)), run from GitHub Actions on `main` at `3783953a` after the owner approved the `npm-release` environment.
- **Publishing method:** npm trusted publishing (OIDC, no stored token).
- **Provenance:** SLSA provenance attestation, recorded in the Sigstore transparency log (log index 4145369190).

The candidate was packed by that run (`pnpm pack:cli -- --release`) and uploaded as the run artifact `cli-release-1.1.2`. Its `release.json` records:
- release mode;
- a clean working tree;
- a version not already on npm;
- `sourceCommit` `3783953a7a44fdef04da81594234ad340c632013`.

Its SHA-512 integrity, which the registry reports for 1.1.2, is:

```text
sha512-yNny8xE7GQ+3taP1SlbYw5nKuQ1BJguFtrSsQX64OmZheS+ht2vX1PWCn08dSr4HwFeTzHkeohvK9/apk10KIA==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

**What the release changes:** a patch release, described in the [1.1.2 CHANGELOG entry](../../CHANGELOG.md). It changes installed source only, in the `pricing-01` block (`blocks/pricing-01.tsx` and `blocks/pricing-01.css`, both editions):
- Plans side by side line up: every "Choose" button sits at the bottom of its card at one height.
- The Recommended badge keeps a gap after the plan name, and a space, so screen readers read "Team Recommended".

No CLI command, flag, `--json` field, lock field or schema changes. `ombelle update` refreshes an unedited `pricing-01`.

**Checks before publication:**
- **Foundation:** [run 45916687455](https://github.com/whritou/ombelle-ui/actions/runs/45916687455) passed on `3783953a`, the published commit, with `verify` green. Recorded in [foundation-run.json](foundation-run.json).
  - 6880 unit tests and 812 integration tests.
  - 1185 browser cases with no flaky case, and 467 specimen cases with 2268 audited specimens. The specimen cases include the one documented known failure, CAT-04.
  - The blocks audit includes the new `pricing-01` alignment check.
- **Foundation extended:** the latest run before publication (45843719741, scheduled, on `cc34c510`) passed.
- **Locally on the release branch** (Windows 11, Node 24.19.0, pnpm 11.25.0): `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` (6876/6876) and `version-alignment`.

**Checks after publication** (Windows 11, Node 24.19.0, npm 11.19.0):
- `npm view @ombelle-ui/cli@1.1.2 dist.integrity` equals the integrity in the run's `release.json`.
- `npm pack @ombelle-ui/cli@1.1.2` is byte-for-byte identical to the run's candidate tarball (`cmp`).
- A fresh script-disabled registry install ran `npm exec --offline -- ombelle --version` (1.1.2) and `--help`. Its bundled catalog contains the `pricing-01` `plan-name` and `plan-body` markers.
- `npx @ombelle-ui/cli@1.1.2 init --preset ps_7cca4bd460bbbd996abcf47cb07aa643@1 --dry-run --json` returned `status: planned` against production and wrote no file. It ran in a copy of the Vite fixture with a Tailwind global stylesheet.

**Not run:**
- a non-dry-run `init`, `add pricing-01` or `update` from the registry package into a fixture;
- macOS and Linux runs of the published package;
- the manual NVDA, VoiceOver, Safari and Firefox reviews (owner actions).
