# npm release 0.7.4

Published `@ombelle-ui/cli@0.7.4` on 11 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-11T23:03:11.878Z`.
The source is `94b5a3e`, the merge of PR #113.

The registry tarball was downloaded and compared byte for byte with the exact
candidate tested before publication. Its SHA-512 integrity is:

```text
sha512-8eQzUetwKpTgxcHoyPG0kkbCgyoFOq9ZTsvjDIskIOaNyytDFCxRMPxmHMmYBPiso53PlUxbr5/jFZYPzRlopQ==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

The tracked sources were clean when the candidate was packed. `workingTreeDirty: true` only records the preexisting untracked `.claude/` directory. The candidate packed from the release-prep commit `dbeebfb` has the same integrity.

**What the release changes:** installed styles only (PR #112). It adds no component, prop or recipe field. Recipe formats 1.0/2.0 and catalog/compiler compatibility 0.1.0 do not change.

## Verification

**Environment:**
- Windows 11, Node 24.19.0, npm 11.19.0 and pnpm 11.25.0.
- Certificate checks used the Windows system trust store through `NODE_USE_SYSTEM_CA=1`.
- The packed-CLI checks ran from PowerShell, so `tar` was Windows `tar.exe`. pnpm was located through `OMBELLE_TEST_PNPM_ENTRY`.

**Results:**
- **Standalone packed-CLI checks (`tests/integration/packed-cli.test.ts`):** 7 of 10 passed. They cover:
  - the package inventory and notices;
  - script-disabled installation;
  - the pnpm bin;
  - Node runtime behavior, immutable code resolution, saved defaults and provenance.
- **The 3 Bun checks were not run:** Bun was not installed on this machine. This release therefore does not claim the Bun runtime checks.
- **Registry:** once npm finished processing, the registry listed 0.7.4 as `latest`, and its integrity matched the candidate.
  - The downloaded registry tarball is identical to the candidate.
  - A fresh registry install, with a fresh npm cache and lifecycle scripts disabled, succeeded.
  - Its installed bin, run through `npm exec --offline -- ombelle --help`, printed the CLI help.
- **After the published installer moved to 0.7.4:**
  - `pnpm version:set --check --published` matches all 9 sites.
  - The website compatibility and route tests and the version-alignment test pass.

**Evidence from the release work:**
- **Release work (PR #112):**
  - the specimen audit of the changed components in all families, editions and modes;
  - their behaviour specs;
  - 1900 unit tests.
- **CI for PRs #112 and #113:** passed.
- **Not claimed:** a new full 40-consumer foundation result.

**Website:** this follow-up points the website commands at the verified release. The website deploys from `main` when this change merges.
