const messages = {
  INVALID_DATA: 'The request data is invalid.',
  INVALID_REFERENCE: 'The snapshot reference is invalid.',
  INVALID_IDEMPOTENCY_KEY: 'A valid UUID-v4 idempotency key is required.',
  ORIGIN_NOT_ALLOWED: 'Publication from this origin is not allowed.',
  SNAPSHOT_NOT_FOUND: 'The snapshot was not found.',
  METHOD_NOT_ALLOWED: 'This method is not supported for this endpoint.',
  IDEMPOTENCY_CONFLICT: 'The idempotency key was already used for different content.',
  SNAPSHOT_WITHDRAWN: 'The snapshot is no longer publicly available.',
  PAYLOAD_TOO_LARGE: 'The preset exceeds the supported size limit.',
  UNSUPPORTED_MEDIA_TYPE: 'Use application/json with UTF-8 and no content compression.',
  UNSUPPORTED_RELEASE: 'The preset requires an unsupported release.',
  RATE_LIMITED: 'The publication limit has been reached. Try again later.',
  SNAPSHOT_SERVICE_UNAVAILABLE: 'The snapshot service is temporarily unavailable.',
  SNAPSHOT_CAPACITY_REACHED: 'The snapshot service has reached its storage capacity.',
} as const

export type SnapshotErrorCode = keyof typeof messages
export type SnapshotIssue = { path: string; message: string }

// Only create these errors from controlled messages/issues, never storage errors
// or user-supplied text. Unexpected exceptions are deliberately opaque below.
export class SnapshotServiceError extends Error {
  readonly status: number
  readonly code: SnapshotErrorCode
  readonly issues: SnapshotIssue[]
  readonly retryAfter?: number

  constructor(options: {
    status: number
    code: SnapshotErrorCode
    issues?: SnapshotIssue[]
    retryAfter?: number
  }) {
    super(messages[options.code])
    this.name = 'SnapshotServiceError'
    this.status = options.status
    this.code = options.code
    this.issues = options.issues ?? []
    this.retryAfter = options.retryAfter
  }
}

export function snapshotErrorResponse(error: unknown, requestId: string, head = false): Response {
  const failure = error instanceof SnapshotServiceError ? error : new SnapshotServiceError({
    status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE',
  })
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-ID': requestId,
  })
  if (failure.retryAfter !== undefined && Number.isFinite(failure.retryAfter) && failure.retryAfter >= 0)
    headers.set('Retry-After', String(Math.ceil(Math.min(failure.retryAfter, Number.MAX_SAFE_INTEGER))))
  return new Response(head ? null : JSON.stringify({
    code: failure.code,
    message: messages[failure.code],
    issues: failure.issues,
    requestId,
  }), { status: failure.status, headers })
}
