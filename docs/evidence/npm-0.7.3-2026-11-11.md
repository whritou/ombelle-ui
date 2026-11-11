# npm release 0.7.3

Published `@ombelle-ui/cli@0.7.3` on 11 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-11T17:19:44.538Z`.
The source is `c319f1ca3b7c679c59f1043660955d772970911d`, the merge of PR #110.

The registry tarball was downloaded and compared byte for byte with the exact
candidate tested before publication. Its SHA-512 integrity is:

```text
sha512-MkP4UuQsftLx3ymSVdXiqqAVu+EbbMOwJuiLQzBblvwy8dceKvbjKzWWS0SnXq3sDHh1eldTq/Ofni+BT5+X4w==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

The tracked sources were clean when the candidate was packed. `workingTreeDirty: true` only records the preexisting untracked `.claude/` directory. The candidate packed from the release-prep commit `3b9db3c` has the same integrity.

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
- **Fresh project:** the candidate installed with `--ignore-scripts`, and `ombelle --help` listed all 45 `add` targets.
- **Registry:** once npm finished processing, the registry listed 0.7.3 as `latest`, and its integrity matched the candidate.
  - The downloaded registry tarball is identical to the candidate.
  - A fresh registry install, with a fresh npm cache and lifecycle scripts disabled, succeeded.
  - Its installed bin, run through `npm exec --offline -- ombelle --help`, printed the CLI help.
- **After the published installer moved to 0.7.3:**
  - `pnpm version:set --check --published` matches all 9 sites.
  - The website compatibility and route tests and the version-alignment test pass.
  - Three published-command expectations still named 0.7.2 and failed once the installer moved to 0.7.3. They now expect 0.7.3. The explicit checks that older installers are refused still pass.

**Evidence from the release work:**
- **Batch evidence files:** display components, form controls, overlays and search, the variant batches, and the editors (`editors-glass-073.md`, `editors-matrix-073.md`).
- **CI for PR #110:** its checks, its four integration shards and its verification job passed.
- **Not claimed:** a new full 40-consumer foundation result.

**Website:** this follow-up points the website commands at the verified release. The website deploys from `main` when this change merges. No separate deployment was made as part of the npm publication.
