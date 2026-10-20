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

## Verification record

The final committed-source gate and review outcome will be recorded here after completion.

## npm behavior references

The selected flags follow the official [npm install documentation](https://docs.npmjs.com/cli/v11/commands/npm-install/). Frozen consumer installation uses [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

The existing development-only shadcn/braces advisory remains documented in [foundation evidence](foundation.md); this task adds no production dependency. This is not a screen-reader certification or a claim of hosted CI execution for this branch.
