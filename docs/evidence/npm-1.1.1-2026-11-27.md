# npm release 1.1.1

Published `@ombelle-ui/cli@1.1.1` on 26 November 2026 (UTC) with the `latest` tag. npm records publication at `2026-11-26T23:23:07.921Z`.
- **Published by:** the `Publish CLI` workflow ([run 45910380946](https://github.com/whritou/ombelle-ui/actions/runs/45910380946)), run from GitHub Actions on `main` at `c68d5618` after the owner approved the `npm-release` environment.
- **Publishing method:** npm trusted publishing (OIDC, no stored token).
- **Provenance:** SLSA provenance attestation, recorded in the Sigstore transparency log (log index 4136381074).

The candidate was packed by that run (`pnpm pack:cli -- --release`) and uploaded as the run artifact `cli-release-1.1.1`. Its `release.json` records:
- release mode;
- a clean working tree;
- a version not already on npm;
- `sourceCommit` `c68d5618b3f6d2dc03b6e706c6ab6d3f79501ba8`.

Its SHA-512 integrity, which the registry reports for 1.1.1, is:

```text
sha512-PjNE7rMrj+rJ1UIpqvU67NttJgKyrFM45nQ65YrfVschl/qWQDEKDWEnqWjy4c96puQeu6oU8F5rmZ6GH9MYQg==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

**What the release changes:** a patch release, described in the [1.1.1 CHANGELOG entry](../../CHANGELOG.md). It changes installed source only:
- **Toolbar:** a hovered pressed item keeps readable text, which fixes the 1.1.0 known issue. `toolbar.css` changes in flat, liquid glass, minimalist, neo-brutalism, ombelle and papier.
- **Native Select (minimalist):** the open option list is readable in dark mode. `native-select.css` changes in minimalist only.

No CLI command, flag, `--json` field, lock field or schema changes. `ombelle update` refreshes unedited files.

**Checks before publication:**
- **Foundation:** [run 45869029914](https://github.com/whritou/ombelle-ui/actions/runs/45869029914) passed on `c68d5618`, the published commit, with `verify` green. Recorded in [foundation-run.json](foundation-run.json).
  - 6879 unit tests and 812 integration tests.
  - 1185 browser cases with no flaky case, and 467 specimen cases with 2268 audited specimens. The specimen cases include the one documented known failure, CAT-04.
- **Earlier Foundation run:** [run 45849201143](https://github.com/whritou/ombelle-ui/actions/runs/45849201143) on `937f1fbb`, before the version bump, failed on one browser test. The preset editor File-menu keyboard test pressed keys before the menu had focused its first item. The test now waits for each focus move; the fix shipped in the release commit.
- **Foundation extended:** the latest scheduled run (45843719741, on `cc34c510`) passed.
- **Locally on the release branch** (Windows 11, Node 24.19.0, pnpm 11.25.0): `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` (6875/6875) and `version-alignment`.

**Checks after publication** (Windows 11, Node 24.19.0, npm 11.19.0):
- `npm view @ombelle-ui/cli@1.1.1 dist.integrity` equals the integrity in the run's `release.json`.
- `npm pack @ombelle-ui/cli@1.1.1` is byte-for-byte identical to the run's candidate tarball (`cmp`).
- A fresh script-disabled registry install ran `npm exec --offline -- ombelle --version` (1.1.1) and `--help`.
- `npx @ombelle-ui/cli@1.1.1 init --preset ps_7cca4bd460bbbd996abcf47cb07aa643@1 --dry-run --json` returned `status: planned` against production and wrote no file. It ran in a copy of the Vite fixture with a Tailwind global stylesheet.

**Not run:**
- a non-dry-run `init`, `add` or `update` from the registry package into a fixture;
- macOS and Linux runs of the published package;
- the manual NVDA, VoiceOver, Safari and Firefox reviews (owner actions).
