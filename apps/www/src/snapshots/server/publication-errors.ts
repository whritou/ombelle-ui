import { FoundationError } from '@ombelle/contracts'
import { SnapshotServiceError } from './errors'

// The preset and recipe services answer the same failures the same way (DUP-02): an invalid
// document is 400 with an issue at its field, an oversized normalized one is 413, and an
// unsupported release is 422.

export type PublicationField = 'preset' | 'recipe'

export function invalidPublication(field: PublicationField): SnapshotServiceError {
  return new SnapshotServiceError({ status: 400, code: 'INVALID_DATA', issues: [{ path: '/' + field, message: `Provide a valid supported ${field}.` }] })
}

/** The service error for a failed normalization; errors that are not the contract's are rethrown. */
export function normalizationFailure(error: unknown, field: PublicationField): SnapshotServiceError {
  if (!(error instanceof FoundationError)) throw error
  if (error.code === 'UNSUPPORTED_RELEASE') return new SnapshotServiceError({ status: 422, code: 'UNSUPPORTED_RELEASE' })
  // The compiler's size limits (65,536 bytes for both kinds) apply after normalization.
  if (/exceeds the [\d,]+-byte UTF-8 limit/.test(error.message)) return new SnapshotServiceError({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
  return invalidPublication(field)
}
