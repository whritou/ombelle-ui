/**
 * Agent eval runner. Opt-in only: set OMBELLE_AGENT_EVALS=1. Never run in CI or check:foundation.
 *
 * Usage: pnpm eval:agents --surface <baseline|phase-1|phase-2|phase-3> [--runs 3] [--task <id>]
 *
 * Environment:
 *   OMBELLE_AGENT_EVALS=1         required to run anything
 *   OMBELLE_AGENT_EVAL_CLAUDE     agent executable (default `claude`)
 *   OMBELLE_AGENT_EVAL_MODEL      model (default claude-opus-5-5)
 *
 * Headless flags used, unverified until the first real run (the claude CLI was
 * not installed where this was written):
 *   -p <prompt> --output-format stream-json --verbose --model <model>
 *   --permission-mode bypassPermissions
 *   --allowedTools Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch
 *   --max-turns 40
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { commandsFromStreamJson, scoreRun, type ProjectOutcome, type RunScore } from './score.js'
import { evalTasks, type EvalTask } from './tasks.js'
import { prepareTaskProject } from './projects.js'
import { renderReport, type EvalResult, type EvalSurface } from './report.js'

const SURFACES: EvalSurface[] = ['baseline', 'phase-1', 'phase-2', 'phase-3']
const SKIP_DIRS = new Set(['node_modules', '.git', '.claude'])
const win = process.platform === 'win32'

export type RunArgs = { surface: EvalSurface; runs: number; task: string | undefined }

export function parseArgs(argv: string[]): RunArgs {
  const value = (flag: string) => {
    const i = argv.indexOf(flag)
    return i === -1 ? undefined : argv[i + 1]
  }
  const surface = value('--surface') as EvalSurface | undefined
  if (!surface || !SURFACES.includes(surface))
    throw new Error(`--surface must be one of ${SURFACES.join(', ')}`)
  const runsText = value('--runs')
  const runs = runsText === undefined ? 3 : Number(runsText)
  if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs must be a positive integer')
  return { surface, runs, task: value('--task') }
}

/** Sorted relative POSIX paths that were added, removed or modified. */
export function diffTrees(before: Record<string, string>, after: Record<string, string>): string[] {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...paths].filter((p) => before[p] !== after[p]).sort()
}

type Lock = { artifacts?: Record<string, { logicalPath?: string; kind?: string }> } | undefined

export function lockIdsFromLock(lock: Lock): string[] {
  const ids = new Set<string>()
  for (const artifact of Object.values(lock?.artifacts ?? {})) {
    if (!artifact.logicalPath) continue
    if (artifact.kind === 'component')
      ids.add(path.posix.basename(artifact.logicalPath).replace(/\.(tsx|css)$/, ''))
    if (artifact.kind === 'block')
      for (const part of artifact.logicalPath.split('/')) ids.add(part.replace(/\.(tsx|css)$/, ''))
  }
  ids.delete('blocks')
  return [...ids]
}

export function aggregateRuns(id: string, scores: RunScore[]): EvalResult['tasks'][number] {
  return {
    id,
    passed: scores.filter((s) => s.passed).length,
    runs: scores.length,
    failures: scores.flatMap((s) => s.checks.filter((c) => !c.passed).map((c) => c.id)),
  }
}

export async function hashTree(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile())
        out[path.relative(root, full).split(path.sep).join('/')] = createHash('sha256')
          .update(await fs.readFile(full))
          .digest('hex')
    }
  }
  await walk(root)
  return out
}

async function runDoctor(root: string): Promise<ProjectOutcome['doctorStatus']> {
  const cli = path.resolve('packages/cli/dist/main.js')
  return new Promise((resolve) => {
    let out = ''
    const child = spawn(process.execPath, [cli, 'doctor', '--json'], { cwd: root, windowsHide: true })
    child.stdout.on('data', (s) => (out += s))
    child.on('error', () => resolve('missing'))
    child.on('exit', () => {
      try {
        const parsed = JSON.parse(out) as { status?: string }
        resolve(parsed.status === 'success' ? 'success' : 'failed')
      } catch {
        resolve('missing')
      }
    })
  })
}

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return undefined
  }
}

async function presetHash(root: string): Promise<string | undefined> {
  try {
    return createHash('sha256').update(await fs.readFile(path.join(root, 'ui-preset.json'))).digest('hex')
  } catch {
    return undefined
  }
}

function runAgent(executable: string, args: string[], cwd: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, shell: win, windowsHide: true })
    let out = ''
    child.stdout.on('data', (s) => (out += s))
    child.on('error', (error) =>
      reject(
        new Error(
          `Cannot run the agent "${executable}": ${error.message}. Set OMBELLE_AGENT_EVAL_CLAUDE to the claude executable.`,
        ),
      ),
    )
    child.on('exit', (code) => {
      if (win && code === 1 && out.trim() === '')
        return reject(
          new Error(
            `The agent "${executable}" produced no output. Set OMBELLE_AGENT_EVAL_CLAUDE to the claude executable.`,
          ),
        )
      resolve(out.split('\n').filter((l) => l.trim() !== ''))
    })
  })
}

async function runOnce(task: EvalTask, args: RunArgs, executable: string, model: string): Promise<RunScore> {
  const root = await prepareTaskProject(task)
  try {
    if (args.surface === 'phase-2') {
      const skills = path.resolve('skills')
      const entries = await fs.readdir(skills, { withFileTypes: true }).catch(() => [])
      for (const entry of entries)
        if (entry.isDirectory())
          await fs.cp(path.join(skills, entry.name), path.join(root, '.claude/skills', entry.name), {
            recursive: true,
          })
    }
    const before = await hashTree(root)
    const presetHashBefore = await presetHash(root)
    const lines = await runAgent(
      executable,
      [
        '-p',
        JSON.stringify(task.prompt),
        '--output-format', 'stream-json',
        '--verbose',
        '--model', model,
        '--permission-mode', 'bypassPermissions',
        '--allowedTools', 'Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch',
        '--max-turns', '40',
      ],
      root,
    )
    const after = await hashTree(root)
    const lock = (await readJson(path.join(root, 'ui-library.lock.json'))) as Lock
    const outcome: ProjectOutcome = {
      doctorStatus: lock === undefined ? 'missing' : await runDoctor(root),
      lockIds: lockIdsFromLock(lock),
      changedFiles: diffTrees(before, after),
      presetHashBefore,
      presetHashAfter: await presetHash(root),
    }
    return scoreRun(commandsFromStreamJson(lines), outcome, task.expected)
  } finally {
    await fs.rm(root, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function main(argv: string[]): Promise<number> {
  if (process.env.OMBELLE_AGENT_EVALS !== '1') {
    console.log('Agent evals are opt-in and cost model usage. Set OMBELLE_AGENT_EVALS=1 to run them. Nothing was run.')
    return 0
  }
  const args = parseArgs(argv)
  if (args.surface === 'phase-3') {
    console.error('phase-3 needs the MCP package (Task 16)')
    return 1
  }
  const tasks = evalTasks.filter((t) => args.task === undefined || t.id === args.task)
  if (tasks.length === 0) throw new Error(`Unknown task "${args.task}"`)
  const executable = process.env.OMBELLE_AGENT_EVAL_CLAUDE ?? 'claude'
  const model = process.env.OMBELLE_AGENT_EVAL_MODEL ?? 'claude-opus-5-5'
  const results: EvalResult['tasks'] = []
  for (const task of tasks) {
    const scores: RunScore[] = []
    for (let i = 0; i < args.runs; i++) {
      console.log(`${task.id} run ${i + 1}/${args.runs}`)
      scores.push(await runOnce(task, args, executable, model))
    }
    results.push(aggregateRuns(task.id, scores))
  }
  const result: EvalResult = {
    surface: args.surface,
    model,
    date: new Date().toISOString().slice(0, 10),
    runsPerTask: args.runs,
    tasks: results,
  }
  await fs.mkdir('.artifacts/agent-evals', { recursive: true })
  await fs.writeFile(`.artifacts/agent-evals/${args.surface}.json`, JSON.stringify(result, null, 2) + '\n')
  await fs.mkdir('docs/evidence', { recursive: true })
  await fs.writeFile(`docs/evidence/agent-evals-${args.surface}.md`, renderReport(result))
  console.log(renderReport(result))
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exit(1)
    },
  )
}
