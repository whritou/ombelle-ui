// RL-08: the editors say how long to wait, whose limit it is, and that a full service is paused.
import { expect, it } from 'vitest'
import { formatWait, publicationFailure } from './publication-failure'

const response = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

it('shows the wait from Retry-After and names a limit shared by everyone', async () => {
  expect((await publicationFailure(response(429, { code: 'RATE_LIMITED', issues: [{ path: '/rateLimit/minute' }] }, { 'Retry-After': '42' }))).message)
    .toBe('Publication limit reached for your connection. Try again in 42 seconds. Your local exports still work.')
  expect((await publicationFailure(response(429, { code: 'RATE_LIMITED', issues: [{ path: '/rateLimit/global-day' }] }, { 'Retry-After': '18987' }))).message)
    .toBe('The service has reached its publication limit for everyone today. Try again in 6 hours. Your local exports still work.')
})

it('words a full service as paused and keeps withdrawal distinct', async () => {
  expect((await publicationFailure(response(503, { code: 'SNAPSHOT_CAPACITY_REACHED' }))).message).toContain('Publishing is paused')
  expect((await publicationFailure(response(503, { code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))).message).toContain('retry this attempt within 24 hours')
  expect(await publicationFailure(response(410, {}))).toMatchObject({ withdrawn: true })
})

it('formats waits', () => {
  expect([formatWait(0), formatWait(61), formatWait(3600), formatWait(3601)]).toEqual(['1 second', '2 minutes', '1 hour', '2 hours'])
})
