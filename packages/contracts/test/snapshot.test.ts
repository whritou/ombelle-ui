import { describe, expect, it } from 'vitest'
import preset from '../../catalog/src/presets/flat.json'
import {
  normalizeSnapshotOrigin,
  parseSnapshotReference,
  validatePresetSnapshot,
  validateSnapshotSource,
} from '../src/index.js'

const id = 'ps_0123456789abcdef0123456789abcdef'
const reference = id + '@1'
const hash = '5ff15eb2735326caa531570abf3bb701cc2ad8e054ce90b2940888bed4bd6038'
const envelope = {
  snapshotVersion: '1.0',
  id,
  revision: 1,
  preset,
  presetHash: hash,
  catalogRelease: '0.1.0',
  compilerVersion: '0.1.0',
  createdAt: '2026-10-27T12:34:56.000Z',
  validationStatus: 'draft',
}

describe('snapshot contracts', () => {
  it('parses only exact immutable revision references', () => {
    expect(parseSnapshotReference(reference)).toEqual({ id, revision: 1 })
  })
  it.each([
    id,
    id + '@01',
    id + '@2',
    id + '@9007199254740992',
    id + '%401',
    id.toUpperCase() + '@1',
    reference + '\n',
    ' ' + reference,
    'ps_0123456789abcdef@1',
    reference + '/extra',
  ])('rejects malformed reference %s', (value) => {
    expect(() => parseSnapshotReference(value)).toThrow()
  })
  it('validates and clones a complete envelope without changing embedded identity', () => {
    const result = validatePresetSnapshot(envelope)
    expect(result).toEqual(envelope)
    expect(result).not.toBe(envelope)
    expect(result.preset).not.toBe(preset)
  })
  it.each([
    { ...envelope, extra: true },
    { ...envelope, preset: { ...preset, extra: true } },
    { ...envelope, snapshotVersion: '2.0' },
    { ...envelope, id: id + '\n' },
    ...[0, 2, 1.5, Number.MAX_SAFE_INTEGER + 1].map((revision) => ({
      ...envelope,
      revision,
    })),
    {
      ...envelope,
      preset: { ...preset, revision: Number.MAX_SAFE_INTEGER + 1 },
    },
    { ...envelope, preset: { ...preset, name: 'x'.repeat(81) } },
    { ...envelope, preset: { ...preset, catalogRelease: '9.0.0' } },
    { ...envelope, preset: { ...preset, compilerVersion: '9.0.0' } },
    { ...envelope, preset: { ...preset, styleFamily: 'liquid-glass' } },
    { ...envelope, catalogRelease: '9.0.0' },
    { ...envelope, compilerVersion: '9.0.0' },
    { ...envelope, validationStatus: 'approved' },
    { ...envelope, presetHash: hash.toUpperCase() },
    { ...envelope, presetHash: hash + '\n' },
    { ...envelope, presetHash: 'f'.repeat(63) },
    ...[
      '2026-02-30T12:34:56.000Z',
      '2026-10-27',
      '2026-10-27T12:34:56.000+00:00',
      '2026-10-27T25:00:00.000Z',
    ].map((createdAt) => ({ ...envelope, createdAt })),
    {
      ...envelope,
      preset: {
        ...preset,
        modes: { ...preset.modes, light: { primary: 'oklch(200% 0.2 10)' } },
      },
    },
    null,
    {},
  ])('rejects malformed or unsupported envelopes %#', (value) => {
    expect(() => validatePresetSnapshot(value)).toThrow()
  })
})

describe('snapshot origins and sources', () => {
  it.each([
    ['https://EXAMPLE.com:443/', 'https://example.com'],
    ['https://example.com:8443', 'https://example.com:8443'],
    ['http://localhost:3000/', 'http://localhost:3000'],
    ['http://127.0.0.1:3000', 'http://127.0.0.1:3000'],
    ['http://[::1]:3000/', 'http://[::1]:3000'],
  ])('canonicalizes allowed origin %s', (input, expected) => {
    expect(normalizeSnapshotOrigin(input)).toBe(expected)
  })
  it.each([
    'http://example.com',
    'http://127.1',
    'http://2130706433',
    'http://0x7f000001',
    'http://127.0.0.2',
    'http://[::ffff:127.0.0.1]',
    'http://localhost.example.com',
    'https://user:password@example.com',
    'https://@example.com',
    'https://example.com/path',
    'https://example.com/a/..',
    'https://example.com/?x=1',
    'https://example.com/#x',
    'https://example.com?',
    'https://example.com#',
    'https://example.com\\path',
    ' https://example.com',
    'https://exam\nple.com',
    '//example.com',
    'file:///tmp',
  ])('rejects unsafe origin %s', (input) => {
    expect(() => normalizeSnapshotOrigin(input)).toThrow()
  })
  const source = { origin: 'https://example.com', reference, presetHash: hash }
  it('validates a separate canonical provenance source', () => {
    expect(validateSnapshotSource(source)).toEqual(source)
    expect(validateSnapshotSource(source)).not.toBe(source)
  })
  it.each([
    { ...source, extra: true },
    { ...source, reference: id },
    { ...source, presetHash: hash.toUpperCase() },
    { ...source, origin: 'https://example.com/path' },
    { ...source, origin: 'https://EXAMPLE.com/' },
    null,
    {},
  ])('rejects malformed or noncanonical provenance %#', (input) => {
    expect(() => validateSnapshotSource(input)).toThrow()
  })
})
