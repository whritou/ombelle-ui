# npm release 0.7.5

Published `@ombelle-ui/cli@0.7.5` on 13 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-13T09:54:27.490Z`.
The source is `492cf14c`, the merge of PR #121, on top of the release-prep
merge of PR #120.

The registry tarball was downloaded and compared byte for byte with the exact
candidate tested before publication. Its SHA-512 integrity is:

```text
sha512-O9eUbZWL/BiYvTxrC2wOaGpU7/OcxP3CI29V6Bxw0bowMIx98Cb26zZ9Abi1U8RNTiUAbPXUB/cNqpUyPdGc9A==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

The tracked sources were clean when the candidate was packed. `workingTreeDirty: true` only records the preexisting untracked `.claude/` directory.

**What the release changes:**
- Eight catalog components (53 in all): Toggle, Collapsible, Scroll Area, Button Group, Item, Number Input, Color Picker and Code Block (PRs #115, #116 and #118).
- Variants for Checkbox, Switch, Progress, Popover, Dialog, Alert Dialog and Breadcrumb, every default unchanged (PRs #119 and #117).
- The editor and component-page fixes of PR #121, including a Calendar that keeps one width across months.

Their install commands and recipe fields require CLI 0.7.5. Recipe formats 1.0/2.0 and catalog/compiler compatibility 0.1.0 do not change.

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
- **Registry:** once npm finished processing, the registry listed 0.7.5 as `latest`, and its integrity matched the candidate.
  - The downloaded registry tarball is identical to the candidate.
  - A fresh registry install, with a fresh npm cache and lifecycle scripts disabled, succeeded.
  - Its installed bin, run through `npm exec --offline -- ombelle --help`, printed the CLI help, which lists the eight new components.
- **After the published installer moved to 0.7.5:**
  - `pnpm version:set --check --published` matches all 9 sites.
  - The website install and compatibility tests and the version-alignment test pass.

**Evidence from the release work:**
- The sub-project evidence in `docs/evidence/primitives-075.md`, `editor-inputs-075.md`, `code-block-075.md` and `variants-075.md`: specimen audits, behaviour specs, board comparisons and unit tests.
- CI for PRs #115 to #121 passed.
- **Not claimed:** a new full 40-consumer foundation result.

**Website:** this follow-up points the website commands at the verified release. The website deploys from `main` when this change merges.
