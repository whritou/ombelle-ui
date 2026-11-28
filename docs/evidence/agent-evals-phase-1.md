# Agent evals: phase-1

- Model: claude-opus-5-5
- Date: 2026-11-28
- Runs per task: 1
- Overall: 1/8 (13%)
- Infra failures: 0 (not scored, excluded from the rates)

| Task | Passed | Rate | Infra | Failing checks |
| --- | --- | --- | --- | --- |
| init-button-dialog | 0/1 | 0% | 0 | doctor, lock, published-cli, required-commands |
| login-page | 0/1 | 0% | 0 | lock |
| switch-theme | 0/1 | 0% | 0 | published-cli, required-commands, no-hand-written-source |
| edited-button | 0/1 | 0% | 0 | published-cli |
| users-table | 0/1 | 0% | 0 | doctor, lock, published-cli, required-commands |
| settings-page | 0/1 | 0% | 0 | doctor, lock, published-cli, required-commands |
| no-preset | 1/1 | 100% | 0 | - |
| check-install | 0/1 | 0% | 0 | published-cli, required-commands |

Rates are over a small number of runs per task and vary between runs; treat them as a trend, not a guarantee.

## Harness

Session harness (`scripts/agent-evals/session.ts`): each run was a fresh Claude Code subagent given only the
task prompt and the project folder. Commands come from the list the agent reported at the end of its run, not
from a captured transcript; outcomes (`doctor`, lock, changed files, preset hash) were measured directly. The
subagents shared the parent session’s context, so this is not an isolated agent.
## What the run showed

Measured on 2026-11-28 against the live site after #214 deployed (`/llms.txt`, `.md` pages, `/api/v1/catalog` and `/docs/agents` all live). One round of 8 runs only: the result was clear, so rounds 2–3 were skipped by decision.

- **The new pages never came into play.** No agent fetched the website. Seven of eight looked for the CLI on npm under guessed names (`ombelle`, `@ombelle/cli`, `ombelle-ui`), got 404s and stopped. One found `@ombelle-ui/cli` with `npm search ombelle`.
- **The result matches the baseline** (1/8 here; 2, 1 and 2 of 8 in the baseline rounds). The one pass is `no-preset`, which stopped without writing anything.
- **Implication:** pages only help an agent that already knows where to look. The gap is discovery: agents try the npm names `ombelle` and `ombelle-ui`, which are unclaimed.
