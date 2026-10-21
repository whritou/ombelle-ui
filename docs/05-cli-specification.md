# CLI Specification

## Purpose and status

The product CLI persists project defaults and installs exact component or recipe artifacts. This is the proposed public interface. `@your-ui/cli`, its versions, registry URLs, and IDs are placeholders; published runner commands remain unavailable. The private local foundation implements `init`, ordinary `add`, `theme add` with local presets, and `add --recipe` with local Button recipes. See [local usage](foundation-local-usage.md) for executable repository commands.

The upstream shadcn CLI remains a supported transport for explicitly published standard registry items. It has its own preset system. Our preset JSON and project lock behavior must not be presented as upstream capabilities.

## Proposed commands

```bash
# Initialize a supported existing application from a local preset.
npx @your-ui/cli@0.1.0 init --preset ./ui-preset.json

# Read the saved project preset automatically.
npx @your-ui/cli@0.1.0 add button dialog

# Use a saved preset for this Button only; preserve project defaults.
npx @your-ui/cli@0.1.0 add button --preset ps_brand@3

# A downloaded preset is also a supported planned input.
npx @your-ui/cli@0.1.0 add button --preset ./brand.preset.json

# Inspect changes without writing source, config, cache, or dependencies.
npx @your-ui/cli@0.1.0 add input --dry-run

# Apply a versioned preset from the website; inspect the planned changes.
npx @your-ui/cli@0.1.0 preset apply ps_brand@3 --dry-run
npx @your-ui/cli@0.1.0 preset apply ps_brand@3

# shadcn already initialized: merge styling into its global stylesheet.
npx @your-ui/cli@0.1.0 theme add ps_brand@3

# Install one customized component without replacing global defaults.
npx @your-ui/cli@0.1.0 add --recipe rc_primary-button@2

# Use the local recipe exported by the editor.
npx @your-ui/cli@0.1.0 add --recipe ./button.recipe.json

# Inspect project state and check compatibility.
npx @your-ui/cli@0.1.0 info --json
npx @your-ui/cli@0.1.0 doctor

# Show upstream changes; updates arrive after the initial vertical slice.
npx @your-ui/cli@0.1.0 diff button
```

`init` prepares configuration and theme integration; it does not scaffold a complete application. Recipe IDs are distinguished from local files using explicit parsing, not arbitrary remote URL execution. Support registry URLs only through a reviewed registry configuration.

## Command semantics

| Command                                   | Behavior                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`                                    | Detect project, select or resolve preset, plan config and CSS integration, write on confirmation                                                        |
| `add <items>`                             | Resolve exact catalog entries against saved project defaults and install required files                                                                 |
| `add <component> --preset <code-or-file>` | Install one component with an explicitly selected, isolated preset; preserve project-wide defaults                                                      |
| `add --recipe`                            | Install the recipe's base component, scoped CSS, pinned token scope, and example usage                                                                  |
| `preset show`                             | Print the locally resolved preset and provenance                                                                                                        |
| `preset apply`                            | Resolve a new preset, report effects on existing components, update compatible generated files                                                          |
| `theme add <preset>`                      | Alias of `preset apply <preset> --only theme`; merge palette and tokens into existing global CSS and persist the preset without reinstalling components |
| `info`                                    | Read configuration, installed artifacts and compatibility status without changes                                                                        |
| `doctor`                                  | Diagnose versions, aliases, missing imports, modified files, dependency and hash issues                                                                 |
| `diff`                                    | Compare local source with a selected pinned catalog release without writes                                                                              |
| `update`                                  | Later explicit migration workflow; never a background automatic update                                                                                  |

Common flags are `--cwd`, `--dry-run`, `--json`, `--package-manager <npm|pnpm|yarn|bun>`, and `--yes` where applicable. The Bun foundation target is exactly 1.4.3. `preset apply` also supports `--only theme`. `--yes` accepts an already safe plan; it never enables overwriting modified files or bypassing schema and compatibility errors. Do not provide a broad force flag in alpha.

`--preset` takes a saved preset code or local JSON path as its value; codes never become flag names. On `init` it establishes project defaults; on `add` it applies only to the requested component. `theme add <code-or-file>` remains the global theme installation path. Recipe inputs use `--recipe` because they additionally carry a component identity, props, text, and overrides. Local files remain a supported product workflow alongside published identifiers.

Component-scoped preset selection initially targets one Button per command. Reject multiple components or simultaneous `--preset` and `--recipe`. Resolve and pin the exact preset, generate isolated light/dark styling and usage, and record scoped provenance without modifying the saved global preset or restyling existing components. Reuse compatible base source or stop with a conflict; never silently replace shared source. See [component-scoped preset selection](04-presets-and-contracts.md#component-scoped-preset-selection) for the full scope and persistence contract.

Implementation status: the current foundation rejects `--preset` on `add`. Local Button recipe files referencing exact built-in presets are implemented through `add --recipe <local.json>`. Component-scoped preset selection and remote preset/recipe code resolution remain requirements for future implementation. The recipe API creates a separate native `RecipeButton`; it preserves ordinary source and global defaults.

The proposed dry-run is stricter than an ordinary installation: it performs no filesystem writes, even to a project cache, and never invokes the package manager. It may fetch public manifests in memory. Document network access in machine-readable output.

## Supported projects

The current foundation implements Vite React TSX and Next.js App Router TSX using Tailwind v4. Its consumer gate covers npm, pnpm, Yarn Classic 1.22.22, modern Yarn 4.18.1 with both linkers, and Bun 1.4.3 with bun.lock/bun.lockb under Node/Bun CLI runtimes. Consumer framework builds use Node. Component source uses the selected Radix-based shadcn edition. A palette-only theme merge can work with other shadcn primitive editions when their token format and CSS baseline are compatible; do not reject that operation solely because the primitive family differs. JSX conversion remains a beta gate.

The npm package has one `your-ui` binary. The package-runner recipes are documented for npm, pnpm, modern Yarn and Bun; Yarn and Bun examples explicitly select the binary because it differs from the unscoped package name `cli`. Test Bun with its own runtime and Yarn with both node-modules and Plug'n'Play. Provide a local-install route for Yarn Classic.

Determine the project manager from an explicit flag, then a valid `packageManager` field, then a unique recognized lockfile. Use the launcher's user agent only when project evidence is absent. Conflicting evidence requires an explicit selection. Never create `package-lock.json` in a pnpm or Yarn project simply because the CLI was launched with `npx`.

See [Installation and theme merging](10-installation-and-theme-merging.md) for runner commands, package manager rules and the CSS merge contract.

Inspect `package.json`, the package manager lockfile, TS or JS config, CSS entry, and `components.json`. If multiple lockfiles, app roots, CSS entries, or ambiguous aliases exist, request an explicit `--cwd` or config path. Never guess across workspace boundaries. Monorepo support starts with an explicitly targeted app or shared UI package.

For an existing shadcn project, preserve its aliases and upstream style settings. Detect component-name collisions and primitive-family differences. Propose adopting a compatible existing component only after verifying its contract; otherwise fail with a path and migration explanation.

If `components.json` already exists, the existing-project path is `theme add`. If a user runs `init` anyway, detect the setup before writes and route them to the same theme plan rather than rerunning upstream initialization. Never reset `components.json` or reinstall existing UI components as part of a theme-only application.

## Installation sequence

1. Detect project and read configuration without mutation.
2. Validate local preset, lockfile, and target platform.
3. Fetch or reuse exact reviewed catalog and snapshot data; check hashes and compatibility.
4. Resolve dependencies, detect cycles, and compile exact output.
5. Apply project alias and path transformations in staging.
6. Inspect target paths, symlinks, existing hashes, managed CSS imports, and dependencies.
7. Show a complete plan listing creates, updates, no-ops, conflicts, package changes, and warnings.
8. Recheck preconditions and acquire a project installation lock immediately before commit.
9. Snapshot only files being changed; write through temporary files and safe renames.
10. Run the selected package manager operation when dependencies require it.
11. Finalize artifact hashes and project lock state, then report imports and usage.

Use argument arrays with `shell: false` for subprocesses. Network-derived metadata must never become executable command text. Test concurrent installation attempts; the second operation must fail or wait without interleaving writes.

## Conflicts and ownership

If a generated file matches its recorded hash, it can be replaced only when the user requested a relevant update or preset change. A repeated `add` for an identical artifact is a no-op. If a file exists without provenance, or its hash changed, report a conflict and do not overwrite it.

Offer a diff and an alternate output or manual migration route. Do not append duplicate imports or reinitialize `components.json`. Compare the current files against the plan again before committing to catch edits made after preview.

Existing `globals.css` is not treated as an untracked generated component file. A deliberately requested theme merge may add or replace the named palette and token declarations after showing their before and after values. Preserve all unrelated CSS. On later runs, locally edited managed tokens require explicit conflict resolution; unrelated stylesheet edits are allowed. A repeated identical theme application is a no-op.

The lockfile records provenance, not ownership of all files in a directory. Removing a component or rolling back an installation must never delete unrelated application files.

## Failure and recovery

Roll back touched source and configuration files if generation or writes fail before completion. Preserve the backup and transaction record until success. If package installation fails, report exactly which source and lockfile changes were restored and whether the package manager state may need repair.

A package manager may modify its cache, `node_modules`, lockfile, or run dependency lifecycle scripts. The CLI cannot promise full transactional rollback of those external effects. In this case return a distinct recovery error and actionable commands for the chosen manager. Do not print success simply because component files were copied.

## Output contract

Machine-readable output includes `command`, `status`, `projectRoot`, `presetHash`, `catalogRelease`, `compilerVersion`, `changes`, `dependencyPlan`, `warnings`, and stable error codes. Error records include code, message, affected path or JSON pointer, and suggested next action. Redact credentials and local secrets.

| Exit code | Meaning                                            |
| --------- | -------------------------------------------------- |
| 0         | Success or valid dry-run with no blocking conflict |
| 1         | Unexpected internal failure                        |
| 2         | Invalid arguments or invalid data                  |
| 3         | Unsupported or ambiguous project configuration     |
| 4         | File conflict or precondition changed              |
| 5         | Resolution, network, or integrity failure          |
| 6         | Package installation failure or recovery required  |

## Standard shadcn path

After a standard registry item is published, a command of this form uses the upstream CLI:

```bash
npx shadcn@latest add https://ui.example.com/r/0.1.0/button-flat.json
```

The URL is illustrative. For reproducible production instructions, replace `latest` with the exact tested shadcn CLI release. A namespaced registry uses a valid `components.json` registry fragment such as the supplied example.

A plain registry item must include or reference all required utility, theme, and style artifacts. It must not assume the custom CLI already created them. The sample item in this documentation is a minimal schema illustration, not the complete production bundle.

For existing-project styling, publish a `registry:theme` item separately and install it through `shadcn add <theme-url>`. The upstream CLI supplies the standard theme transport; persistent custom preset state and our detailed merge safeguards remain the product CLI's responsibility. Do not confuse our preset IDs with upstream shadcn preset codes.

## Required CLI tests

For component-scoped presets, verify saved-code and local-file resolution, unknown revision/integrity failures before writes, strict flag validation, isolated light/dark tokens, unchanged global preset/theme and neighboring components, later ordinary additions using project defaults, repeated no-op installation, compatible source reuse, incompatible or edited source conflicts, and preview/export/install parity. Cover the declared framework and four-manager matrix; do not claim portal support without explicit scope-propagation tests.

Verify clean installation, repeated no-op addition, saved preset reuse across processes, Next.js client boundaries, alias rewriting, unsupported configuration rejection, dependency deduplication, locally edited component conflict, traversal and symlink rejection, concurrent writes, network and package manager failure, dry-run non-mutation, interrupted-write recovery, and preview versus install parity. The foundation gate covers npm, pnpm, Yarn Classic/modern linkers, and Bun 1.4.3. Bun checks include native executable discovery, actual CLI runtime identity, binary-byte metadata preconditions, configuration rejection, and real installed-package verification. It rejects workspace ownership and incompatible Bun settings before source writes; package-state rollback after dependency failure is not promised.

Also test existing-shadcn theme merging with custom CSS, custom stylesheet paths, light and dark declarations, nested layers, existing Tailwind mappings, duplicate or ambiguous token definitions, locally edited tokens, repeated application and rollback. Verify no source reinstall, no reinitialization, no unnecessary dependency command and no foreign lockfile, including cross-runner launches.
