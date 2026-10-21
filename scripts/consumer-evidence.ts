import type { StyleFamily, PackageManager } from '@ombelle/contracts'
import type { RuntimeIdentity } from '../tests/helpers/cli-runtime.js'
import type { ConsumerCase } from './consumer-matrix.js'

export type ConsumerEvidence = {
  family: StyleFamily
  manager: PackageManager
  managerVersion: string
  cliRuntime: RuntimeIdentity
  buildRuntime: RuntimeIdentity
  sourceHashes: Record<string, string>
  audit: { exitCode: number; scope: 'production' | 'all' }
  build: { exitCode: number }
}
export type PendingConsumerEvidence = Omit<ConsumerEvidence, 'buildRuntime' | 'build'>

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected evidence object')
  return value as Record<string, unknown>
}
function runtime(value: unknown, expected: 'node' | 'bun') {
  const r = record(value)
  if (r.name !== expected || typeof r.executable !== 'string' || !r.executable.trim() || typeof r.version !== 'string') throw new Error('Missing or wrong runtime identity')
  const nodeVersion = /^24\.(\d+)\.\d+$/.exec(r.version)
  if (expected === 'bun' ? r.version !== '1.4.3' : !nodeVersion || Number(nodeVersion[1]) < 19) throw new Error('Unsupported measured runtime version')
}
export function finalizeConsumerEvidence(cases: readonly ConsumerCase[], measured: Record<string, ConsumerEvidence>): Record<string, ConsumerEvidence> {
  const ids = cases.map(c => c.id)
  if (new Set(ids).size !== ids.length || Object.keys(measured).length !== ids.length || Object.keys(measured).some(id => !ids.includes(id))) throw new Error('Consumer evidence row set differs from descriptors')
  for (const c of cases) {
    const row = record(measured[c.id])
    const version = c.manager === 'npm' ? '11.19.0' : c.manager === 'pnpm' ? '11.25.0' : c.manager === 'bun' ? '1.4.3' : c.yarnFixtureId === 'classic-vite' ? '1.22.22' : '4.18.1'
    if (row.family !== c.family || row.manager !== c.manager || row.managerVersion !== version) throw new Error('Wrong consumer family/manager/version: ' + c.id)
    runtime(row.cliRuntime, c.cliRuntime)
    runtime(row.buildRuntime, 'node')
    const hashes = Object.values(record(row.sourceHashes))
    if (!hashes.length || hashes.some(hash => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))) throw new Error('Missing measured source hashes: ' + c.id)
    const audit = record(row.audit), build = record(row.build)
    if (audit.exitCode !== 0 || audit.scope !== (c.manager === 'bun' ? 'all' : 'production') || build.exitCode !== 0) throw new Error('Missing successful measured audit/build: ' + c.id)
  }
  return measured
}

export function validateMinimalistMeasurements(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length !== 10) throw new Error('Expected ten minimalist app/mode measurements')
  const expected = new Set(['preview','vite','next','npm-vite','npm-next'].flatMap(app => ['light','dark'].map(mode => app + '/' + mode)))
  for (const item of value) {
    const row = record(item), id = row.app + '/' + row.mode
    if (!expected.delete(id)) throw new Error('Missing or duplicate minimalist app/mode')
    const ratios = record(row.ratios)
    const required = ['inputBoundary','focus','muted','error','dialogText','dialogFocus']
    for (const variant of ['default','secondary','outline','ghost','link','destructive']) for (const state of ['', 'Hover','Pressed']) {
      required.push(variant + state)
      if (!['ghost','link'].includes(variant)) required.push(variant + state + 'Boundary')
    }
    for (const key of required) {
      const ratio = ratios[key], threshold = key.includes('Boundary') || ['focus','dialogFocus'].includes(key) ? 3 : 4.5
      if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < threshold || ratio > 21) throw new Error('Missing or failed contrast measurement: ' + key)
    }
    if (row.textMethod !== 'synthetic font enlargement (not native browser zoom)' || row.disabledContrast !== 'exempt' || row.forcedColors !== 'active' || row.motionPositiveControlMs !== 150) throw new Error('Missing or mislabeled state evidence')
    if (!Array.isArray(row.textEvidence) || row.textEvidence.length !== 4) throw new Error('Missing enlargement scenarios')
    const layouts = new Set(['1100/false','1100/true','320/false','320/true'])
    for (const item of row.textEvidence) {
      const layout = record(item)
      if (!layouts.delete(layout.width + '/' + layout.dialogOpen) || !Array.isArray(layout.samples) || layout.samples.length <= 15) throw new Error('Incomplete enlargement scenario')
      let input = false, dialog = false
      for (const item of layout.samples) {
        const sample = record(item)
        if (typeof sample.selector !== 'string' || typeof sample.before !== 'number' || typeof sample.after !== 'number' || !Number.isFinite(sample.before) || sample.before <= 0 || !Number.isFinite(sample.after) || Math.abs(sample.after / sample.before - 2) >= 0.02) throw new Error('Text did not measurably double')
        input ||= sample.selector.includes('input'); dialog ||= sample.selector.includes('dialog')
      }
      if (!input || (layout.dialogOpen && !dialog)) throw new Error('Input/Dialog text missing from enlargement evidence')
    }
  }
  return value
}
