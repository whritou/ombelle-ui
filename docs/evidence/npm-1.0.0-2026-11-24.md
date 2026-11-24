# npm release 1.0.0

Published `@ombelle-ui/cli@1.0.0` on 24 November 2026 with the `latest` tag. npm records publication at `2026-11-24T22:37:43.914Z`. This is the first release published from GitHub Actions: the `Publish CLI` workflow ([run 45502025627](https://github.com/whritou/ombelle-ui/actions/runs/45502025627)) ran on `main` at `517c6309` after the owner approved the `npm-release` environment, and npm trusted publishing (OIDC, no stored token) accepted it. The version carries a SLSA provenance attestation (`https://slsa.dev/provenance/v1`).

The candidate was packed by that run (`pnpm pack:cli -- --release`) and uploaded as the run artifact `cli-release-1.0.0`. Its SHA-512 integrity, which the registry reports for 1.0.0, is:

```text
sha512-pOVpX25Joga1piCipkS5azFjsMR69+QRXnt8ZkW2gipbManjc63t69kYp1qTJhB7+brkOayXlTZULe3HVcePJw==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

The workflow refused to publish unless `release.json` recorded release mode, a clean working tree, a version not already on npm, the run's own commit as `sourceCommit`, and exactly those five files.

**What the release changes:** the 1.0 audit fixes and the 1.0 CLI, described in the [1.0.0 CHANGELOG entry](../../CHANGELOG.md) and the [upgrade guide](../upgrading-to-1.0.md). Breaking for 0.x projects: installed source changes in glass CSS, `styles/ui-style.css` and the Data Table example; versioned `--json` output with coded notices; and the new refusals listed in the CHANGELOG.

**Checks before publication:**
- Foundation [run 45485446635](https://github.com/whritou/ombelle-ui/actions/runs/45485446635) passed on `517c6309`, the published commit, with every job green on the first attempt. It counted 6823 unit tests, 797 integration tests, 1185 browser cases, 431 specimen cases with one documented known failure (CAT-04), and 54 consumer apps on bundled Chromium 158. Recorded in [foundation-run.json](foundation-run.json).
- Foundation extended [run 45432116795](https://github.com/whritou/ombelle-ui/actions/runs/45432116795) ran on `b96ceee5`, the same code before the version bump. It had one failure, named in the CHANGELOG as a known issue: the preset editor's instant radius edit measured 208.5 ms against a 200 ms target.
- Locally on the release branch (Windows 11, Node 24.19.0, pnpm 11.25.0): `pnpm build:packages`, `pnpm typecheck`, 957 CLI, contracts and installer tests, and `pnpm pack:cli`.

**Checks after publication** (Windows 11, Node 24.19.0, npm 11.19.0):
- `npm view @ombelle-ui/cli@1.0.0 dist.integrity` equals the integrity in the run's `release.json`.
- `npm pack @ombelle-ui/cli@1.0.0` is byte-for-byte identical to the run's candidate tarball (`cmp`).
- A fresh script-disabled registry install ran `npm exec --offline -- ombelle --version` (1.0.0) and `--help`.
- `npx @ombelle-ui/cli@1.0.0 init --preset ps_7cca4bd460bbbd996abcf47cb07aa643@1 --dry-run --json`, in a copy of the Vite fixture with a Tailwind global stylesheet, returned `status: planned` against production and wrote no file.

**Not run:** a non-dry-run `init` or `add` from the registry package into a fixture, macOS and Linux runs of the published package, and the manual NVDA, VoiceOver, Safari and Firefox reviews (owner actions).
