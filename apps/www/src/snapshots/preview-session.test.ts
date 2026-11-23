import { expect, it } from 'vitest'
import { getCatalogPresets } from '@ombelle/catalog/presets'
import { glassContrastReport, normalizePublishedPreset, resolvePreset } from '@ombelle/compiler'
import { componentsWithStyleSupport, type Preset, type PresetSnapshot } from '@ombelle/contracts'
import { handlePresetCompileMessage } from '../preset-editor/compile-protocol'
import { prepareSnapshotFrame, snapshotContrastWarning } from './preview-session'
import { snapshotPreviewMessage } from './snapshot-preview'

async function snapshotOf(preset: Preset): Promise<PresetSnapshot> {
  const resolved = await normalizePublishedPreset(preset)
  return {
    snapshotVersion: '1.0',
    id: 'ps_' + 'a'.repeat(32),
    revision: 1,
    preset: resolved.data,
    presetHash: resolved.hash,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    createdAt: '2026-10-27T12:34:56.000Z',
    validationStatus: 'draft',
  }
}
const catalog = getCatalogPresets('0.1.0')
async function lowContrastGlass() {
  const glass = catalog.presets['liquid-glass']
  const preset = await resolvePreset({ ...glass, design: { ...glass.design, glassOpacity: 0.3 } }, catalog)
  return snapshotOf(preset.data)
}

it('sends a stable snapshot to the gallery as tokens', async () => {
  const snapshot = await snapshotOf(catalog.presets.flat)
  expect(await prepareSnapshotFrame(snapshot)).toEqual({ kind: 'tokens' })
  expect(snapshotContrastWarning(snapshot)).toBe(false)
})

it('compiles a glass snapshot in the worker, not on the server', async () => {
  expect(await prepareSnapshotFrame(await snapshotOf(catalog.presets['liquid-glass']))).toEqual({ kind: 'worker' })
})

it('shows no frame for a snapshot whose preset does not resolve to its hash', async () => {
  for (const family of ['flat', 'liquid-glass'] as const) {
    const snapshot = { ...(await snapshotOf(catalog.presets[family])), presetHash: 'f'.repeat(64) }
    expect(await prepareSnapshotFrame(snapshot)).toEqual({ kind: 'failed' })
  }
})

it('flags a published glass preset below the contrast bound', async () => {
  const snapshot = await lowContrastGlass()
  expect(snapshotContrastWarning(snapshot)).toBe(!glassContrastReport(snapshot.preset).passes)
  expect(snapshotContrastWarning(snapshot)).toBe(true)
})

// The page sends only glass snapshots; a flat one keeps the test to a quick compile.
it('compiles a snapshot preset in the preset worker: the components its family supports', async () => {
  const snapshot = await snapshotOf(catalog.presets.flat)
  const response = await handlePresetCompileMessage({ type: 'compile-snapshot', requestId: 7, preset: snapshot.preset })
  expect(response.type).toBe('preset-compiled')
  const result = response.type === 'preset-compiled' ? response.result : null
  expect(result?.preset.hash).toBe(snapshot.presetHash)
  // One component file per supported component, as the editor's compile of the same preset gives.
  const components = result!.artifacts.filter((artifact) => artifact.kind === 'component').map((artifact) => artifact.logicalPath)
  expect(components).toHaveLength(componentsWithStyleSupport('flat', ['stable', 'experimental']).length)
  const invalid = await handlePresetCompileMessage({ type: 'compile-snapshot', requestId: 8, preset: { name: 'not a preset' } })
  expect(invalid).toMatchObject({ type: 'preset-invalid', requestId: 8 })
}, 180_000)

it('words the status while compiling, on failure and for each gallery state', () => {
  const tokens = { kind: 'tokens' } as const
  expect(snapshotPreviewMessage(null, 'connecting')).toBe('Compiling snapshot preview…')
  expect(snapshotPreviewMessage({ kind: 'worker' }, 'connecting', null)).toBe('Compiling snapshot preview…')
  expect(snapshotPreviewMessage({ kind: 'worker' }, 'connecting', 'failed')).toBe('Preview compilation unavailable. Preset JSON remains available.')
  expect(snapshotPreviewMessage(tokens, 'connecting')).toBe('Connecting snapshot gallery…')
  expect(snapshotPreviewMessage(tokens, 'ready')).toBe('Snapshot gallery ready.')
  expect(snapshotPreviewMessage(tokens, 'failed')).toBe('Gallery unavailable. Preset JSON remains available.')
  expect(snapshotPreviewMessage({ kind: 'failed' }, 'connecting')).toBe('Preview compilation unavailable. Preset JSON remains available.')
})
