import { describe, expect, it, vi } from 'vitest'
import { renderReport, type EvalResult } from '../../scripts/agent-evals/report.js'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  agentInvocation,
  aggregateRuns,
  hasResultEvent,
  capture,
  killTree,
  parseTimeoutMs,
  skillFolders,
  diffTrees,
  lockIdsFromLock,
  parseArgs,
} from '../../scripts/agent-evals/run.js'

const result: EvalResult = {
  surface: 'baseline',
  model: 'claude-opus-5-5',
  date: '2026-11-27',
  runsPerTask: 3,
  tasks: [
    { id: 'init-button-dialog', passed: 3, runs: 3, failures: [] },
    { id: 'login-page', passed: 1, runs: 3, failures: ['lock', 'published-cli', 'lock'] },
  ],
}

describe('renderReport', () => {
  const text = renderReport(result)
  it('prints one row per task as passed/runs with a percentage', () => {
    expect(text).toMatch(/init-button-dialog.*3\/3.*100%/)
    expect(text).toMatch(/login-page.*1\/3.*33%/)
  })
  it('prints the overall rate, model and date', () => {
    expect(text).toContain('4/6')
    expect(text).toContain('67%')
    expect(text).toContain('claude-opus-5-5')
    expect(text).toContain('2026-11-27')
  })
  it('lists the failing check ids per task, deduplicated', () => {
    const row = text.split('\n').find((l) => l.includes('login-page'))!
    expect(row).toContain('lock')
    expect(row).toContain('published-cli')
    expect(text).not.toMatch(/init-button-dialog.*\|\s*lock/)
  })
})

describe('parseArgs', () => {
  it('defaults runs to 3 and requires a valid surface', () => {
    expect(parseArgs(['--surface', 'phase-1'])).toEqual({ surface: 'phase-1', runs: 3, task: undefined })
    expect(parseArgs(['--surface', 'baseline', '--runs', '5', '--task', 'login-page'])).toEqual({
      surface: 'baseline',
      runs: 5,
      task: 'login-page',
    })
    expect(() => parseArgs([])).toThrow(/--surface/)
    expect(() => parseArgs(['--surface', 'nope'])).toThrow(/--surface/)
    expect(() => parseArgs(['--surface', 'baseline', '--runs', '0'])).toThrow(/--runs/)
  })
})

describe('diffTrees', () => {
  it('returns sorted added, removed and modified paths', () => {
    expect(diffTrees({ 'a.ts': '1', 'b.ts': '2', 'c.ts': '3' }, { 'a.ts': '1', 'b.ts': 'x', 'd.ts': '4' })).toEqual([
      'b.ts',
      'c.ts',
      'd.ts',
    ])
  })
})

describe('lockIdsFromLock', () => {
  it('reads component and block ids from artifact paths', () => {
    const lock = {
      artifacts: {
        'src/components/ui/button.tsx': { logicalPath: 'components/ui/button.tsx', sha256: 'x', kind: 'component' },
        'src/styles/ui-tokens.css': { logicalPath: 'styles/ui-tokens.css', sha256: 'x', kind: 'style' },
        'src/blocks/login-01.tsx': { logicalPath: 'blocks/login-01.tsx', sha256: 'x', kind: 'block' },
      },
    }
    expect(lockIdsFromLock(lock).sort()).toEqual(['button', 'login-01'])
    expect(lockIdsFromLock(undefined)).toEqual([])
  })
})

describe('aggregateRuns', () => {
  it('counts passes and collects failing check ids', () => {
    const task = aggregateRuns('t', [
      { passed: true, checks: [] },
      { passed: false, checks: [{ id: 'lock', passed: false, detail: '' }, { id: 'doctor', passed: true, detail: '' }] },
    ])
    expect(task).toEqual({ id: 't', passed: 1, runs: 2, failures: ['lock'] })
  })
})

describe('agentInvocation', () => {
  it('uses raw argv without a shell for an executable', () => {
    const { args, shell } = agentInvocation('claude', 'claude-opus-5-5')
    expect(shell).toBe(false)
    expect(args).toContain('-p')
    expect(args).not.toContain('--prompt')
    expect(args).toEqual(expect.arrayContaining(['--model', 'claude-opus-5-5', '--max-turns', '40']))
  })
  it('enables a shell only for .cmd/.bat and validates every arg', () => {
    expect(agentInvocation('C:/x/claude.cmd', 'claude-opus-5-5').shell).toBe(true)
    expect(() => agentInvocation('claude.cmd', 'bad model & calc')).toThrow(/argument/)
    expect(agentInvocation('claude', 'bad model & calc').shell).toBe(false)
  })
})

describe('hasResultEvent', () => {
  it('finds a stream-json result line', () => {
    expect(hasResultEvent(['{"type":"assistant"}', 'junk', '{"type":"result","subtype":"success"}'])).toBe(true)
    expect(hasResultEvent(['{"type":"assistant"}', 'junk'])).toBe(false)
  })
})

describe('skillFolders', () => {
  it('throws when skills/ is missing or empty and lists folders otherwise', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-test-'))
    try {
      await expect(skillFolders(path.join(dir, 'nope'))).rejects.toThrow('phase-2 needs skills/ (Task 10)')
      await expect(skillFolders(dir)).rejects.toThrow('phase-2 needs skills/ (Task 10)')
      await fs.mkdir(path.join(dir, 'ombelle'))
      expect(await skillFolders(dir)).toEqual(['ombelle'])
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })
})

describe('parseTimeoutMs', () => {
  it('uses a positive finite number and otherwise the 15 minute default', () => {
    expect(parseTimeoutMs('5000')).toBe(5000)
    for (const bad of [undefined, '', 'abc', '0', '-5', 'Infinity', 'NaN'])
      expect(parseTimeoutMs(bad)).toBe(15 * 60 * 1000)
  })
})

function fakeChild(pid = 4242) {
  const child = Object.assign(new EventEmitter(), {
    pid,
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    kill: vi.fn(),
  })
  return child
}

describe('killTree', () => {
  it('runs taskkill on the tree for a win32 shell and falls back when it fails', () => {
    const child = fakeChild()
    const killer = new EventEmitter()
    const spawn = vi.fn(() => killer)
    killTree(child as never, true, { spawn: spawn as never, platform: 'win32', graceMs: 1 })
    expect(spawn).toHaveBeenCalledWith('taskkill', ['/pid', '4242', '/T', '/F'], { windowsHide: true })
    expect(child.kill).not.toHaveBeenCalled()
    killer.emit('close', 1)
    expect(child.kill).toHaveBeenCalledWith('SIGKILL')
  })
  it('kills directly without a shell', () => {
    const child = fakeChild()
    const spawn = vi.fn()
    killTree(child as never, false, { spawn: spawn as never, platform: 'win32', graceMs: 1 })
    expect(spawn).not.toHaveBeenCalled()
    expect(child.kill).toHaveBeenCalledWith('SIGKILL')
  })
})

describe('capture', () => {
  it('resolves timedOut after the grace period even if close never fires', async () => {
    const child = fakeChild()
    const spawn = vi.fn(() => child)
    const result = await capture('x', [], { cwd: '.', timeoutMs: 10 }, { spawn: spawn as never, platform: 'linux', graceMs: 10 })
    expect(result.timedOut).toBe(true)
    expect(result.code).toBeNull()
    expect(child.kill).toHaveBeenCalledWith('SIGKILL')
    expect(child.stdout.destroyed).toBe(true)
  })
})
