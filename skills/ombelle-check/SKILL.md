---
name: ombelle-check
description: Use when the user asks whether their Ombelle UI install is healthy, what is installed, what changed upstream, or to update Ombelle components, or when a project that uses Ombelle misbehaves after an install, a theme change or a CLI upgrade.
---

# Check, diagnose and update an Ombelle install

The commands `info`, `doctor`, `diff` and `preset show` are read-only. `update` writes, so it follows the loop from the `ombelle-install` skill.

## Get the CLI version

Read `cliVersion` from `https://ombelle-ui.vercel.app/api/v1/catalog`. If that URL is unreachable, use the version on `https://ombelle-ui.vercel.app/docs/getting-started`. Write it wherever a command says `<version>`. Confirm the CLI that will run with:

```bash
npx @ombelle-ui/cli@<version> --version --json
```

## What is installed

```bash
npx @ombelle-ui/cli@<version> info --json
```

Report the framework, manager, edition, preset, `components`, and the `summary` count per file state: `current`, `update-available`, `edited`, `edited-update-available`, `missing`, `not-generated`.

## Is it healthy

```bash
npx @ombelle-ui/cli@<version> doctor --json
```

`doctor` exits 0 when no check fails and 3 when one does. Read `checks[]`: for each `warn` or `fail`, give the `message` and `nextAction` to the developer. A `BLOCK_COMPONENT_MISSING` warning means a block's component is not installed; the fix is `add` with the block id. Do not hide a failed check or work around an unsupported project.

## What changed upstream

```bash
npx @ombelle-ui/cli@<version> diff <component> --json
```

It prints a unified diff of the project's bytes against today's catalog bytes for every managed file that is not `current`. Leave `<component>` out for all of them. A file in the `edited` state holds the developer's changes; say so before suggesting an update.

## Update

Preview first; the plan lists what refreshes:

```bash
npx @ombelle-ui/cli@<version> update --dry-run --json
```

Then follow the loop: show the plan, run again with `--yes` only if no warning has `resolutions`. An edited file conflicts (`FILE_CONFLICT`): stop and ask. If the developer decides to replace it, they choose the path and you run `update <component> --overwrite <path>` (dry run first). Never pick `--overwrite` yourself. Finish with `doctor --json`.

## Saved preset

`preset show --json` prints the saved preset and whether it matches the lock. To change it, use `ombelle-theme`.
