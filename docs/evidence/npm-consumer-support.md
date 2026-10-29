# npm consumer support

20 October 2026. F11 first slice: extend the existing installer to npm consumers while retaining pnpm. This is a bounded change to the existing init/add/theme flow, approved in chat.

## Scope and decisions

- Target package.json.packageManager selects npm or pnpm; a unique recognized lockfile is the fallback. Conflicting evidence, Yarn/Bun and npm shrinkwrap are rejected. No manager conversion is performed.
- InstallPlan and JSON output record the selected manager; new Ombelle config persists it. Existing auto configuration remains supported. The repository itself stays on pnpm.
- npm runs through its JavaScript entry using argument arrays and no shell evaluation, with exact production dependencies, lifecycle scripts disabled, a local prefix, workspace operations disabled, and lockfile saving explicitly enabled.
- The existing source transaction and metadata preconditions also cover npm lockfiles and project .npmrc. Recovery names the selected manager and distinguishes source restoration from package state uncertainty.
- Consumer verification uses npm 11.19.0, package-lock v3, and eight standalone apps across manager × framework × family. npm ci uses committed locks. Windows local browser checks use installed Edge; CI is configured for pinned Playwright Chromium.
- Workspace-wide npm installations, npm shrinkwrap, explicit manager override flags, Yarn and Bun are later work. The exact React/ReactDOM 19.3.1 baseline remains unchanged.

## Regression evidence

Before implementation, eight of nine new cases failed because the target inspector rejected npm. The contradictory-evidence case already passed. The implemented cases then passed against the real CLI, including actual dependency installs.

An additional assertion reproduced incorrect pnpm recovery guidance for an npm failure and passed after using the plan's manager in that guidance.

Tests cover package-field/lock selection, field-only and lock-only apps, manager propagation and saved configuration, stale-lock rejection, runner independence, exact dependencies and npm lockfiles even with save=false/package-lock=false, disabled lifecycle scripts, preset reuse in a fresh process, repeated no-op addition, theme-only application without a working package manager, local edit preservation, and failure recovery.

## Integration fixture locks

29 October 2026. `createNpmProject` (tests/helpers/npm-project.ts) used to write a root-only `package-lock.json`, so each CLI `npm install` resolved the whole transitive tree live. A foundation gate run that day failed when the npm row of `bun-cross-runner.test.ts` resolved `rolldown@1.2.16`, published 61 seconds earlier, and its tarball returned 404.

The helper now copies a committed, fully resolved lock from `fixtures/npm/minimal-vite/` or `fixtures/npm/minimal-next/` and refuses to start when that lock's root entry no longer matches the fixture manifest in `tests/helpers/projects.ts`. Lifecycle scripts stay disabled and the `preinstall` marker check is unchanged. `tests/integration/npm.test.ts` also asserts that every package pinned in the fixture lock keeps its version after the CLI adds dependencies. Dependencies the CLI adds are exact, but their own transitive dependencies are still resolved from the registry at test time.

After changing the fixture manifest, regenerate both locks with Node 24.19.0 and npm 11.19.0 on PATH:

```bash
pnpm exec tsx scripts/generate-npm-test-locks.ts
```

The script runs `npm install --package-lock-only --ignore-scripts` with a fixed `--before` cutoff, so repeated runs produce byte-identical locks. Move the cutoff forward deliberately when the fixture's dependencies change, and commit the regenerated locks with the manifest change. The standalone npm consumers keep using their own committed locks in `fixtures/npm/vite/` and `fixtures/npm/next/`.

## Verification record

The complete nine-stage gate passed on clean committed source f11d0e0ea617cdb3c27523a84a03d56e4cbb9efc using Node v24.19.0, pnpm 11.25.0, npm 11.19.0, and Edge Chromium 155.0.4283.62.

- 67 unit tests passed.
- 12 integration tests passed.
- 24 browser tests passed.
- Zero failures, skips or flaky cases.
- All eight standalone consumer production builds and production dependency audits passed.
- Exact specimen screenshots, normalized DOM, computed styles and canonical hashes matched for preview, npm Vite/Next and pnpm Vite/Next consumers in both families and modes.

Command: pnpm check:foundation with OMBELLE_BROWSER_CHANNEL=msedge. [Machine-readable run](npm-consumer-run.json) records every stage, exit and duration. Later documentation-only commits preserve this result.

One fresh independent review of 1ca2399..d43ebbd identified one Important configuration issue and one Minor documentation omission. Real npm reproduced two inherited settings (dry-run=true and package-lock-only=true) reporting success with no installed dependency. Explicit false overrides corrected both; both regression cases were observed RED then GREEN. A third omit=prod control already installed the explicitly requested dependency and remains covered. The README now states and installs npm 11.19.0 before the full gate. No Critical findings were raised.

Review exclusions were retained as scoped limits: Yarn/Bun/shrinkwrap/overrides/workspace-wide operations and public publication are unsupported; hosted CI/Linux results and broader browser/screen-reader evidence are not claimed. Those decisions cost broader compatibility and certification coverage, and require later work rather than implied support. The reviewer did not rerun the shared gate; the linked final result is the implementer’s execution evidence.

## npm behavior references

The selected flags follow the official [npm install documentation](https://docs.npmjs.com/cli/v11/commands/npm-install/). Frozen consumer installation uses [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

The existing development-only shadcn/braces advisory remains documented in [foundation evidence](foundation.md); this task adds no production dependency. This is not a screen-reader certification or a claim of hosted CI execution for this branch.
