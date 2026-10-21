import { expect, it } from 'vitest'
import { consumerCases } from '../../scripts/consumer-matrix.js'
import { finalizeConsumerEvidence, validateMinimalistMeasurements, type ConsumerEvidence } from '../../scripts/consumer-evidence.js'

const cases = consumerCases()
// Structural fixtures only: these values never enter retained run evidence.
function validRows(): Record<string, ConsumerEvidence> {
  return Object.fromEntries(cases.map(c => [c.id, {
    family: c.family, manager: c.manager,
    managerVersion: c.manager === 'npm' ? '11.19.0' : c.manager === 'pnpm' ? '11.25.0' : c.manager === 'bun' ? '1.4.3' : c.yarnFixtureId === 'classic-vite' ? '1.22.22' : '4.18.1',
    cliRuntime: { name: c.cliRuntime, executable: '/fixture/' + c.cliRuntime, version: c.cliRuntime === 'bun' ? '1.4.3' : '24.19.0' },
    buildRuntime: { name: 'node', executable: '/fixture/node', version: '24.19.0' },
    sourceHashes: { 'components/ui/button.tsx': 'a'.repeat(64) },
    audit: { exitCode: 0, scope: c.manager === 'bun' ? 'all' : 'production' }, build: { exitCode: 0 },
  }]))
}
it('finalizes exactly thirty-four rows including fifteen minimalist consumers', () => {
  const result = finalizeConsumerEvidence(cases, validRows())
  expect(Object.keys(result)).toHaveLength(34)
  expect(Object.values(result).filter(r => r.family === 'minimalist')).toHaveLength(15)
})
it('rejects incomplete or mislabeled consumer evidence', () => {
  const id = 'vite-minimalist', bun = 'bun-text-vite-bun-minimalist'
  const mutations: ((rows: Record<string, any>) => void)[] = [
    r => { delete r[id] }, r => { r.extra = r[id] },
    r => { delete r[id].cliRuntime }, r => { r[id].cliRuntime.executable = '' },
    r => { r[id].sourceHashes = {} }, r => { r[id].sourceHashes.x = 'invalid' },
    r => { r[id].family = 'flat' }, r => { r[id].manager = 'npm' },
    r => { r[bun].cliRuntime.name = 'node' }, r => { r[bun].cliRuntime.version = '1.0.0' },
    r => { r[id].managerVersion = '0.0.0' }, r => { r[id].cliRuntime.version = '22.0.0' },
    r => { r[id].audit.exitCode = 1 }, r => { r[id].audit.scope = 'all' },
    r => { r[id].build = { status: 'pending' } }, r => { delete r[id].build },
    r => { r[id].build.exitCode = 1 }, r => { r[id].buildRuntime.name = 'bun' },
  ]
  for (const mutate of mutations) { const rows = validRows(); mutate(rows); expect(() => finalizeConsumerEvidence(cases, rows)).toThrow() }
  expect(() => finalizeConsumerEvidence([...cases, cases[0]], validRows())).toThrow()
})
function measurements() {
  return ['preview', 'vite', 'next', 'npm-vite', 'npm-next'].flatMap(app => ['light', 'dark'].map(mode => ({
    app, mode, ratios: Object.fromEntries(['placeholder','placeholderFocus','error','inputBoundary','focus','muted','dialogText','dialogFocus', ...['default','secondary','outline','ghost','link','destructive'].flatMap(v => ['', 'Hover','Pressed'].flatMap(s => ['ghost','link'].includes(v) ? [v+s] : [v+s,v+s+'Boundary']))].map(key => [key, 7])),
    disabledContrast: 'exempt', textMethod: 'synthetic font enlargement (not native browser zoom)', forcedColors: 'active', motionPositiveControlMs: 150,
    textEvidence: [1100,320].flatMap(width => [false,true].map(dialogOpen => ({width, dialogOpen, samples: Array.from({length:16}, (_,i) => ({selector: i === 0 ? 'input' : dialogOpen ? '[role="dialog"] p'+i : 'p'+i, before:16, after:32}))}))),
  })))
}
it('requires all measured app/mode and actual text-scaling outcomes', () => {
  expect(validateMinimalistMeasurements(measurements())).toHaveLength(10)
  const mutations: ((rows: any[]) => void)[] = [
    r => { r.pop() }, r => { r[1] = r[0] }, r => { r[0].ratios.focus = 2 },
    r => { r[0].ratios.defaultHover = 4 }, r => { delete r[0].ratios.dialogText },
    r => { r[0].textEvidence.pop() }, r => { r[0].textEvidence[0].samples[0].after = 16 },
    r => { r[0].textEvidence[1].samples = [{selector:'input',before:16,after:32}] },
    r => { r[0].textMethod = 'native browser zoom' }, r => { r[0].forcedColors = 'none' },
    r => { delete r[0].ratios.placeholder }, r => { r[0].ratios.placeholderFocus = 3.3 },
  ]
  for (const mutate of mutations) { const rows = measurements(); mutate(rows); expect(() => validateMinimalistMeasurements(rows)).toThrow() }
})
