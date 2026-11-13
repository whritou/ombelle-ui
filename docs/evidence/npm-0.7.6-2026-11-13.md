# npm release 0.7.6

Published `@ombelle-ui/cli@0.7.6` on 13 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-13T23:14:51.749Z`.
The candidate was packed from `3c1c2122`, the release-prep commit of PR #126,
whose merge into `main` is `ee6fdc49`. Packing again from `ee6fdc49` gave the
same integrity.

The registry tarball was downloaded and compared byte for byte with the exact
candidate packed before publication. Its SHA-512 integrity is:

```text
sha512-7uLNqtu1zmKjYaxhgpzZ1PH8ng9sUfPNLn+5AY5Id9S25n3Vj5MhVvfHq9kZdyjhWA8+LbHScxYC7G1gsJAsng==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

The tracked sources were clean when the candidate was packed (`workingTreeDirty: false`).

**What the release changes:**
- Four catalog components (57 in all): Password Field, Carousel, Aspect Ratio and Toolbar (PR #123).
- Form and FieldSet parts for Field, and Checkbox groups (PR #123).
- Sheet snap points, Card actions, Slider values, circular Progress and Meter, Code Block diffs, Tooltip shortcuts and the image Carousel, every default unchanged (PR #124).
- The responsive website editors, and the Tabs count and neo-brutalism Badge contrast fixes (PR #125).

Their install commands and recipe fields require CLI 0.7.6. Recipe formats 1.0/2.0 and catalog/compiler compatibility 0.1.0 do not change.

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
- **Registry:** once npm finished processing, the registry listed 0.7.6 as `latest`, and its integrity matched the candidate.
  - The downloaded registry tarball is identical to the candidate.
  - A fresh registry install, with a fresh npm cache and lifecycle scripts disabled, succeeded.
  - Its installed bin, run through `npm exec --offline -- ombelle --help`, printed the CLI help, which lists the four new components.
- **After the published installer moved to 0.7.6:**
  - `pnpm version:set --check --published` matches all 9 sites.
  - The website install and compatibility tests and the version-alignment test pass.

**Evidence from the release work:**
- The sub-project evidence in `docs/evidence/components-076.md`, `variants-076.md` and `responsive-editors.md`.
- CI for PRs #123 to #126 passed.
- **Not claimed:** a new full 40-consumer foundation result.

**Website:** this follow-up points the website commands at the verified release. The website deploys from `main` when this change merges.
