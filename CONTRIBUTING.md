# Contributing to Ombelle UI

Thanks for helping. This guide covers how to set up the repository, what we expect in a pull request, and how changes are reviewed. Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- **Bugs and small fixes:** open a pull request directly, or file an issue first if the cause is unclear.
- **New components, styles, presets, CLI flags or contract changes:** open an issue or a [Discussion](https://github.com/whritou/ombelle-ui/discussions/categories/ideas) first so the scope can be agreed before you write code. Several public commands in the docs are proposals; check [`docs/`](docs/) for the implementation status.
- **Security problems:** do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## Setup

Use the versions pinned in `.node-version` (Node 24.19.0) and the root `package.json` (pnpm 11.25.0).

```bash
corepack enable
pnpm install --frozen-lockfile --ignore-scripts
pnpm build:packages
```

Common commands:

```bash
pnpm typecheck                              # TypeScript
pnpm test:unit                              # package tests
pnpm test:integration                       # CLI, manager and consumer tests
pnpm exec vitest run <test-file>            # one test file (build packages first if it imports dist)
pnpm generate:preview && pnpm dev:preview   # preview app
```

`pnpm check:foundation` is the full evidence gate. It needs registry access, Yarn, Bun and a browser toolchain, so you do not need to run it. CI runs the fast checks on every pull request.

## Where to change things

- Edit source schemas in `schemas/`, not their generated copies in `packages/contracts/src/`.
- Edit catalog inputs in `packages/catalog/src/templates/`, `styles/` and `presets/`, not `packages/catalog/src/generated.ts`.
- `pnpm build:packages` runs the generators. Commit generated changes together with their sources.
- Keep compiler output deterministic. Update the focused tests when you change schemas, resolution, generated artifacts or installer behaviour.
- Keep planning separate from applying file changes in the CLI, and preserve dry-run behaviour and transaction safeguards.
- Keep relative TypeScript imports compatible with the existing `.js` import specifiers.

See [AGENTS.md](AGENTS.md) for the repository map and the same rules in more detail.

## Pull requests

1. Fork the repository and branch from `main`. Name the branch `type/short-kebab-case-description`, for example `feat/local-button-recipes` or `docs/preset-scope`.
2. Make focused changes with tests. A bug fix should include a test that fails without it.
3. Run `pnpm build:packages`, `pnpm typecheck` and the tests for the area you changed.
4. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and the pull request title: `type(scope): description`. Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, `revert`.
5. Fill in the pull request template and link the issue it closes.
6. Pull requests are squash-merged, so the title becomes the commit message on `main`.

A pull request needs the `verify` check to pass and an approving review from a maintainer. Conversations must be resolved before merge.

Keep verification claims tied to evidence you actually ran, and say what you did not run.

## Accessibility and visual changes

Components must stay keyboard and screen-reader usable. For catalog style or template changes, run the specimen audit for the components you touched (`pnpm build:packages`, `pnpm generate:preview`, then `pnpm test:specimen-audit`) and describe the result in the pull request.

## License

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE). We do not require a CLA. Signing off commits (`git commit -s`) to certify the [Developer Certificate of Origin](https://developercertificate.org/) is encouraged, not required.
