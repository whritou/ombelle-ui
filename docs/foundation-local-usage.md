# Local foundation usage

Run from the Ombelle repository using the pinned Node version and pnpm for repository commands; consumer projects can use npm or pnpm. Build packages with pnpm build:packages first. The production CLI resolves pnpm's JavaScript entry from its launch environment or a recognized PATH shim; it reads the known script location without evaluating Windows shell text.

Commands below are local development invocations, not published package commands. Replace APP with an explicit supported npm/pnpm Vite/Next React TSX app using Tailwind v4 and an unambiguous TS alias/global stylesheet. PRESET is an absolute path to a local preset JSON file, for example this repository's examples/preset.example.json.

~~~powershell
pnpm exec node packages/cli/dist/main.js init --preset PRESET --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js init --preset PRESET --cwd APP --yes
pnpm exec node packages/cli/dist/main.js add button dialog --cwd APP --yes
pnpm exec node packages/cli/dist/main.js add input --cwd APP --dry-run
pnpm exec node packages/cli/dist/main.js add input --cwd APP --yes
pnpm exec node packages/cli/dist/main.js theme add PRESET --cwd APP --dry-run
~~~

A theme operation updates managed CSS and saved project defaults; it never rewrites installed component source or runs dependency installation. Preset file arguments resolve relative to the invoking working directory; saved project paths resolve relative to APP. Existing shadcn configuration is preserved. The initial adapters support Radix nova/new-york component projects and palette-only application to otherwise compatible primitive editions.

Do not use --yes to resolve a conflict: it cannot bypass source or managed-token ownership checks. Review local changes and manually reconcile them. On failure, read the reported transaction recovery.json. Source restoration and package-manager dependency/cache state are reported separately; retain backups until the project is repaired. Dependency additions run with lifecycle scripts disabled.

Scope: three components; flat/neo brutalism; npm and pnpm supported. No public package, registry endpoint, interactive editor, snapshot service, or native support is provided by this foundation. Yarn/Bun and the full stable style/component matrix remain alpha requirements. The development-only upstream registry probe has an acknowledged unpatched braces advisory documented in decisions/0002-registry-adapter.md.

The complete verified support matrix and test evidence are in [foundation evidence](evidence/foundation.md). Planning networkAccess refers to local artifact resolution; dependencyPlan lists package operations that may contact the npm registry. No dry-run runs those operations.

The verified consumer baseline requires exact react and react-dom 19.3.1 declarations; older versions, mismatched renderers and version ranges are rejected before writes. Set a custom component destination together with a matching components.json aliases.ui mapping through tsconfig paths. Managed CSS ownership includes !important priority; legacy lock records without priority mean false, so any modifier change conflicts.

Consumer manager selection uses package.json.packageManager, then a unique package-lock.json or pnpm-lock.yaml. Contradictory or unsupported lockfiles are rejected. The launching runner does not switch the target manager. New config saves the selected manager; existing auto remains valid. npm additions use exact production dependencies and retain package-lock.json even when local npm settings disable saving; lifecycle scripts are disabled. Theme-only commands never invoke npm. npm 11.19.0 and package-lock v3 are the verified npm baseline. npm-shrinkwrap, Yarn, Bun and workspace-wide installation are outside this slice. The repository itself continues to use pnpm.
