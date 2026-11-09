# npm release 0.7.2

Published `@ombelle-ui/cli@0.7.2` on 9 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-09T09:31:53.653Z`.
The source is `79dce7d49f45a8185d339c29b329b7261ce61f6c`, the merge of PR #97.

The registry tarball was downloaded and compared byte for byte with the exact
candidate tested before publication. Its SHA-512 integrity is:

```text
sha512-gsdc34nEygMawVplPylcqC7r5Z3NJ4fuRu2RvMwCzlDlAWymUrL1s8G757zlAEfOK9rqez+sAt1NNLzyfvVFfA==
```

The package contains five files: the standalone CLI, package manifest, README,
MIT license and third-party notices. It has no workspace dependencies or install
scripts. Tracked sources were clean at packing; `workingTreeDirty: true` records
the preexisting untracked `.claude/` directory.

## Verification

Environment: Windows, Node 24.19.0, npm 11.19.0, pnpm 11.25.0, Yarn Classic
1.22.22, Yarn 4.18.1 and Bun 1.4.3. Certificate verification used the Windows
system trust store via `NODE_USE_SYSTEM_CA=1`.

- All 10 standalone packed-CLI checks passed. They verify package inventory,
  notices, script-disabled installation, manager bins, Node/Bun runtime behavior,
  immutable code resolution, saved defaults and provenance.
- All 22 exact-tarball expansion scenarios passed: Input Group, Sheet, Alert
  Dialog, Breadcrumb, Pagination, Toast and the five variant APIs in Radix and
  Base UI Vite-shaped fixtures. Radix recipes also installed successfully and
  preserved saved defaults. Base UI recipe installation remains deliberately
  unsupported under ADR 0005, and its rejection was verified. These fixtures
  exercise planning and generated files; their dependencies were declared in
  advance, so these scenarios do not claim new production consumer builds.
- After npm processing completed, the registry advertised 0.7.2 as `latest` and
  its integrity matched the candidate. A fresh registry-backed install with a
  fresh npm cache and lifecycle scripts disabled succeeded; running its installed
  bin through `npm exec --offline -- ombelle --help` printed CLI help.
- All 41 targeted website compatibility, route and version-alignment tests
  passed after updating the published installer reference to 0.7.2. The four
  newly enabled command expectations failed against 0.7.1 before the update;
  explicit regression checks still verify rejection by older installers.

The implementation's unit, browser and integration evidence is recorded in
[catalog expansion](2026-11-09-catalog-expansion.md). CI for PR #97 passed its
checks, four integration shards and verification job. This release does not
claim a new full 40-consumer foundation result.

Detailed local results are in `.artifacts/release-072-packed.json`,
`.artifacts/release-072-smoke.json` and `.artifacts/release-072-registry.json`.
The source follow-up points website commands at the verified release; no
separate website deployment was performed as part of npm publication.
