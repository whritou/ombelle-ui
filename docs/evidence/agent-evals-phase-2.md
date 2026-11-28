# Agent evals: phase-2

- Model: claude-opus-5-5
- Date: 2026-11-28
- Runs per task: 3
- Overall: 20/24 (83%)
- Infra failures: 0 (not scored, excluded from the rates)

| Task | Passed | Rate | Infra | Failing checks |
| --- | --- | --- | --- | --- |
| init-button-dialog | 3/3 | 100% | 0 | - |
| login-page | 2/3 | 67% | 0 | lock |
| switch-theme | 3/3 | 100% | 0 | - |
| edited-button | 3/3 | 100% | 0 | - |
| users-table | 3/3 | 100% | 0 | - |
| settings-page | 0/3 | 0% | 0 | lock, required-commands |
| no-preset | 3/3 | 100% | 0 | - |
| check-install | 3/3 | 100% | 0 | - |

Rates are over a small number of runs per task and vary between runs; treat them as a trend, not a guarantee.

## Harness

Session harness (`scripts/agent-evals/session.ts`): each run was a fresh Claude Code subagent given only the
task prompt and the project folder. Commands come from the list the agent reported at the end of its run, not
from a captured transcript; outcomes (`doctor`, lock, changed files, preset hash) were measured directly. The
subagents shared the parent session’s context, so this is not an isolated agent.
## What the runs showed

Measured on 2026-11-28 with the five skills copied into each project's `.claude/skills/` and listed (name, description, path) in the prompt. That mirrors what an agent sees after `npx skills add whritou/ombelle-ui`, since session subagents don't load skills from the project folder.

- **83% against 21% at baseline.** All 20 passing runs read the matching skill, took `cliVersion` from the live catalog, dry-ran before `--yes`, and finished with `doctor`.
- **Blocks are used now.** 2 of 3 login runs installed `login-01` (none did in the baseline) and kept its example-only auth marked. Settings runs all chose `settings-01`.
- **Conflicts and missing presets are handled.** All 3 `edited-button` runs stopped at `FILE_CONFLICT` and offered `--beside`, `--overwrite` or skip. All 3 `no-preset` runs asked for a code and linked the preset editor.
- **All 3 settings failures come from the environment.** `add settings-01` needs new packages. The CLI refused with `UNSUPPORTED_PROJECT`: "Cannot locate a pnpm JavaScript entry without shell evaluation". On this Windows machine pnpm is only available through corepack. Each agent explained the error and stopped, as the skill says. This confirms a CLI gap that blocks real Windows users.
- **The one login failure came from the harness.** Two parallel agents wrote dry-run output to the same scratch file (`add.json`), so one saw another project's plan. The agent noticed the mismatch and refused to apply it.
- **A content slip to fix:** one `no-preset` run told the developer the flat family's "accessibility is guaranteed". Nothing on the site or in the skills says that.
