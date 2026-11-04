# Standalone CLI candidate

`pnpm pack:cli` generates `.artifacts/cli-release/ombelle-ui-cli-0.3.1.tgz` and a separate `release.json` containing its SHA-512 integrity, source commit, dirty-tree status, file inventory and bundled package inventory. The package contains bundled JavaScript, its manifest, README, MIT license and third-party notices. It has no workspace dependencies or installation scripts. Packing does not publish anything or enable public website commands.

Use the repository's pinned Node 24.19.0, pnpm 11.25.0 and npm 11.19.0. The packer explicitly builds package sources before bundling. If npm is installed separately, put its bin directory on PATH or set `OMBELLE_RELEASE_NPM_ENTRY` to that installation's absolute `npm-cli.js` path. Never disable TLS verification.

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

All six workspace packages use software version 0.3.1, which is not yet published; website commands keep `0.3.0` until it is. 0.3.1 adds the liquid-glass refraction filter component. The installer continues to accept catalog/compiler compatibility release 0.1.0 and schema 1.0; package versions do not reinterpret saved presets, recipes, snapshots or lockfiles.

Post-publication checks on 2026-11-02:

- The registry tarball is byte-for-byte identical to the candidate (integrity `sha512-TAkxY7UE…BDJFxJQ==`).
- On Linux (WSL Ubuntu, Node 24.19.0), `npx @ombelle-ui/cli@0.2.1 --help` prints help, while 0.2.0 exits 0 with no output.
- On production (`https://ombelle-ui.vercel.app`, Neon `main` branch initialized explicitly), a labelled smoke-test preset `ps_7cca4bd460bbbd996abcf47cb07aa643@1` and recipe `rc_b511c3b46cf3293bf58491e0839ddf48@1` were published. In a fresh npm Vite-shaped project on Linux, `npx @ombelle-ui/cli@0.2.1` planned `init` without writes, applied `init` and `add --recipe` by code, and a later ordinary `add input` kept `ui-preset.json` unchanged; the lock records the official origin, both codes and their hashes.
- After a production redeploy of the same commit, both codes returned byte-identical responses.

`@ombelle-ui/cli@0.3.0` was published on 2026-11-04 from `a9e56fc` and is the `latest` tag; its registry integrity `sha512-3YPRTtPy…HeQgSXBrZjYkw==` matches the tested candidate. The candidate's `release.json` records `workingTreeDirty: true` only because the Windows build rewrote three generated files with LF line endings; their content was unchanged. 0.3.0 adds recipe color overrides and the hover/pressed catalog styles; 0.2.1 rejects recipes that use colors.

Code pages and Get code therefore show `@ombelle-ui/cli@0.3.0` commands. The runner table below was measured for 0.2.1 and has not been repeated for 0.3.0. Editor export panels for downloaded preset and recipe JSON files use the same npx runner, run from the folder containing the file.

## Verified public runners

Measured on 2026-11-02 on Linux (WSL Ubuntu, Node 24.19.0) against the public registry, from an empty directory, with `--help` and a dry-run `init --preset ps_7cca4bd460bbbd996abcf47cb07aa643@1 --cwd APP --dry-run --json` against production. Every dry run returned `status: planned` and wrote nothing.

| Runner | Version | Command |
| --- | --- | --- |
| npx | npm 11.17.0 | `npx @ombelle-ui/cli@0.2.1` |
| pnpm | 11.25.0 | `pnpm dlx @ombelle-ui/cli@0.2.1` |
| Bun | 1.4.3 | `bunx @ombelle-ui/cli@0.2.1` (measured as the equivalent `bun x`) |
| Yarn | 4.18.1 | `yarn dlx --quiet @ombelle-ui/cli@0.2.1` |

Yarn 4 refuses package versions younger than its `npmMinimalAgeGate` (1440 minutes by default) with `YN0016 … are quarantined`, so `yarn dlx` works from 24 hours after each publication (from 2026-11-03T17:19Z for 0.2.1). The Yarn row was measured with `YARN_NPM_PREAPPROVED_PACKAGES=@ombelle-ui/cli`. Without `--quiet`, `yarn dlx` prints its own resolution lines on stdout before the CLI output, which breaks `--json` parsing. Yarn Classic has no `dlx`.
