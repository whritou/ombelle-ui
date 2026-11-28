# CLI Specification

## Purpose and status

This is the specification of the Ombelle CLI as of 1.0. Every command, flag, environment variable, project file and output field below exists in `packages/cli`; nothing here is proposed. The npm package is `@ombelle-ui/cli` and its binary is `ombelle` (see the [CLI release](cli-release.md) for published versions). `npx @ombelle-ui/cli@<version> <command>` runs it; the examples below write `ombelle`.

The CLI persists a project preset, merges its theme into the app's global stylesheet, and installs reviewed component source with lock provenance. It plans every change first and applies a plan in one guarded transaction. The upstream shadcn CLI is a separate tool with its own presets; Ombelle presets, locks and commands are not upstream capabilities.

Upgrading a project installed by a 0.x CLI: see [Upgrading to 1.0](upgrading-to-1.0.md).

## Supported projects

Each version range has three bands. **Refused**: known not to work; the command fails before any write. **Tested**: the range this release was tested with; accepted silently. **Accepted, untested**: a newer major than the tested range; accepted, and every plan carries a notice. Accepted never means supported: only the tested band is.

| Area | Refused | Tested | Accepted, untested | Checked by |
| --- | --- | --- | --- | --- |
| React (`react`, `react-dom`) | 18 and older: the templates use React 19 APIs (a `ref` prop on function components). Also declarations the CLI cannot read (`latest`, `workspace:`, `catalog:`, unions). | 19.x: an exact version or a range inside 19.0.0 to below 20 (`19.3.0`, `^19.3.1`, `~19.2.0`, `19`, `19.x`). The evidence uses 19.3.1. | 20 and newer, or a range that can resolve to one (`^20`, `>=19.0.0 <21`): notice `REACT_UNTESTED_MAJOR`. Component dependencies (Radix UI, Base UI, …) may not declare that React yet, so npm can refuse their install (see [peer conflicts](#plan-and-apply)). | Every command, before any write; installed copies in `node_modules` too (an installed React older than 19 is refused). |
| Node (runs npm, pnpm, Yarn) | Below 24.19.0 | 24.19.0 to below 27 (Node 24 and 26 LTS) | 27 and newer: notice `RUNTIME_UNTESTED_MAJOR` | Dependency installs; a dry run reports an install that could not start; `doctor` |
| Bun | Below 1.4.3 | 1.4.3 to below 2, with `bun.lock` or `bun.lockb` | 2 and newer: notice `RUNTIME_UNTESTED_MAJOR` | Dependency installs, `doctor` |

| Area | Supported | Checked by |
| --- | --- | --- |
| Frameworks | Vite React TSX, or Next.js App Router TSX, with Tailwind CSS v4 (`tailwindcss` declared as 4.x). | Every command |
| Package managers | npm; pnpm; Yarn 1 and Yarn 2+ (node-modules and Plug'n'Play); Bun (ranges above). | Selection: every command. Runtime: dependency installs. |
| shadcn styles | `components.json` `style` `radix-nova`, `new-york` or no file (Radix edition); shadcn's `base-*` styles (Base UI edition). Other styles take a palette-only theme. | Every component command |
| Browsers | Chromium-tested. Safari and Firefox are untested. | Evidence only |

Workspaces (monorepo roots) and `npm-shrinkwrap.json` are refused; target the app with `--cwd`. The same matrix is printed by `ombelle --help` and checked by `ombelle doctor`.

## Commands

| Command | Writes | Behavior |
| --- | --- | --- |
| `init --preset <file\|code>` | yes | Validate the project, save the preset (`ui-preset.json`), write `ui-library.config.json` and the lock, merge the theme into the global stylesheet and write the shared `ui-style.css`. On an existing shadcn project it plans the same merge as `theme add`; it never reruns shadcn's init or resets `components.json`. On an initialized project it replaces the saved preset like `theme add`. |
| `add <component\|block...>` | yes | Install catalog components, and blocks (composed sections such as `login-01`; see [Blocks](#blocks)), mixed in one command, with the saved project preset: source, colocated CSS, usage example, the shared utility and stylesheet, and their dependencies. Requires `init`. An installed component is planned exactly as `update` plans it. |
| `add button --preset <file\|code>` | yes | Install one Button with its own preset under `<components>/presets/<id>/r<revision>/`, leaving the project preset and existing components unchanged. A registry body font in the preset is imported by the Button's scoped stylesheet and its pinned Fontsource package is installed; heading and mono fonts are ignored, since a Button shows neither. Radix edition only. |
| `add --recipe <file\|code>` | yes | Install a recipe component under `<components>/recipes/<id>/r<revision>/` with scoped CSS and a usage example. Radix edition only. |
| `update [<component\|block...>]` | yes | Refresh managed source whose catalog bytes changed (see [Managed files](#managed-files-and-updates)). Without operands: every installed component and block, the shared files, and every recipe and component-preset row. With operands: those components and blocks (a block with its components) and the shared files they use. A component or block that is not installed fails with `INVALID_DATA`. |
| `preset apply <file\|code>` | yes | Switch the project preset: the theme merge of `theme add`, plus every installed component recompiled with the new preset under the update rules, in one transaction. A style-family switch therefore restyles installed components. |
| `preset apply <file\|code> --only theme` | yes | Exactly `theme add <file\|code>`. |
| `theme add <file\|code>` | yes | Merge the preset's palette and tokens into the global stylesheet, write `ui-style.css`, and save the preset, without touching component source. A family switch with installed component styles fails with `STYLE_UNAVAILABLE` at `/styleFamily`; use `preset apply`. |
| `preset show` | no | Print the saved preset, its hash and whether it matches the lock, the catalog release and compiler version, its source code if any, and each component preset and recipe row with its source. |
| `info` | no | Print the CLI version, framework, manager, edition, shadcn style, stylesheet paths, preset, installed components with placement and state, recipes, component presets, every managed file with its state, and a count per state. |
| `doctor` | no | Check the CLI runtime, project support, the install runtime and manager, the preset against the lock, every managed file, the stylesheet import, installed components' declared dependencies, that every installed block's components are installed, and a leftover operation lock. Exits 0 when no check fails and 3 when one does; a failed project check is reported as a check, not an error. |
| `diff [<component\|block...>]` | no | Print a unified diff (project bytes against today's catalog bytes) for every managed file that is not `current`. Without operands: every managed file, including block, recipe and component-preset rows. Exits 0. |

`--help` and `-h` print the usage, every command, the options and the support matrix. `--version` prints the CLI version (with `--json`: `{ "outputVersion": 1, "command": "version", "status": "success", "version": "<x.y.z>" }`).

Examples:

```bash
ombelle init --preset ps_0123456789abcdef0123456789abcdef@1
ombelle add button dialog --dry-run
ombelle add button dialog --yes
ombelle add login-01 --dry-run
ombelle add button pricing-01 --yes
ombelle add button --preset ./brand.preset.json
ombelle add --recipe ./button.recipe.json
ombelle update --dry-run
ombelle update meter --overwrite src/components/ui/meter.tsx
ombelle update dashboard-01 --dry-run
ombelle preset apply ./minimalist.json --dry-run
ombelle theme add ps_0123456789abcdef0123456789abcdef@1
ombelle info --json
ombelle doctor
ombelle diff button
```

## Options

| Option | Commands | Meaning |
| --- | --- | --- |
| `--cwd <app>` | all | Target application directory (default: the current directory). Relative input files still resolve from the invoking directory. |
| `--dry-run` | writing commands | Plan and print; write nothing (no source, config, cache or dependency change), never run an install. |
| `--yes` | writing commands | Apply a conflict-free plan without the prompt. It never resolves a conflict, a schema error or an unsupported project. |
| `--json` | all | Print one JSON record on stdout (see [Output](#output)). It also suppresses the interactive resolution prompt. |
| `--package-manager <npm\|pnpm\|yarn\|bun>` | writing commands, `doctor` | Choose the manager when the project's evidence allows it (see [Package managers](#package-managers)). |
| `--preset <file\|code>` | `init`, `add button` | The project preset (`init`) or the component-only preset (`add button`). `theme add` and `preset apply` take the preset as an operand and refuse `--preset`. |
| `--recipe <file\|code>` | `add` | A recipe; refuses component operands and `--preset`. |
| `--overwrite <path>` | `add <components>`, `update`, `preset apply` | Replace an existing file Ombelle does not manage, or a managed file edited after install. Repeatable, one choice per path. |
| `--beside <path>` | `add <components>` | Keep an existing unmanaged component file and install Ombelle's beside it, under `<components>/ombelle/`. Repeatable. |
| `--only theme` | `preset apply` | Theme only; the only accepted value. |
| `--snapshot-origin <origin>` | inputs given as codes | Resolve codes at another service. HTTPS is required except literal loopback HTTP. |
| `--preset-hash <64 hex>` | preset codes | Expected preset hash; required with `--snapshot-origin` for presets. |
| `--recipe-hash <64 hex>` | recipe codes | Expected recipe hash; required with `--snapshot-origin` for recipes. |
| `--offline` | inputs given as codes | Use only the verified cache; requires `--snapshot-origin` and the hash. It cannot learn that a code was withdrawn later. |
| `--help`, `-h`, `--version` | — | Usage; version. |

Values may be written `--flag value` or `--flag=value`. A repeated flag (other than `--overwrite` and `--beside`), a flag without its value, an unknown flag, any other token starting with `-`, and a flag the command does not take fail with `INVALID_DATA` (exit 2) before any input is read.

## Inputs

A preset input is a local JSON file (UTF-8, regular file, at most 256 KiB) or an exact code `ps_<32 lowercase hex>@1`. A recipe input is a local file (at most 64 KiB) or `rc_<32 lowercase hex>@1`. A value that looks like a code or a URL but is not an exact code is refused; prefix a local path with `./`. Files are validated against the strict schemas in `schemas/` and their pinned catalog and compiler releases. Readers refuse FIFOs and other non-regular files without waiting.

Bare codes resolve at `https://ombelle-ui.com`. Redirects are refused and TLS verification stays on. The CLI verifies the normalized hash and supported releases before planning. A successful apply caches the verified envelope; dry runs, cancellations, conflicts and failures write no cache. Later `add` and `update` read the saved project preset and never contact the service. See [snapshot service operations](snapshot-service-operations.md).

Compatibility rule for documents: a newer Ombelle release that adds a value or a field raises the document's `schemaVersion`. `minimumCliTable`, `minimumCliForPreset` and `minimumCliForRecipe` in `@ombelle/contracts` name the first CLI that reads each document feature. Schemas are identified as `https://ombelle-ui.vercel.app/schemas/<name>-<version>.json`. These identifiers are permanent: they stay on the original domain after the move to `ombelle-ui.com`, and the site serves every schema at the same path on both domains. This CLI reads preset `schemaVersion` `1.0` and `1.1`. A document whose `schemaVersion`, enum value or field this CLI does not know fails with `UNSUPPORTED_RELEASE` (exit 3), the CLI version, the pointer, and the next action to run the newest CLI or export the document again. A `ui-library.config.json` or lock with a higher `configVersion` or `lockVersion` fails the same way.

## Plan and apply

1. Parse and check arguments; read the environment settings (`OMBELLE_DEPENDENCY_TIMEOUT_SECONDS`).
2. Resolve inputs (files or codes).
3. Inspect the project without writes: `package.json`, the single lockfile and `packageManager`, React, Tailwind, `tsconfig.json` aliases, `components.json`, the CSS entry, the config, the saved preset and the lock with all its rows.
4. Compile and plan every file change, theme declaration and dependency change; report conflicts.
5. Print the plan. A plan with a conflict exits 4 and writes nothing. `--dry-run` stops here.
6. Without `--yes`: in a terminal, ask `Apply these changes? [y/N]`; without a terminal, fail with `INVALID_DATA` (`Noninteractive writes require --yes after reviewing --dry-run`).
7. Apply in a transaction: recheck every precondition and file hash against the plan, take `.ombelle-operation.lock`, write the plan journal, replace files through temporary files and renames, run the package manager, then finalize.

Interactive resolution: in a terminal, without `--yes`, `--json` or `--dry-run`, when every diagnostic of an `add`, `update` or `preset apply` plan offers resolutions, the CLI asks per file `<path> exists and is not managed by Ombelle: [o]verwrite, [b]eside, [c]ancel` (no `[b]eside` for non-component files), or `<path> was edited after install and the catalog changed it: [o]verwrite, [c]ancel` for a managed file, re-plans with the answers, then asks to apply. Any other answer cancels without writes.

Peer conflicts: when the package manager refuses an install because of a peer dependency (npm `ERESOLVE`, pnpm `ERR_PNPM_PEER_DEP_ISSUES`, Yarn and Bun unmet-peer failures), the plan's files are restored as for any failure, and the error is `DEPENDENCY_FAILURE` naming the package, its peer range and the project's declaration, for example `npm refused the install because of a peer dependency: @radix-ui/react-slot declares peer react@"^16.8 || ^17.0 || ^18.0 || ^19.0", and the project declares react "20.0.0". The source files of this plan were restored.`, with a next action instead of the manager's raw output.

Subprocesses use argument arrays with `shell: false`; network data never becomes command text. Dependency installs pin exact versions and disable lifecycle scripts (`--ignore-scripts`, Yarn 2+ `--mode=skip-build`). The child gets `CI=true`. Declared dependencies are never downgraded or narrowed: a declaration at or above the catalog version is kept with a notice; an older one is raised and the plan shows the replaced range.

Failure and recovery: a failure, Ctrl-C, SIGTERM or SIGHUP rolls back every touched source and configuration file. The journal under `.ombelle-transactions/<id>/` and the owner record in `.ombelle-operation.lock` let the next applying command restore a transaction whose process was killed, then ask you to run your command again (see [interrupted operations](foundation-local-usage.md#interrupted-operations)). If the package manager failed after it started, the error's `recovery` says which paths were restored and whether package state (`node_modules`, the lockfile) may have changed; the CLI cannot roll back a package manager's own effects.

## Managed files and updates

The lock records, per managed file, the logical catalog path, the kind and the SHA-256 of the bytes Ombelle wrote (LF line endings; a CRLF checkout of the same bytes counts as unedited). For each file a plan touches:

| On disk | Plan |
| --- | --- |
| Missing | `create`. |
| Equal to the planned bytes | `noop` when the lock records those bytes. |
| Equal to the lock record, planned bytes differ (the catalog or the preset changed it) | `update`, with the notice `refresh <path> (unedited since install; the catalog source changed)`. |
| Different from the lock record (edited after install) | `conflict`: `<path> was edited after install; keep your version, or rerun with --overwrite <path> to replace it with the catalog source (diff shows the changes)`, with `resolutions: ["overwrite"]`. Recipe and component-preset files say `run update --overwrite <path>`. |
| Present without a lock record | `conflict`: `<path> exists and is not managed by Ombelle; rerun with --overwrite <path> or --beside <path>` (`--beside` only for component files), with `resolutions`. A `lib/utils.ts` whose bytes match the pinned shadcn output is adopted instead, with the notice `adopt <path> (generated by shadcn)`. |
| Created at a path that differs only in case from an existing directory or file | `conflict`: `Destination differs only in case from existing '<path>'; rename one of them`. |

`add` of an installed component, `update`, `add --recipe` and `add button --preset` of an installed row follow this table, so an unedited install from an earlier release takes catalog fixes and an edit is never overwritten without `--overwrite <path>`. `--overwrite` accepts only an existing unmanaged file or a managed file edited after install; `--beside` only an existing unmanaged component file. Anything else, a missing file, or a path that resolves to no planned file fails with `INVALID_DATA` before any write. Paths are relative to the app (absolute paths are made relative) and match regardless of case and separators.

`info`, `diff` and `doctor` report each managed file's state: `current`, `update-available` (unedited; the catalog changed it), `edited` (edited; the catalog did not change it), `edited-update-available`, `missing` (recorded but absent; `update` creates it again) or `not-generated` (today's catalog no longer produces it; left as it is).

A recipe or component preset whose identity changed under the same `id@revision` (preset data, scope or dark selector) conflicts: install a new revision. Revisions coexist.

The shared `ui-style.css` and the shared utility are managed files like any other; `add`, `update`, `theme add` and `preset apply` refresh them when unedited. `theme add` replaces managed theme declarations it wrote earlier; a declaration edited since conflicts (`Managed theme declaration was edited locally`). Unrelated CSS is preserved; a repeated identical theme is a no-op. Token blocks inside a top-level `@layer` are edited in place; a selector declared both inside and outside `@layer`, or twice, is refused with `UNSUPPORTED_PROJECT`.

The lock records provenance, not ownership of directories: nothing outside the planned files is ever deleted.

## Blocks

A block is a composed section built only from catalog components: `login-01` (sign-in card), `settings-01` (account settings), `pricing-01` (three plans) and `dashboard-01` (overview content area). Block ids and component ids share one namespace on the command line. Each block has its own page in [`docs/blocks/`](blocks/login-01.md). Blocks need `@ombelle-ui/cli` 1.1.0 or later.

- **Grammar.** `add` and `update` accept block ids and component ids in one command (`ombelle add button pricing-01`). `diff` accepts them too.
- **Files.** A block writes `<dirname of the components directory>/blocks/<id>.tsx` and `<id>.css`, by default `src/components/blocks/`. Its components install where they always do and the block imports them through the project alias (or from `<components>/ombelle/` for a component installed beside).
- **Lock.** Block files are managed files recorded only in the lock's `artifacts`, with `kind: "block"` and the logical path `blocks/<id>.tsx` or `.css`. The lock has no block field and `lockVersion` stays 1; installed blocks are read from those records. `info` and `diff` list the files like any other.
- **Planning.** The block's files follow the [managed file table](#managed-files-and-updates), and so do its components, with these differences:
  - A component that Ombelle installed, that you edited and that the plan reaches only through a block is kept as it is, with the notice `BLOCK_COMPONENT_EDITED` (`<path> was edited after install; <block> uses it as is`). It is not a conflict.
  - A component you named on the command line keeps the usual conflict when edited.
  - A component file that exists but is not managed by Ombelle is a conflict, as for `add <component>`; resolve it with `--overwrite <path>` or `--beside <path>`. The block never imports a foreign component silently.
  - `--beside` is refused for a block's own files. A component installed beside is used from there.
  - An edited block file conflicts with `FILE_CONFLICT`; `--overwrite <path>` replaces it with the catalog source.
- **`update`.** Without operands it refreshes installed blocks as well. `update <block>` refreshes that block and its components under the rules above.
- **`doctor`.** The `blocks` check warns, and still exits 0, when an installed block's component is not installed: `<block> needs <component>; run ombelle add <block>`, with the notice code `BLOCK_COMPONENT_MISSING`.
- **Older CLIs.** CLI 1.0 refuses `add login-01` with `UNKNOWN_COMPONENT`. In a project that has blocks, it keeps the block records when it rewrites the lock, its `doctor` warns that they are "no longer generated by the catalog" (exit 0), and its `update` leaves them alone. Use CLI 1.1 or later in such a project. `tests/integration/blocks-older-cli.test.ts` pins this; it needs registry access (`OMBELLE_REGISTRY_TESTS=1`, which `pnpm check:foundation` sets).

## Component editions and existing files

Implemented per [decision 0005](decisions/0005-base-ui-edition.md).

- **Edition.** `components.json` `style` selects the edition: `radix-nova`, `new-york` or no file → Radix; shadcn's `base-*` styles → Base UI. Other styles: `theme add`, `init` and `preset apply` apply the palette only, with the notice `Palette only: components.json style "<style>" is not one Ombelle styles, …`; component commands fail with `UNSUPPORTED_PROJECT` ``Style `<style>` isn't supported; Ombelle supports `radix-nova`, `new-york` and shadcn's `base-*` styles``. The lock records `edition` (absent means Radix). Once the lock records components, a different detected edition fails every plan with `FILE_CONFLICT`. `add --recipe` and `add button --preset` on Base UI fail with `UNSUPPORTED_PROJECT` "Recipes and component presets aren't available for Base UI yet".
- **Beside.** The component and its stylesheet go to `<components>/ombelle/`; the lock records `placements: { <id>: "beside" }`, and later `add`, `update`, `theme add` and `preset apply` keep that location. Its `data-slot` values gain the `ombelle-` prefix, and shared rules for those slots are rewritten to the prefixed values. Installing beside may update an unedited shared stylesheet in the same plan.
- **CSS entry.** `config.theme.cssEntry`, else `components.json` `tailwind.css`, else the one existing file among `src/index.css`, `src/app/globals.css` and `app/globals.css`. None or several fail with `UNSUPPORTED_PROJECT`.
- **Aliases.** The component directory comes from `components.json` `aliases.ui` (else `aliases.components`, else `@/components/ui`) resolved through exactly one `tsconfig.json` `paths` entry; ambiguous or missing aliases fail with `UNSUPPORTED_PROJECT`.

## Liquid glass

Plans that install liquid glass components carry one notice per plan: `Accessibility not guaranteed: liquid glass text contrast depends on the background behind it. Check contrast over your own backgrounds, or set design.transparency to "reduced" for opaque surfaces. See docs/components/liquid-glass.md.` (`GLASS_ACCESSIBILITY_CAVEAT`). `add`, and `preset apply` when it restyles installed components, also print `mount <LiquidGlassFilter /> from components/ui/liquid-glass-filter once in your root layout for refraction in Chromium browsers` (`GLASS_FILTER_MOUNT`), and a preset below the contrast bound adds `GLASS_CONTRAST`. Every catalog component is available in liquid glass. `theme add` from liquid glass to a stable family with installed glass component styles fails with `STYLE_UNAVAILABLE` at `/styleFamily`; `preset apply` restyles them instead. See [liquid glass](components/liquid-glass.md#cli-behaviour).

## Package managers

Selection is strict and ignores the runner's user agent. A project may have at most one recognized lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `bun.lockb`); two are refused even with `--package-manager`. Without `--package-manager`, a `packageManager` field and the lockfile must name the same manager, and a project with neither is refused. `--package-manager` must name the lockfile's manager when one exists (it may side with the lockfile against a different `packageManager` field, with a `managerWarning`), must match `packageManager` when there is no lockfile, and decides alone only when the project has neither. `ui-library.config.json` `packageManager` must be `auto` or the same manager. A refusal exits 3. The CLI never creates a foreign lockfile because it was launched with `npx`.

Running the manager: npm, pnpm and Yarn run as their JavaScript entry under a native Node executable (`OMBELLE_NODE_EXECUTABLE`, else the running Node, else `node` on `PATH`, not below 24.19.0). The entry is found from `OMBELLE_YARN_ENTRY` (Yarn), `npm_execpath`, the release `npm_config_user_agent` names in corepack's cache (so `pnpm dlx`, `pnpm exec` and `yarn dlx` work without a launcher on `PATH`), then launchers on `PATH` (`npm-cli.js`, `pnpm.cjs`, `pnpm.cmd`, corepack and Yarn shims, `#!/usr/bin/env node` scripts). A native `pnpm` binary on `PATH` (`pnpm.exe` on Windows, the standalone installer's binary elsewhere) runs directly. Bun runs as its native executable (`OMBELLE_BUN_EXECUTABLE`, else the running Bun, else `bun` on `PATH`); Bun settings that simulate, freeze or redirect installs are refused before any write.

Runners: `npx @ombelle-ui/cli@<version>`, `pnpm dlx @ombelle-ui/cli@<version>`, `yarn dlx @ombelle-ui/cli@<version>` (add `--quiet` before the package with `--json`), `bunx @ombelle-ui/cli@<version>`. The package has the single binary `ombelle`, so runners need no binary selection. For Yarn 1 projects use `npx`. A runner never switches the project's package manager.

## Project files

| File | Written by | Content |
| --- | --- | --- |
| `ui-library.config.json` | `init`, `theme add`, `preset apply` | [project-config.schema.json](../schemas/project-config.schema.json), `configVersion` 1. |
| `ui-preset.json` (`config.presetFile`) | same | The saved project preset. |
| `ui-library.lock.json` (`config.lockFile`) | every writing command | [project-lock.schema.json](../schemas/project-lock.schema.json), `lockVersion` 1. Commit it. |
| `<global CSS entry>` | `init`, `theme add`, `preset apply` | Managed `:root`, dark selector and `@theme inline` declarations, and `@import` of `ui-style.css`. |
| `<src>/styles/ui-style.css` (`config.paths.styleOutput`) | same, and `add`, `update` | Shared component rules. |
| `<components>/<id>.tsx`, `<components>/<id>.css` | `add`, `update`, `preset apply` | Component source and colocated CSS; `<components>/ombelle/` when installed beside. |
| `<src>/ombelle-examples/<id>.tsx` | same | Usage examples. |
| `<components>/presets/<id>/r<n>/button.*`, `<src>/ombelle-examples/presets/<id>/r<n>.tsx` | `add button --preset` | Component-preset Button. |
| `<components>/recipes/<id>/r<n>/*`, `<src>/ombelle-examples/recipes/<id>/r<n>.tsx` | `add --recipe` | Recipe component. |
| `<utils alias>.ts` | component commands | The shared `cn` utility. |
| `.ombelle-operation.lock` | during an apply | Owner record of the running transaction; left behind only by a killed process. |
| `.ombelle-transactions/<id>/` | during an apply | Plan journal, backups and markers for recovery; removed after success. |

## Environment variables

| Variable | Effect |
| --- | --- |
| `OMBELLE_SNAPSHOT_CACHE_DIR` | Absolute snapshot cache directory. Default: `%LOCALAPPDATA%\ombelle\cache\snapshots` (Windows; `LOCALAPPDATA` is then required), `~/Library/Caches/ombelle/snapshots` (macOS), `$XDG_CACHE_HOME/ombelle/snapshots` or `~/.cache/ombelle/snapshots` (others; `HOME`, else `USERPROFILE`). A relative value fails with `INVALID_DATA`. Read only when a code is resolved. |
| `OMBELLE_DEPENDENCY_TIMEOUT_SECONDS` | Whole seconds a dependency install may take; unset or `0` means no limit. Any other value fails with `INVALID_DATA` before planning. |
| `OMBELLE_NODE_EXECUTABLE` | Absolute path of the native Node used to run npm, pnpm or Yarn. |
| `OMBELLE_BUN_EXECUTABLE` | Absolute path of the native Bun. |
| `OMBELLE_YARN_ENTRY` | Yarn's JavaScript launcher (`yarn.js`, `yarn.cjs`, `yarn.mjs`). |
| `npm_execpath`, `npm_config_user_agent`, `COREPACK_HOME` | Manager discovery (see [Package managers](#package-managers)); `COREPACK_HOME` defaults to corepack's own default (`%LOCALAPPDATA%\node\corepack`, `$XDG_CACHE_HOME/node/corepack` or `~/.cache/node/corepack`). |
| `PATH` | Executable and launcher discovery. |
| `XDG_CONFIG_HOME` | Location of Bun's global `.bunfig.toml`, checked before Bun installs. |

`NODE_OPTIONS`, `BUN_OPTIONS` and `BUN_RUNTIME_TRANSPILER_CACHE_PATH` are removed from the environment of runtime probes.

## Output

Text output starts with `<command>: <status>`, then one `<action> <path>` line per planned file, snapshot provenance lines, `<CODE> (<path>): <message>` per diagnostic, `Notice: <message>` per notice, `Warning: <managerWarning>` and `Dependencies: name@version (replaces <range>), …`. Errors print `<CODE>: <message> (<path>)` and `Next: <next action>` on stderr.

With `--json`, stdout holds exactly one JSON record. Every record has `outputVersion` (1; a field added keeps it, a field renamed, removed or changing meaning raises it), `command` (`init`, `add`, `update`, `theme add`, `preset apply`, `preset show`, `info`, `doctor`, `diff`, `version`, or `""` when the command could not be parsed) and `status`.

Plan records (`status` `planned`, `success`, `conflict` or `cancelled`):

| Field | Content |
| --- | --- |
| `projectRoot`, `packageManager`, `bunLockfile`?, `managerWarning`? | The resolved project. |
| `presetHash`, `catalogRelease`, `compilerVersion` | The preset the plan compiled. |
| `presetResolution`?, `recipeResolution`? | `{ source: { origin, reference, presetHash \| recipeHash }, via: "network" \| "cache" }` for codes. |
| `recipe`?, `componentPreset`? | The scoped identity, `importPath`, `examplePath`, and `scopeType` (`component`, `component-only`). |
| `changes` | `[{ path, beforeHash, afterContent, kind, action }]`; `kind` is `component`, `block`, `style`, `usage`, `utility`, `theme`, `preset`, `config` or `lock` (`block` since 1.1); `action` is `create`, `update`, `noop` or `conflict`. `afterContent` is the full planned file. |
| `dependencyPlan` | `[{ name, version, current? }]`. |
| `warnings` | Diagnostics: `[{ code, message, path?, resolutions? }]`. |
| `notices` | `[{ code, message }]`; codes below. |
| `networkAccess` | Whether resolving the input used the network. |

Notice codes: `FILE_REFRESHED`, `SHADCN_UTILITY_ADOPTED`, `DEPENDENCY_KEPT`, `DEPENDENCY_RUNTIME_UNAVAILABLE` (dry run only), `REACT_UNTESTED_MAJOR`, `RUNTIME_UNTESTED_MAJOR`, `GLASS_ACCESSIBILITY_CAVEAT`, `GLASS_FILTER_MOUNT`, `GLASS_CONTRAST`, `FONT_CSS_MANUAL`, `FONT_PACKAGES_UNUSED`, `THEME_PALETTE_ONLY`, `INTERRUPTED_OPERATION`, `CATALOG_FILE_REMOVED`, `BLOCK_COMPONENT_EDITED`, `BLOCK_COMPONENT_MISSING` (also the `code` of the `blocks` doctor check when it warns), and `NOTICE` for any other text.

Report records: `preset show` adds `presetFile`, `preset`, `presetHash`, `matchesLock`, `catalogRelease`, `compilerVersion`, `source`?, `componentPresets` and `recipes`. `info` adds `cliVersion`, `initialized`, `framework`, `packageManager`, `edition`, `shadcnStyle`?, `shadcnStyleSupported`?, `cssEntry`, `componentsDirectory`, `styleFile`, `preset`?, `components` (`[{ id, placement, state }]`), `recipes`, `componentPresets`, `files` (`[{ path, kind, owner, state }]`; `kind` takes the `changes` values, so a block file is `block`) and `summary` (count per state). `diff` adds `files` (`[{ path, owner, state, diff }]`). `doctor` has `status` `success` or `failed` and `checks` (`[{ id, status: "pass" | "warn" | "fail", message, path?, nextAction?, code? }]`; `code` is set when a check carries a notice code, as `BLOCK_COMPONENT_MISSING`).

Error records: `{ outputVersion, command, status: "error", error: { code, message, path?, nextAction?, recovery? } }`, where `recovery` is `{ sourceRestored, unrestoredPaths, transactionPath, packageStateMayHaveChanged, restoredPaths?, interrupted? }`.

## Diagnostic codes and exit codes

| Code | Exit | Meaning |
| --- | --- | --- |
| — | 0 | Success, a dry run, a report, or a cancelled prompt. |
| `INTERNAL_ERROR` | 1 | Unexpected failure, including an interrupted apply after rollback. |
| `INVALID_DATA` | 2 | Invalid arguments, flags, input files, environment values or resolutions. |
| `INVALID_REFERENCE` | 2 | A malformed snapshot reference. |
| `UNKNOWN_COMPONENT` | 2 | A component or block id outside the catalog, checked before any other work; the message ("Unknown component or block: <id> (did you mean …?)", plural "Unknown components or blocks: …") suggests up to three close ids, and the next action lists the components, then the blocks. |
| `STYLE_UNAVAILABLE` | 2 | A component the preset's family cannot style, or a theme switch that would strand installed styles. |
| `UNSUPPORTED_PROJECT` | 3 | Unsupported or ambiguous project, React, framework, manager evidence, runtime or style. |
| `UNSUPPORTED_RELEASE` | 3 | A document, config or lock from a newer release, or an unsupported catalog or compiler release. |
| `FILE_CONFLICT` | 4 | A plan conflict, or a file or precondition that changed after planning. `doctor` uses exit 3 when a check fails. |
| `RESOLUTION_FAILURE` | 5 | Network, service or integrity failure resolving a code. |
| `DEPENDENCY_FAILURE` | 6 | The package manager failed or timed out; see `recovery`. |

The hosted service's HTTP error codes are documented in [snapshot service operations](snapshot-service-operations.md).

## Verification

The CLI tests live in `packages/cli/test` (planning, transactions, recovery, managers, inputs, the support matrix, the argument grammar and output) and `tests/integration` (built CLI runs, including `update-cli.test.ts` for upgrades from 0.9.x installs, `blocks-cli.test.ts` for blocks and `blocks-older-cli.test.ts` for a 1.0 CLI on a lock with blocks (it installs the 1.0 CLI from the npm registry, so the quality group needs registry access), `stock-projects-cli.test.ts` for projects as create-vite and create-next-app generate them, and `shadcn-theme-merge.test.ts` for genuine shadcn templates). Consumer and browser evidence is recorded in `docs/evidence/`; it uses Chromium only.
