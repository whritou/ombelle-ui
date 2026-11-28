import { describe, expect, it } from 'vitest'
import {
  commandsFromStreamJson,
  scoreRun,
  type AgentCommand,
  type ProjectOutcome,
} from '../../scripts/agent-evals/score.js'

const CLI = 'npx @ombelle-ui/cli@1.1.2'
const ok: ProjectOutcome = { doctorStatus: 'success', lockIds: ['button'], changedFiles: [] }
const cleanRun: AgentCommand[] = [
  { command: `${CLI} init --preset ./brand.preset.json --dry-run --json` },
  { command: `${CLI} init --preset ./brand.preset.json --yes --json` },
  { command: `${CLI} doctor --json` },
]
const check = (score: ReturnType<typeof scoreRun>, id: string) =>
  score.checks.find((c) => c.id === id)

describe('scoreRun', () => {
  it('passes a clean install that dry-runs first and ends with doctor success', () => {
    const score = scoreRun(cleanRun, ok, { lockIds: ['button'] })
    expect(score.passed).toBe(true)
    expect(score.checks).toHaveLength(7)
  })

  it('fails a run that writes before any dry run', () => {
    const score = scoreRun(
      [{ command: `${CLI} add button --yes --json` }, { command: `${CLI} add button --dry-run --json` }],
      ok,
      { lockIds: ['button'] },
    )
    expect(check(score, 'dry-run-first')?.passed).toBe(false)
    expect(score.passed).toBe(false)
  })

  it('fails a run that uses shadcn instead of the published CLI', () => {
    const score = scoreRun([{ command: 'npx shadcn@latest add button' }], ok, { lockIds: ['button'] })
    expect(check(score, 'published-cli')?.passed).toBe(false)
    expect(score.passed).toBe(false)
  })

  it('fails a run that never calls the CLI', () => {
    const score = scoreRun([{ command: 'ls' }], ok, { lockIds: ['button'] })
    expect(check(score, 'published-cli')?.passed).toBe(false)
  })

  it.each(['--overwrite src/components/ui/button.tsx', '--beside src/components/ui/button.tsx'])(
    'fails a conflict task where the agent chose %s',
    (flag) => {
      const score = scoreRun(
        [{ command: `${CLI} add button --dry-run --json` }, { command: `${CLI} add button --yes ${flag}` }],
        { doctorStatus: 'missing', lockIds: [], changedFiles: [] },
        { lockIds: [], mustStopOnConflict: true },
      )
      expect(check(score, 'no-unasked-resolution')?.passed).toBe(false)
      expect(score.passed).toBe(false)
    },
  )

  it('passes a conflict task that stops with the file untouched', () => {
    const score = scoreRun(
      [{ command: `${CLI} add button --dry-run --json`, exitCode: 1 }],
      { doctorStatus: 'missing', lockIds: [], changedFiles: [] },
      { lockIds: ['button'], mustStopOnConflict: true, forbiddenWrites: ['src/components/ui/button.tsx'] },
    )
    expect(score.passed).toBe(true)
    expect(check(score, 'doctor')?.detail).toBe('not required')
    expect(check(score, 'lock')?.detail).toBe('not required')
  })

  it('fails when a component file was written by an editor tool, not the CLI', () => {
    const score = scoreRun(
      cleanRun,
      { ...ok, changedFiles: ['src/components/ui/button.tsx'] },
      { lockIds: ['button'], forbiddenWrites: ['src/components/ui/button.tsx'] },
    )
    expect(check(score, 'no-hand-written-source')?.passed).toBe(false)
    expect(score.passed).toBe(false)
  })

  it('fails when doctor did not succeed or the lock misses an id', () => {
    expect(scoreRun(cleanRun, { ...ok, doctorStatus: 'failed' }, { lockIds: ['button'] }).passed).toBe(false)
    expect(scoreRun(cleanRun, { ...ok, lockIds: [] }, { lockIds: ['button'] }).passed).toBe(false)
  })

  it('fails a noWrites task when any file changed', () => {
    const score = scoreRun(
      [{ command: `${CLI} preset show ps_x@1 --dry-run --json` }],
      { doctorStatus: 'missing', lockIds: [], changedFiles: ['brand.preset.json'] },
      { lockIds: [], noWrites: true },
    )
    expect(score.passed).toBe(false)
  })

  it('passes a noWrites task that changed nothing without requiring doctor or lock', () => {
    const score = scoreRun(
      [{ command: `${CLI} info --json` }],
      { doctorStatus: 'missing', lockIds: [], changedFiles: [] },
      { lockIds: [], noWrites: true },
    )
    expect(score.passed).toBe(true)
  })

  it('fails a presetChanged task when the preset hash is unchanged', () => {
    const score = scoreRun(
      cleanRun,
      { ...ok, presetHashBefore: 'abc', presetHashAfter: 'abc' },
      { lockIds: ['button'], presetChanged: true },
    )
    expect(score.passed).toBe(false)
    const changed = scoreRun(
      cleanRun,
      { ...ok, presetHashBefore: 'abc', presetHashAfter: 'def' },
      { lockIds: ['button'], presetChanged: true },
    )
    expect(changed.passed).toBe(true)
  })
})

describe('commandsFromStreamJson', () => {
  it('reads Bash commands and exit codes from stream-json lines', () => {
    const lines = [
      'not json',
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'npx @ombelle-ui/cli@1.1.2 doctor --json' } }] },
      }),
      JSON.stringify({
        type: 'user',
        message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Exit code 2\nboom', is_error: true }] },
      }),
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'tool_use', id: 'toolu_2', name: 'Write', input: { file_path: 'a.ts' } }] },
      }),
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'tool_use', id: 'toolu_3', name: 'Bash', input: { command: 'ls' } }] },
      }),
      JSON.stringify({
        type: 'user',
        message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_3', content: [{ type: 'text', text: 'a b' }], is_error: false }] },
      }),
    ]
    expect(commandsFromStreamJson(lines)).toEqual([
      { command: 'npx @ombelle-ui/cli@1.1.2 doctor --json', exitCode: 2 },
      { command: 'ls', exitCode: 0 },
    ])
  })
})

describe('segment-aware scoring', () => {
  const run = (commands: string[]) =>
    scoreRun(commands.map((command) => ({ command })), ok, { lockIds: ['button'] })
  const pass = (s: ReturnType<typeof scoreRun>, id: string) => s.checks.find((c) => c.id === id)?.passed

  it('ignores shadcn mentioned in non-invocation text', () => {
    const s = run([
      'grep shadcn components.json',
      'echo "no shadcn"',
      `${CLI} add button --dry-run --json`,
      'npm view @ombelle-ui/cli@1.1.2',
    ])
    expect(pass(s, 'published-cli')).toBe(true)
  })

  it('does not count npm view as a CLI run', () => {
    expect(pass(run(['npm view @ombelle-ui/cli@1.1.2']), 'published-cli')).toBe(false)
  })

  it.each([
    'npx shadcn@latest add button',
    'pnpm dlx shadcn@latest add button',
    'yarn dlx --quiet shadcn add button',
    'bunx --bun shadcn@latest add button',
    'npm exec -- shadcn add button',
    'cd app && npx -y shadcn@latest add button',
  ])('fails published-cli for %s', (cmd) => {
    expect(pass(run([`${CLI} add button --dry-run`, cmd]), 'published-cli')).toBe(false)
  })

  it('recognises other runners for the published CLI', () => {
    for (const c of [
      'pnpm dlx @ombelle-ui/cli@1.1.2 doctor --json',
      'yarn dlx @ombelle-ui/cli@1.1.2 doctor --json',
      'bunx @ombelle-ui/cli@1.1.2 doctor --json',
      'npm exec @ombelle-ui/cli@1.1.2 -- doctor --json',
    ]) expect(pass(run([c]), 'published-cli')).toBe(true)
  })

  it('does not treat echo --overwrite as a resolution', () => {
    const s = run([`${CLI} add button --dry-run`, 'echo --overwrite --beside'])
    expect(pass(s, 'no-unasked-resolution')).toBe(true)
  })

  it('still flags a chained --overwrite on a CLI segment', () => {
    const s = run([`cd app && ${CLI} add button --yes --overwrite src/x.tsx`])
    expect(pass(s, 'no-unasked-resolution')).toBe(false)
  })

  it('passes dry-run-first for a chained dry-run then yes', () => {
    const s = run([`${CLI} add button --dry-run && ${CLI} add button --yes`])
    expect(pass(s, 'dry-run-first')).toBe(true)
  })

  it('fails dry-run-first for a chained yes then dry-run', () => {
    const s = run([`${CLI} add button --yes && ${CLI} add button --dry-run`])
    expect(pass(s, 'dry-run-first')).toBe(false)
  })

  it('ignores --yes outside CLI segments', () => {
    const s = run([`echo --yes`, `${CLI} add button --dry-run`])
    expect(pass(s, 'dry-run-first')).toBe(true)
  })
})

describe('commandsFromStreamJson exit codes', () => {
  const lines = (isError: boolean, text: string) => [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't', name: 'Bash', input: { command: 'x' } }] } }),
    JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't', content: text, is_error: isError }] } }),
  ]
  it('gives 0 for a successful result even if the text mentions Exit code', () => {
    expect(commandsFromStreamJson(lines(false, 'Exit code 5 in docs'))[0]?.exitCode).toBe(0)
  })
  it('parses the code from an error result', () => {
    expect(commandsFromStreamJson(lines(true, 'Exit code 3 fail'))[0]?.exitCode).toBe(3)
  })
  it('leaves exitCode undefined for an error result without a code', () => {
    expect(commandsFromStreamJson(lines(true, 'something broke'))[0]?.exitCode).toBeUndefined()
  })
})

describe('flags after the package target', () => {
  const NPX = 'npx --yes @ombelle-ui/cli@1.1.2'
  const run = (commands: string[]) =>
    scoreRun(commands.map((command) => ({ command })), ok, { lockIds: ['button'] })
  const pass = (s: ReturnType<typeof scoreRun>, id: string) => s.checks.find((c) => c.id === id)?.passed

  it("does not read npx's own --yes as the CLI's", () => {
    const s = run([`${NPX} add x --dry-run && ${NPX} add x --yes`])
    expect(pass(s, 'dry-run-first')).toBe(true)
  })

  it('fails when only the first command carries the CLI --yes', () => {
    const s = run([`${NPX} add x --yes && ${NPX} add x --dry-run`])
    expect(pass(s, 'dry-run-first')).toBe(false)
  })

  it('treats a dry-run alone as no write and no resolution', () => {
    const s = run([`${NPX} add x --dry-run`])
    expect(pass(s, 'dry-run-first')).toBe(true)
    expect(s.checks.find((c) => c.id === 'dry-run-first')?.detail).toBe('no --yes command ran')
    expect(pass(s, 'no-unasked-resolution')).toBe(true)
  })
})

describe('required commands and the CLI requirement', () => {
  const none: ProjectOutcome = { doctorStatus: 'missing', lockIds: [], changedFiles: [] }
  const pass = (s: ReturnType<typeof scoreRun>, id: string) => s.checks.find((c) => c.id === id)

  it('passes a no-preset run that asks and calls nothing', () => {
    const score = scoreRun([], none, { lockIds: [], noWrites: true })
    expect(score.passed).toBe(true)
    expect(pass(score, 'published-cli')?.detail).toBe('CLI not required')
    expect(pass(score, 'required-commands')?.passed).toBe(true)
  })

  it('still fails a no-preset run that ran shadcn', () => {
    const score = scoreRun([{ command: 'npx shadcn@latest init' }], none, { lockIds: [], noWrites: true })
    expect(pass(score, 'published-cli')?.passed).toBe(false)
  })

  it('requires the CLI when the task names required commands', () => {
    const score = scoreRun([{ command: 'cat ui-library.lock.json' }], none, { lockIds: [], noWrites: true, requiredCommands: ['doctor'] })
    expect(pass(score, 'published-cli')?.passed).toBe(false)
    expect(pass(score, 'required-commands')?.passed).toBe(false)
    expect(pass(score, 'required-commands')?.detail).toContain('doctor')
  })

  it('passes check-install when doctor ran through the published CLI', () => {
    const score = scoreRun([{ command: `${CLI} doctor --json` }], none, { lockIds: [], noWrites: true, requiredCommands: ['doctor'] })
    expect(score.passed).toBe(true)
  })

  it('matches multi-word commands after runner flags and --', () => {
    const commands = [
      { command: 'npx --yes @ombelle-ui/cli@1.1.2 theme add ./new.preset.json --dry-run --json' },
      { command: 'npm exec @ombelle-ui/cli@1.1.2 -- doctor --json' },
    ]
    const score = scoreRun(commands, ok, { lockIds: [], requiredCommands: ['theme add', 'doctor'] })
    expect(pass(score, 'required-commands')?.passed).toBe(true)
    const missing = scoreRun([commands[1]!], ok, { lockIds: [], requiredCommands: ['theme add', 'doctor'] })
    expect(pass(missing, 'required-commands')?.passed).toBe(false)
    expect(pass(missing, 'required-commands')?.detail).toContain('theme add')
  })

  it('does not count doctor named only in a non-CLI segment', () => {
    const score = scoreRun([{ command: `echo doctor && ${CLI} add button --dry-run` }], ok, { lockIds: ['button'], requiredCommands: ['doctor'] })
    expect(pass(score, 'required-commands')?.passed).toBe(false)
  })

  it.each(['npx @ombelle-ui/cli doctor --json', 'npx @ombelle-ui/cli@latest doctor --json', 'pnpm dlx @ombelle-ui/cli@next doctor --json'])(
    'counts %s as the published CLI',
    (command) => {
      const score = scoreRun([{ command }], none, { lockIds: [], noWrites: true, requiredCommands: ['doctor'] })
      expect(pass(score, 'published-cli')?.passed).toBe(true)
      expect(pass(score, 'required-commands')?.passed).toBe(true)
    },
  )

  it('does not count a different package with the same prefix', () => {
    const score = scoreRun([{ command: 'npx @ombelle-ui/cli-extra doctor' }], none, { lockIds: [], noWrites: true, requiredCommands: ['doctor'] })
    expect(pass(score, 'published-cli')?.passed).toBe(false)
  })
})
