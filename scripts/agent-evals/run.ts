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
 *   -p (prompt on stdin: unverified, `claude -p` should read stdin when given no prompt argument)
 *   --output-format stream-json --verbose --model <model>
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
    if (artifact.kind === 'component' || artifact.kind === 'block')
      ids.add(path.posix.basename(artifact.logicalPath).replace(/\.(tsx|css)$/, ''))
  }
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

type Captured = { code: number | null; stdout: string; stderrTail: string; timedOut: boolean; spawnError?: Error }

const STDERR_TAIL = 4096

/** Spawns without a shell unless told; drains both streams, keeps a bounded stderr tail, resolves on `close`. */
function capture(
  executable: string,
  args: string[],
  options: { cwd: string; shell?: boolean; input?: string; timeoutMs?: number },
): Promise<Captured> {
  return new Promise((resolve) => {
    const child = spawn(executable, args, { cwd: options.cwd, shell: options.shell ?? false, windowsHide: true })
    let stdout = ''
    let stderrTail = ''
    let timedOut = false
    let spawnError: Error | undefined
    const timer =
      options.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            timedOut = true
            child.kill()
          }, options.timeoutMs)
    child.stdout.on('data', (s) => (stdout += s))
    child.stderr.on('data', (s) => (stderrTail = (stderrTail + s).slice(-STDERR_TAIL)))
    child.on('error', (error) => {
      spawnError = error
    })
    child.on('close', (code) => {
      if (timer) clearTimeout(timer)
      resolve({ code, stdout, stderrTail, timedOut, spawnError })
    })
    child.stdin.on('error', () => undefined)
    child.stdin.end(options.input ?? '')
  })
}

class InfraError extends Error {}

const SAFE_ARG = /^[A-Za-z0-9._:,=/-]+$/

/**
 * Headless arguments (the prompt goes on stdin, so no quoting is ever needed).
 * A shell is enabled only for .cmd/.bat shims, and then every argument must be plain.
 */
export function agentInvocation(executable: string, model: string): { args: string[]; shell: boolean } {
  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--model', model,
    '--permission-mode', 'bypassPermissions',
    '--allowedTools', 'Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch',
    '--max-turns', '40',
  ]
  const shell = /\.(cmd|bat)$/i.test(executable)
  if (shell) for (const arg of args) if (!SAFE_ARG.test(arg)) throw new Error(`Unsafe agent argument: ${arg}`)
  return { args, shell }
}

export function hasResultEvent(lines: string[]): boolean {
  return lines.some((line) => {
    try {
      return (JSON.parse(line) as { type?: string }).type === 'result'
    } catch {
      return false
    }
  })
}

export async function skillFolders(skillsDir: string): Promise<string[]> {
  const entries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => [])
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  if (folders.length === 0) throw new Error('phase-2 needs skills/ (Task 10)')
  return folders
}

async function runDoctor(root: string): Promise<ProjectOutcome['doctorStatus']> {
  const cli = path.resolve('packages/cli/dist/main.js')
  const result = await capture(process.execPath, [cli, 'doctor', '--json'], { cwd: root })
  try {
    const parsed = JSON.parse(result.stdout) as { status?: string }
    return parsed.status === 'success' ? 'success' : 'failed'
  } catch {
    return 'missing'
  }
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

async function preflight(executable: string): Promise<void> {
  const shell = /\.(cmd|bat)$/i.test(executable)
  const result = await capture(executable, ['--version'], { cwd: process.cwd(), shell, timeoutMs: 30000 })
  if (result.spawnError || result.code !== 0)
    throw new InfraError(
      `Cannot run the agent "${executable}" (${result.spawnError?.message ?? `exit ${result.code}`}). Set OMBELLE_AGENT_EVAL_CLAUDE to the claude executable.
${result.stderrTail}`,
    )
}

async function runAgent(
  executable: string,
  model: string,
  prompt: string,
  cwd: string,
  timeoutMs: number,
): Promise<string[]> {
  const { args, shell } = agentInvocation(executable, model)
  const result = await capture(executable, args, { cwd, shell, input: prompt, timeoutMs })
  const lines = result.stdout.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (result.spawnError)
    throw new InfraError(`Agent failed to start: ${result.spawnError.message}
${result.stderrTail}`)
  if (result.timedOut) throw new InfraError(`Agent timed out after ${timeoutMs} ms
${result.stderrTail}`)
  if (result.code !== 0 && !hasResultEvent(lines))
    throw new InfraError(`Agent exited ${result.code} without a result event
${result.stderrTail}`)
  return lines
}

async function runOnce(task: EvalTask, args: RunArgs, executable: string, model: string, timeoutMs: number): Promise<RunScore> {
  const root = await prepareTaskProject(task)
  try {
    if (args.surface === 'phase-2') {
      const skills = path.resolve('skills')
      for (const name of await skillFolders(skills))
        await fs.cp(path.join(skills, name), path.join(root, '.claude/skills', name), { recursive: true })
    }
    const before = await hashTree(root)
    const presetHashBefore = await presetHash(root)
    const lines = await runAgent(executable, model, task.prompt, root, timeoutMs)
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
  if (args.surface === 'phase-2') await skillFolders(path.resolve('skills'))
  const tasks = evalTasks.filter((t) => args.task === undefined || t.id === args.task)
  if (tasks.length === 0) throw new Error(`Unknown task "${args.task}"`)
  const executable = process.env.OMBELLE_AGENT_EVAL_CLAUDE ?? 'claude'
  const model = process.env.OMBELLE_AGENT_EVAL_MODEL ?? 'claude-opus-5-5'
  const timeoutMs = Number(process.env.OMBELLE_AGENT_EVAL_TIMEOUT_MS ?? 15 * 60 * 1000)
  await preflight(executable)
  const results: EvalResult['tasks'] = []
  for (const task of tasks) {
    const scores: RunScore[] = []
    for (let i = 0; i < args.runs; i++) {
      console.log(`${task.id} run ${i + 1}/${args.runs}`)
      scores.push(await runOnce(task, args, executable, model, timeoutMs))
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
