import { beforeAll, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { parseSnapshotReference, type PresetSnapshot } from '@ombelle/contracts'
import {
  canonicalize,
  normalizePublishedPreset,
  resolvePreset,
  sha256,
  verifyPresetSnapshot,
} from '../src/index.js'

const preset = getCatalog('0.1.0').presets.flat
const hash = '5ff15eb2735326caa531570abf3bb701cc2ad8e054ce90b2940888bed4bd6038'
let envelope: PresetSnapshot
beforeAll(async () => {
  envelope = {
    snapshotVersion: '1.0',
    id: 'ps_0123456789abcdef0123456789abcdef',
    revision: 1,
    preset: (await resolvePreset(preset, getCatalog('0.1.0'))).data,
    presetHash: hash,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    createdAt: '2026-10-27T12:34:56.000Z',
    validationStatus: 'draft',
  }
})

it('keeps embedded identity and the existing canonical preset hash', async () => {
  const normalized = await normalizePublishedPreset(preset)
  expect(normalized).toEqual(await resolvePreset(preset, getCatalog('0.1.0')))
  expect(normalized.hash).toBe(hash)
  expect((await verifyPresetSnapshot(envelope)).preset).toEqual(normalized.data)
  expect(() => parseSnapshotReference(envelope.id + '@01')).toThrow()
  expect(normalized.data).toMatchObject({
    id: 'builtin-flat',
    name: 'Flat',
    revision: 1,
  })
  expect(await sha256(canonicalize(normalized.data) + '\n')).not.toBe(hash)
})
it('checks requested distribution identity and required preset hash', async () => {
  const expected = { reference: envelope.id + '@1', presetHash: hash }
  expect(await verifyPresetSnapshot(envelope, expected)).toEqual(envelope)
  await expect(
    verifyPresetSnapshot(envelope, {
      ...expected,
      reference: 'ps_ffffffffffffffffffffffffffffffff@1',
    }),
  ).rejects.toThrow()
  await expect(
    verifyPresetSnapshot(envelope, {
      ...expected,
      reference: envelope.id + '@01',
    }),
  ).rejects.toThrow()
  await expect(
    verifyPresetSnapshot(envelope, { ...expected, presetHash: 'f'.repeat(64) }),
  ).rejects.toThrow()
})
it.each(['colors', 'defaults', 'hash', 'content'])(
  'rejects an envelope requiring normalization or with invalid integrity: %s',
  async (change) => {
    const value = structuredClone(envelope)
    if (change === 'colors') value.preset.modes.light.primary = '#1D4ED8'
    if (change === 'defaults') delete value.preset.componentDefaults
    if (change === 'hash') value.presetHash = '0'.repeat(64)
    if (change === 'content') value.preset.name = 'Changed'
    await expect(verifyPresetSnapshot(value)).rejects.toThrow()
  },
)
it('normalizes sparse drafts through the existing resolver without mutating them', async () => {
  const input = { ...preset, design: {}, modes: { light: {}, dark: {} } }
  const before = structuredClone(input)
  expect(await normalizePublishedPreset(input)).toEqual(
    await resolvePreset(input, getCatalog('0.1.0')),
  )
  expect(input).toEqual(before)
})
it.each([
  { ...preset, catalogRelease: '9.0.0' },
  { ...preset, compilerVersion: '9.0.0' },
  { ...preset, styleFamily: 'liquid-glass' },
  { ...preset, revision: Number.MAX_SAFE_INTEGER + 1 },
  { ...preset, schemaVersion: '2.0' },
  { ...preset, extra: true },
])('rejects unsupported publication input %#', async (input) => {
  await expect(normalizePublishedPreset(input)).rejects.toThrow()
})
it('rejects oversized untrusted UTF-8 publication input', async () => {
  const input = { ...preset, name: '🌷'.repeat(17_000) }
  await expect(normalizePublishedPreset(input)).rejects.toThrow(
    expect.objectContaining({ code: 'INVALID_DATA' }),
  )
})
it.each(['flat', 'minimalist', 'neo-brutalism'] as const)(
  'accepts bounded supported family %s',
  async (family) => {
    const normalized = await normalizePublishedPreset(
      getCatalog('0.1.0').presets[family],
    )
    expect(
      new TextEncoder().encode(canonicalize(normalized.data)).byteLength,
    ).toBeLessThanOrEqual(65_536)
  },
)
it('does not include timestamp or snapshot identity in the preset hash', async () => {
  const other = {
    ...envelope,
    id: 'ps_ffffffffffffffffffffffffffffffff',
    createdAt: '2026-11-01T00:00:00.000Z',
  }
  expect((await verifyPresetSnapshot(other)).presetHash).toBe(hash)
})
