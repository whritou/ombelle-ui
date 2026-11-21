# npm release 0.9.1

Published `@ombelle-ui/cli@0.9.1` on 21 November 2026 with the `latest` tag, from the npm identity `ombelle`. npm records publication at `2026-11-21T18:31:24.352Z`. The candidate was packed from `d162ab30`, the release-prep commit of PR #183 on `main`.

The registry tarball was downloaded with `npm pack @ombelle-ui/cli@0.9.1` and compared byte for byte with the exact candidate packed before publication (`cmp`: identical). Its SHA-512 integrity is:

```text
sha512-pyBNjd9ak80t+6eBy4jEkK6shdpRaTQLO2qFVWL5drtoZBj4+0WAv4CqHaUBJ5HZmwWLdWKX9TaR0466QVnIxg==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

The pack manifest reports a clean working tree (`workingTreeDirty: false`): the candidate was packed in a separate worktree detached at `d162ab30`.

**What the release changes:** catalog style fixes from PR #182, with no contract change:
- Meter frames only its plain bar, and the ring drawing carries `data-mode="circle"`.
- Input OTP rings only its active slot.
- Tab counts keep a gap from their label.
- Organic and Retro futurism field-set legends sit inside the card.
- A collapsed sidebar no longer opens tooltips hovered while it was expanded.

It also includes the `compile()` refactor from PR #181, whose output is byte-identical. Recipe formats 1.0/2.0 and catalog/compiler compatibility 0.1.0 do not change.

**Checks before publication** (Windows 11, Node 24.19.0, pnpm 11.25.0 through corepack):
- The candidate's integrity, recomputed from the tarball, matched `release.json`.
- The packed candidate installed into an empty project with lifecycle scripts disabled, reported version 0.9.1, and printed help listing all 63 components.
- On `main` at the release-prep commit: `pnpm build:packages`, `pnpm typecheck` and `pnpm test:unit` (5880 passed, 6 skipped).

**Checks after publication:**
- The registry tarball is byte-for-byte identical to the candidate, and its registry integrity matches.
- A fresh script-disabled registry install ran `npm exec --offline -- ombelle --help` successfully.

**Not run:** the ten standalone release checks and `pnpm check:foundation` (no native Bun on this machine, and `tar` fails on the D: path), and an `init` or `add` into a fixture from the registry package.
