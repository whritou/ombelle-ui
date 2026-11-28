# Agent evals

An opt-in measurement of how well a coding agent installs Ombelle UI. It never runs in CI or in
`pnpm check:foundation`.

## What it measures

Eight tasks (`scripts/agent-evals/tasks.ts`), each run three times in a fresh temp project: initialize with a preset and
add components, add a login page, switch the theme, add a Button over a hand-edited one, add a users table, add a
settings page, add Ombelle with no preset at all, and check an existing install. The prompts name only "Ombelle UI".

Each run is scored from the agent's shell commands and the project afterwards (`scripts/agent-evals/score.ts`):

- `doctor` and `lock`: the install is healthy and the lock has the expected components or blocks.
- `published-cli`: the agent ran `@ombelle-ui/cli` (any version or tag) and never `shadcn`. A task that writes nothing
  and needs no command, such as asking for a preset, passes without a CLI call.
- `required-commands`: the CLI subcommands the task needs ran, for example `doctor` after an install.
- `dry-run-first`, `no-unasked-resolution`: the install loop was followed, and `--overwrite` / `--beside` were never
  chosen without the developer.
- `no-hand-written-source`: no component source was written by hand and no-write tasks changed nothing.

Results are rates per task, written to `.artifacts/agent-evals/<surface>.json` and
`docs/evidence/agent-evals-<surface>.md`. A run that fails before it can be scored (the agent did not start, timed out
or exited without a result, or the project could not be prepared) is an infra failure: it is counted in its own column
and excluded from the rates. After three infra failures in a row the eval stops, writes the partial results and exits 1.

## Running it

Build the packages first (`corepack pnpm build:packages`), then:

```sh
OMBELLE_AGENT_EVALS=1 corepack pnpm eval:agents --surface baseline
```

`--surface` is `baseline`, `phase-1` (agent-readable site), `phase-2` (agent skills) or `phase-3` (MCP, not built).
`--runs <n>` changes the runs per task (default 3) and `--task <id>` runs one task. Without
`OMBELLE_AGENT_EVALS=1` the command prints a notice and runs nothing.

| Variable | Meaning |
| --- | --- |
| `OMBELLE_AGENT_EVALS` | `1` to run anything |
| `OMBELLE_AGENT_EVAL_CLAUDE` | The agent executable (default `claude`) |
| `OMBELLE_AGENT_EVAL_MODEL` | The model (default `claude-opus-5-5`) |
| `OMBELLE_AGENT_EVAL_TIMEOUT_MS` | Per-run agent timeout in milliseconds (default 15 minutes) |

The agent needs its Anthropic credentials in `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` or `CLAUDE_CODE_OAUTH_TOKEN`
(or a login the `claude` CLI finds under your home directory).

**Cost:** a full surface is 8 tasks × 3 runs = 24 agent sessions of up to 40 turns each, billed as model usage.

## Run the baseline first

The baseline measures agents before the agent-readable site exists. Run `--surface baseline` before `llms.txt`, the
`.md` pages and the catalog JSON are deployed to the site origin, or with that domain blocked for the agent. Otherwise
the agent can read them and the baseline no longer measures "before".

## Containment

The agent runs headless with `--permission-mode bypassPermissions` in its temp project, with a minimal environment
(`PATH`, `HOME`, the Windows essentials, the Anthropic credentials and `CI=1`), no MCP servers
(`--strict-mcp-config`), only project and local settings (`--setting-sources project,local`) and a fixed tool list
(`--tools`). These flags are unverified until the first real run; check them against `claude --help`.

The agent is **not sandboxed** beyond its temp working directory: it can run any shell command and reach the network
as your user. Run the evals only on a machine you are comfortable with.
