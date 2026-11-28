# Agent Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a developer's coding agent install Ombelle correctly in their own app, and measure that it does.

**Architecture:** Four sequential phases. Phase 0 is an opt-in measurement runner under `scripts/agent-evals/` that
drives a headless agent against real consumer fixtures and scores the result. Phase 1 adds agent-readable output to
`apps/www`: one source of install rules, a catalog JSON route, markdown page routes, `llms.txt` and `llms-full.txt`.
Phase 2 adds `skills/` in the open Agent Skills format with a test that runs every command they show. Phase 3 adds a
local stdio MCP package that spawns the published CLI with `--json`.

**Tech Stack:** TypeScript ES modules, Next.js route handlers (`force-static`), React `renderToStaticMarkup`,
`turndown` 7.2.0, vitest 5.1.0, `tsx`, the `claude` CLI in headless mode, `@modelcontextprotocol/sdk` (phase 3).

**Spec:** [docs/internal/superpowers/specs/2026-11-27-agent-support-design.md](../specs/2026-11-27-agent-support-design.md)

## Global Constraints

- Node 24.19.0, pnpm 11.25.0. New dependencies are pinned to an exact version at least two weeks old.
- Every command shown to agents names the published CLI from `publishedInstaller` in
  `apps/www/src/snapshots/install-command.ts` (`@ombelle-ui/cli@1.1.2` today), never a hard-coded version. Skills
  write `@ombelle-ui/cli@<version>` and tell the agent where to read the version.
- Preset codes (`ps_…@1`) lead every example; a JSON preset file is the offline alternative.
- The install loop, verbatim in substance everywhere it appears: run with `--dry-run --json`; show the plan; if it has
  no warnings with `resolutions`, rerun the same command with `--yes`; on `FILE_CONFLICT` or any warning with
  `resolutions`, stop and ask the developer, never choosing `--overwrite` or `--beside` yourself; finish with
  `ombelle doctor --json`.
- Agents run without a TTY, so every write needs `--yes` (1.x safety rule).
- Glass is offered only with the label `Accessibility not guaranteed` (`accessibilityCaveatLabel` in
  `@ombelle/contracts`).
- No new CLI commands or flags. No shadcn registry item routes (`/r/...`).
- Skill install command: `npx skills add whritou/ombelle-ui` (one skill: add `--skill <name>`).
- Measurement: 3 runs per task, 8 tasks, one model (default `claude-opus-5-5`, overridable with
  `OMBELLE_AGENT_EVAL_MODEL`), opt-in with `OMBELLE_AGENT_EVALS=1`, never in CI or `pnpm check:foundation`. Results
  are rates per task.
- Site origin: `officialSnapshotOrigin` (`https://ombelle-ui.vercel.app`) from `@ombelle/contracts`.
- Conventional Commits; branch `docs/agent-support` (rename to `feat/agent-support` before the first code commit).
- Phases 0–2 run straight through. Phase 3 starts only after the owner reviews the phase 2 record.

## Review Focus

1. **The published CLI lags the catalog.** A component or block newer than `publishedInstaller` must not appear as
   installable in `llms.txt`, the catalog JSON or markdown pages; it shows its `minimumCli` instead. Test in Task 5.
2. **Guide markdown loses the commands.** `CodeBlockCommand` renders runner tabs; the markdown must still contain the
   plain `npx @ombelle-ui/cli@<published> …` command text. Test in Task 6.
3. **An agent with no preset at all** ("add Ombelle with the flat style"). The rules must say to ask the developer for
   a code or file and link the preset editor, never invent preset JSON. Test in Task 5 (rule present) and Task 3
   (task 7 scores inventing a preset file as a fail).
4. **A skill command that only works in some project state** (`update`, `diff`) must still be exercised by the
   staleness test against an initialized project with a component installed. Test in Task 11.
5. **MCP `apply` after the project changed** between `plan` and `apply` must refuse, with the stale-plan message, and
   write nothing. Test in Task 15.

---

## Phase 0: measurement

### Task 1: Scoring

**Files:**
- Create: `scripts/agent-evals/score.ts`
- Test: `tests/integration/agent-eval-score.test.ts`

**Interfaces:**
- Produces:
  - `type AgentCommand = { command: string; exitCode?: number }` (one Bash tool call from the transcript)
  - `type ProjectOutcome = { doctorStatus: 'success' | 'failed' | 'missing'; lockIds: string[]; changedFiles: string[]; presetHashBefore?: string; presetHashAfter?: string }`
  - `type TaskExpectation = { lockIds: string[]; mustStopOnConflict?: boolean; forbiddenWrites?: string[]; noWrites?: boolean; presetChanged?: boolean }`
  - `type RunScore = { passed: boolean; checks: { id: 'doctor' | 'lock' | 'published-cli' | 'dry-run-first' | 'no-unasked-resolution' | 'no-hand-written-source'; passed: boolean; detail: string }[] }`
  - `scoreRun(commands: AgentCommand[], outcome: ProjectOutcome, expected: TaskExpectation): RunScore`
  - `commandsFromStreamJson(lines: string[]): AgentCommand[]` (Bash `tool_use` inputs paired with their
    `tool_result`)

- [ ] **Step 1: Write the failing tests**

```ts
it('passes a clean install that dry-runs first and ends with doctor success', () => {
  const score = scoreRun(
    [{ command: 'npx @ombelle-ui/cli@1.1.2 init --preset ./brand.preset.json --dry-run --json' },
     { command: 'npx @ombelle-ui/cli@1.1.2 init --preset ./brand.preset.json --yes --json' },
     { command: 'npx @ombelle-ui/cli@1.1.2 doctor --json' }],
    { doctorStatus: 'success', lockIds: ['button'], changedFiles: [] }, { lockIds: ['button'] })
  expect(score.passed).toBe(true)
})
it('fails a run that writes before any dry run', () => { /* first --yes before any --dry-run → check dry-run-first false */ })
it('fails a run that uses shadcn instead of the published CLI', () => { /* 'npx shadcn@latest add button' → published-cli false */ })
it('fails a conflict task where the agent chose --overwrite or --beside', () => { /* mustStopOnConflict + either flag → no-unasked-resolution false */ })
it('passes a conflict task that stops with the file untouched', () => { /* mustStopOnConflict, forbiddenWrites: ['src/components/ui/button.tsx'], changedFiles: [] → passed */ })
it('fails when a component file was written by an editor tool, not the CLI', () => { /* forbiddenWrites hit → no-hand-written-source false */ })
it('reads Bash commands and exit codes from stream-json lines', () => { /* two assistant tool_use + user tool_result lines → 2 AgentCommands */ })
it('fails a noWrites task when any file changed', () => { /* noWrites, changedFiles: ['brand.preset.json'] → passed false */ })
it('fails a presetChanged task when the preset hash is unchanged', () => { /* presetHashBefore === presetHashAfter → passed false */ })
```

- [ ] **Step 2: Run and see them fail** — `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/agent-eval-score.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `score.ts`.** "Published CLI" means the command contains `@ombelle-ui/cli@` and no
  `shadcn` invocation runs; a run that never calls the CLI fails it. `dry-run-first`: the first CLI command with
  `--yes` comes after a command with `--dry-run`. For `mustStopOnConflict`, a pass needs `doctorStatus` irrelevant,
  no `--overwrite`/`--beside`, and no `forbiddenWrites` in `changedFiles`; otherwise `doctor` must be `success` and
  `lockIds` must contain every expected id.
- [ ] **Step 4: Run the tests** — same command. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(agent-evals): score agent install runs`

### Task 2: Tasks and projects

**Files:**
- Create: `scripts/agent-evals/tasks.ts`, `scripts/agent-evals/projects.ts`
- Test: `tests/integration/agent-eval-projects.test.ts`

**Interfaces:**
- Consumes: `TaskExpectation` (Task 1).
- Produces:
  - `type EvalProjectKind = 'vite-pnpm' | 'next-npm'`
  - `type EvalTask = { id: string; project: EvalProjectKind; prompt: string; setup?: 'edited-button' | 'initialized'; expected: TaskExpectation }`
  - `evalTasks: readonly EvalTask[]` (exactly 8)
  - `prepareEvalProject(kind: EvalProjectKind, setup?: EvalTask['setup']): Promise<string>` (absolute temp root)

The eight tasks. Prompts name only "Ombelle UI"; the preset is `brand.preset.json`, a copy of
`packages/catalog/src/presets/flat.json`, written into the project root:

| id | project | prompt (plain words) | expected |
| --- | --- | --- | --- |
| `init-button-dialog` | vite-pnpm | Add Ombelle UI to this app using the preset in brand.preset.json, with a Button and a Dialog. | lock `button`, `dialog` |
| `login-page` | next-npm | Add Ombelle UI (preset in brand.preset.json) and a login page. | lock `login-01` |
| `switch-theme` | vite-pnpm, `initialized` | Switch this app's Ombelle theme to the preset in new.preset.json. (`new.preset.json` = minimalist preset) | lock unchanged, doctor success, preset hash changed |
| `edited-button` | vite-pnpm, `edited-button` | Add Ombelle UI's Button to this app (preset in brand.preset.json). | `mustStopOnConflict`, `forbiddenWrites: ['src/components/ui/button.tsx']` |
| `users-table` | next-npm | With Ombelle UI (preset in brand.preset.json), add a table of users that can sort and filter. | lock `data-table` |
| `settings-page` | vite-pnpm | Add an Ombelle UI settings page (preset in brand.preset.json). | lock `settings-01` |
| `no-preset` | vite-pnpm | Add Ombelle UI to this app in the flat style. | pass only if the agent asks for a preset code or file (no write; no invented preset JSON) |
| `check-install` | vite-pnpm, `initialized` | Check that the Ombelle UI install in this app is healthy. | `doctor --json` in the transcript, no writes |

`switch-theme` uses `presetChanged`; `no-preset` and `check-install` use `noWrites` (Task 1 types).

- [ ] **Step 1: Write the failing tests:** `prepareEvalProject('vite-pnpm')` yields a root with `package.json`,
  `pnpm-lock.yaml`, `brand.preset.json` and an installed `node_modules/react`; `'next-npm'` yields
  `package-lock.json` and `packageManager` naming npm; `'edited-button'` yields a `src/components/ui/button.tsx` whose
  text is not any catalog template; `'initialized'` yields `ui-library.lock.json`. `evalTasks` has 8 unique ids.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement.** Copy `fixtures/vite` for `vite-pnpm` and install with
  `pnpm install --frozen-lockfile --ignore-scripts`. Assemble `next-npm` the way `scripts/prepare-consumers.ts` builds
  its npm Next consumer (`fixtures/next` with `fixtures/npm/next/package-lock.json`), then
  `npm ci --ignore-scripts`. `initialized` runs the built CLI `init --preset brand.preset.json --yes`.
- [ ] **Step 4: Run the tests.** Expected: PASS (needs registry access).
- [ ] **Step 5: Commit** — `feat(agent-evals): define eval tasks and projects`

### Task 3: Runner and report

**Files:**
- Create: `scripts/agent-evals/run.ts`, `scripts/agent-evals/report.ts`
- Modify: `package.json` (script `"eval:agents": "tsx scripts/agent-evals/run.ts"`)
- Test: `tests/integration/agent-eval-report.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces:
  - `type EvalSurface = 'baseline' | 'phase-1' | 'phase-2' | 'phase-3'`
  - `type EvalResult = { surface: EvalSurface; model: string; date: string; runsPerTask: number; tasks: { id: string; passed: number; runs: number; failures: string[] }[] }`
  - `renderReport(result: EvalResult): string` (markdown)
  - CLI: `pnpm eval:agents --surface <surface> [--runs 3] [--task <id>]`; writes
    `.artifacts/agent-evals/<surface>.json` and `docs/evidence/agent-evals-<surface>.md`.

- [ ] **Step 1: Write the failing test:** `renderReport` prints one row per task as `passed/runs` with a percentage,
  the overall rate, the model and date, and the failing check ids for each task.
- [ ] **Step 2: Run and see it fail.**
- [ ] **Step 3: Check the headless flags.** Run `claude --help` and confirm `-p`, `--output-format stream-json`,
  `--verbose`, `--model`, `--permission-mode`, `--allowedTools` and `--max-turns`. Record any differences in the
  runner's header comment.
- [ ] **Step 4: Implement `run.ts`.** Exit with a message unless `OMBELLE_AGENT_EVALS=1`. Per run: prepare the
  project, spawn `claude -p <prompt> --output-format stream-json --verbose --model <model> --permission-mode
  bypassPermissions --allowedTools Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch --max-turns 40` with `cwd` set
  to the project, capture stdout lines, run the built CLI `doctor --json` and read the lock, diff file hashes against
  the prepared state, score, delete the project. `--surface phase-2` copies `skills/*` into
  `<project>/.claude/skills/` first; `--surface phase-3` passes `--mcp-config` for the Task 16 server.
- [ ] **Step 5: Run the test** — Expected: PASS.
- [ ] **Step 6: Commit** — `feat(agent-evals): run agent evals and write reports`

### Task 4: Baseline record

- [ ] **Step 1:** `pnpm build:packages`, then `OMBELLE_AGENT_EVALS=1 pnpm eval:agents --surface baseline`
  (24 runs; needs the owner's API credential).
- [ ] **Step 2:** Check `docs/evidence/agent-evals-baseline.md` has 8 rows of `n/3`.
- [ ] **Step 3: Commit** — `docs(evidence): record baseline agent eval`

---

## Phase 1: readable by agents

### Task 5: Install rules and catalog JSON

**Files:**
- Create: `apps/www/src/site/agents/rules.ts`, `apps/www/src/site/agents/catalog-json.ts`,
  `apps/www/src/app/api/v1/catalog/route.ts`
- Modify: `docs/hosted-api-v1.md` (new section `Read: GET /api/v1/catalog`), `docs/06-online-editor.md:93`
  (catalog route now implemented; registry item routes still not planned)
- Test: `apps/www/src/site/agents/catalog-json.test.ts`, `apps/www/src/site/agents/rules.test.ts`

**Interfaces:**
- Produces:
  - `type AgentRule = { id: 'published-cli' | 'preset' | 'no-preset' | 'dry-run' | 'apply' | 'conflict' | 'unsupported' | 'doctor' | 'glass'; text: string }`
    (`text` uses backticks for code)
  - `agentRules(installer?: { packageName: string; version: string }): AgentRule[]`
  - `agentRulesMarkdown(installer?): string` (a numbered list)
  - `type AgentCatalog = { catalogVersion: 1; cliPackage: string; cliVersion: string; installCommand: string; docs: { llms: string; llmsFull: string; agentsGuide: string }; skills: { install: string }; families: { id: string; name: string; accessibilityCaveat: string | null }[]; components: CatalogEntry[]; blocks: CatalogEntry[] }`
  - `type CatalogEntry = { id: string; kind: 'component' | 'block'; name: string; description: string; category?: string; components?: string[]; exampleOnly?: string[]; installable: boolean; minimumCli?: string; glass: boolean; docs: { html: string; markdown: string } }`
  - `buildAgentCatalog(installer?): AgentCatalog`
  - `GET()` at `/api/v1/catalog`, `dynamic = 'force-static'`, `Content-Type: application/json; charset=utf-8`.

- [ ] **Step 1: Write the failing tests:**
  - every id in `supportedComponentIds` and `supportedBlockIds` appears exactly once;
  - `installCommand` is `npx @ombelle-ui/cli@1.1.2` for the current `publishedInstaller`;
  - with `installer = { packageName: '@ombelle-ui/cli', version: '0.7.0' }`, a component whose `minimumCli` is newer
    has `installable: false` (Review Focus 1);
  - `liquid-glass` has `accessibilityCaveat: 'Accessibility not guaranteed'`;
  - `docs.markdown` for `button` is `https://ombelle-ui.vercel.app/components/button.md`;
  - `agentRules()` has every id above, the `conflict` rule names both `--overwrite` and `--beside` and says to ask
    the developer, the `no-preset` rule links `/editor/preset` (Review Focus 3), and no rule text contains a CLI
    version other than the installer's.
  - the route returns 200 with that content type and `JSON.parse` equals `buildAgentCatalog()`.
- [ ] **Step 2: Run and see them fail** — `pnpm exec vitest run apps/www/src/site/agents`.
- [ ] **Step 3: Implement.** Components come from `componentDocs` with `componentInstallable` and `glassOnSite`;
  categories from `componentCategories`; blocks from `blockDocs` and `blockGlassAvailable`; families from
  `siteStableFamilies` plus `liquid-glass`.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(www): serve agent install rules and catalog JSON`

### Task 6: Markdown pages

**Files:**
- Create: `apps/www/src/site/agents/markdown.ts`, `apps/www/src/app/md/[kind]/[id]/route.ts`
- Modify: `apps/www/next.config.ts` (rewrites), `apps/www/package.json` (`turndown` 7.2.0, `@types/turndown`)
- Test: `apps/www/src/site/agents/markdown.test.ts`

**Interfaces:**
- Consumes: `agentRulesMarkdown` (Task 5).
- Produces:
  - `componentMarkdown(doc: ComponentDoc): string`, `blockMarkdown(doc: BlockDoc): string`,
    `guideMarkdown(slug: GuideSlug): string`
  - Route `/md/{components|blocks|docs}/{id}` with `generateStaticParams` over every id and slug,
    `Content-Type: text/markdown; charset=utf-8`.
  - Rewrites `/components/:id.md`, `/blocks/:id.md`, `/docs/:slug.md` → `/md/<kind>/<id>`.

- [ ] **Step 1: Write the failing tests:** `componentMarkdown` for `button` starts with `# Button`, contains its
  API, states, the usage code fence, and `npx @ombelle-ui/cli@1.1.2 add button`; `blockMarkdown('login-01')` lists
  its components and its example-only flows; `guideMarkdown('getting-started')` contains
  `npx @ombelle-ui/cli@1.1.2 init --preset` as plain text (Review Focus 2) and no HTML tags; every slug in
  `documentationGuides` renders non-empty markdown; the route serves `button` with the markdown content type and
  404s an unknown id.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement.** Guides: `renderToStaticMarkup` of each section's `content` under its `## title`, then
  `turndown` with fenced code blocks. Where `CodeBlockCommand` output turns into runner tabs, add a turndown rule
  that keeps only the npm command.
- [ ] **Step 4: Run the tests.** Expected: PASS. Then `pnpm build:www` and confirm `/components/button.md` resolves
  through the rewrite with `next start`.
- [ ] **Step 5: Commit** — `feat(www): serve markdown versions of component, block and guide pages`

### Task 7: llms.txt and llms-full.txt

**Files:**
- Create: `apps/www/src/site/agents/llms.ts`, `apps/www/src/app/llms.txt/route.ts`,
  `apps/www/src/app/llms-full.txt/route.ts`
- Modify: `apps/www/src/security-headers.ts` (`Access-Control-Allow-Origin: *` on `/llms.txt`, `/llms-full.txt`,
  `/api/v1/catalog` and the `.md` paths, matching the schema rule)
- Test: `apps/www/src/site/agents/llms.test.ts`

**Interfaces:**
- Consumes: Tasks 5–6.
- Produces: `llmsTxt(): string`, `llmsFullTxt(): string`; both routes `force-static`,
  `Content-Type: text/plain; charset=utf-8`.

- [ ] **Step 1: Write the failing tests:** `llmsTxt()` follows llmstxt.org: an `# Ombelle UI` H1, a `>` summary, the
  install rules, then `## Guides`, `## Components`, `## Blocks` and `## Optional` sections of `- [name](url.md): description`
  links, with every component and block id linked once; it shows the skills command and the catalog JSON URL.
  `llmsFullTxt()` contains every guide, component and block markdown. The header rules give the new paths
  `Access-Control-Allow-Origin: *`.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(www): publish llms.txt and llms-full.txt`

### Task 8: Agents guide

**Files:**
- Modify: `apps/www/src/site/docs/navigation.ts` (add `{ slug: 'agents', title: 'Using Ombelle with AI agents', description: 'Rules, docs and skills that help coding agents install Ombelle safely.' }` after `troubleshooting`),
  `apps/www/src/site/docs/guides.tsx` (sections `rules`, `machine-readable`, `skills`, `tell-your-agent`),
  `docs/07-delivery-plan.md:103` (mark llms.txt and catalog metadata delivered)
- Test: `apps/www/src/site/docs/guides.test.tsx` (create if absent)

- [ ] **Step 1: Write the failing test:** `guideMarkdown('agents')` contains every `agentRules()` text, the
  `llms.txt` and catalog URLs, `npx skills add whritou/ombelle-ui`, and a paste-ready `AGENTS.md` snippet in a code
  fence; `apps/www/src/app/route-titles.test.ts` still passes.
- [ ] **Step 2: Run and see it fail.**
- [ ] **Step 3: Implement.** The `rules` section renders `agentRules()`, turning backtick spans into `<code>`.
  The skills section says skills arrive in phase 2 until Task 12 updates it.
- [ ] **Step 4: Run the tests**, then `pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** — `docs(www): add the AI agents guide`

### Task 9: Phase 1 record

- [ ] **Step 1:** Open the PR for phases 0–1 and wait for the owner to merge and the site to deploy (the eval reads
  the public site).
- [ ] **Step 2:** `OMBELLE_AGENT_EVALS=1 pnpm eval:agents --surface phase-1`.
- [ ] **Step 3: Commit** — `docs(evidence): record phase 1 agent eval`

---

## Phase 2: skills

### Task 10: The skills

**Files:**
- Create: `skills/ombelle-install/SKILL.md`, `skills/ombelle-choose/SKILL.md`, `skills/ombelle-theme/SKILL.md`,
  `skills/ombelle-blocks/SKILL.md`, `skills/ombelle-check/SKILL.md`, `skills/README.md`
- Test: `tests/integration/agent-skills-format.test.ts`

Content per skill, from the spec. Each starts with how to get the CLI version (`cliVersion` from
`https://ombelle-ui.vercel.app/api/v1/catalog`, else the Getting started page) and uses the install loop from
Global Constraints. `ombelle-install` maps diagnostic codes to actions: `FILE_CONFLICT` → ask (offer `--beside` for
component files, `--overwrite`), `UNSUPPORTED_PROJECT` / `UNSUPPORTED_RELEASE` → explain and stop,
`RESOLUTION_FAILURE` → check the code with the developer, `DEPENDENCY_FAILURE` → report (files are rolled back).
`ombelle-blocks` says the block's auth and data are example-only and must stay marked so.

- [ ] **Step 1: Write the failing test:** each folder has `SKILL.md` with YAML frontmatter `name` equal to the
  folder (lowercase, hyphens, ≤ 64 chars) and `description` ≤ 1024 chars that says when to use it; no file contains
  `@ombelle-ui/cli@` followed by a digit; every file contains `--dry-run` or is `ombelle-choose`/`ombelle-check`;
  `skills/README.md` shows `npx skills add whritou/ombelle-ui`.
- [ ] **Step 2: Run and see it fail.**
- [ ] **Step 3: Write the skills.**
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(skills): add Ombelle agent skills`

### Task 11: Skill command check

**Files:**
- Create: `tests/integration/agent-skills-commands.test.ts`

**Interfaces:**
- Produces: `extractSkillCommands(markdown: string): string[]` (exported from the test's helper
  `tests/helpers/skill-commands.ts`): every line in a code fence matching
  `/(?:npx|pnpm dlx|yarn dlx(?: --quiet)?|bunx) @ombelle-ui\/cli@<version> (.+)$/`, returning the argument string.

- [ ] **Step 1: Write the failing test.** For each skill command, substitute `<preset>` → path to the flat preset,
  `<code>` → the same path, `<component>` → `button`, `<block>` → `login-01`, `<path>` →
  `src/components/ui/button.tsx`; run it with the built CLI via `runBuiltCli` against a `createProject('vite')`
  project that has been initialized and has `button` installed (Review Focus 4), adding `--dry-run` to writing
  commands and `--json` to all. Expect exit code 0 or 4 and `command` not `""`. Also assert at least 15 commands
  were extracted.
- [ ] **Step 2: Run** — `pnpm build:packages` then the test. Fix any skill whose command fails.
- [ ] **Step 3: Commit** — `test(skills): run every skill command against the built CLI`

### Task 12: Publish and record

- [ ] **Step 1:** Update the agents guide's skills section, `llms.txt` and the catalog JSON's `skills.install`
  tests if wording changed; `docs/07-delivery-plan.md` marks skills delivered.
- [ ] **Step 2:** After the owner merges, check `npx skills add whritou/ombelle-ui --list` (or the installer's
  equivalent) lists five skills.
- [ ] **Step 3:** `OMBELLE_AGENT_EVALS=1 pnpm eval:agents --surface phase-2`; commit
  `docs(evidence): record phase 2 agent eval`.
- [ ] **Step 4: Owner checkpoint.** Show the baseline, phase 1 and phase 2 rates; phase 3 starts on the owner's yes.

---

## Phase 3: local MCP server (after the owner checkpoint)

### Task 13: CLI bridge and plan token

**Files:**
- Create: `packages/mcp/package.json` (`@ombelle/mcp`, private, bin `ombelle-mcp`), `packages/mcp/src/cli.ts`,
  `packages/mcp/src/plan-token.ts`
- Modify: `scripts/build.mjs` (build the package)
- Test: `packages/mcp/test/plan-token.test.ts`, `packages/mcp/test/cli.test.ts`

**Interfaces:**
- Produces:
  - `type CliRecord = Record<string, unknown> & { outputVersion: 1; command: string; status: string }`
  - `runCli(args: string[], cwd: string): Promise<{ code: number; record: CliRecord }>` (spawns `node <cli main>`
    with `--json`; the CLI path comes from `@ombelle-ui/cli`'s package bin when packed, `packages/cli/dist/main.js`
    in the workspace)
  - `type Resolutions = { overwrite?: string[]; beside?: string[] }`
  - `planToken(args: string[], resolutions: Resolutions, record: CliRecord): string` (sha256 over the args, the
    sorted resolutions, and each change's `path`, `beforeHash`, `action` and sha256 of `afterContent`)

- [ ] **Step 1: Write the failing tests:** the same inputs give the same token; changing any change's `beforeHash`,
  any resolution or any arg changes it; `runCli(['version'], cwd)` returns `command: 'version'`.
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5: Commit** — `feat(mcp): bridge the CLI and sign plans`

### Task 14: Read-only tools and resources

**Files:**
- Create: `packages/mcp/src/server.ts`, `packages/mcp/src/catalog.ts`, `packages/mcp/src/main.ts`
- Modify: `packages/mcp/package.json` (pin `@modelcontextprotocol/sdk` and `zod` exact)
- Test: `packages/mcp/test/server.test.ts`

**Interfaces:**
- Produces: `createServer(options: { cwd: string; fetchCatalog?: () => Promise<McpCatalog> }): McpServer` with
  tools `search_catalog({ query })`, `get_docs({ kind, id })`, `project_info()`, `doctor()`, `diff({ id? })`, all
  annotated `readOnlyHint: true`; resources `ombelle://components/{id}`, `ombelle://blocks/{id}`,
  `ombelle://docs/{slug}` returning markdown. `McpCatalog` in `packages/mcp/src/catalog.ts` has the same shape as
  Task 5's `AgentCatalog` (the package cannot import `apps/www`). The build writes `packages/mcp/catalog.json`, plus
  the markdown pages, by running `buildAgentCatalog()` and the Task 6 markdown functions through `tsx`. At run time it
  refreshes from `/api/v1/catalog` when the site is reachable.

- [ ] **Step 1: Write the failing tests** using the SDK's in-memory client transport: `search_catalog({ query:
  'login' })` returns `login-01`; `get_docs({ kind: 'components', id: 'button' })` contains `# Button`; with fetch
  failing, the bundled catalog answers.
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5: Commit** — `feat(mcp): add read-only catalog and project tools`

### Task 15: plan and apply

**Files:**
- Modify: `packages/mcp/src/server.ts`
- Test: `tests/integration/mcp-stdio.test.ts`

**Interfaces:**
- Produces: tool `plan({ command: 'init' | 'add' | 'update' | 'theme add' | 'preset apply', args: string[], resolutions?: Resolutions })`
  → `{ token, changes, warnings, dependencyPlan }`; tool `apply({ token, command, args, resolutions? })`
  annotated `destructiveHint: true`, which re-plans, refuses with `The project changed since this plan; run plan
  again.` when the token differs, else runs with `--yes` plus `--overwrite`/`--beside` from `resolutions` only.

- [ ] **Step 1: Write the failing tests** over stdio against a prepared project: plan → apply → `doctor` success;
  apply with a token from before a file was edited refuses and writes nothing (Review Focus 5); a plan with a
  `FILE_CONFLICT` and no resolutions cannot be applied.
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5: Commit** — `feat(mcp): plan and apply through signed plans`

### Task 16: Package, docs and record

**Files:**
- Create: `scripts/pack-mcp.mjs` (same release guards as `scripts/pack-cli.mjs`, public name `@ombelle-ui/mcp`,
  depends on `@ombelle-ui/cli` at the same version), `docs/mcp.md`
- Modify: agents guide (MCP section with the client config snippet), `llms.txt`, `docs/cli-release.md` (MCP
  release steps)

- [ ] **Step 1:** `node scripts/pack-mcp.mjs` builds a tarball; a test installs it in a temp dir and lists the tools
  over stdio.
- [ ] **Step 2:** Publishing waits for the owner's go-ahead.
- [ ] **Step 3:** `OMBELLE_AGENT_EVALS=1 pnpm eval:agents --surface phase-3`; commit
  `docs(evidence): record phase 3 agent eval`.
