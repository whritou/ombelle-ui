# Local foundation usage

Run from the Ombelle repository using the pinned Node version and pnpm for repository commands; consumer projects can use npm, pnpm, Yarn, or Bun in the documented support matrix. Build packages with pnpm build:packages first. The production CLI resolves pnpm's JavaScript entry from its launch environment or a recognized PATH shim; it reads the known script location without evaluating Windows shell text.

Commands below are local development invocations, not published package commands. Replace APP with an explicit supported Vite/Next React TSX app using Tailwind v4 and an unambiguous TS alias/global stylesheet. PRESET is an absolute path to a local preset JSON file, for example this repository's examples/preset.example.json.

```powershell
pnpm exec node packages/cli/dist/main.js init --preset PRESET --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js init --preset PRESET --cwd APP --yes
pnpm exec node packages/cli/dist/main.js add button dialog --cwd APP --yes
pnpm exec node packages/cli/dist/main.js add input --cwd APP --dry-run
pnpm exec node packages/cli/dist/main.js add input --cwd APP --yes
pnpm exec node packages/cli/dist/main.js theme add PRESET --cwd APP --dry-run
```

A theme operation updates managed CSS and saved project defaults; it never rewrites installed component source or runs dependency installation. Preset file arguments resolve relative to the invoking working directory; saved project paths resolve relative to APP. Existing shadcn configuration is preserved. The initial adapters support Radix nova/new-york component projects and palette-only application to otherwise compatible primitive editions.

Do not use --yes to resolve a conflict: it cannot bypass source or managed-token ownership checks. Review local changes and manually reconcile them. On failure, read the reported transaction recovery.json. Source restoration and package-manager dependency/cache state are reported separately; retain backups until the project is repaired. Dependency additions run with lifecycle scripts disabled.

Scope: three components; flat/minimalist/neo brutalism; the documented npm/pnpm/Yarn/Bun foundation matrix. No public package, registry endpoint, interactive editor, snapshot service, or native support is provided by this foundation. The full twelve-component stable matrix remains alpha work. The development-only upstream registry probe has an acknowledged unpatched braces advisory documented in decisions/0002-registry-adapter.md.

The complete verified support matrix and test evidence are in [foundation evidence](evidence/foundation.md). Planning networkAccess refers to local artifact resolution; dependencyPlan lists package operations that may contact the npm registry. No dry-run runs those operations.

The verified consumer baseline requires exact react and react-dom 19.3.1 declarations; older versions, mismatched renderers and version ranges are rejected before writes. Set a custom component destination together with a matching components.json aliases.ui mapping through tsconfig paths. Managed CSS ownership includes !important priority; legacy lock records without priority mean false, so any modifier change conflicts.

Consumer manager selection uses package.json.packageManager, then a unique recognized package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lock, or bun.lockb. Contradictory evidence requires explicit selection; workspaces and npm-shrinkwrap remain unsupported. The launching runner does not switch the target manager. New config saves the selected manager; existing auto remains valid. Dependency additions use exact production requirements with lifecycle scripts disabled and preserve the manager's lock format. Theme-only commands never invoke a dependency manager. The repository itself continues to use pnpm. See the README and individual manager evidence for exact versions and linker/runtime boundaries.

## Component-scoped Button presets

Initialize APP with a saved project preset, then select a local JSON preset for one separate Button installation:

```powershell
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --yes
```

The preset path resolves relative to the invoking directory, independently of APP. The file must be regular UTF-8 JSON, at most 256 KiB, and satisfy the strict preset schema and pinned catalog/compiler releases. Import the generated usage example's Button path (for the example preset this is under `@/components/ui/presets/`); it points to a separate generated Button with colocated CSS. The ordinary Button and saved global preset stay unchanged, and later ordinary `add` operations use project defaults. Scoped styling does not merge into the global stylesheet.

An identical repeat is a no-op. An unowned existing destination, edited generated file, changed preset identity/revision or dark selector, or incompatible shared utility conflicts. Review and reconcile the local file or create a new preset revision; `--yes` cannot bypass that check. The command rejects multiple components and cannot be combined with `--recipe`. It follows the project's manager and lockfile selection described above, preserving npm, pnpm, Yarn or Bun ownership. With the example preset and default aliases, the generated import path is `@/components/ui/presets/builtin-neo-brutalism/r1/button`.

The current slice covers flat, minimalist, and neo-brutalism Button styles in supported Vite/Next.js React TSX apps using Tailwind v4 and Radix nova/new-york. Styles come from the typed preset schema; arbitrary CSS overrides are not accepted. Button does not use a portal. Dialog, other portal-rendered components, editor workflows, and remote/saved-code resolution are outside this implementation. See [component-scoped Button evidence](evidence/component-scoped-button-presets.md) for measured manager and browser coverage.

## Local Button recipes

Initialize the project with a local preset first, then use a recipe file such as this repository's `examples/recipe.example.json`:

```powershell
pnpm exec node packages/cli/dist/main.js add --recipe ./examples/recipe.example.json --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add --recipe ./examples/recipe.example.json --cwd APP --yes
```

The file path resolves relative to the invoking directory, independently of APP. Input must be a regular UTF-8 JSON file no larger than 64 KiB and match the strict recipe schema. Built-in preset IDs and revision 1 must match catalog/compiler 0.1.0 exactly; remote recipe codes and accompanying preset bundles are not accepted.

The example creates `<componentsDir>/recipes/rc_primary-button/r2/button.tsx` and its colocated `button.css`, plus `<sourceDir>/ombelle-examples/recipes/rc_primary-button/r2.tsx`. Use the generated example's import path (normally `@/components/ui/recipes/rc_primary-button/r2/button`) to import `RecipeButton`. The component imports its CSS automatically; no global stylesheet edit is needed. Saved props/content become defaults. Loading keeps its visible label, exposes busy state, and disables activation. The recipe API uses a native button and does not support `asChild`.

Recipe installation preserves the saved global preset, theme, style pack, ordinary components, and existing usages. A recorded shared utility can be reused only if unchanged and byte-compatible; an untracked or edited utility causes a conflict requiring manual reconciliation. `--yes` does not override conflicts. Repeating the same recipe is a no-op when its files and dependencies still match. Changed content under the same ID/revision conflicts; use a new revision to install alongside it. Later ordinary additions and compatible global theme changes retain recipe provenance and its pinned appearance.

Dark mode follows the project's configured single class, default `.dark`; `.night` and `.theme-dark` also work. Complex selectors and custom `paths.recipeOutput` roots are outside this slice. A dark-selector change affecting an existing recipe requires an explicit migration. Parent workspace ownership, paths, dependencies, and failure/recovery use the existing installer safeguards. Component-scoped local preset installation is documented above; remote preset/recipe codes remain pending.
