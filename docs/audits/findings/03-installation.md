# Installation journeys

Date: 22 November 2026. Commit `9317458ab81a8afe9ab95a1402e2bc81cc908e9f` on `docs/1-0-audits-wave-3`: 0.9.1 plus the wave 1 fixes (PR #189) and the liquid glass stable change (PR #190). The wave 2 fixes (PR #191) are not in this tree.

Environment: Windows 11, Node 24.19.0, npm 11.19.0, pnpm 11.25.0 and Yarn 4.18.1 through corepack (corepack is not enabled, so neither `pnpm` nor `yarn` is on PATH), Git Bash and Windows PowerShell 5.1. No Bun. Node 20.18.3 was available for one runtime check.

Two CLIs were used:
- **Packed candidate.** `corepack pnpm pack:cli` produced `.artifacts/cli-release/ombelle-ui-cli-0.9.1.tgz` (integrity `sha512-K2mg1fCN…pYl3mg==`, unpublished candidate). It was installed with `npm install --ignore-scripts` into a separate runner folder and run as `node …/dist/main.js`.
- **Published installer.** `npx @ombelle-ui/cli@0.9.0`, the version the site and docs advertise, was used for the journeys a new user would meet today. It is read-only against npm. No code was resolved against the hosted service and nothing was published.

Fresh projects were generated with the real upstream tools (network available), all under the session scratchpad `audit-03\`:
- `npm create vite@9.3.4 -- --template react-ts`
- `npx create-next-app@16.4.6 --ts --tailwind --app --src-dir --use-npm`
- `npx shadcn@4.23.0 init` in three ways: `-t vite -b radix -p nova`, `-d` (Next.js template, now `base-nova` by default), and `-b radix -p nova` inside the create-next-app project
- a copy of `fixtures/shadcn/next` for the pnpm route

Covered:
- Every route the README, `docs/foundation-local-usage.md`, `docs/10-installation-and-theme-merging.md`, `docs/cli-release.md`, the site guides (`apps/www/src/site/docs/guides.tsx`), the landing journey (`apps/www/src/site/home/journey.tsx`) and Get code (`apps/www/src/snapshots/install-command.ts`) advertise.
- Peer and runtime checks, first-run errors, runner commands, upgrade from an earlier 0.x install, and the installation gaps in `docs/web-alpha-readiness.md`.

Not covered:
- **Bun.** Not installed. The Bun route is code-read only.
- **macOS and Linux.** Not available. Platform notes are reasoned from the code.
- **Hosted service.** The install-by-code journey against it was not run (see Unverified).
- **Yarn Classic.** Not run.
- **Browser rendering.** Not checked in any generated app; production builds were run instead.

Earlier audits: CLI internals are audit 02 (`02-cli-installer.md`, fixes in `wave-1-fixes.md`). The public surface is audit 12 (`12-public-surface.md`). This audit does not repeat their findings. It references them where a journey reproduces one, and adds what running the journeys showed.

## Summary

Installation works end to end once a project matches the narrow baseline. A Vite 8 + TypeScript 7 app with Tailwind v4 and a shadcn 4.23 project both initialized, added components with real npm installs, and passed `vite build` / `next build`. Theme-only `theme add` on a stock shadcn project works with the published 0.9.0. That closes the readiness doc's "0.2.1 rejects every stock shadcn project" gap.

The front door is still shut for most newcomers. Of the four stock projects generated today, three are refused before any write by the exact `react`/`react-dom` 19.3.1 check:
- create-vite (`^19.3.1`)
- create-next-app (`19.3.0`)
- shadcn's own Vite template (`^19.3.1`)

The site never mentions that requirement. The repository's own test and playground pin React before they run the CLI. Two runtime checks also lag current toolchains:
- Node must be 24.x, while Node 26 is now the Active LTS.
- Bun must be exactly 1.4.3, while 1.4.5 is current.

Both pass a dry run and fail only when a dependency install starts. With the site's `pnpm dlx` and `yarn dlx` runners, the dependency step cannot find the manager that launched it unless a JavaScript launcher is on PATH. The upgrade path is also missing: a 0.9.0-installed, unedited component whose catalog bytes changed is an unresolvable conflict under the new CLI.

The React pin (INS-01) blocks 1.0. INS-02 to INS-05 should be fixed before it.

## Journey matrix

"Proven by test" names the existing test. "Proven now" means run in this audit. "Unproven" means no run exists.

| Journey | Status | Evidence |
| --- | --- | --- |
| Fresh Vite (create-vite 9.3.4, React `^19.3.1`, Vite 8, TS 7) + Tailwind v4 per Tailwind docs | **Refused** unmodified; proven now after pinning React | `init` → `UNSUPPORTED_PROJECT` exit 3. After editing to `19.3.1`, `init`, `add button dialog` (npm install) and `npm run build` pass (`j2-vite-npm`, published 0.9.0) |
| Fresh Next.js (create-next-app 16.4.6, React `19.3.0`, Tailwind 4.3.3) | **Refused** | `init --dry-run` exit 3, published 0.9.0 and packed candidate |
| shadcn init on a create-next-app project (radix-nova) | **Refused** (React `19.3.0`) | `init` and `theme add` exit 3, packed candidate |
| shadcn 4.23 Vite template (radix-nova) | **Refused** unmodified; proven now after pinning | After pinning: `theme add`, `add button dialog tooltip --beside …` with npm install, `npm run build` pass (packed candidate, `j5`) |
| shadcn 4.23 Next.js template (default `base-nova`, React `19.3.1`) | Proven now | `init`, `add button dialog input --beside components/ui/button.tsx` (npm install), `tsc --noEmit`, `next build` pass (published 0.9.0, `j1`) |
| Existing shadcn, theme only | Proven by `tests/integration/shadcn-theme-merge.test.ts` (pnpm, React pinned by the test, lines 58-73); proven now with published 0.9.0 (`pnpm dlx`, `j8`) and the packed candidate (npm, `j5`) | — |
| Add a component later, saved preset reused | Proven by `tests/integration/npm.test.ts`, Yarn/Bun consumer tests; proven now (npm, Yarn 4) | — |
| Scoped recipe / preset-scoped Button | Proven by `recipe-cli.test.ts`, `component-preset-cli.test.ts`, consumer matrix; not rerun | — |
| Install by code (`ps_…@1`, `rc_…@1`) | Proven by `hosted-code-cli.test.ts` against a local service; published path last applied on 2 November with 0.2.1 (`docs/cli-release.md:170-175`) | Not rerun (see Unverified) |
| npm runner (`npx`) | Proven now (Git Bash and PowerShell) | — |
| pnpm runner (`pnpm dlx`) | Proven now for theme-only; **fails** at the dependency step without a pnpm launcher on PATH (INS-04) | `j8` |
| Yarn modern runner (`yarn dlx`) | Proven now for `init` and an `add` with no new dependency; **fails** at the dependency step without a Yarn launcher on PATH (INS-04) | `j3` |
| Yarn Classic | Site says use `npx`; consumer matrix covers Yarn 1.22.22 installs; not run here | — |
| Bun (`bunx`) | Consumer matrix and `bun-*.test.ts` at Bun 1.4.3 only; not run here; current Bun 1.4.5 is refused at the dependency step by code (INS-03) | — |
| Upgrade a 0.9.0 install with the new CLI | **Fails** for changed components (INS-05) | `j7` |

## Findings

### INS-01 Three of four stock projects are refused by the exact React 19.3.1 check, and the site never says so
- Severity: blocker
- Where:
  - `packages/cli/src/project/inspect.ts:114-117`
  - `apps/www/src/site/home/journey.tsx:108`
  - `apps/www/src/site/docs/guides.tsx:18` and `:182`
  - `tests/integration/shadcn-theme-merge.test.ts:58-73`
  - `scripts/playground/projects.ts:72`
  - `docs/foundation-local-usage.md:38` (the only place the pin is stated)
- What happens: before any write, `init`, `theme add` and `add` refuse every project whose `package.json` does not declare `react` and `react-dom` as the exact string `19.3.1`. The output (published 0.9.0 and the packed candidate are identical):
  ```
  UNSUPPORTED_PROJECT: Foundation requires exact react and react-dom 19.3.1 declarations; align both versions before installing (ranges are not verified) (…\next-npm)
  ```
  Exit code 3. Generated today:
  - create-vite 9.3.4 writes `"react": "^19.3.1"`: refused.
  - create-next-app 16.4.6 writes `"react": "19.3.0"`: refused. Next.js pins one patch behind React's `latest`.
  - shadcn's Vite template writes `^19.3.1`: refused.
  - shadcn init inside the create-next-app project keeps `19.3.0`: refused.
  - Only shadcn's Next.js template (`19.3.1`) passes.

  The site's prerequisites ("Node 24.19.0 or newer Node 24 and a Vite React TSX or Next.js App Router TSX app with Tailwind v4") and troubleshooting list omit React. A newcomer who follows the guide is stopped at step 3. The message names the version but not the edit: replace the range and reinstall, or upgrade from 19.3.0. The check also means every future React patch (19.3.2) refuses every fresh project until a CLI release. The repository's own shadcn test and playground rewrite React to `19.3.1` before running the CLI, so no test exercises a project as generated. Audit 12 (PUB-04) found this by reading; this audit reproduces it and corrects one detail: create-next-app pins rather than uses a caret range, and is still refused.
- How verified: reproduced with `npx @ombelle-ui/cli@0.9.0 init --preset ../preset.json --dry-run` and `node <packed>/dist/main.js init|theme add … --dry-run` in `next-npm`, `next-npm-shadcn`, `shadcn-vite-npm` and `j2-vite-npm` (before the pin). After the pin was edited by hand, the same apps installed and built.
- Suggested change: accept a React 19 range for 1.0 (for example `>=19.2.0 <20` on the declared minimum, and verify the installed version from `node_modules` where present). Keep 19.3.1 as the tested pin in evidence, and state the rule on the site prerequisites. At minimum, add it to the site now and make the message say "change `^19.3.1` to `19.3.1` and reinstall".
- Effort: S to document, M to relax with tests

### INS-02 The CLI demands Node 24, while the default Node download is now 26; a dry run passes and the apply then fails without saying what to do
- Severity: should-fix
- Where:
  - `packages/cli/src/apply/executable.ts:8-11` and `:35-50`
  - `scripts/pack-cli.mjs:94` (`engines: ">=24.19.0 <25"`)
  - `packages/cli/src/main.ts:415-421`
  - `apps/www/src/site/home/journey.tsx:108`
- What happens:
  - Node 26.13.1 has been the Active LTS ("Lithium") since October; Node 24 is in maintenance. A newcomer who installs "LTS" gets 26.
  - `npx` only warns about the engine range. The CLI then plans normally, and `--dry-run` reports `planned`, exit 0.
  - On apply, any plan with a dependency resolves a Node executable for the package manager. It accepts only `v24.x` with minor ≥ 19 (`process.execPath` first, then `node` on PATH).
  - Reproduced with only Node 20 available (same code path as 26):
    ```
    UNSUPPORTED_PROJECT: Cannot resolve a supported native node executable
    ```
    Exit 3, no files written.
  - The `nextAction` ("Install Node 24.19.0 or newer Node 24 and configure its executable path.") exists, but human output prints `nextAction` only for `RESOLUTION_FAILURE` and `UNKNOWN_COMPONENT` (main.ts:419-420). It appears only with `--json`.
  - The same hidden `nextAction` affects `add` before `init`. Text output is `UNSUPPORTED_PROJECT: Initialize a saved project preset first (<path>)`; the "Run init --preset" hint is JSON-only.
  - A missing preset file gives a raw `INVALID_DATA: ENOENT: no such file or directory, stat '…\project-preset.json'`.
  - Theme-only commands succeed on Node 26, so the failure shows up later, at the first `add`.
- How verified:
  - Reproduced: `PATH=<node20 dir>:/usr/bin <node20> <packed>/dist/main.js add switch --yes` in `j6-node20` (dry run exit 0, apply exit 3). With Node 24 left on PATH, the same Node 20 run succeeded, which confirms the PATH fallback.
  - Hidden hints reproduced with published 0.9.0 in `j4-friction`.
  - Node 26 itself was not run: no binary here, and downloading one was out of scope.
- Suggested change:
  - Test and accept Node 26 (and 24) before 1.0.
  - Check the runtime at plan time, so `--dry-run` reports it.
  - Print `Next:` for every error that has a `nextAction`.
- Effort: M

### INS-03 Bun projects are refused unless Bun is exactly 1.4.3
- Severity: should-fix
- Where:
  - `packages/cli/src/apply/executable.ts:43`
  - `apps/www/src/site/docs/guides.tsx:19` ("The CLI supports npm, pnpm, Yarn, and Bun projects")
- What happens: any `add` that installs a dependency in a Bun project resolves the Bun executable and rejects every version except the string `1.4.3`. Bun's current release is 1.4.5 (`npm view bun version`). A Bun user on a current Bun therefore cannot add most components, and the error is the generic `Cannot resolve a supported native bun executable`, with its hint hidden as in INS-02. The site states Bun support without any version. The README names 1.4.3 only as the verified version.
- How verified: read end to end (resolveExecutable → `kind==='bun'?version!=='1.4.3'`); Bun was not run.
- Suggested change: accept a tested Bun range (for example `>=1.4.3 <2`) and state it on the site.
- Effort: S

### INS-04 The site's `pnpm dlx` and `yarn dlx` runners cannot install dependencies unless a JavaScript launcher for that manager is on PATH
- Severity: should-fix
- Where:
  - `packages/cli/src/apply/manager.ts:197-290` (`resolveManager`)
  - `apps/www/src/snapshots/install-command.ts:282-287` (`managerRunner`)
  - `apps/www/src/site/docs/guides.tsx:12`
- What happens:
  - The CLI finds the target project's manager from `npm_execpath` (only when it ends in `pnpm.cjs|mjs|js` / `yarn.cjs|mjs|js`) or from PATH shims it can parse.
  - `pnpm dlx` does not set `npm_execpath`. A probe package run with `corepack pnpm@11.25.0 dlx` printed `execpath= undefined ua= pnpm/11.25.0`.
  - Running exactly the site command `pnpm dlx @ombelle-ui/cli@0.9.0` in a pnpm shadcn project: `theme add` succeeded, then `add dialog --yes` failed:
    ```
    UNSUPPORTED_PROJECT: Cannot locate a pnpm JavaScript entry without shell evaluation
    ```
  - The same happened with `yarn dlx --quiet @ombelle-ui/cli@0.9.0 add tooltip --yes` in a Yarn 4 project (`Cannot locate a yarn JavaScript entry…`).
  - It works when `corepack enable` or `npm i -g pnpm` has put a parsable `pnpm.cmd`/`yarn.cmd` on PATH. By the code, it fails with pnpm's standalone installer, whose launcher is the native `pnpm.exe` / `pnpm` binary: neither is in the candidate names, and a binary has no `#!/usr/bin/env node` line.
  - The hint "Install pnpm and add its launcher to PATH." is hidden (INS-02).
  - Wave 1 recorded the same corepack symptom in a unit test (TST-09), but not as a user journey.
- How verified: reproduced in `j8-pnpm-next` and `j3-vite-yarn` with corepack not enabled; the standalone-binary case was read only.
- Suggested change: also read `npm_config_user_agent` plus the launching process, or accept a native manager executable on PATH (spawned with `shell: false`), so the runner the site recommends can install. Otherwise state the PATH requirement next to the runner tabs.
- Effort: M

### INS-05 A project installed with an earlier 0.x cannot take changed component source: unedited files become an unresolvable conflict, and no upgrade route is written
- Severity: should-fix (high). Audit 12 PUB-01 rates the same gap a blocker for 1.0; this audit reproduces it.
- Where:
  - `packages/cli/src/plan/components.ts:256-275`
  - `docs/cli-release.md:103` ("Projects get the new styles with CLI 0.7.4 on their next `add` or `theme add`")
  - `apps/www/src/site/docs/guides.tsx:66`
- What happens:
  - In `j7-upgrade`, `add meter input-otp --yes` was run with published 0.9.0, then the packed candidate ran `add meter input-otp --dry-run`. The files were untouched and their hashes matched the lock. Output:
    ```
    conflict src/components/ui/meter.tsx
    FILE_CONFLICT (src/components/ui/input-otp.css): Existing source requires an explicit migration
    FILE_CONFLICT (src/components/ui/meter.tsx): Existing source requires an explicit migration
    ```
    Exit 4. `theme add ui-preset.json` is a no-op and does not help.
  - The message is the same one an edited file gets, so the user cannot tell "you changed this" from "we changed this". `--overwrite` is refused for managed files, there is no `update` command, and `--yes` cannot pass.
  - The only working route is to delete the file and run `add` again. That route is documented only for the historical Dialog migration (`docs/foundation-local-usage.md:42-58`).
  - The 0.7.4 release note's promise that projects get new styles on the next `add` is false for colocated component CSS and TSX. Only `ui-style.css` refreshes, through `theme add`.
  - The 0.9.1 fixes (Meter, Input OTP, Tabs counts, Organic and Retro futurism legends, sidebar tooltips) and every 1.0 byte change reach existing projects only by hand.
- How verified: reproduced (above); code path read.
- Suggested change: for a hash-matched managed file whose catalog bytes changed, report a distinct "catalog update available" status, and let `add <id> --update` (or `--overwrite` for unedited managed files) replace it. Write a 0.x → 1.0 upgrade page.
- Effort: M

### INS-06 The published installer still downgrades the user's dependencies; the wave 1 fix reaches users only after a release, and the packed candidate reuses the published version number
- Severity: should-fix
- Where:
  - `apps/www/src/snapshots/install-command.ts:6` (`version: '0.9.0'`)
  - `docs/cli-release.md:7-13`
  - `packages/cli/package.json` (0.9.1)
  - `scripts/pack-cli.mjs:92`
- What happens:
  - With the advertised `npx @ombelle-ui/cli@0.9.0` on the shadcn Next.js template, `add button dialog input` rewrote `"lucide-react": "^1.77.0"` to `"1.55.0"` and `"@base-ui/react": "^1.9.0"` to `"1.9.0"` (CLI-01, `j1`). The packed candidate keeps `lucide-react ^1.77.0` and installs only what is missing (`j5`), so CLI-01's fix changes this journey, but only once it is published.
  - npm's `latest` for `@ombelle-ui/cli` is already **0.9.1**, published 2026-11-21T18:31Z, before the wave 1 fixes. The docs still say "Until 0.9.1 is published, the public installer stays 0.9.0", and audit 12 (PUB-12) calls 0.9.1 unpublished.
  - `pnpm pack:cli` in this tree produces another `ombelle-ui-cli-0.9.1.tgz` with different bytes. It cannot be published under that number, and `release.json` records nothing that warns about the clash.
  - Users who type the unpinned `npx @ombelle-ui/cli` get 0.9.1. The site pins 0.9.0.
- How verified: reproduced (`j1` package.json after apply; `j5` after apply); `npm view @ombelle-ui/cli dist-tags time`.
- Suggested change: bump the workspace to the next version before packing, have `pack-cli.mjs` refuse a version that already exists on the registry, and record 0.9.1's publication in `docs/cli-release.md` (and run `version:set --published`) or deprecate it.
- Effort: S

### INS-07 The landing page's install demo shows output the CLI never prints and a component add that conflicts on the shadcn route
- Severity: nice-to-have
- Where: `apps/www/src/site/home/journey.tsx:15-36`, `:126`
- What happens:
  - The "Example output" lines are labelled "Summarised output". Lines such as `✓ Detected Vite · React · Tailwind v4`, `✓ Resolved preset PRESET (FAMILY)`, `~ merge palette and tokens into globals.css` and `= keep installed component source` are not in any CLI output format.
  - The real plan is a status line plus `update`/`create`/`noop` rows, as quoted in the matrix runs. A user comparing the two may think the CLI misbehaves.
  - "Then add components: `add button`" promises `~ would create components/ui/button.tsx`. After the "Existing shadcn" scenario, `add button` actually exits 4 on shadcn's own `button.tsx` (reproduced in `j1`). The `--beside` step that resolves it appears only in the docs.
- How verified: reproduced output compared with the source strings.
- Suggested change: show abbreviated real output, and add the `--beside` step (or say "conflicts with shadcn's button.tsx") to the shadcn scenario.
- Effort: S

### INS-08 shadcn's other Radix presets and its new React Aria base are refused for components and get only palette themes, and nothing on the site says which shadcn styles work
- Severity: nice-to-have
- Where:
  - `packages/catalog/src/shadcn.ts:4-13`
  - `packages/cli/src/project/edition.ts:4-26`
  - `apps/www/src/site/docs/guides.tsx:57`
- What happens:
  - Radix is recognized only as `radix-nova` and `new-york`, while eight `base-*` styles are accepted.
  - shadcn 4.23 now offers `-b aria` (React Aria), and its non-nova Radix presets produce other `radix-*` styles (see the vega run below).
  - For those styles, `add` fails with ``Style `…` isn't supported; Ombelle supports `radix-nova`, `new-york` and shadcn's `base-*` styles``. `theme add` silently falls back to palette-only.
  - The site says "The installer detects Radix or Base UI from components.json" without the style list.
  - shadcn's default (`-d`) is now `base-nova`, which works.
- How verified: reproduced in `j9-vega` with the packed candidate. `npx shadcn@4.23.0 init -b radix -p vega` wrote `"style": "radix-vega"`. Results:
  - `theme add --dry-run` planned `update app/globals.css` with no `ui-style.css`, so palette only, with no notice saying so.
  - `init --yes` succeeded.
  - `add dialog --dry-run` failed with the message above, exit 3.
  - The `aria` base was read only.
- Suggested change: list the supported `style` values on the existing-project page. Add a plan notice when a theme is applied palette-only. Accept the other `radix-*` presets if their component structure matches nova.
- Effort: S to document

## Unverified

- **Install by code against the hosted service with the published installer.** Last applied on 2 November with 0.2.1. A read-only `init --preset ps_…@1 --dry-run` against production would settle whether today's resolution path works, and an applied run in a throwaway project would settle the rest. Not run, to keep the hosted service out of this audit's write and read budget.
- **Node 26 itself.** Expected to fail like Node 20 (INS-02), from the code. Settle by running the packed CLI under Node 26 with a dependency-installing `add`.
- **Bun 1.4.5.** Expected to fail (INS-03). Settle with `bunx @ombelle-ui/cli@0.9.0 add tooltip --yes` in a Bun project.
- **pnpm standalone (`pnpm.exe`) and corepack-enabled shims (INS-04).** Run `add` with a dependency through `pnpm dlx` after `corepack enable`, and again with pnpm's standalone installer.
- **macOS and Linux.** Not run.
  - From the code, separators are normalized (`portable()`), resolutions match case- and separator-insensitively, CRLF is handled (CLI-03 fix), and `shell: false` is used everywhere. `invokedAsEntry` resolves POSIX bin symlinks, the 0.2.0 failure.
  - Get code's alternate-origin commands quote the origin with single quotes, which `cmd.exe` does not treat as quotes. Official-origin commands carry no quoted part. PowerShell ran the official `npx` command correctly.
  - `resolveManager` on POSIX reads PATH entries named `pnpm`/`yarn` and requires a `#!/usr/bin/env node` first line. Homebrew or standalone native binaries would not match (INS-04).
- **Yarn Classic.** The site's "use npx for Yarn Classic" route was not run; the CLI then has to find `yarn.cmd`/`yarn` on PATH for the dependency step.
- **Browser rendering of the generated apps.** Only production builds were run.

## Looked at and found sound

- **Runners.** `npx @ombelle-ui/cli@0.9.0` runs from Git Bash and from Windows PowerShell 5.1 (no `@` splatting issue). `pnpm dlx` and `yarn dlx` start the CLI and run plans. `yarn dlx --quiet` keeps `--json` clean (`guides.tsx:12` uses it; Get code's Yarn tab omits `--quiet`, which matters only with `--json`).
- **Toolchain compatibility once React is pinned.** Vite 8.3, TypeScript 7.0 (`tsc -b`) and Tailwind 4.3.5 built with installed components. Next.js 16.4.6 with TypeScript 5 built with Base UI components.
- **Theme-only route on genuine shadcn projects.** `theme add` on shadcn 4.23 Vite (radix-nova) and on the shadcn fixture (pnpm) planned no dependency, and a later `add` reused the saved preset. Readiness gap 3's "0.2.1 rejects every stock shadcn project" no longer holds.
- **shadcn conflicts.** `button.tsx` conflicts with an actionable message naming `--overwrite`/`--beside`. `lib/utils.ts` from shadcn's `cn` package is adopted with a notice and rewritten to the `clsx`/`tailwind-merge` form; the build passed.
- **Dependency plans in the candidate (CLI-01 fix).** On the shadcn Vite template the plan installs only missing packages and keeps the newer `lucide-react` range.
- **Non-interactive safety.** Without `--yes` and without a TTY, `init` stops with `Noninteractive writes require --yes after reviewing --dry-run`, exit 2.
- **Packing.** `pnpm pack:cli` produced a 5-file package with bundled JavaScript, a bin, MIT licence, notices and README, and no install scripts. It installed with `--ignore-scripts`.

## Status of installation gaps in docs/web-alpha-readiness.md

| Gap | Status now |
| --- | --- |
| PR10: only npm applied a published journey; pnpm, Yarn and Bun only planned `init` | **Still open, wording stale** (names 0.2.1). This audit applied `theme add` through `pnpm dlx` and `init`/`add` through `yarn dlx` with 0.9.0. Both failed at the first dependency install without a PATH launcher (INS-04). Bun was not run. |
| PR11 / gap 3: published 0.2.1 rejects every stock shadcn project (workspace file, `tailwindcss: "^4"`) | **Closed** for 0.9.0: `theme add` works on stock shadcn projects. |
| PR11 / gap 3: decide whether a theme-only merge should require exact React | **Still open**, and wider than stated: it also refuses create-next-app and create-vite (INS-01). |
| PR11: `lib/utils.ts` conflict | **Closed** (adopted; already corrected in wave 1). |
| Gap 4: Yarn Classic route undocumented | **Closed** on the site (`guides.tsx:50`: use `npx`); docs/10 still gives a different, `your-ui` placeholder route. |
| Gap 6 / PR7: pnpm, Yarn, Bun commands in export panels | **Partly closed.** Get code and the guides have runner tabs. The preset and recipe export panels still show only `npx` (`preset-export-panel.tsx:181`, `artifact-panel.tsx:32`). |
| Not blocking: offline build of an app installed by the published package (PR1); macOS run | **Still open.** Not run here. |
