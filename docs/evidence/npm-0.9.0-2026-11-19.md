# npm release 0.9.0

Published `@ombelle-ui/cli@0.9.0` on 19 November 2026 with the `latest` tag. npm
records publication at `2026-11-19T13:25:46.657Z`. The candidate was packed from
`405b10b9`, the release-prep commit of PR #173 on `main`.

The registry tarball was downloaded with `npm pack @ombelle-ui/cli@0.9.0` and
compared byte for byte with the exact candidate packed before publication
(`cmp`: identical). Its SHA-512 integrity is:

```text
sha512-9oxfEqZh8dvPkAW6vxUhRZ9B1fA6Q380Zl/Sv6e2MOC+6RqFi9ak3TD8qHiXyl2A8ORqpKza3NWOYBuLcSRFAg==
```

**What the package contains:**
- Five files: the standalone CLI, the package manifest, the README, the MIT license and the third-party notices.
- No workspace dependencies and no install scripts.

The pack manifest reports a dirty working tree (`workingTreeDirty: true`) only
because of two untracked local directories, `.claude/` and `docs/audits/`.
Tracked sources matched the release commit.

**What the release changes:** it adds six catalog components (63 total): Sidebar,
Navigation Menu, Resizable, Data Table, Menubar and Prose, in all eight style
families and both editions, with recipes and component editors (PRs #171 and
#172). Their install commands and the recipe fields they use require CLI 0.9.0.
Recipe formats 1.0/2.0 and catalog/compiler compatibility 0.1.0 do not change.

**Checks before publication** (Windows 11, Node 24.19.0, npm through corepack):
- The packed candidate installed into an empty project with lifecycle scripts disabled and printed help listing the new components.
- On a copy of the Vite fixture with a global stylesheet, `ombelle init --preset <local preset> --dry-run --json` returned `status: planned` and wrote nothing.

**Checks after publication:**
- The registry tarball is byte-for-byte identical to the candidate.
- A fresh script-disabled registry install ran `npm exec --offline -- ombelle --help` successfully.

**Not run:** the ten standalone release checks, `pnpm check:foundation` (no native
Bun on this machine, and `tar` fails on the D: path), and an `add` of the new
components into an initialised project from the registry package. The
branch's browser, specimen-audit and unit tests ran before the release (see
[the app shell evidence](app-shell-09.md)).
