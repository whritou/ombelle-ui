# npm release 0.8.2

Published `@ombelle-ui/cli@0.8.2` on 17 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-17T12:22:25.206Z`.
The candidate was packed from `decd28ef`, the merge of PR #165 (the release-prep
commit), on a clean tree (`workingTreeDirty: false`). That commit also contains
PR #163 (the Retro futurism style family) and PR #164 (Next.js 16.4.5 in the
consumer fixtures).

The registry tarball was downloaded with `npm pack @ombelle-ui/cli@0.8.2` and
compared with the candidate packed before publication (`cmp`): both are 829,988
bytes and identical. Its SHA-512 integrity (SHA-1 `8caa308aae6d9bf24bdecb775621f4b398d094db`) is:

```text
sha512-QLmUYyhWvLyN1exCz/NOCPEnYLLn8V3lX2QLhSHO1mYdLPh7ikCRO8d0vsZgwXCfbJv+kK2yQGE4dP3dnscFDA==
```

**What the release changes:** the Retro futurism style family (PR #163,
[decision 0008](../decisions/0008-retro-futurism-family.md)) and seven Retro futurism
palettes in the preset editor. The preset schema gains `retro-futurism` in
`styleFamily`, which older CLIs reject. Its fonts were already in the registry, so the
font fields are unchanged. The website and both editors hold back Retro futurism until
the published installer is 0.8.2 (`retroFuturismMinimumCli`). Recipe format 1.0/2.0 and
catalog/compiler compatibility 0.1.0 remain.

## Verification

**Environment:** Windows 11, Node 24.19.0 and pnpm 11.25.0, run from PowerShell and
Git Bash; the publish itself was run by the `ombelle` identity.

**Results:**
- **Registry state:** `npm view @ombelle-ui/cli dist-tags` reports `latest: 0.8.2`, and
  `npm view @ombelle-ui/cli@0.8.2` reports the integrity above and `_npmUser: ombelle`.
- **Tarball identity:** the downloaded registry tarball and the packed candidate are
  byte-identical.
- **Install and run:** `npm install --ignore-scripts` of the registry package in a fresh
  project succeeded, and `npm exec -- ombelle --help` printed the CLI help.
- **Candidate checks before publishing:** the packed candidate installed with lifecycle
  scripts disabled and printed its help. In a Vite-shaped app with a `components.json`
  and a Tailwind CSS entry, `init --preset` with the built-in Retro futurism preset and
  `--dry-run --json` returned `planned` and wrote no files. `pnpm build:packages`,
  `pnpm generate:preview`, `pnpm typecheck` and the version-alignment, install-command
  and install-compatibility tests passed on the release-prep tree.

**Not run:** an applied `init` or `add` of Retro futurism from the published tarball, a
pnpm, Yarn or Bun install of it, `pnpm check:foundation`, the Retro futurism consumer
apps, and the website post-publication check on a deployed build.
