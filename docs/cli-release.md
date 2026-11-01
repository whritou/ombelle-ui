# Standalone CLI candidate

`pnpm pack:cli` generates `.artifacts/cli-release/ombelle-cli-0.1.0.tgz` and a separate `release.json` containing its SHA-512 integrity, source commit, dirty-tree status, file inventory and bundled package inventory. The package contains bundled JavaScript, its manifest, README, MIT license and third-party notices. It has no workspace dependencies or installation scripts. Packing does not publish anything or enable public website commands.

Use the repository's pinned Node 24.19.0, pnpm 11.25.0 and npm 11.19.0. The packer explicitly builds package sources before bundling. If npm is installed separately, put its bin directory on PATH or set `OMBELLE_RELEASE_NPM_ENTRY` to that installation's absolute `npm-cli.js` path. Never disable TLS verification.

Install the exact candidate in an independent project with lifecycle scripts disabled. Replace TARBALL with its absolute path:

| Manager | Candidate installation | Run the installed bin |
| --- | --- | --- |
| npm 11.19.0 | `npm install --ignore-scripts TARBALL` | `npm exec -- ombelle --help` |
| pnpm 11.25.0 | `pnpm add --ignore-scripts TARBALL` | `pnpm exec ombelle --help` |
| Yarn Classic 1.22.22 | `yarn add --ignore-scripts TARBALL` | `yarn run ombelle --help` |
| Yarn 4.18.1 | Copy the tarball into the project as `candidate.tgz`, disable scripts with `YARN_ENABLE_SCRIPTS=false`, then `yarn add --mode=skip-build @ombelle/cli@file:./candidate.tgz` | `yarn run ombelle --help` |
| Bun 1.4.3 | `bun add --ignore-scripts TARBALL` | `bun run ombelle --help` |

The supported CLI runtime is Node 24.19.0 or newer Node 24; the candidate is also tested directly under Bun 1.4.3. Manager ownership of target applications remains independent from the installer package's manager. Review a plan with `--dry-run --json`, then explicitly apply with `--yes`. All target dependency installations disable lifecycle scripts.

## Publication gate

The current artifact is an **unpublished candidate**. npm authentication is absent on this machine, and namespace ownership has not been established. The registry returned 404 for `@ombelle/cli`; this does not establish access to the `@ombelle` namespace. Complete account authentication through npm's ordinary login flow, verify the publishing identity and namespace access, then review and publish the exact tested tarball under the approved name. Do not substitute another namespace or version without a decision.

After publication, independently fetch `@ombelle/cli@0.1.0`, compare its registry integrity and installed bytes to the candidate, and exercise real hosted codes before enabling website commands. Only then are `npx @ombelle/cli@0.1.0`, `pnpm dlx @ombelle/cli@0.1.0`, `yarn dlx @ombelle/cli@0.1.0`, and `bunx @ombelle/cli@0.1.0` verified public runners. Until that gate passes, the website retains truthful private checkout commands. A local candidate and mocked official-origin test transport do not establish a live service or public release.
