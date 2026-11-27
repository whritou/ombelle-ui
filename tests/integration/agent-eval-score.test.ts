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
    expect(score.checks).toHaveLength(6)
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
      { command: 'ls' },
    ])
  })
})
