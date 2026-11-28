# Agent evals: baseline

- Model: claude-opus-5-5
- Date: 2026-11-28
- Runs per task: 3
- Overall: 5/24 (21%)
- Infra failures: 0 (not scored, excluded from the rates)

| Task | Passed | Rate | Infra | Failing checks |
| --- | --- | --- | --- | --- |
| init-button-dialog | 2/3 | 67% | 0 | doctor, lock, published-cli, required-commands |
| login-page | 0/3 | 0% | 0 | lock, doctor, published-cli, required-commands |
| switch-theme | 0/3 | 0% | 0 | doctor, published-cli, required-commands, no-hand-written-source |
| edited-button | 0/3 | 0% | 0 | published-cli |
| users-table | 1/3 | 33% | 0 | doctor, lock, published-cli, required-commands |
| settings-page | 0/3 | 0% | 0 | doctor, lock, published-cli, required-commands |
| no-preset | 2/3 | 67% | 0 | no-hand-written-source |
| check-install | 0/3 | 0% | 0 | published-cli, required-commands |

Rates are over a small number of runs per task and vary between runs; treat them as a trend, not a guarantee.

## Harness

Session harness (`scripts/agent-evals/session.ts`): each run was a fresh Claude Code subagent given only the
task prompt and the project folder. Commands come from the list the agent reported at the end of its run, not
from a captured transcript; outcomes (`doctor`, lock, changed files, preset hash) were measured directly. The
subagents shared the parent session’s context, so this is not an isolated agent.
## What the runs showed

Measured on 2026-11-28 against the live site before this branch deployed (no `llms.txt`, `.md` pages, catalog JSON or skills yet).

- **Finding the CLI is the main failure.** Only 9 of 24 runs ever ran `@ombelle-ui/cli`. The others tried `ombelle`, `@ombelle/cli` or `ombelle-ui` on npm, got 404s and stopped to ask. Agents that ran `npm search ombelle` found the package.
- **Blocks were never used.** In all 6 login and settings runs, no agent installed `login-01` or `settings-01`. The ones that found the CLI assembled pages from components.
- **Once found, the CLI loop was mostly right.** Every agent that ran the CLI did a `--dry-run` before `--yes`, and most ran `doctor` at the end.
- **The conflict case was handled correctly in substance.** All 3 `edited-button` agents stopped and asked about the existing `button.tsx`. They failed only because they never ran the CLI.
- **No preset is a real gap.** There is no published code for the built-in families. One run pulled the flat preset out of the site's JavaScript and wrote preset JSON itself. One asked correctly and pointed to the preset editor. One passed only because it never found the CLI.
- **Hand-written look-alikes happen.** One settings run wrote its own components styled from the preset instead of installing Ombelle's.

## Caveats

- 3 runs per task: rates are a trend, not a precise measure.
- Commands are the agents' own lists. Outcomes were measured from the project.
- The test agents were subagents of a session working on this repository, and at least one referred to "the Ombelle repo". The baseline is therefore, if anything, generous.
- In rounds 1–2, the scorer's own `doctor` call failed on pnpm projects because pnpm was not resolvable on the scoring PATH (`install-runtime`). This affected `switch-theme` (rounds 1–2) and `settings-page` (round 1). Those runs failed other checks too, so pass counts are unchanged. Round 3 used a `pnpm.cmd` shim.
- Possible CLI gap, not yet confirmed: on Windows, `doctor` and dependency installs could not locate pnpm when it is only available through corepack (`corepack enable` writes `pnpm.CMD`, which calls corepack instead of `pnpm.cjs`).
