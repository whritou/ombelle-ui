# Project instructions

## Git naming

- Use Conventional Commits: `type(scope): description`, with an optional scope.
- Use the appropriate type, such as `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, or `revert`.
- Name branches `type/short-kebab-case-description`, using the type that describes the work. For example, `feat/local-button-recipes` or `docs/preset-scope`.
- Do not use a `codex/` branch prefix or add a `codex` prefix to commit messages.
- Commit completed features, fixes, and documentation changes with the appropriate Conventional Commit type.

## Cloudflare

When interacting with Cloudflare, use the `cf` CLI unless the project has a Wrangler configuration file.
