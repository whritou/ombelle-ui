# Installation and Theme Merging

## Mandatory first release behavior

Support npm, pnpm, Yarn and Bun from alpha. Offer two clear website paths: initialize a new setup, or add styling to a project where shadcn is already initialized. The existing-project path merges palette and token values into the configured global stylesheet without rerunning shadcn initialization or reinstalling component source.

Implementation status for this foundation: npm, pnpm, Yarn Classic 1.22.22, modern Yarn 4.18.1, and Bun 1.4.3 have consumer coverage. Modern Yarn covers both linkers. Bun covers Vite/Next.js with text/binary lockfiles and the built CLI under Node/Bun; framework builds remain on Node. These are local private CLI routes; the illustrative published package commands below remain proposed.

Website copy: “If you already initialized shadcn, add the styling to the project instead. This command merges the palette and tokens into your globals.css.”

The examples below are proposed product commands. The namespace, package, preset ID and version are placeholders. Pin a tested CLI version and an immutable preset revision in generated production commands.

## Commands for an existing shadcn project

| Package runner | Command |
| --- | --- |
| npm | `npx @your-ui/cli@0.1.0 theme add ps_brand@3` |
| pnpm | `pnpm dlx @your-ui/cli@0.1.0 theme add ps_brand@3` |
| Yarn modern | `yarn dlx --package @your-ui/cli@0.1.0 your-ui theme add ps_brand@3` |
| Bun | `bunx --bun --package @your-ui/cli@0.1.0 your-ui theme add ps_brand@3` |

The package exposes a single binary named `your-ui`. Explicit package selection in the Yarn and Bun examples avoids relying on the binary being named `cli`. Bun's `--bun` flag deliberately exercises its runtime; the CLI must be tested under both Node and Bun.

Yarn Classic does not supply the modern dlx workflow. Use a local development dependency (`yarn add --dev @your-ui/cli@0.1.0`, then `yarn your-ui theme add ps_brand@3`) or another runner with `--package-manager yarn`. The current private CLI is not published, so these package names are illustrative. A runner choice must not switch the consumer project's dependency manager.

## Commands for new setup and component addition

| Runner | New setup | Add a component later |
| --- | --- | --- |
| npm | `npx @your-ui/cli@0.1.0 init --preset ps_brand@3` | `npx @your-ui/cli@0.1.0 add button` |
| pnpm | `pnpm dlx @your-ui/cli@0.1.0 init --preset ps_brand@3` | `pnpm dlx @your-ui/cli@0.1.0 add button` |
| Yarn modern | `yarn dlx -p @your-ui/cli@0.1.0 your-ui init --preset ps_brand@3` | `yarn dlx -p @your-ui/cli@0.1.0 your-ui add button` |
| Bun | `bunx --bun -p @your-ui/cli@0.1.0 your-ui init --preset ps_brand@3` | `bunx --bun -p @your-ui/cli@0.1.0 your-ui add button` |

`init` targets an existing supported app and initializes the UI setup, not a whole application. If `components.json` already exists, detect that before writes and use the theme plan instead of resetting the setup. An incompatible or incomplete configuration receives an actionable diagnostic.

## Select a preset for one component

Before choosing a runner, distinguish the installation scope. The proposed `add button --preset ps_brand@3` applies a preset only to that Button installation; `theme add ps_brand@3` applies the same preset globally. All four runner forms above can pass `--preset ps_brand@3` after `add button`. Codes are values, never flag names. `add button --preset ./brand.preset.json` remains the offline equivalent; `add --recipe <code-or-file>` additionally restores saved props, text, and overrides.

The private built CLI implements the local JSON Button slice after initialization:

```powershell
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --yes
```

This creates a separate native `Button`, colocated scoped CSS, and usage example under preset ID/revision paths. It preserves the saved project preset, global theme, ordinary components, recipes, and manager/lockfile ownership. Plans show scoped provenance; incompatible shared source, edited/untracked output, changed content under the same ID/revision, or changed dark context conflict even with `--yes`. Identical repeats are no-ops; new revisions coexist. Later ordinary additions still use project defaults. Input is strict local UTF-8 JSON at most 256 KiB, with flat/minimalist/neo-brutalism and exact catalog/compiler 0.1.0. Existing manager, script suppression, workspace rejection, and recovery boundaries apply.

Only one Button is accepted per command, without `--recipe`. Single dark classes work on the Button or an ancestor; complex selectors, nested independently themed subtrees, arbitrary consumer CSS/style overrides, and portal propagation are outside this guarantee. Saved preset/recipe codes, remote resolution, other scoped components, and editor integration remain pending. See [local imports and ownership rules](foundation-local-usage.md#component-scoped-button-presets), [measured coverage](evidence/component-scoped-button-presets.md), and the [scope contract](04-presets-and-contracts.md#component-scoped-preset-selection).

## Package manager selection

Use an explicit `--package-manager` selection when present. Otherwise inspect `package.json.packageManager`, then a unique recognized lockfile. Recognized lockfiles are package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lock, and bun.lockb. Both Bun formats together are ambiguous, just like mixed-manager locks. Keep the existing format; do not convert it as a side effect of installation. A field-only Bun project creates bun.lock only when dependency work requires it.

Bun 1.4.3 runs as a native executable, with exact dependency saving and lifecycle scripts disabled for the project and trusted packages. Override discovery with an absolute `OMBELLE_BUN_EXECUTABLE` path. Incompatible inherited settings for simulated/frozen installation, lockfile saving/output, or format conversion receive preflight diagnostics. Existing development/optional/peer-only dependencies required by a component must first be moved into dependencies; this Bun release cannot safely promote their group. The CLI preserves user configuration and rejects workspace ownership. The built CLI can run under Bun while npm/pnpm/Yarn scripts use verified Node; set `OMBELLE_NODE_EXECUTABLE` if Node is not on PATH. No-op additions, dry-runs, and actual theme-only operations avoid dependency-manager invocation.

Conflicting project evidence requires an explicit choice. The runner user agent is only a fallback when no project evidence exists. In a workspace, inspect the target package and governing workspace root without writing outside the explicitly selected project boundary. Retain the manager's workspace behavior and lockfile ownership.

Use npm install, pnpm add, or yarn add only when the planned component installation needs dependency changes. Yarn dependency installs disable lifecycle scripts and use exact versions. A theme-only command must not run an unnecessary dependency installation. Never create another manager's lockfile or assume node_modules exists in a Yarn Plug'n'Play project. The current Yarn consumer gate checks preserved CSS, a fresh-process preset reuse, lockfile ownership, and production builds in all three verified Yarn layouts.

## Theme merge contract

1. Read `components.json` and its `tailwind.css` path. The filename can differ from globals.css. Preserve the upstream style, aliases and primitive configuration.
2. Validate the selected preset, its exact catalog/compiler releases, and compatibility with the project's CSS and token conventions. The first supported baseline remains Tailwind v4; incompatible earlier conventions receive migration guidance rather than guessed edits.
3. Parse the stylesheet and locate active `:root` and dark-mode token definitions, including supported nesting inside layers. Respect an explicitly configured dark selector. If multiple definitions or conditional scopes make the effective target ambiguous, request a specific target instead of appending overrides blindly.
4. Plan additions and replacements for the incoming semantic variables. Convert contract keys such as primaryForeground into the CSS name --primary-foreground. Incoming preset values replace the same selected token keys; unrelated project tokens remain.
5. Add missing Tailwind mappings through the correct v4 theme syntax only when required. Preserve existing custom mappings unless a reviewed change is explicitly requested. Do not create duplicate @theme blocks or token declarations unnecessarily.
6. Show the exact CSS diff. The initial theme adoption is authorized to replace matching palette tokens after that review; previously managed tokens with conflicting local edits require explicit resolution.
7. Apply the parsed edits atomically, preserving unrelated rules, imports, comments, layers and declarations. The initial implementation does not use regular-expression replacement of the entire stylesheet.
8. Save the normalized ui-preset.json plus product configuration and lock provenance. Future add commands reuse the preset. Track touched selectors and declarations individually so unrelated edits to globals.css do not become false conflicts.
9. Repeat with the same inputs and receive a no-op. Restore touched files if the merge fails. Dry-run leaves the project unchanged.

Additional CSS for compatible library slot recipes may be generated in ui-style.css and imported once. This must be reviewed CSS and must not force component reinstalls. A theme-only plan changes no component TSX or JSX, no application usage and no dependency set.

See the [CSS before](../examples/globals.before.css), [CSS after](../examples/globals.after.css) and [standard registry theme](../examples/registry-theme.example.json) examples. They illustrate the output contract; they are not an implemented merger.

## What existing components inherit

Existing shadcn components inherit palette values and other variables they already reference. Our installed components also consume our reviewed style tokens. A hardcoded class or an incompatible slot structure cannot be transformed by changing a variable it does not use.

The website must distinguish Apply palette and tokens from a complete visual-family conversion requiring source changes. The theme command never silently performs that source migration. Native React Native components use a separate adapter and are outside the CSS merge operation.

## Upstream shadcn route

Publish a standard registry:theme artifact with cssVars.light, cssVars.dark and relevant cssVars.theme data. An existing shadcn project can add that published theme using `shadcn add <theme-url>` through the same four runners. This is a supported upstream transport described in sources S3, S5 and S17.

It does not automatically create our product's preset configuration or lockfile. The branded theme add command is the recommended route when users want both styling and saved defaults for future library installations. Our preset IDs are not upstream shadcn preset codes.

## Acceptance evidence

Across all four managers, verify fresh setup, source installation and existing-project theme merging. Include Yarn Classic and modern Yarn with node-modules and Plug'n'Play, and execute the CLI under Bun as well as Node. Pin tested versions in CI.

Check light and dark values, custom CSS paths, preservation of unrelated CSS, compatible mappings, duplicate handling, local token conflicts, idempotence, rollback, dry-run non-mutation and saved preset reuse in a fresh process. Hash component source before and after theme application to prove it was not replaced. Check that no foreign lockfile or unnecessary dependency command appears, including when a different runner launches the CLI.
