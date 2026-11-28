// Session harness for the agent evals: the agent under test is a fresh subagent of a Claude Code session instead of
// a headless `claude -p` process, so no separate CLI or API credential is needed. The session drives the loop:
//
//   tsx scripts/agent-evals/session.ts prepare <task-id>                      → prints the project root
//   (the session gives the task prompt to a fresh subagent working only in that root; the subagent ends its
//    reply with a ```commands block listing every shell command it ran, which the session saves to a file)
//   tsx scripts/agent-evals/session.ts score <task-id> <root> <commands-file> <out-dir>
//   tsx scripts/agent-evals/session.ts report <out-dir> <surface> <model>
//
// Differences from run.ts, recorded in every report: commands come from the agent's own list rather than a captured
// transcript, and the subagent inherits the session's context (it is not isolated from the user's settings).
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { scoreRun, type AgentCommand, type ProjectOutcome, type RunScore } from './score.js'
import { evalTasks, type EvalTask } from './tasks.js'
import { prepareTaskProject } from './projects.js'
import { renderReport, type EvalResult, type EvalSurface } from './report.js'
import { aggregateRuns, diffTrees, hashTree, lockIdsFromLock, presetHash, readJson, runDoctor, type Lock } from './run.js'

type Before = { tree: Record<string, string>; presetHash?: string }
type ScoreLine = { task: string; score: RunScore }

const beforeFile = (root: string) => `${root}.before.json`

function findTask(id: string): EvalTask {
  const task = evalTasks.find((t) => t.id === id)
  if (!task) throw new Error(`Unknown task "${id}"`)
  return task
}

/** Commands from the agent's list: one per line, blank lines and a surrounding fence ignored. */
export function commandsFromList(text: string): AgentCommand[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('```'))
    .map((command) => ({ command }))
}

async function prepare(id: string): Promise<string> {
  const root = await prepareTaskProject(findTask(id))
  const before: Before = { tree: await hashTree(root), presetHash: await presetHash(root) }
  await fs.writeFile(beforeFile(root), JSON.stringify(before))
  return root
}

async function score(id: string, root: string, commandsPath: string, outDir: string): Promise<RunScore> {
  const task = findTask(id)
  try {
    const before = JSON.parse(await fs.readFile(beforeFile(root), 'utf8')) as Before
    const lock = (await readJson(path.join(root, 'ui-library.lock.json'))) as Lock
    const outcome: ProjectOutcome = {
      doctorStatus: lock === undefined ? 'missing' : await runDoctor(root),
      lockIds: lockIdsFromLock(lock),
      changedFiles: diffTrees(before.tree, await hashTree(root)),
      presetHashBefore: before.presetHash,
      presetHashAfter: await presetHash(root),
    }
    const result = scoreRun(commandsFromList(await fs.readFile(commandsPath, 'utf8')), outcome, task.expected)
    await fs.mkdir(outDir, { recursive: true })
    await fs.appendFile(path.join(outDir, 'scores.jsonl'), JSON.stringify({ task: id, score: result } satisfies ScoreLine) + '\n')
    return result
  } finally {
    await fs.rm(root, { recursive: true, force: true }).catch(() => undefined)
    await fs.rm(beforeFile(root), { force: true }).catch(() => undefined)
  }
}

async function report(outDir: string, surface: EvalSurface, model: string): Promise<string> {
  const lines = (await fs.readFile(path.join(outDir, 'scores.jsonl'), 'utf8')).split('\n').filter(Boolean)
  const scores = lines.map((l) => JSON.parse(l) as ScoreLine)
  const tasks = evalTasks
    .map((t) => aggregateRuns(t.id, scores.filter((s) => s.task === t.id).map((s) => s.score)))
    .filter((t) => t.runs > 0 || t.infra > 0)
  const runsPerTask = Math.max(0, ...tasks.map((t) => t.runs))
  const result: EvalResult = { surface, model, date: new Date().toISOString().slice(0, 10), runsPerTask, tasks }
  await fs.mkdir('.artifacts/agent-evals', { recursive: true })
  await fs.writeFile(`.artifacts/agent-evals/${surface}.json`, JSON.stringify({ harness: 'session', ...result }, null, 2) + '\n')
  const note = [
    '',
    '## Harness',
    '',
    'Session harness (`scripts/agent-evals/session.ts`): each run was a fresh Claude Code subagent given only the',
    'task prompt and the project folder. Commands come from the list the agent reported at the end of its run, not',
    'from a captured transcript; outcomes (`doctor`, lock, changed files, preset hash) were measured directly. The',
    'subagents shared the parent session’s context, so this is not an isolated agent.',
    '',
  ].join('\n')
  const markdown = renderReport(result) + note
  await fs.writeFile(`docs/evidence/agent-evals-${surface}.md`, markdown)
  return markdown
}

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv
  if (command === 'prepare' && rest.length === 1) return console.log(await prepare(rest[0]!))
  if (command === 'score' && rest.length === 4) {
    const result = await score(rest[0]!, rest[1]!, rest[2]!, rest[3]!)
    return console.log(JSON.stringify({ passed: result.passed, failed: result.checks.filter((c) => !c.passed).map((c) => `${c.id}: ${c.detail}`) }))
  }
  if (command === 'report' && rest.length === 3) return console.log(await report(rest[0]!, rest[1] as EvalSurface, rest[2]!))
  throw new Error('Usage: session.ts prepare <task> | score <task> <root> <commands-file> <out-dir> | report <out-dir> <surface> <model>')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
