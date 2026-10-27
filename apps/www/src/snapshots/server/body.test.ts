import { afterEach, expect, it, vi } from 'vitest'
import { readPublishBody } from './body'

function request(body: BodyInit, headers: HeadersInit = {}) {
  return new Request('https://example.test/api/v1/presets', {
    method: 'POST', body, duplex: 'half',
    headers: { 'Content-Type': 'application/json', ...headers },
  } as RequestInit)
}
afterEach(() => vi.useRealTimers())

it('bounds actual chunked bytes independently of Content-Length and cancels overflow', async () => {
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(65_536))
      controller.enqueue(new Uint8Array(1))
    },
    cancel() { cancelled = true },
  })
  await expect(readPublishBody(request(body, { 'Content-Length': '1' })))
    .rejects.toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
  expect(cancelled).toBe(true)
})

it('accepts exactly 65,536 UTF-8 bytes', async () => {
  const text = 'é'.repeat(32_767)
  expect(await readPublishBody(request(JSON.stringify(text)))).toBe(text)
})

it('cancels a slow stream at the ten-second deadline without awaiting cancellation', async () => {
  vi.useFakeTimers()
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    cancel() { cancelled = true; return new Promise(() => {}) },
  })
  const failure = readPublishBody(request(body)).catch((error: unknown) => error)
  await vi.advanceTimersByTimeAsync(9_999)
  expect(cancelled).toBe(false)
  await vi.advanceTimersByTimeAsync(1)
  expect(await failure).toMatchObject({ status: 400, code: 'INVALID_DATA' })
  expect(cancelled).toBe(true)
})

it('uses fatal UTF-8 decoding across chunk boundaries', async () => {
  await expect(readPublishBody(request(new Uint8Array([34, 0xc3, 34]))))
    .rejects.toMatchObject({ status: 400, code: 'INVALID_DATA' })
  const body = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(new Uint8Array([34, 0xc3]))
    controller.enqueue(new Uint8Array([0xa9, 34]))
    controller.close()
  } })
  expect(await readPublishBody(request(body))).toBe('é')
})

it('scans nesting before parsing while ignoring escaped quotes, backslashes, and braces in strings', async () => {
  const value = { text: '\\"' + '{['.repeat(30) + '\\' }
  expect(await readPublishBody(request(JSON.stringify(value)))).toEqual(value)
  const allowed = '['.repeat(16) + '0' + ']'.repeat(16)
  expect(await readPublishBody(request(allowed))).toBeDefined()
  await expect(readPublishBody(request('['.repeat(17) + '0' + ']'.repeat(17))))
    .rejects.toMatchObject({ status: 400, code: 'INVALID_DATA' })
})

it.each(['', '{', '{"x":undefined}', 'null trailing'])('rejects malformed JSON %j', async (body) => {
  await expect(readPublishBody(request(body))).rejects.toMatchObject({ status: 400, code: 'INVALID_DATA' })
})

it.each([
  { 'Content-Type': 'text/json' },
  { 'Content-Type': 'application/json; charset=iso-8859-1' },
  { 'Content-Type': 'application/json; unknown=value' },
  { 'Content-Type': 'application/json; charset=utf-8; charset=utf-8' },
  { 'Content-Encoding': 'gzip' },
  { 'Content-Encoding': 'identity, gzip' },
] as Record<string, string>[])('rejects unsupported media before reading the body: %j', async (headers) => {
  await expect(readPublishBody(request('{}', headers)))
    .rejects.toMatchObject({ status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' })
})

it('accepts explicit UTF-8 and identity encoding', async () => {
  expect(await readPublishBody(request('{}', {
    'Content-Type': 'Application/JSON; Charset="UTF-8"', 'Content-Encoding': 'identity',
  }))).toEqual({})
})

it('maps a failed stream to a safe input error', async () => {
  const body = new ReadableStream<Uint8Array>({ start(controller) {
    controller.error(new Error('private transport details'))
  } })
  await expect(readPublishBody(request(body))).rejects.toMatchObject({ status: 400, code: 'INVALID_DATA' })
})
