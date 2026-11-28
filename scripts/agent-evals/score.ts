export type AgentCommand = { command: string; exitCode?: number }

export type ProjectOutcome = {
  doctorStatus: 'success' | 'failed' | 'missing'
  lockIds: string[]
  changedFiles: string[]
  presetHashBefore?: string
  presetHashAfter?: string
}

export type TaskExpectation = {
  lockIds: string[]
  mustStopOnConflict?: boolean
  forbiddenWrites?: string[]
  noWrites?: boolean
  presetChanged?: boolean
  /** Ombelle CLI subcommands the run must call, such as `doctor` or `theme add`. */
  requiredCommands?: string[]
}

export type RunScore = {
  passed: boolean
  checks: {
    id:
      | 'doctor'
      | 'lock'
      | 'published-cli'
      | 'required-commands'
      | 'dry-run-first'
      | 'no-unasked-resolution'
      | 'no-hand-written-source'
    passed: boolean
    detail: string
  }[]
}

type Check = RunScore['checks'][number]

type Segment = { kind: 'ombelle' | 'shadcn' | 'other'; tokens: string[]; argStart: number; text: string }

const RUNNERS: Record<string, string[]> = {
  npx: [],
  bunx: [],
  pnpm: ['dlx', 'exec'],
  yarn: ['dlx'],
  npm: ['exec'],
}

function classify(text: string): Segment {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  let i = 0
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i]!)) i++
  const runner = tokens[i]
  let kind: Segment['kind'] = 'other'
  let argStart = tokens.length
  if (runner !== undefined) {
    let target: string | undefined
    if (runner === 'shadcn') {
      target = runner
      argStart = i + 1
    }
    else if (runner in RUNNERS) {
      const subs = RUNNERS[runner]!
      let j = i + 1
      if (subs.length === 0 || (tokens[j] !== undefined && subs.includes(tokens[j]!))) {
        if (subs.length > 0) j++
        while (j < tokens.length && (tokens[j]!.startsWith('-') || tokens[j] === '--')) j++
        target = tokens[j]
        argStart = j + 1
      }
    }
    if (target !== undefined) {
      // Any version, tag or none: `@ombelle-ui/cli`, `@ombelle-ui/cli@1.1.2`, `@ombelle-ui/cli@latest`.
      if (/^@ombelle-ui\/cli(@\S+)?$/.test(target)) kind = 'ombelle'
      else if (/^shadcn(-ui)?(@|$)/.test(target)) kind = 'shadcn'
    }
  }
  return { kind, tokens, argStart, text: text.trim() }
}

const segmentsOf = (command: string): Segment[] =>
  command
    .split(/&&|\|\||[;|\n]/)
    .filter((part) => part.trim() !== '')
    .map(classify)

/** The leading non-flag words after the package target, e.g. `theme add` (a `--` separator is skipped). */
function subcommand(segment: Segment): string[] {
  const words: string[] = []
  for (const token of segment.tokens.slice(segment.argStart)) {
    if (token === '--' && words.length === 0) continue
    if (token.startsWith('-')) break
    words.push(token)
  }
  return words
}

const hasFlag = (segment: Segment, flag: string): boolean =>
  segment.tokens.slice(segment.argStart).some((t) => t === flag || t.startsWith(flag + '='))

export function scoreRun(
  commands: AgentCommand[],
  outcome: ProjectOutcome,
  expected: TaskExpectation,
): RunScore {
  const notRequired =
    expected.mustStopOnConflict === true ||
    (expected.noWrites === true && expected.lockIds.length === 0)
  const checks: Check[] = []

  checks.push(
    notRequired
      ? { id: 'doctor', passed: true, detail: 'not required' }
      : {
          id: 'doctor',
          passed: outcome.doctorStatus === 'success',
          detail: `doctor status ${outcome.doctorStatus}`,
        },
  )

  if (notRequired || (expected.noWrites === true && expected.lockIds.length === 0)) {
    checks.push({ id: 'lock', passed: true, detail: 'not required' })
  } else {
    const missing = expected.lockIds.filter((id) => !outcome.lockIds.includes(id))
    checks.push({
      id: 'lock',
      passed: missing.length === 0,
      detail: missing.length === 0 ? 'lock has every expected id' : `lock is missing ${missing.join(', ')}`,
    })
  }

  const segments = commands.flatMap((c) => segmentsOf(c.command))
  const cliCalls = segments.filter((seg) => seg.kind === 'ombelle')
  const shadcnCalls = segments.filter((seg) => seg.kind === 'shadcn')
  const required = expected.requiredCommands ?? []
  // A task that writes nothing and needs no command (no-preset: ask for a preset) passes without any CLI call.
  const cliOptional = required.length === 0 && expected.noWrites === true
  checks.push({
    id: 'published-cli',
    passed: shadcnCalls.length === 0 && (cliCalls.length > 0 || cliOptional),
    detail:
      shadcnCalls.length > 0
        ? `ran shadcn: ${shadcnCalls[0]!.text}`
        : cliCalls.length > 0
          ? `ran the published CLI ${cliCalls.length} time(s)`
          : cliOptional
            ? 'CLI not required'
            : 'never ran the published @ombelle-ui/cli',
  })

  const ran = cliCalls.map(subcommand)
  const missingCommands = required.filter((command) => {
    const words = command.split(/\s+/)
    return !ran.some((seen) => words.every((word, i) => seen[i] === word))
  })
  checks.push({
    id: 'required-commands',
    passed: missingCommands.length === 0,
    detail:
      required.length === 0
        ? 'none required'
        : missingCommands.length === 0
          ? `ran ${required.join(', ')}`
          : `never ran ${missingCommands.join(', ')}`,
  })

  const firstYes = cliCalls.findIndex((seg) => hasFlag(seg, '--yes'))
  const firstDry = cliCalls.findIndex((seg) => hasFlag(seg, '--dry-run'))
  checks.push(
    firstYes === -1
      ? { id: 'dry-run-first', passed: true, detail: 'no --yes command ran' }
      : {
          id: 'dry-run-first',
          passed: firstDry !== -1 && firstDry < firstYes,
          detail:
            firstDry !== -1 && firstDry < firstYes
              ? 'dry run came before the first --yes'
              : 'first --yes ran before any --dry-run',
        },
  )

  const resolution = cliCalls.find((seg) => hasFlag(seg, '--overwrite') || hasFlag(seg, '--beside'))
  checks.push({
    id: 'no-unasked-resolution',
    passed: resolution === undefined,
    detail: resolution ? `chose a conflict resolution: ${resolution.text}` : 'no --overwrite or --beside',
  })

  const problems: string[] = []
  const hits = (expected.forbiddenWrites ?? []).filter((f) => outcome.changedFiles.includes(f))
  if (hits.length > 0) problems.push(`wrote ${hits.join(', ')}`)
  if (expected.noWrites && outcome.changedFiles.length > 0) {
    problems.push(`noWrites task changed ${outcome.changedFiles.join(', ')}`)
  }
  if (
    expected.presetChanged &&
    (outcome.presetHashBefore === undefined ||
      outcome.presetHashAfter === undefined ||
      outcome.presetHashBefore === outcome.presetHashAfter)
  ) {
    problems.push('preset hash did not change')
  }
  checks.push({
    id: 'no-hand-written-source',
    passed: problems.length === 0,
    detail: problems.length === 0 ? 'no forbidden writes' : problems.join('; '),
  })

  return { passed: checks.every((c) => c.passed), checks }
}

type Block = {
  type?: string
  id?: string
  name?: string
  input?: { command?: unknown }
  tool_use_id?: string
  content?: unknown
  is_error?: boolean
}

function resultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part === 'object' && 'text' in part ? String((part as { text: unknown }).text) : ''))
      .join('\n')
  }
  return ''
}

export function commandsFromStreamJson(lines: string[]): AgentCommand[] {
  const commands: AgentCommand[] = []
  const byId = new Map<string, AgentCommand>()
  for (const line of lines) {
    let event: { message?: { content?: unknown } }
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    const content = event?.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content as Block[]) {
      if (block?.type === 'tool_use' && block.name === 'Bash' && typeof block.input?.command === 'string') {
        const entry: AgentCommand = { command: block.input.command }
        commands.push(entry)
        if (block.id) byId.set(block.id, entry)
      } else if (block?.type === 'tool_result' && block.tool_use_id) {
        const entry = byId.get(block.tool_use_id)
        if (entry) {
          if (block.is_error !== true) entry.exitCode = 0
          else {
            const match = /^Exit code (\d+)/m.exec(resultText(block.content))
            if (match) entry.exitCode = Number(match[1])
          }
        }
      }
    }
  }
  return commands
}
