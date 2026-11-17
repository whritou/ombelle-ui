# npm release 0.8.3

Published `@ombelle-ui/cli@0.8.3` on 17 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-17T17:56:30.963Z`.
The candidate was packed from `0187850f`, the merge of PR #169 (the release-prep
commit), on a clean tree (`workingTreeDirty: false`). That commit also contains
PR #167 (the Retro futurism Card description) and PR #168 (calendar outside days).

The registry tarball was downloaded with `npm pack @ombelle-ui/cli@0.8.3` and
compared with the candidate packed before publication (`cmp`): both are 830,007
bytes and identical. Its SHA-512 integrity (SHA-1 `5cf983c75c051ae1399739d7a13f7526ca7c67b2`) is:

```text
sha512-ND1I0ma1ty+HD+jUPqL5hVlJ+x2tHGl4tZuHGSoPmP+BrjTpqBXpalqSnNyHo+u6DGzmuaEaP5WqoOl37u1GYw==
```

**What the release changes:** two contrast fixes. The Retro futurism Card description in a
banded header takes the header text colour instead of the muted colour, which measured about
1.1:1 on the sunset band (PR #167). Calendar days from the neighbouring month use the muted
text colour at full opacity in every family instead of the foreground at 60% opacity, which
measured 3.8 to 4.5:1 on light palettes in five families (PR #168). The preset schema, recipe
formats 1.0/2.0 and catalog/compiler compatibility 0.1.0 are unchanged.

## Verification

**Environment:** Windows 11, Node 24.19.0 and pnpm 11.25.0, run from PowerShell and
Git Bash; the publish itself was run by the `ombelle` identity.

**Results:**
- **Registry state:** `npm view @ombelle-ui/cli dist-tags` reports `latest: 0.8.3`, and
  `npm view @ombelle-ui/cli@0.8.3` reports the integrity above and `_npmUser: ombelle`.
- **Tarball identity:** the downloaded registry tarball and the packed candidate are
  byte-identical.
- **Install and run:** `npm install --ignore-scripts` of the registry package in a fresh
  project succeeded, and `npm exec -- ombelle --help` printed the CLI help.
- **Candidate checks before publishing:** the packed candidate installed with lifecycle
  scripts disabled and printed its help. Its bundle contains the Card fix
  (`--rf-desc:var(--rf-head-desc,currentColor)`, no `inherit`) and the outside-day rule
  (`[data-slot='calendar-day-button']:is([data-outside] > *)`) for all eight families. In a
  Vite-shaped app, `init --preset` with the built-in Retro futurism preset and
  `--dry-run --json` returned `planned` and wrote no files. The fixes' unit tests and browser
  contrast scans are recorded in PRs #167 and #168.

**Not run:** an applied `init` or `add` from the published tarball, a pnpm, Yarn or Bun
install of it, the specimen audit, `pnpm check:foundation`, and the website
post-publication check on a deployed build.
