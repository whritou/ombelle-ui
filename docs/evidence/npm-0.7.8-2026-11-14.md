# npm release 0.7.8

Published `@ombelle-ui/cli@0.7.8` on 14 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-14T15:52:55.624Z`.
The candidate was packed from `c0f43ee6`, the release-prep commit of PR #132,
in a clean worktree (`workingTreeDirty: false`). Its content is identical to the
merge commit `d90c8949`.

The registry tarball was downloaded and compared byte for byte with the exact
candidate packed before publication. Its SHA-512 integrity is:

```text
sha512-3rHd5Wh3zLmu7N0W3ugkKHYtXW/jpRV2ez8DolL40LbfI8bsjRCNJdBc+Vv4Gkh9QDL1nxcfh/SDHh70toJUmw==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

**What the release changes:** font pairs (PR #131). A preset can choose a display, body and code font from 19 self-hosted Fontsource fonts (see [fonts](../fonts.md)). A preset that uses any of them declares preset format 1.1; every other preset stays 1.0 and installs to the same bytes as before. `init` and `theme add` plan and install the missing pinned font packages for such a preset and nothing else. No component, recipe field or recipe format is added; catalog/compiler compatibility 0.1.0 does not change.

## Verification

**Environment:**
- Windows 11, Node 24.19.0, npm 11.19.0 and pnpm 11.25.0.
- The packed-CLI checks ran from PowerShell, so `tar` was Windows `tar.exe`. pnpm was located through `OMBELLE_TEST_PNPM_ENTRY`.

**Results:**
- **Standalone packed-CLI checks (`tests/integration/packed-cli.test.ts`):** 7 of 10 passed on the clean worktree. The 3 Bun checks were not run because Bun was not installed on this machine, so this release does not claim the Bun runtime checks.
- **Registry:** about 30 seconds after `npm publish` finished, the registry listed 0.7.8 as `latest`, and its integrity matched the candidate.
  - The downloaded registry tarball is byte-identical to the candidate.
  - A fresh registry install, with a fresh npm cache and lifecycle scripts disabled, installed 0.7.8 with no `scripts` in its manifest.
  - Its installed bin, run through `npm exec --offline -- ombelle --help`, printed the CLI help.
- **Before publishing,** the candidate, run as a dry-run `init` against a font preset, planned exactly the three pinned `@fontsource-variable` packages (`fraunces`, `inter`, `jetbrains-mono`, all 5.3.0).
- **After the published installer moved to 0.7.8:**
  - `pnpm version:set --check --published` matches all 9 sites.
  - The website install and compatibility tests pass (12 files, 266 tests).

**Order of release:**
1. PR #131 merged. Its deployment succeeded, so the hosted service accepted preset format 1.1 before the CLI was published.
2. PR #132 (version bump and notes) merged.
3. The CLI was published.
4. This record and the change of `publishedInstaller` to 0.7.8 turn the font install commands on in the site.

**Not claimed:** a new full 40-consumer foundation result, the Bun runtime checks, and the font consumer rows and Yarn and pnpm CLI paths listed as open in [font pairs evidence](font-pairs.md).

**Website:** merging this record deploys the website from `main`, with install commands pointing at 0.7.8 and no longer held back for font presets.
