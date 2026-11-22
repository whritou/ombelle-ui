import { expect, it } from 'vitest'
import { getCatalogPresets } from '@ombelle/catalog/presets'
import { compile, glassContrastReport, normalizePublishedPreset, resolvePreset } from '@ombelle/compiler'
import { componentsWithStyleSupport, type Preset, type PresetSnapshot } from '@ombelle/contracts'
import { prepareSnapshotPreview } from './preview-session'
import { snapshotPreviewMessage } from './snapshot-preview'

async function snapshotOf(preset: Preset, id = 'a'): Promise<PresetSnapshot> {
  const resolved = await normalizePublishedPreset(preset)
  return {
    snapshotVersion: '1.0',
    id: 'ps_' + id.repeat(32),
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

it('sends a stable snapshot to the gallery as tokens, compiling nothing', async () => {
  const snapshot = await snapshotOf(catalog.presets.flat)
  expect(await prepareSnapshotPreview(snapshot, { compile: () => { throw new Error('compiled') } }))
    .toEqual({ frame: { kind: 'tokens' }, contrastWarning: false })
})

it('shows no frame for a stable snapshot whose preset does not resolve to its hash', async () => {
  const snapshot = { ...(await snapshotOf(catalog.presets.flat)), presetHash: 'f'.repeat(64) }
  expect((await prepareSnapshotPreview(snapshot)).frame).toEqual({ kind: 'failed' })
})

it('compiles a glass snapshot on the server, components the family supports only', async () => {
  const snapshot = await snapshotOf(catalog.presets['liquid-glass'])
  const preview = await prepareSnapshotPreview(snapshot)
  expect(preview.frame.kind).toBe('compiled')
  expect(preview.frame.kind === 'compiled' && preview.frame.result).toEqual(await compile({
    preset: snapshot.preset,
    componentIds: componentsWithStyleSupport('liquid-glass', ['stable', 'experimental']),
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    glassContrast: 'report',
  }))
})

it('previews a published glass preset below the contrast bound and flags it', async () => {
  const snapshot = await lowContrastGlass()
  const preview = await prepareSnapshotPreview(snapshot)
  expect(preview.frame.kind === 'compiled' && preview.frame.result.preset.data.design.glassOpacity).toBe(0.3)
  expect(preview.contrastWarning).toBe(!glassContrastReport(snapshot.preset).passes)
  expect(preview.contrastWarning).toBe(true)
})

it('rejects a compiled result for a different preset hash', async () => {
  const a = await snapshotOf(catalog.presets['liquid-glass'])
  const b = await lowContrastGlass()
  const other = await compile({ preset: a.preset, componentIds: ['button'], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  expect((await prepareSnapshotPreview(b, { compile: async () => other })).frame).toEqual({ kind: 'failed' })
})

it('words the status for compile failure and for each gallery state', () => {
  const tokens = { frame: { kind: 'tokens' }, contrastWarning: false } as const
  expect(snapshotPreviewMessage(tokens, 'connecting')).toBe('Connecting snapshot gallery…')
  expect(snapshotPreviewMessage(tokens, 'ready')).toBe('Snapshot gallery ready.')
  expect(snapshotPreviewMessage(tokens, 'failed')).toBe('Gallery unavailable. Preset JSON remains available.')
  expect(snapshotPreviewMessage({ frame: { kind: 'failed' }, contrastWarning: false }, 'connecting'))
    .toBe('Preview compilation unavailable. Preset JSON remains available.')
})
