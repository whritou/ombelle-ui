import { SnapshotServiceError } from './errors'

function invalidBody() {
  return new SnapshotServiceError({ status: 400, code: 'INVALID_DATA' })
}

function assertDepth(text: string): void {
  let depth = 0
  let quoted = false
  let escaped = false
  for (const char of text) {
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
    } else if (char === '"') quoted = true
    else if (char === '{' || char === '[') {
      if (++depth > 16) throw invalidBody()
    } else if (char === '}' || char === ']') depth--
  }
}

export async function readPublishBody(request: Request): Promise<unknown> {
  const media = request.headers.get('Content-Type')
  const encoding = request.headers.get('Content-Encoding')
  if (!media || !/^application\/json\s*(?:;\s*charset\s*=\s*(?:utf-8|"utf-8")\s*)?$/i.test(media) ||
      (encoding !== null && encoding.toLowerCase() !== 'identity'))
    throw new SnapshotServiceError({ status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' })

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    reader = request.body?.getReader()
    if (!reader) throw invalidBody()
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(invalidBody()), 10_000)
    })
    const decoder = new TextDecoder('utf-8', { fatal: true })
    let size = 0
    let text = ''
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline])
      if (done) break
      size += value.byteLength
      if (size > 65_536)
        throw new SnapshotServiceError({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
    assertDepth(text)
    return JSON.parse(text) as unknown
  } catch (error) {
    // A stream's cancel hook can itself stall or reject. Never let it extend
    // the deadline or replace the safe transport error.
    void reader?.cancel().catch(() => {})
    throw error instanceof SnapshotServiceError ? error : invalidBody()
  } finally {
    clearTimeout(timer)
    reader?.releaseLock()
  }
}
