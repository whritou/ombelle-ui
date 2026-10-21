# Project instructions

## Repository map

- `packages/contracts` defines schemas, shared types, and validation.
- `packages/catalog` contains reviewed component templates, styles, and built-in presets.
- `packages/compiler` resolves presets and compiles deterministic component artifacts.
- `packages/cli` inspects projects, plans changes, and applies guarded file and dependency operations.
- `apps/preview` and `fixtures/` exercise generated components; `scripts/` builds packages, prepares consumers, and runs the full verification gate.
- `docs/` contains product requirements, contracts, CLI behavior, decisions, local usage, and measured evidence. Follow the implementation status in the docs; proposed public commands may not exist in the local CLI.

## Toolchain and common commands

- Use the versions pinned in `.node-version` and the root `package.json`: Node 24.19.0 and pnpm 11.25.0.
- Install repository dependencies with `pnpm install --frozen-lockfile --ignore-scripts`.
- Run `pnpm build:packages` after changing package sources and before testing built CLI or consumer behavior. It regenerates schemas and the catalog before building packages.
- Run `pnpm typecheck` for TypeScript checks, `pnpm test:unit` for package tests, and `pnpm test:integration` for CLI, manager, and consumer integration tests.
- For focused tests, use `pnpm exec vitest run <test-file>`. When a test imports package `dist` output, build packages first.
- `pnpm check:foundation` is the complete evidence gate. It needs registry access and the documented npm, Yarn, Bun, and browser toolchain, and it builds 34 standalone consumers. Consult the README before running it; CI uses bundled Chromium.
- For preview work, run `pnpm build:packages`, `pnpm generate:preview`, then `pnpm dev:preview`.

## Source and generated files

- Edit source schemas in `schemas/`, not their generated TypeScript copies in `packages/contracts/src/`.
- Edit catalog inputs in `packages/catalog/src/templates/`, `styles/`, and `presets/`, not `packages/catalog/src/generated.ts`.
- `pnpm build:packages` runs the schema and catalog generators. Review generated changes alongside their source changes.
- The repository uses TypeScript and JavaScript ES modules. Keep relative TypeScript imports compatible with the existing `.js` import specifiers and package exports.
- Keep compiler output deterministic and update focused tests when changing schemas, resolution, generated artifacts, or installer behavior.

## Installer safety and scope

- Keep planning separate from applying file changes. Preserve dry-run behavior and the transaction safeguards for conflicts, stale plans, and recovery.
- `--yes` accepts a safe plan; it does not bypass schema, compatibility, or modified-file conflicts. Dependency installs disable lifecycle scripts.
- Keep component-scoped recipes and styles isolated from saved global project defaults and existing component source unless the documented contract explicitly says otherwise.
- The private local CLI supports `init`, `add`, `theme add`, and local Button `add --recipe`. Check current documentation before assuming proposed public flags or remote registry behavior are implemented.
- Keep verification claims tied to the recorded environment and evidence. The consumer matrix separates browser-tested npm/pnpm apps from Yarn/Bun build and audit checks.

## Git naming

- Use Conventional Commits: `type(scope): description`, with an optional scope.
- Use the appropriate type, such as `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, or `revert`.
- Name branches `type/short-kebab-case-description`, using the type that describes the work. For example, `feat/local-button-recipes` or `docs/preset-scope`.
- Do not use a `codex/` branch prefix or add a `codex` prefix to commit messages.
- Commit completed features, fixes, and documentation changes with the appropriate Conventional Commit type.

## Cloudflare

When interacting with Cloudflare, use the `cf` CLI unless the project has a Wrangler configuration file.
