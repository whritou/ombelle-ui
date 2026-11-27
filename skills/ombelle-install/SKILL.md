---
name: ombelle-install
description: Use when the user asks to add Ombelle UI, install Ombelle components or blocks, or initialize an Ombelle preset in their app (a Vite React or Next.js App Router project with Tailwind CSS v4). Covers the guarded CLI install loop, preset codes, and what to do on conflicts and errors.
---

# Install Ombelle UI

Ombelle UI is installed with its CLI, never by copying component source or running `shadcn add`. The CLI plans every change, applies it in one guarded transaction and records what it wrote in `ui-library.lock.json`.

## Get the CLI version

Read `cliVersion` from `https://ombelle-ui.vercel.app/api/v1/catalog`. If that URL is unreachable, use the version on `https://ombelle-ui.vercel.app/docs/getting-started`. Write it wherever a command below says `<version>`; never guess it or reuse one from memory. `npx` is the default runner. In a project that uses another manager you may use `pnpm dlx`, `yarn dlx --quiet` (with `--json`) or `bunx` with the same arguments; for Yarn 1 use `npx`. The runner never changes the project's package manager. To target an app inside a monorepo, add `--cwd` with the app's directory.

## The install loop

Agents have no TTY, so every write needs `--yes`, but only after a dry run.

1. Run the writing command with `--dry-run --json`. It writes nothing.
2. Show the developer the planned changes: `changes[].path` with its `action`, `dependencyPlan`, `notices`.
3. If `warnings` is empty of entries with `resolutions`, rerun the same command with `--yes` in place of `--dry-run`.
4. If a warning has `resolutions` (or the code is `FILE_CONFLICT`), stop and ask the developer. Never choose `--overwrite` or `--beside` yourself.
5. Finish with `doctor --json` and report its `checks`.

`--yes` never bypasses a conflict, a schema error or an unsupported project.

## Initialize with a preset

Lead with a preset code (`ps_…@1`) the developer gives you:

```bash
npx @ombelle-ui/cli@<version> init --preset <code> --dry-run --json
```

A preset JSON file works too (a path starting with `./` or a full path):

```bash
npx @ombelle-ui/cli@<version> init --preset <preset> --dry-run --json
```

If the developer gave neither a code nor a file, ask for one and point them to `https://ombelle-ui.vercel.app/editor/preset`, where they design a preset and copy its code. Never write preset JSON yourself and never invent a code. After the plan is reviewed, rerun with `--yes`:

```bash
npx @ombelle-ui/cli@<version> init --preset <code> --yes
```

`init` needs a supported project: React 19, Tailwind CSS v4, Vite or Next.js App Router, no workspace root.

## Add components

Find ids with the `ombelle-choose` skill. `add` needs `init` first and uses the saved project preset.

```bash
npx @ombelle-ui/cli@<version> add <component> --dry-run --json
```

```bash
npx @ombelle-ui/cli@<version> add <component> --yes
```

Several ids go in one command (`add button dialog`). Blocks (`login-01`) use the same command; see the `ombelle-blocks` skill. Then verify:

```bash
npx @ombelle-ui/cli@<version> doctor --json
```

## Conflicts

A plan that would replace a file the developer owns reports `FILE_CONFLICT` and writes nothing. Show the paths and explain the two ways forward, then wait for the developer's choice:

- `--beside <path>` keeps their component file and installs Ombelle's under `<components>/ombelle/` (component files only, not blocks or shared files).
- `--overwrite <path>` replaces the file with the catalog source.
- Or keep their version and skip that component.

Only after the developer chooses, rerun the dry run with their choice, then apply it:

```bash
npx @ombelle-ui/cli@<version> add <component> --beside <path> --dry-run --json
```

```bash
npx @ombelle-ui/cli@<version> add <component> --overwrite <path> --dry-run --json
```

`--beside` and `--overwrite` repeat once per path. Use `--yes` once that dry run is clean.

## Codes and exit codes

| Code | Exit | Do this |
| --- | --- | --- |
| `FILE_CONFLICT` | 4 | Stop and ask; offer `--beside` (component files) or `--overwrite`. |
| `UNSUPPORTED_PROJECT` | 3 | Explain the message and its next action; do not work around it. |
| `UNSUPPORTED_RELEASE` | 3 | Explain it; the document or config needs a newer CLI. Rerun with the current `<version>`; otherwise stop. |
| `RESOLUTION_FAILURE` | 5 | A preset code could not be resolved. Check the code with the developer; do not retry guesses. |
| `DEPENDENCY_FAILURE` | 6 | Report the package manager's reason. The CLI rolled the files back; say so. |
| `UNKNOWN_COMPONENT` | 2 | The id is not in the catalog; use the closest suggestion or `ombelle-choose`. |
| `INVALID_DATA` | 2 | A flag or input was wrong; fix the command, not the project. |

Glass (`liquid-glass`) is a stable family whose contrast depends on the backdrop. Offer it only with its label, `Accessibility not guaranteed`, and say so.
