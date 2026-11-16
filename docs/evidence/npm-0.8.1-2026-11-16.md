# npm release 0.8.1

Published `@ombelle-ui/cli@0.8.1` on 16 November 2026 by npm identity `ombelle`,
with the `latest` tag. npm records publication at `2026-11-16T17:51:59.831Z`.
The candidate was packed from `69023e01`, the merge of PR #158 (the release-prep
commit), on a clean tree (`workingTreeDirty: false`). That commit also contains
PR #156 (the Organic style family) and PR #157.

The registry tarball was downloaded with `npm pack @ombelle-ui/cli@0.8.1` and
compared with the candidate packed before publication (`cmp`): both are 817,630
bytes and identical. Its SHA-512 integrity (SHA-1 `c6d334acadb2694f97e255c54d5744c196a23882`) is:

```text
sha512-WL+XQSb2StvfhIvAQnvbaDRHyBoXA3cjpl6fA+IpGrp+WMaoLbW/XjTL/B5puuP9ABw+saa4syNPsX0iNYI4CQ==
```

**What the release changes:** the Organic style family (PR #156,
[decision 0007](../decisions/0007-organic-family.md)), seven Organic palettes in
the preset editor, and DM Mono in the font registry. The preset schema gains
`organic` in `styleFamily` and `dm-mono` in `monoFontFamilyId`, which older CLIs
reject. The website holds back Organic and DM Mono until the published installer is
0.8.1 (`organicMinimumCli`). Recipe format 1.0/2.0 and catalog/compiler
compatibility 0.1.0 remain.

## Verification

**Environment:** Windows 11, Node 24.19.0 and pnpm 11.25.0, run from PowerShell and
Git Bash; the publish itself was run by the `ombelle` identity.

**Results:**
- **Registry state:** `npm view @ombelle-ui/cli dist-tags` reports `latest: 0.8.1`, and
  `npm view @ombelle-ui/cli@0.8.1` reports the integrity above and `_npmUser: ombelle`.
- **Tarball identity:** the downloaded registry tarball and the packed candidate are
  byte-identical.
- **Install and run:** `npm install --ignore-scripts` of the registry tarball in a fresh
  project succeeded, and `ombelle --help` printed the CLI help.
- **Candidate checks before publishing:** `pnpm build:packages`, `pnpm generate:preview`,
  `pnpm typecheck` and the version-alignment, install-command and install-compatibility
  tests passed on the release-prep tree.

**Not run:** an `init --preset` or `add` of Organic from the published tarball, a pnpm,
Yarn or Bun install of it, `pnpm check:foundation`, the Organic consumer apps, and the
website post-publication check on a deployed build.
