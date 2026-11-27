# Agent support design

Date: 2026-11-27. Status: draft for owner review.

## Intent

A developer asks their coding agent (Claude Code, Cursor, Codex, Copilot and similar) to "add Ombelle with this
preset" or "build a settings page with Ombelle". The agent has never seen Ombelle: its training data predates the
catalog, preset codes and CLI. This work makes such an agent install Ombelle the way a careful human would: through
the published CLI, with a preset code, through dry-run and conflict resolution, ending with a passing `doctor`.

Nobody has tried Ombelle with an agent yet. This is groundwork, so the first deliverable measures how agents do today,
and every later phase is judged against that measurement.

[07-delivery-plan.md](../../../07-delivery-plan.md) already orders the work: machine-readable catalog metadata and
`llms.txt` first, skills once CLI contracts stabilize, MCP optional. The CLI contract stabilized at 1.0
([1.0 public contract](../../../1.0-public-contract.md)), so the conditions for skills are met.

## Goals

- An agent with no prior knowledge can find the right component or block, install it with the published CLI and a
  preset code, and leave the project passing `ombelle doctor`.
- Agents respect the installer's safety model: `--dry-run` before writing, never `--overwrite` an edited or foreign
  file without the developer's say-so, and never hand-copy component source instead of running the CLI.
- A repeatable measurement shows whether each phase improved agent behaviour.

## Non-goals

- Agents working on this repository. `AGENTS.md` covers them.
- Serving shadcn registry item routes (`/r/{release}/{item}.json`) as an install path. It would let shadcn's own
  tooling install Ombelle source while skipping the lock, the saved preset and conflict checks. It stays not planned.
- New CLI commands or flags for agents in phases 0–2. Agents use the 1.x grammar as it is.
- Hosted (remote) MCP. Installing writes to the developer's disk, so the server runs locally.

## Anti-goals

- Agents installing Ombelle in a way that leaves a project `doctor` would fail, or that drops the lock.
- Skills or docs that describe behaviour the CLI does not have. An agent following them confidently into an error is
  worse than no guidance.
- An MCP server that applies changes without the developer seeing the plan.

## Constraints

- The 1.x public contract: exit codes, diagnostic codes, `--json` `outputVersion` 1, and the three safety rules. In
  particular, **a write from a non-TTY session needs `--yes`**, and agents run without a TTY. Guidance must say: run
  with `--dry-run --json`, show the plan, then rerun with `--yes`.
- Lead with preset codes (`ps_…@1`); JSON preset files are the offline alternative.
- Pin the CLI version in every command shown (`npx @ombelle-ui/cli@<version>`), using the site's existing
  `publishedInstaller` source, so docs never name an unpublished CLI.
- Glass is stable with the "accessibility not guaranteed" label. Agent-facing text carries that label wherever glass
  is offered.
- Generated outputs stay deterministic and have tests, like the rest of the repository.
- Only `@ombelle-ui/cli` is published today. A new package (phase 3) goes through the same release flow
  ([cli-release.md](../../../cli-release.md)).

## Approaches considered

| | Approach | Trade-off |
| --- | --- | --- |
| A | Docs only: `llms.txt`, markdown pages, catalog JSON | Works with every agent and adds no package, but the agent reads it only if it goes looking. |
| B | A plus a skills pack | Skills load when the task matches. They describe CLI behaviour and can go stale; guarded by tests. |
| C | B plus a local MCP server | Typed tools and an explicit plan/apply split, but mostly wraps the CLI's `--json`. One more package to version, publish and secure. |

**Chosen by the owner: all three, as sequential phases**, preceded by a measurement phase. Each phase ships on its
own and is re-measured before the next starts.

## Phase 0: measurement (about 1–2 days)

A small agent evaluation that can run repeatedly.

- **Projects:** fresh copies of the stock create-vite and create-next-app projects the integration tests already use
  (`stock-projects-cli.test.ts`), one npm and one pnpm.
- **Tasks** (eight prompts in plain developer words; the first five are below):
  1. "Add Ombelle UI to this app with preset `ps_…@1` and add a Button and a Dialog."
  2. "Add a login page using Ombelle." (expects the `login-01` block)
  3. "Switch the Ombelle theme to preset `ps_…@1`." (expects `theme add` / `preset apply`)
  4. A project where `src/components/ui/button.tsx` already exists and is hand-edited: "Add Ombelle's Button."
     (expects a conflict to be reported to the developer, not overwritten)
  5. "Add a data table of users with Ombelle." (component choice)
- **Scoring**, from the final project and the transcript:
  - `ombelle doctor --json` status is `success`; the lock lists the expected component or block ids.
  - The transcript runs the published CLI (not `shadcn add`, not hand-written component files under the components
    directory).
  - No `--overwrite` on a file the task did not authorize; the conflict in task 4 is surfaced.
  - A `--dry-run` precedes the first write.
- **Runner:** a script under `scripts/agent-evals/` that drives a headless agent (Claude Agent SDK or `claude -p`),
  three runs per task, and writes per-task rates as JSON plus a short markdown summary to `docs/evidence/agent-evals-<phase>.md`.
  It needs an API key and network access, so it is opt-in (`OMBELLE_AGENT_EVALS=1`) and never part of
  `pnpm check:foundation` or CI by default.
- **Baseline:** run it once before phase 1 and record the result. That record is the "why" this work currently lacks.

## Phase 1: readable by agents (about 1–2 days)

Site-only; ships with a `www` deploy, no CLI release.

- **`/llms.txt`**: the [llmstxt.org](https://llmstxt.org) format. A one-paragraph summary of Ombelle, the install
  rules (CLI pinned version, preset codes, dry-run then `--yes`, never overwrite without asking, `doctor` at the end),
  then links to the markdown pages below.
- **`/llms-full.txt`**: the same rules plus every guide, component and block page inlined, for agents that read one
  file.
- **Markdown pages**: `/docs/<slug>.md`, `/components/<id>.md`, `/blocks/<id>.md`. Component pages come from the
  same `componentDocs` data the HTML page uses (name, description, API, states, basis, usage, minimum CLI, glass
  label). Block pages come from the block catalog. Guide pages need a markdown form of the TSX guide content.
- **`/docs/agents` guide**: a human-readable page with the same install rules, plus a short "tell your agent"
  snippet a developer can paste into their own `AGENTS.md` / `CLAUDE.md`.
- **Catalog JSON**: `/api/v1/catalog`, statically generated. Per component and block: id, name, kind, description,
  category, families supported, editions, minimum CLI, glass label, doc URLs. Plus the families, the current
  published CLI version and the install command template. Documented in [hosted-api-v1.md](../../../hosted-api-v1.md)
  and covered by the API's existing stability rules. This replaces the "not planned for 1.0" note for the catalog
  route only; registry item routes stay not planned.
- **Tests:** every component id and block id in the catalog appears in `llms.txt`, `llms-full.txt` and the catalog
  JSON; every `.md` route returns markdown; every command shown names the published CLI version.
- Re-run phase 0 against the deployed site; record `agent-evals-phase-1`.

## Phase 2: skills (about 2 days)

Skills in the open Agent Skills format (`SKILL.md` with name and description frontmatter), which Claude Code, Codex,
Cursor and other agents read.

- **Skills:**
  - `ombelle-install`: initialize a project with a preset code and add components or blocks; the dry-run → show plan
    → `--yes` loop; reading `--json` diagnostics by code (`FILE_CONFLICT` → ask the developer, offer `--beside` for
    component files or `--overwrite`; `UNSUPPORTED_PROJECT` → explain, no workaround); finish with `doctor`.
  - `ombelle-choose`: pick a component or block for a described UI, using the catalog JSON or `llms.txt`.
  - `ombelle-theme`: change or inspect the project preset (`theme add`, `preset apply`, `preset show`), and
    component-scoped recipes and presets.
  - `ombelle-blocks`: add a block and adapt it, keeping its example-only auth and data clearly marked.
  - `ombelle-check`: `doctor`, `info`, `diff` and `update`, and what each state means.
- **Source:** `skills/` at the repository root, one folder per skill. There is no build step between the repository
  and the developer, so skills never hard-code a CLI version: they tell the agent to read `cliVersion` and the
  install command template from `/api/v1/catalog` (or `llms.txt`), and to fall back to the version named on the
  site's Getting started page.
- **Distribution (owner: "like other libraries that have skills"):** the same pattern Supabase and shadcn use.
  Developers run `npx skills add whritou/ombelle-ui` (all skills) or add `--skill ombelle-install` (one skill).
  This is the open skills installer, which writes them into the project for Claude Code, Cursor, Codex, Copilot and
  other agents, and lists them on skills.sh. The `/docs/agents` guide and `llms.txt` show this command. No CLI
  release is needed.
- **Staleness guard:** a test extracts every `ombelle …` command from the skills, runs each with `--dry-run --json`
  (or `--help` for forms that need a project state) against the built CLI in a temp project, and fails on
  `INVALID_DATA` from argument parsing or an unknown command or flag.
- Re-run phase 0 with the skills installed; record `agent-evals-phase-2`.

## Phase 3: local MCP server (about 1–2 weeks)

Start only if the phase 2 evaluation still shows agents mishandling the CLI, or the owner decides to go ahead
anyway. The owner has asked for it to be planned.

- **Package:** `@ombelle-ui/mcp`, stdio transport, run with `npx @ombelle-ui/mcp@<version>`. Versioned with the
  CLI.
- **How it works:** it spawns the pinned CLI with `--json` and returns the parsed records. It does not import CLI
  internals (the CLI's JavaScript module is not an API).
- **Tools:**
  - `search_catalog` (read-only): reads the catalog JSON (offline copy bundled, refreshed from the site when
    reachable).
  - `get_docs` (read-only): markdown for a component, block or guide.
  - `project_info`, `doctor`, `diff` (read-only).
  - `plan` (read-only): `init`, `add`, `theme add`, `preset apply` or `update` with `--dry-run --json`. Returns the
    plan, the diagnostics with their resolutions, and a plan token.
  - `apply` (destructive, annotated as such): takes a plan token, re-plans, refuses if the plan changed (stale-plan
    rule), then runs the same command with `--yes` and any `--overwrite`/`--beside` the plan's resolutions named.
- **Resources:** each component, block and guide as markdown, mirroring phase 1.
- **Tests:** unit tests for the tool schemas and the plan-token check; an integration test that drives the server
  over stdio against a stock project through plan → apply → doctor.
- **Release:** a new public package needs the owner's go-ahead at publish time, a README and a `docs/` page, and an
  entry in the 1.x contract only once the owner decides it is stable.
- Re-run phase 0 through the MCP server; record `agent-evals-phase-3`.

## Decided by the owner

- The audience is developers' agents installing Ombelle in their own apps.
- Nobody has tried it yet; the work is groundwork.
- All three approaches are wanted, as phases.

## Calls made in this design (owner may override)

- A measurement phase comes first, and every phase is re-measured.
- shadcn registry item routes stay out.
- Phases 0–2 add no CLI commands or flags.
- The MCP server is local stdio and wraps the CLI process, not its internals.
- The phase 0 runner is opt-in and outside CI because it needs an API key.
- The agent under test has web search and fetch, and the prompt names only "Ombelle UI" (no URL or package), as a
  real developer would. This setting stays fixed across all phases so results compare.
- Results are reported as rates per task over several runs, never single pass/fail claims.
- Phases 0–2 run straight through; each re-measurement is a record, not a gate. Phase 3 starts after an owner
  checkpoint on the phase 2 record.
- MCP `plan` takes the developer's chosen conflict resolutions as input and binds them into the plan token; `apply`
  never chooses a resolution itself.

## Decided by the owner after review

- **Agent autonomy:** the developer's request approves a clean plan, so the agent runs `--dry-run --json`, shows the
  plan, and applies it with `--yes` when it has no diagnostics. On `FILE_CONFLICT` (or any diagnostic with
  resolutions) the agent stops and asks the developer; it never picks `--overwrite` or `--beside` itself. The phase 0
  runner is single-turn: a task passes when a clean task ends with `doctor` success, and task 4 passes only if the
  conflict is reported and nothing is overwritten or written beside.
- **Skill distribution:** `npx skills add`, as above.
- **Measurement size:** 3 runs per task × 8 tasks, one model, on the owner's API key, reported as rates.

## Left to the builder

- How guide TSX content becomes markdown for `/docs/<slug>.md`.
- Exact catalog JSON field names, within the fields listed.
- The evaluation runner's agent harness and prompt wording.
- Skill wording, within the rules above.
