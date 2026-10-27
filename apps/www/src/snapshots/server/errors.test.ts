import { expect, it } from 'vitest'
import { SnapshotServiceError, snapshotErrorResponse } from './errors'

it.each([
  [400, 'INVALID_DATA'], [400, 'INVALID_REFERENCE'], [400, 'INVALID_IDEMPOTENCY_KEY'],
  [403, 'ORIGIN_NOT_ALLOWED'], [404, 'SNAPSHOT_NOT_FOUND'], [405, 'METHOD_NOT_ALLOWED'], [409, 'IDEMPOTENCY_CONFLICT'],
  [410, 'SNAPSHOT_WITHDRAWN'], [413, 'PAYLOAD_TOO_LARGE'], [415, 'UNSUPPORTED_MEDIA_TYPE'],
  [422, 'UNSUPPORTED_RELEASE'], [429, 'RATE_LIMITED'], [503, 'SNAPSHOT_SERVICE_UNAVAILABLE'],
  [503, 'SNAPSHOT_CAPACITY_REACHED'],
] as const)('maps %i %s to safe JSON with no-store headers', async (status, code) => {
  const response = snapshotErrorResponse(new SnapshotServiceError({ status, code }), 'request-123')
  expect(response.status).toBe(status)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('X-Request-ID')).toBe('request-123')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(response.headers.get('Content-Type')).toMatch(/^application\/json/)
  expect(await response.json()).toMatchObject({ code, message: expect.any(String), issues: [], requestId: 'request-123' })
})

it('retains safe validation issues and emits Retry-After seconds', async () => {
  const response = snapshotErrorResponse(new SnapshotServiceError({
    status: 429, code: 'RATE_LIMITED', retryAfter: 42,
    issues: [{ path: '/preset/name', message: 'Expected a string' }],
  }), 'request-123')
  expect(response.headers.get('Retry-After')).toBe('42')
  expect(await response.json()).toMatchObject({ issues: [{ path: '/preset/name', message: 'Expected a string' }] })
})

it('hides unexpected exception internals and returns an empty HEAD error', async () => {
  const response = snapshotErrorResponse(new Error('SQL failed at C:/private/db.sqlite; secret body'), 'request-123')
  expect(response.status).toBe(503)
  const payload = await response.text()
  expect(payload).not.toMatch(/SQL|private|secret/)
  expect(JSON.parse(payload)).toMatchObject({ code: 'SNAPSHOT_SERVICE_UNAVAILABLE', requestId: 'request-123' })
  const head = snapshotErrorResponse(new SnapshotServiceError({ status: 404, code: 'SNAPSHOT_NOT_FOUND' }), 'request-123', true)
  expect(head.status).toBe(404)
  expect(head.headers.get('Content-Type')).toMatch(/^application\/json/)
  expect(head.headers.get('Cache-Control')).toBe('no-store')
  expect(await head.text()).toBe('')
})

it.each([[1.1, '2'], [Number.MAX_VALUE, String(Number.MAX_SAFE_INTEGER)], [-1, null], [Infinity, null], [NaN, null]] as const)(
  'bounds Retry-After %s as %s', (retryAfter, expected) => {
    expect(snapshotErrorResponse(new SnapshotServiceError({ status: 429, code: 'RATE_LIMITED', retryAfter }), 'request-123').headers.get('Retry-After')).toBe(expected)
  },
)
