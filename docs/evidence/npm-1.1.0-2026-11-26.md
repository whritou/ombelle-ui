# npm release 1.1.0

Published `@ombelle-ui/cli@1.1.0` on 26 November 2026 with the `latest` tag. npm records publication at `2026-11-26T12:21:13.853Z`.
- **Published by:** the `Publish CLI` workflow ([run 45818392080](https://github.com/whritou/ombelle-ui/actions/runs/45818392080)), run from GitHub Actions on `main` at `ab266f92` after the owner approved the `npm-release` environment.
- **Publishing method:** npm trusted publishing (OIDC, no stored token).
- **Provenance:** SLSA provenance attestation (`https://slsa.dev/provenance/v1`).

The candidate was packed by that run (`pnpm pack:cli -- --release`) and uploaded as the run artifact `cli-release-1.1.0`. Its `release.json` records:
- release mode;
- a clean working tree;
- a version not already on npm;
- `sourceCommit` `ab266f929a88ec2302fccbca8db6451a2c3a7641`.

Its SHA-512 integrity, which the registry reports for 1.1.0, is:

```text
sha512-pf0qERyqNhk8yGRToGrzzm7PqEfyy3hcPvoQfRrY+fMAy2HDxK306xzI2r3I29ATLJyXSOUZeLmqu7fNXlXbHQ==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

**What the release changes:** managed blocks, described in the [1.1.0 CHANGELOG entry](../../CHANGELOG.md) and [docs/blocks](../blocks/):
- **Blocks:** `login-01`, `settings-01`, `pricing-01` and `dashboard-01`, installed with `ombelle add <block-id>` and refreshed by `update`.
- **CLI:** `add`, `update` and `diff` accept block ids, `doctor` has a `blocks` check, and the new notice codes are `BLOCK_COMPONENT_EDITED` and `BLOCK_COMPONENT_MISSING`.
- **Lock and `--json`:** block files are recorded in the lock's `artifacts` with `kind: "block"`, with no new lock field. `--json` `kind` gains `block`.
- **Installed source:** the four blocks, plus minimalist Input, whose focus is now a 3px rule.

Nothing breaks for a 1.0 project. A 1.0 CLI keeps block records but cannot install or update blocks.

**Known issue** (CHANGELOG): a hovered pressed Toolbar toggle in flat and neo-brutalism dark mode shows about 1.21:1 text contrast.

**Checks before publication:**
- **Foundation:** [run 45790840319](https://github.com/whritou/ombelle-ui/actions/runs/45790840319) passed on `ab266f92`, the published commit, with `verify` green. Recorded in [foundation-run.json](foundation-run.json).
  - 6870 unit tests and 812 integration tests.
  - 1185 browser cases and 467 specimen cases, with 2268 audited specimens. The specimen cases include the one documented known failure, CAT-04.
  - 54 consumer apps, including Yarn and Bun, on bundled Chromium 158.
- **Earlier Foundation run:** run 45717856295 on the release commit `de37158a` failed: an evidence-inventory environment gap, a minimalist Input focus below the bar at 320px, a pointer-left-hovering audit artefact on Toolbar, and a liquid-glass timeout. They were fixed in #204 (`ab266f92`) before publishing.
- **Locally on the release branch** (Windows 11, Node 24.19.0, pnpm 11.25.0, Bun 1.4.3): `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration` (Windows timeouts re-run on their own) and `pnpm version:set --check`.

**Checks after publication** (Windows 11, Node 24.19.0, npm 11.19.0):
- `npm view @ombelle-ui/cli@1.1.0 dist.integrity` equals the integrity in the run's `release.json`.
- `npm pack @ombelle-ui/cli@1.1.0` is byte-for-byte identical to the run's candidate tarball (`cmp`).
- A fresh script-disabled registry install ran `npm exec --offline -- ombelle --version` (1.1.0) and `--help`.
- `npx @ombelle-ui/cli@1.1.0 init --preset ps_7cca4bd460bbbd996abcf47cb07aa643@1 --dry-run --json` returned `status: planned` against production and wrote no file. It ran in a copy of the Vite fixture with a Tailwind global stylesheet.

**Not run:**
- a non-dry-run `init`, `add` or `add <block>` from the registry package into a fixture;
- macOS and Linux runs of the published package;
- the manual NVDA, VoiceOver, Safari and Firefox reviews (owner actions).
