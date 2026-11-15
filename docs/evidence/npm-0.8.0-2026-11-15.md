# npm release 0.8.0

Published `@ombelle-ui/cli@0.8.0` on 15 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-15T16:44:35.976Z`.
The candidate was packed from `c7109c5c`, the merge of PR #144 (the release-prep
commit), on a clean tree (`workingTreeDirty: false`). That commit also contains
PR #146 (the font recipe install gate), PR #138 (Papier polish) and PR #145.

The registry tarball was downloaded with `npm pack @ombelle-ui/cli@0.8.0` and
compared with the candidate packed before publication: both are 795,156 bytes
with the same SHA-512 file hash, so they are byte-identical. Its SHA-512
integrity is:

```text
sha512-Y87e6Jm39UkjU0VQzIUl/CHaI7mokfvaKFEsKpeLCvYRzMoJM6y40FKZgr4NoHq+Ke5GJeqEUPnrNCLI64xpCQ==
```

**What the release changes:** the Papier style family (PR #136, polished in #138,
[decision 0006](../decisions/0006-papier-family.md)), per-style palettes in the
preset editor (PR #134), and style fonts in the editors: the preset editor starts
each style with its fonts (PR #135), and component recipes can carry them (PR #137:
a Button recipe's `overrides.fontFamilyId`, a catalog recipe's `appearance.fonts`).
The preset schema gains `papier` in `styleFamily`, which older CLIs reject. The
website holds back Papier and recipes that use fonts until the published installer
is 0.8.0 (`papierMinimumCli` and the recipe font gate of PR #146). Recipe format
1.0/2.0 and catalog/compiler compatibility 0.1.0 remain.

## Verification

**Environment:** Windows 11, Node 24.19.0, npm 11.19.0 and pnpm 11.25.0, run from
PowerShell.

**Results:**
- **Candidate install, before publishing** (lifecycle scripts disabled, in independent
  projects): `npm install --ignore-scripts TARBALL` and `pnpm add --ignore-scripts
  TARBALL` both succeeded, and `ombelle --help` printed the CLI help under both.
- **Candidate behaviour, before publishing:** in a fresh Vite-style project managed
  by npm, `init --preset` with the built-in Papier preset set to its editor fonts
  (Fraunces, Instrument Sans, IBM Plex Mono) planned cleanly with `--dry-run` and
  applied with `--yes`. It added `@fontsource-variable/fraunces`,
  `@fontsource-variable/instrument-sans` (both 5.3.0) and `@fontsource/ibm-plex-mono`
  (5.3.0) and wrote their imports at the top of `ui-style.css`. `add button card
  dialog pagination meter --yes` then succeeded and wrote the components and their
  stylesheets.
- **Registry:** the registry lists 0.8.0 as `latest`, and `dist.integrity` matches the
  candidate. A fresh install (`npm install --ignore-scripts @ombelle-ui/cli@0.8.0`)
  recorded the same integrity in its lockfile, and `npm exec -- ombelle --help`
  printed the CLI help.
- **After the published installer moved to 0.8.0:** `version:set --check --published`
  matches all 9 sites, and the website install and compatibility tests pass.

**Order of release:**
1. PRs #136, #137 and #138 (Papier, recipe fonts, Papier polish) merged.
2. PR #146 (recipe font install gate) merged, so no command for a font recipe is
   offered while the installer is older than 0.8.0.
3. PR #144 (version bump and notes) merged.
4. The CLI was published.
5. This record and the change of `publishedInstaller` to 0.8.0 turn on Papier and
   font recipe install commands in the site.

**Not claimed:**
- A new full foundation or consumer-app result. The Papier consumer rows exist in the
  consumer matrix but no consumer app was prepared, built or browsed, because the
  consumer pipeline is being fixed first.
- The Yarn and Bun candidate checks, the standalone packed-CLI integration suite
  (`tests/integration/packed-cli.test.ts`) and installs into a pnpm-managed target
  project: pnpm cannot be located by the CLI on this Windows machine ("Cannot locate
  a pnpm JavaScript entry without shell evaluation").
- A font recipe installed with `add --recipe` from the candidate or the registry.

**Website:** merging this record deploys the website from `main`, with install
commands pointing at 0.8.0, Papier selectable and font recipes no longer held back.
