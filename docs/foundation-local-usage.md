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

The supported project baseline is Vite React TSX or Next.js App Router TSX using Tailwind v4 and the supported Radix nova/new-york component editions. Initialize the project first, then install one Button from a local preset JSON:

```powershell
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --yes
```

The path resolves relative to the invoking directory, independently of APP. Input must be a regular UTF-8 JSON file at most 256 KiB and pass the strict preset schema. Flat, minimalist, and neo brutalism are available with exact catalog/compiler 0.1.0; valid local preset design, light/dark token, and Button variant/size defaults are compiled. Saved codes, URLs, remote resolution, unsupported releases/families, multiple components, `add input --preset`, repeated flags, and simultaneous `--recipe` are rejected.

For the example preset, `id: "builtin-neo-brutalism"` and `revision: 1`, installation creates `<componentsDir>/presets/builtin-neo-brutalism/r1/button.tsx` and `button.css`, plus `<sourceDir>/ombelle-examples/presets/builtin-neo-brutalism/r1.tsx`. Follow the generated example's import path:

```tsx
import { Button as BrandButton } from '@/components/ui/presets/builtin-neo-brutalism/r1/button'

export function SaveAction() {
  return <BrandButton>Save</BrandButton>
}
```

The exported `Button` is a separate native button with variant/size props and native `disabled`/`aria-busy` props. It has no recipe `loading` prop or `asChild` API. Its import loads colocated scoped CSS; installing it does not edit the global stylesheet or existing usages. Scope attributes and slot identity are emitted after caller props. Project preset/configuration, global tokens/style pack, ordinary Button/Input/Dialog, and existing recipes retain their defaults and source. The project lock adds `componentPresets` provenance; canonical compiler hashes and alias-transformed installed hashes are distinct. Later ordinary additions and compatible global theme changes retain the scoped preset's pinned appearance.

An identical repeat is a no-op when installed source and dependencies match. Changed content under the same ID/revision, changed dark context, modified or untracked destination files, incompatible shared utility bytes, and invalid saved global provenance cause conflicts; `--yes` cannot bypass them. Use a new preset revision for coexistence or reconcile/migrate explicitly. Shared utilities are reused only with matching recorded ownership and bytes. Dry-run performs no file or dependency operations. Actual dependency changes use the target manager with lifecycle scripts disabled and existing transaction/recovery safeguards; the command does not change manager or lockfile format. Workspaces remain unsupported. Bun retains its documented dependency-group and configuration restrictions.

Dark mode uses the configured single class (`.dark` by default; classes such as `.night` and `.theme-dark` are supported) on the element or an ancestor. The full browser matrix uses `.dark`; compiler checks cover custom `.night`. Complex selectors, nested independently themed subtrees, arbitrary consumer CSS/style overrides, portal propagation, other component types, remote preset codes, and the production editor remain outside this local Button guarantee. Measured browser coverage is preview plus npm/pnpm Vite/Next.js; Yarn/Bun have installation, source, audit, and production-build evidence. See [the retained run](evidence/component-scoped-button-presets.md).

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
