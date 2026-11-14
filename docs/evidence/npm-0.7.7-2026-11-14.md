# npm release 0.7.7

Published `@ombelle-ui/cli@0.7.7` on 14 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-14T10:18:58.524Z`.
The candidate was packed from `6c499ed9`, the release-prep commit of PR #130.

The registry tarball was downloaded and compared byte for byte with the exact
candidate packed before publication. Its SHA-512 integrity is:

```text
sha512-rUsxGWHpOc25/BlD1zeR42Q3pdYqtbTpzpbrs9qCkKZ8rHHimssMXvItXbxFqQ2Enum51VXYsKNeKsMAakxDPg==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

The tracked sources were clean when the candidate was packed (`workingTreeDirty: false`).

**What the release changes:** installed styles and behaviour only, in all five families and both editions (PRs #128 and #129):
- Pagination's current page keeps its text colour on hover.
- Scroll Area pads its content, keeps a scrollbar gutter and wraps content to its width.
- Carousel insets its slides.
- The Toolbar More menu drops empty check boxes.
- Tooltip closes when the pointer leaves the page and after a click.
- Item actions wrap; the Number Input unit stays on one line.
- Code Block shows its copy result for 2 s.
- A Progress circle in a button sits on the label's line.

No component, recipe field or format is added. Recipe formats 1.0/2.0 and catalog/compiler compatibility 0.1.0 do not change.

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
- **Registry:** once npm finished processing, the registry listed 0.7.7 as `latest`, and its integrity matched the candidate.
  - The downloaded registry tarball is identical to the candidate.
  - A fresh registry install, with a fresh npm cache and lifecycle scripts disabled, succeeded.
  - Its installed bin, run through `npm exec --offline -- ombelle --help`, printed the CLI help.
- **After the published installer moved to 0.7.7:**
  - `pnpm version:set --check --published` matches all 9 sites.
  - The website install and compatibility tests and the version-alignment test pass.

**Evidence from the release work:**
- The specimen audit for the changed components passed in every family, edition and mode (PR #128).
- CI for PRs #128 to #130 passed.
- **Not claimed:** a new full 40-consumer foundation result.

**Website:** merging PR #130 deploys the website from `main`, with install commands pointing at 0.7.7.
