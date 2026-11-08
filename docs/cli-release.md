# Standalone CLI candidate

`pnpm pack:cli` generates `.artifacts/cli-release/ombelle-ui-cli-0.7.1.tgz` and a separate `release.json` containing its SHA-512 integrity, source commit, dirty-tree status, file inventory and bundled package inventory. The package contains bundled JavaScript, its manifest, README, MIT license and third-party notices. It has no workspace dependencies or installation scripts. Packing does not publish anything or enable public website commands.

Use the repository's pinned Node 24.19.0, pnpm 11.25.0 and npm 11.19.0. The packer explicitly builds package sources before bundling. If npm is installed separately, put its bin directory on PATH or set `OMBELLE_RELEASE_NPM_ENTRY` to that installation's absolute `npm-cli.js` path. Never disable TLS verification.

## Catalog recipe release

The component editor release uses recipe 2.0 for the 22 new editors and recipe 1.0 for Button. The website's minimum candidate for recipe 2.0 is CLI `0.6.0`. Verify the candidate can install both recipe formats from JSON and immutable codes. Run the catalog browser parity and foundation gates before updating the site's published installer version. Publish and smoke-test the compatible package before that website change.

Install the exact candidate in an independent project with lifecycle scripts disabled. Replace TARBALL with its absolute path:

| Manager | Candidate installation | Run the installed bin |
| --- | --- | --- |
| npm 11.19.0 | `npm install --ignore-scripts TARBALL` | `npm exec -- ombelle --help` |
| pnpm 11.25.0 | `pnpm add --ignore-scripts TARBALL` | `pnpm exec ombelle --help` |
| Yarn Classic 1.22.22 | `yarn add --ignore-scripts TARBALL` | `yarn run ombelle --help` |
| Yarn 4.18.1 | Copy the tarball into the project as `candidate.tgz`, disable scripts with `YARN_ENABLE_SCRIPTS=false`, then `yarn add --mode=skip-build @ombelle-ui/cli@file:./candidate.tgz` | `yarn run ombelle --help` |
| Bun 1.4.3 | `bun add --ignore-scripts TARBALL` | `bun run ombelle --help` |

The supported CLI runtime is Node 24.19.0 or newer Node 24; the candidate is also tested directly under Bun 1.4.3. Manager ownership of target applications remains independent from the installer package's manager. Review a plan with `--dry-run --json`, then explicitly apply with `--yes`. All target dependency installations disable lifecycle scripts.

## Publication gate

`@ombelle-ui/cli@0.2.0` was published on 2026-11-02 by npm identity `ombelle`, owner of the user-reserved `ombelle-ui` organization. Its registry tarball matched the tested candidate byte for byte (integrity `sha512-ikzam7qN…8uUVs4OSXlfhQ==`), but it exits 0 without output when run through a POSIX bin symlink (`npx`, `npm exec`, Bun on Linux and macOS). Windows shims and direct `node dist/main.js` were unaffected. Do not advertise 0.2.0.

`@ombelle-ui/cli@0.2.1`, which resolves its entry path through symlinks, was published on 2026-11-02 from `c9ba4c1` with a clean tree and is the `latest` tag. 0.2.0 is deprecated on npm with a pointer to 0.2.1. npm also lists `0.0.0-stage`, a two-file placeholder without bin or scripts that npm created during the first staged publication.

All six workspace packages use software version 0.7.1. The published installer is `@ombelle-ui/cli@0.7.0`. 0.3.1 adds the liquid-glass refraction filter component; 0.4.0 adds the `ombelle` style family, refreshes the flat, minimalist and neo-brutalism families and their built-in presets, and rebuilds both editors; 0.4.1 restyles the four stable families to their UI kits, adds the optional `shadowColor` preset colour and the new Button recipe fields, and adds Badge variants, Button `loading` and `icon-sm`, and `DialogHeader`; 0.5.0 adds Select, Radio Group, Dropdown Menu and Alert, makes every liquid glass component experimental, restyles liquid glass to its design kit with the material lab settings and starting presets, and adds the Button recipe glass overrides. 0.7.0 supports shadcn's Base UI (`base-*`) projects for themes and all 24 components, adopts shadcn's generated `lib/utils.ts`, and resolves other app-owned files with `--overwrite` or `--beside` ([decision 0005](decisions/0005-base-ui-edition.md)). The installer accepts catalog and compiler compatibility release 0.1.0 and recipe formats 1.0 and 2.0.

Release 0.5.0 in this order:

1. Publish `@ombelle-ui/cli@0.5.0` from the tested candidate and verify the registry integrity.
2. Run `pnpm version:set --published 0.5.0` (then `--check --published`) and commit it to `main`.
3. Deploy the website from `main`.

The website withholds liquid glass components, material presets and recipe glass overrides while its published installer is older than 0.5.0 (`glassMinimumCli`, `glassMaterialMinimumCli` and `glassContrastMinimumCli`), so deploying before step 2 keeps them gated. The built-in liquid glass preset changes value in 0.5.0; see [Upgrading from 0.4.x](components/liquid-glass.md#upgrading-from-04x).

Release 0.4.1 in this order:

1. Publish `@ombelle-ui/cli@0.4.1` from the tested candidate and verify the registry integrity.
2. Run `pnpm version:set --published 0.4.1` (then `--check --published`) and commit it to `main`.
3. Deploy the website from `main`.

0.4.1 has no version gate on the website. The website deploys from `main` on every merge, so it already publishes ombelle and neo-brutalism preset codes with `shadowColor` and recipe codes with the new Button fields. Installer 0.4.0 rejects those, and installs the other families with their 0.4.0 stylesheets, which differ from the preview. Publish 0.4.1 and complete step 2 promptly.

Release 0.4.0 in this order:

1. Publish `@ombelle-ui/cli@0.4.0` from the tested candidate and verify the registry integrity.
2. Run `pnpm version:set --published 0.4.0` (then `--check --published`) and commit it to `main`.
3. Deploy the website from `main`.

The website offers the `ombelle` family only when its published installer version is at least `ombelleMinimumCli` (0.4.0, in `apps/www/src/snapshots/install-command.ts`), so deploying before step 2 keeps Ombelle hidden. The refreshed flat, minimalist and neo-brutalism built-in presets are not gated: a website deployed from `main` before step 2 publishes codes for the refreshed presets while its commands still name the older installer, which installs them with its older family stylesheets, so the result differs from the website preview. Keep to the order above.

Post-publication checks on 2026-11-02:

- The registry tarball is byte-for-byte identical to the candidate (integrity `sha512-TAkxY7UE…BDJFxJQ==`).
- On Linux (WSL Ubuntu, Node 24.19.0), `npx @ombelle-ui/cli@0.2.1 --help` prints help, while 0.2.0 exits 0 with no output.
- On production (`https://ombelle-ui.vercel.app`, Neon `main` branch initialized explicitly), a labelled smoke-test preset `ps_7cca4bd460bbbd996abcf47cb07aa643@1` and recipe `rc_b511c3b46cf3293bf58491e0839ddf48@1` were published. In a fresh npm Vite-shaped project on Linux, `npx @ombelle-ui/cli@0.2.1` planned `init` without writes, applied `init` and `add --recipe` by code, and a later ordinary `add input` kept `ui-preset.json` unchanged; the lock records the official origin, both codes and their hashes.
- After a production redeploy of the same commit, both codes returned byte-identical responses.

`@ombelle-ui/cli@0.3.0` was published on 2026-11-04 from `a9e56fc` and is the `latest` tag; its registry integrity `sha512-3YPRTtPy…HeQgSXBrZjYkw==` matches the tested candidate. The candidate's `release.json` records `workingTreeDirty: true` only because the Windows build rewrote three generated files with LF line endings; their content was unchanged. 0.3.0 adds recipe color overrides and the hover/pressed catalog styles; 0.2.1 rejects recipes that use colors.

`@ombelle-ui/cli@0.3.1` was published on 2026-11-04 from `4c0563d`, built in a clean worktree (`workingTreeDirty: false`), and is the `latest` tag; its registry integrity `sha512-oTZ/4Hlu…LzdsQ==` matches the tested candidate. It adds the liquid-glass refraction filter component and its `add` notice.

`@ombelle-ui/cli@0.4.0` was published on 2026-11-04 from `0040a61` (the merge of PR #50), built in a clean worktree (`workingTreeDirty: false`), and is the `latest` tag; its registry integrity `sha512-dlQSyY9L…F1QU6A==` matches the tested candidate. Before publication the packed candidate installed with lifecycle scripts disabled, printed help, and planned an `init` dry run with the built-in ombelle preset without writing files; after publication `npx @ombelle-ui/cli@0.4.0 --help` ran from the registry. `pnpm check:foundation` was not completed for this release on the Windows release machine (no native Bun, `tar` fails on the D: path); see [ADR 0004](decisions/0004-ombelle-family.md). It adds the `ombelle` style family and refreshes the flat, minimalist and neo-brutalism families and built-in presets.

`@ombelle-ui/cli@0.4.1` was published on 2026-11-05 from `bea58a4` (the head of PR #63, merged as `cc53a1a`), built in a clean worktree (`workingTreeDirty: false`), and is the `latest` tag; its registry integrity `sha512-w8ZzyGlI…F/xklg==` matches the tested candidate. Before publication the packed candidate installed with lifecycle scripts disabled, printed help, and planned an `init` dry run with the built-in ombelle preset, which sets `shadowColor`, without writing files. `pnpm check:foundation` was not completed on the Windows release machine, as for 0.4.0. It restyles the four stable families to their UI kits and adds `shadowColor`, the new Button recipe fields, Badge variants, Button `loading` and `icon-sm`, and `DialogHeader`.

`@ombelle-ui/cli@0.5.0` was published on 2026-11-06 from `04d106d` (the merge of PR #82), built in a clean worktree (`workingTreeDirty: false`), and is the `latest` tag; its registry integrity `sha512-/lOhcC/E…L5e6qwZHw==` matches the tested candidate. Before publication the packed candidate installed with lifecycle scripts disabled, printed help, and planned `init` dry runs with the built-in ombelle and liquid glass Cristal presets without writing files; after publication `npx @ombelle-ui/cli@0.5.0 --help` ran from the registry. `pnpm check:foundation` was not completed on the Windows release machine, as for 0.4.x. It adds Select, Radio Group, Dropdown Menu and Alert, makes every liquid glass component experimental, restyles liquid glass to its design kit with the material lab settings and starting presets, and adds the Button recipe glass overrides.

`@ombelle-ui/cli@0.6.0` was published on 2026-11-06 from `1a550db` with the npm `latest` tag. The registry integrity matched the tested tarball (`sha512-/tUHdylZlneme…2WwOsbQ==`). The tarball installed Button 1.0 and a customized Liquid Glass Card 2.0 from JSON and local immutable codes in a standalone npm fixture with lifecycle scripts disabled. A fresh registry install printed CLI help. The pack manifest reports a dirty working tree because of a preexisting untracked local directory. Tracked sources matched the commit.

`@ombelle-ui/cli@0.7.0` was published on 2026-11-07 from `4635ed1` (the merge of PR #91), built in a clean worktree (`workingTreeDirty: false`), and is the `latest` tag; its registry integrity `sha512-WoM2QGp/…aC1xdUPQ==` matches the tested candidate byte for byte. Before publication the packed candidate installed with lifecycle scripts disabled, printed help, and, on a copy of the shadcn `base-nova` Next.js fixture, applied `theme add` (recording the Base UI edition), stopped `add button` on shadcn's `button.tsx` with exit code 4, and planned `add button --beside` without writes. After publication `npx @ombelle-ui/cli@0.7.0 --help` ran from the registry. `pnpm check:foundation` was not completed on the Windows release machine (no native Bun, `tar` fails on the D: path); Base UI consumers were verified with `pnpm test:base-consumers` and `pnpm test:editions`.

Code pages and Get code use `@ombelle-ui/cli@0.7.0` commands for all catalog editors. The runner table below records the 0.2.1 verification. Editor export panels for downloaded preset and recipe JSON files use the same npx runner, run from the folder containing the file.

## Verified public runners

Measured on 2026-11-02 on Linux (WSL Ubuntu, Node 24.19.0) against the public registry, from an empty directory, with `--help` and a dry-run `init --preset ps_7cca4bd460bbbd996abcf47cb07aa643@1 --cwd APP --dry-run --json` against production. Every dry run returned `status: planned` and wrote nothing.

| Runner | Version | Command |
| --- | --- | --- |
| npx | npm 11.17.0 | `npx @ombelle-ui/cli@0.2.1` |
| pnpm | 11.25.0 | `pnpm dlx @ombelle-ui/cli@0.2.1` |
| Bun | 1.4.3 | `bunx @ombelle-ui/cli@0.2.1` (measured as the equivalent `bun x`) |
| Yarn | 4.18.1 | `yarn dlx --quiet @ombelle-ui/cli@0.2.1` |

Yarn 4 refuses package versions younger than its `npmMinimalAgeGate` (1440 minutes by default) with `YN0016 … are quarantined`, so `yarn dlx` works from 24 hours after each publication (from 2026-11-03T17:19Z for 0.2.1). The Yarn row was measured with `YARN_NPM_PREAPPROVED_PACKAGES=@ombelle-ui/cli`. Without `--quiet`, `yarn dlx` prints its own resolution lines on stdout before the CLI output, which breaks `--json` parsing. Yarn Classic has no `dlx`.
