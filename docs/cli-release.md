# CLI release procedure

How to publish `@ombelle-ui/cli`. It is a procedure, not a log: the dated record of past releases is
[CLI release history](cli-release-history.md), and the evidence for each is in `docs/evidence/npm-<version>-<date>.md`.

`pnpm pack:cli` generates `.artifacts/cli-release/ombelle-ui-cli-0.9.1.tgz` and a separate `release.json` containing its SHA-512 integrity, source commit, dirty-tree status, whether the version already exists on the registry, the file inventory and the bundled package inventory. The package contains bundled JavaScript, its manifest, README, MIT license and third-party notices. It has no workspace dependencies or installation scripts. Packing does not publish anything or enable public website commands.

All six workspace packages use software version 0.9.1. This is the workspace version, not necessarily a published one: the version npm serves is `npm view @ombelle-ui/cli dist-tags`, and the version the website tells people to install is `publishedInstaller` in `apps/www/src/snapshots/install-command.ts`. They are updated by different commands (`version:set` and `version:set --published`) and are deliberately separate.

## Version clash in this tree

`@ombelle-ui/cli@0.9.1` is already published (21 November 2026, from `d162ab30`). The tree this procedure ships with has the 1.0 fixes on top of that commit but still says 0.9.1, so `pnpm pack:cli` here builds a **different tarball under a version npm will refuse to take again**, and the website still pins an installer without those fixes. Therefore:

- Do not publish a candidate built at 0.9.1. `pnpm pack:cli -- --release` refuses it (the registry already has that number) and a plain `pnpm pack:cli` warns and records `versionAlreadyOnRegistry: true` in `release.json`.
- The next release must bump first: `pnpm version:set <next>` (a release candidate such as `1.0.0-rc.1` is not accepted by the version script, which takes `x.y.z`; use `0.9.2` or go straight to `1.0.0`). Which number is next is the owner's call; every number is final once published.
- Until that release, the website pins the installer it pins today (`publishedInstaller`), and anyone running the pinned or the unpinned command gets the published 0.9.1 tarball, which does not contain the 1.0 fixes (for example the dependency re-pinning fix CLI-01).

## Rules

1. **Never publish from a dirty tree.** `pack:cli -- --release` refuses one. Pack from a clean worktree detached at the release commit.
2. **Never reuse a version number.** npm will not accept it, and a different tarball under the same number is a silent fork. The packer checks the registry.
3. **Publish first, deploy second.** The website deploys from `main` on every merge and emits install codes and commands based on `publishedInstaller` and the minimum-CLI gates in `install-command.ts`. A site that advertises a CLI that is not on npm yet gives users commands that fail. The order is always: publish, `version:set --published`, deploy.
4. **Gate before publishing.** `pnpm check:foundation` must pass, or the release record states exactly what was not run and why. Several earlier releases skipped it; the history says which.
5. **The owner publishes.** Publishing needs the npm identity `ombelle` (owner of the `@ombelle-ui` organization) with 2FA. An agent or CI job never does this; see [proposed CI publishing](#proposed-ci-publishing-owner-action).

## Procedure

Use the repository's pinned Node 24.19.0, pnpm 11.25.0 (through `corepack pnpm`) and npm 11.19.0. The packer builds package sources itself. If npm is installed separately, put its bin directory on PATH or set `OMBELLE_RELEASE_NPM_ENTRY` to that installation's absolute `npm-cli.js`. Never disable TLS verification.

### 1. Prepare the release commit

1. Branch `chore/release-<version>`.
2. `pnpm version:set <version> --date YYYY-MM-DD`. This aligns every workspace version site and turns the CHANGELOG "Unreleased" section into the dated entry. Then `pnpm version:set --check`.
3. Edit the CHANGELOG entry so it follows the [changelog layout](../CHANGELOG.md): installed source, CLI, contracts, website, with **Breaking** and **Upgrade** items called out. Anything that changes installed bytes goes under installed source with the upgrade step.
4. If a new style family, component, schema field or enum value needs this CLI, set or update its minimum-CLI gate in `apps/www/src/snapshots/install-command.ts` and note it in the history entry.
5. Open the PR, let CI pass, merge to `main`. Do not deploy anything yet: the merge deploys the website, but with `publishedInstaller` still at the previous version the site only advertises the old installer, which is safe.

### 2. Gate

From a clean checkout of the merge commit:

```powershell
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm build:packages
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:integration
corepack pnpm check:foundation
```

`check:foundation` needs registry access, native Bun 1.4.3, both Yarn versions and the browser (see the README). Record the counts it prints.

### 3. Pack the candidate

```powershell
corepack pnpm pack:cli -- --release
```

Open `.artifacts/cli-release/release.json` and confirm: `releaseMode: true`, `workingTreeDirty: false`, `versionAlreadyOnRegistry: false`, `sourceCommit` is the release commit, `version` is the intended one, and the file inventory is exactly `dist/main.js`, `package.json`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.txt`. Confirm the package manifest carries `repository`, `homepage`, `bugs` and a description (they come from `scripts/pack-cli.mjs`).

Install the exact candidate in an independent project with lifecycle scripts disabled. Replace TARBALL with its absolute path:

| Manager | Candidate installation | Run the installed bin |
| --- | --- | --- |
| npm 11.19.0 | `npm install --ignore-scripts TARBALL` | `npm exec -- ombelle --help` |
| pnpm 11.25.0 | `pnpm add --ignore-scripts TARBALL` | `pnpm exec ombelle --help` |
| Yarn Classic 1.22.22 | `yarn add --ignore-scripts TARBALL` | `yarn run ombelle --help` |
| Yarn 4.18.1 | Copy the tarball into the project as `candidate.tgz`, disable scripts with `YARN_ENABLE_SCRIPTS=false`, then `yarn add --mode=skip-build @ombelle-ui/cli@file:./candidate.tgz` | `yarn run ombelle --help` |
| Bun 1.4.3 | `bun add --ignore-scripts TARBALL` | `bun run ombelle --help` |

`--help` must report the version you are releasing. The supported CLI runtime is Node 24.19.0 or newer Node 24; the candidate is also tested directly under Bun 1.4.3.

### 4. Publish (owner)

**A release needs a green Foundation run on the commit it publishes.** Before publishing any package version, from 1.0 on:

1. Run the Foundation workflow on the release commit (Actions > Foundation > Run workflow, or `gh workflow run foundation.yml --ref <branch>`), or use the nightly run if it ran on exactly that commit.
2. Require its `verify` job to pass. It validates the quality, consumers and four specimen shard groups together: unit and integration results, every consumer app, the browser matrix and the complete specimen audit, all on one commit. It also requires the catalog consumers job: every component installed with the built CLI into a Radix and a Base UI shadcn app (Vite and Next), built and rendered.
3. Record the run with `node scripts/record-foundation-run.mjs <run-id>`, which writes `docs/evidence/foundation-run.json` from the run's own aggregate report, and cite that run id in the release evidence.
4. Read the latest Foundation extended run (`foundation-extended.yml`: editors, website, catalog expansion, usage examples, hosted website). A failure there is a release blocker unless the release notes name it.

Pull requests run a browser subset in `ci.yml` (interaction specs and the specimen audit of the changed components); a green pull request is not a substitute for step 2. Releases 0.8.0 to 0.9.1 shipped while the Foundation gate was red (audit 11, TST-01).

```powershell
npm publish .artifacts/cli-release/ombelle-ui-cli-<version>.tgz --access public --ignore-scripts
```

Run it as the `ombelle` npm identity. Use `--tag next` for a pre-release or a candidate you want people to opt into; the default tag is `latest`.

### 5. Verify the registry

1. `npm view @ombelle-ui/cli@<version> dist.integrity` equals the `integrity` in `release.json`.
2. `npm pack @ombelle-ui/cli@<version>` in an empty folder, then compare it byte for byte with the candidate (`cmp`).
3. A fresh project installs it from the registry with scripts disabled, and `npm exec --offline -- ombelle --help` runs.
4. Run a dry-run `init` against production, in an empty project: `npx @ombelle-ui/cli@<version> init --preset <a published ps_ code>@1 --dry-run --json` returns `status: planned` and writes nothing.

### 6. Point the website at it

```powershell
corepack pnpm version:set --published <version>
corepack pnpm version:set --check --published
```

Commit as `chore(release): publish <version>`, open a PR, merge to `main`. The merge deploys the website, and its commands now use the new installer. Check one published-code page shows the new version.

### 7. Record it

Add `docs/evidence/npm-<version>-<date>.md` (use the previous one as the template: integrity, commit, checks before and after, and **what was not run**) and one dated entry to [CLI release history](cli-release-history.md): the publish note, what the release changes, and the website gates it needs. Never edit an old entry to describe a newer state.

## If a release is bad

Follow the "Bad CLI release" runbook in [production operations](production-operations.md#bad-cli-release): deprecate the version, move `latest` back with `npm dist-tag`, and point the website at a working version with `version:set --published <good>` before anything else.

## Proposed CI publishing (owner action)

Publishing is a manual `npm publish` from the owner's workstation with a long-lived credential. Proposed replacement, which only the owner can enable because it needs the npm and GitHub account settings:

1. On npm, configure **trusted publishing** for `@ombelle-ui/cli`: repository `whritou/ombelle-ui`, workflow `publish-cli.yml`, environment `npm-release`. No token is stored.
2. In GitHub, create the environment `npm-release` with the owner as required reviewer.
3. Add `.github/workflows/publish-cli.yml` that runs on a `cli-v*` tag or manual dispatch, installs with the frozen lockfile, runs `pnpm pack:cli -- --release`, and publishes the tarball with `npm publish --provenance` (`permissions: id-token: write, contents: read`). The workflow publishes the tarball built from the tagged commit, so the registry integrity equals the artifact attached to the run.
4. Keep steps 5 to 7 above manual or add them as a post-publish job.

This gives a signed provenance statement tying each version to a commit, removes the workstation credential, and lets a second maintainer release. It is not implemented here because the workflow cannot be tested without those settings; the repository's current `.github/workflows/` has no publish workflow.
