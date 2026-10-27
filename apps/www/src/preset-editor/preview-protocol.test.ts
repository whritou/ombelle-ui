import { beforeAll, expect, it } from 'vitest'
import { compile, sha256 } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { supportedComponentIds, type CompileResult } from '@ombelle/contracts'
import type { PresetSourceManifest } from '../../../../scripts/generate-preset-gallery.js'
import { verifyPresetRender, verifyGallerySources, presetRuntimeStyles, isPresetHandshake, isPresetAck } from './preview-protocol.js'

let result: CompileResult, manifest: PresetSourceManifest
beforeAll(async () => {
  result = await compile({ preset: getCatalog('0.1.0').presets.flat, componentIds: supportedComponentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  manifest = { catalogRelease: '0.1.0', compilerVersion: '0.1.0', sources: Object.fromEntries(await Promise.all(result.artifacts.filter((a) => a.kind === 'component' || a.kind === 'utility').map(async (a) => [a.logicalPath, { canonicalHash: a.sha256, transformedHash: await sha256(a.content) }]))) }
})
const message = () => ({ type: 'preset-render', requestId: 1, result: structuredClone(result), view: { mode: 'light', viewport: 'wide' } })
it('accepts only a complete current compiler result with matching reviewed source', async () => {
  expect(await verifyPresetRender(message(), 0, manifest)).toEqual(message())
  expect(await verifyPresetRender(message(), 1, manifest)).toBeNull()
  const css = presetRuntimeStyles(result)
  expect(css).toContain(':root')
  expect(css).not.toContain('@theme')
  expect(await verifyGallerySources(manifest, Object.fromEntries(result.artifacts.filter((a) => a.kind === 'component' || a.kind === 'utility').map((a) => [a.logicalPath, async () => a.content])))).toBe(true)
  expect(await verifyGallerySources(manifest, {})).toBe(false)
})
it.each(['css', 'hash', 'source', 'provenance', 'duplicate', 'missing', 'extra', 'huge', 'manifest'])('rejects %s tampering', async (kind) => {
  const input = message(), expected = structuredClone(manifest)
  if (kind === 'css') input.result.artifacts.find((a) => a.kind === 'style')!.content += '\nbody { display:none }'
  if (kind === 'hash') input.result.preset.hash = 'a'.repeat(64)
  if (kind === 'source') input.result.artifacts.find((a) => a.kind === 'component')!.content += '\nalert(1)'
  if (kind === 'provenance') input.result.provenance.compilerVersion = '99.0.0'
  if (kind === 'duplicate') input.result.artifacts.push(input.result.artifacts[0])
  if (kind === 'missing') input.result.artifacts.pop()
  if (kind === 'extra') Object.assign(input.view, { unsafe: true })
  if (kind === 'huge') input.result.artifacts[0].content = 'é'.repeat(1024 * 1024)
  if (kind === 'manifest') expected.sources[Object.keys(expected.sources)[0]].canonicalHash = 'a'.repeat(64)
  expect(await verifyPresetRender(input, 0, expected)).toBeNull()
})
it('requires exact handshake and acknowledgement shapes', () => {
  expect(isPresetHandshake({ type: 'ombelle-preset-preview-ready', version: 1 }, 'ready')).toBe(true)
  expect(isPresetHandshake({ type: 'ombelle-preset-preview-ready', version: 1, extra: true }, 'ready')).toBe(false)
  expect(isPresetAck({ type: 'preset-render-ack', requestId: 1, presetHash: result.preset.hash, status: 'applied' })).toBe(true)
  expect(isPresetAck({ type: 'preset-render-ack', requestId: -1, presetHash: result.preset.hash, status: 'applied' })).toBe(false)
})
