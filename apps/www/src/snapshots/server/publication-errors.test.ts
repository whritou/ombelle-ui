import { describe, expect, it } from 'vitest'
import { FoundationError } from '@ombelle/contracts'
import { invalidPublication, normalizationFailure } from './publication-errors'

// The compiler's size errors, word for word (packages/compiler/src/snapshot.ts and recipe-snapshot.ts).
const oversized = {
  preset: new FoundationError('INVALID_DATA', 'Preset exceeds the 65,536-byte UTF-8 limit', '/preset'),
  recipe: new FoundationError('INVALID_DATA', 'Recipe publication exceeds the 65536-byte UTF-8 limit', '/recipe'),
}

describe.each(['preset', 'recipe'] as const)('%s publication errors', (field) => {
  it('answers an oversized normalized document with 413', () => {
    expect(normalizationFailure(oversized[field], field)).toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
  })

  it('answers an unsupported release with 422', () => {
    expect(normalizationFailure(new FoundationError('UNSUPPORTED_RELEASE', 'Unsupported catalog release', '/catalogRelease'), field))
      .toMatchObject({ status: 422, code: 'UNSUPPORTED_RELEASE' })
  })

  it('answers any other invalid document with 400 and an issue at its field', () => {
    const expected = { status: 400, code: 'INVALID_DATA', issues: [{ path: '/' + field, message: `Provide a valid supported ${field}.` }] }
    expect(normalizationFailure(new FoundationError('INVALID_DATA', 'bad', '/x'), field)).toMatchObject(expected)
    expect(invalidPublication(field)).toMatchObject(expected)
  })

  it('rethrows errors that are not the contract', () => {
    const error = new Error('database down')
    expect(() => normalizationFailure(error, field)).toThrow(error)
  })
})
