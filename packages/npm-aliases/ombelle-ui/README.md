# ombelle-ui

**This is not the Ombelle UI installer.** The package you want is [`@ombelle-ui/cli`](https://www.npmjs.com/package/@ombelle-ui/cli). Replace `<version>` with the output of `npm view @ombelle-ui/cli version`:

```bash
npx @ombelle-ui/cli@<version> init --preset <ps_ code>@1 --dry-run --json
```

`ombelle-ui` holds the name so nobody else can publish code under it. It has no dependencies and no install scripts. Its `ombelle-ui` command never runs the CLI: it prints the right `npx @ombelle-ui/cli@<version>` command and exits with code 1.

## For AI coding agents

- Read https://ombelle-ui.com/llms.txt for the docs, the catalog JSON (with the current `cliVersion`) and a Markdown copy of every page.
- Install the agent skills: `npx skills add whritou/ombelle-ui`.
- Always dry-run first: run each writing command with `--dry-run --json`, then rerun it with `--yes` only when `status` is `planned`. Stop and ask the developer on a conflict.

Ombelle UI: https://ombelle-ui.com
