# Local foundation usage

Run from the Ombelle repository using the pinned Node version and pnpm. Build packages with pnpm build:packages first. The production CLI resolves pnpm's JavaScript entry from its launch environment or a recognized PATH shim; it reads the known script location without evaluating Windows shell text.

Commands below are local development invocations, not published package commands. Replace APP with an explicit supported pnpm Vite/Next React TSX app using Tailwind v4 and an unambiguous TS alias/global stylesheet. PRESET is an absolute path to a local preset JSON file, for example this repository's examples/preset.example.json.

~~~powershell
pnpm exec node packages/cli/dist/main.js init --preset PRESET --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js init --preset PRESET --cwd APP --yes
pnpm exec node packages/cli/dist/main.js add button dialog --cwd APP --yes
pnpm exec node packages/cli/dist/main.js add input --cwd APP --dry-run
pnpm exec node packages/cli/dist/main.js add input --cwd APP --yes
pnpm exec node packages/cli/dist/main.js theme add PRESET --cwd APP --dry-run
~~~

A theme operation updates managed CSS and saved project defaults; it never rewrites installed component source or runs dependency installation. Preset file arguments resolve relative to the invoking working directory; saved project paths resolve relative to APP. Existing shadcn configuration is preserved. The initial adapters support Radix nova/new-york component projects and palette-only application to otherwise compatible primitive editions.

Do not use --yes to resolve a conflict: it cannot bypass source or managed-token ownership checks. Review local changes and manually reconcile them. On failure, read the reported transaction recovery.json. Source restoration and pnpm dependency/cache state are reported separately; retain backups until the project is repaired. Dependency additions run with lifecycle scripts disabled.

Scope: three components; flat/neo brutalism; pnpm verified first. No public package, registry endpoint, interactive editor, snapshot service, or native support is provided by this foundation. npm/Yarn/Bun and the full stable style/component matrix remain alpha requirements. The development-only upstream registry probe has an acknowledged unpatched braces advisory documented in decisions/0002-registry-adapter.md.

The complete verified support matrix and test evidence are in [foundation evidence](evidence/foundation.md). Planning networkAccess refers to local artifact resolution; dependencyPlan lists package operations that may contact the npm registry. No dry-run runs those operations.
