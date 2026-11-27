import { describe, expect, it } from 'vitest'
import { renderReport, type EvalResult } from '../../scripts/agent-evals/report.js'
import {
  aggregateRuns,
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
