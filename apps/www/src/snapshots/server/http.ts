import type { SnapshotService } from './service'
import { snapshotErrorResponse, SnapshotServiceError } from './errors'
import { createHash, randomUUID } from 'node:crypto'
import { canonicalize } from '@ombelle/compiler'
import { parseSnapshotReference } from '@ombelle/contracts'

function headers(requestId: string, cacheControl: string): Headers {
  return new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'X-Request-ID': requestId, 'Cache-Control': cacheControl })
}

export async function handleSnapshotUnsupportedMethod(request: Request, allow: string): Promise<Response> {
  const requestId = randomUUID()
  const response = request.method === 'OPTIONS'
    ? new Response(null, { status: 204, headers: headers(requestId, 'no-store') })
    : snapshotErrorResponse(new SnapshotServiceError({ status: 405, code: 'METHOD_NOT_ALLOWED' }), requestId, request.method === 'HEAD')
  response.headers.set('Allow', allow)
  return response
}

export async function handleSnapshotPublish(request: Request, service: SnapshotService): Promise<Response> {
  const requestId = randomUUID()
  try {
    const { snapshot, replayed } = await service.publish(request)
    const responseHeaders = headers(requestId, 'no-store')
    responseHeaders.set('Location', `/api/v1/presets/${snapshot.id}/${snapshot.revision}`)
    return new Response(canonicalize(snapshot), { status: replayed ? 200 : 201, headers: responseHeaders })
  } catch (error) { return snapshotErrorResponse(error, requestId) }
}

export async function handleSnapshotRead(request: Request, params: { id: string; revision: string }, service: SnapshotService): Promise<Response> {
  const requestId = randomUUID(), head = request.method === 'HEAD'
  try {
    let ref
    try { ref = parseSnapshotReference(`${params.id}@${params.revision}`) }
    catch { throw new SnapshotServiceError({ status: 400, code: 'INVALID_REFERENCE' }) }
    // Always read and verify before evaluating cache validators: neither
    // withdrawal nor corrupt storage may be hidden by a client cache hit.
    const snapshot = await service.read(ref)
    const body = canonicalize(snapshot)
    const etag = '"' + createHash('sha256').update(body).digest('hex') + '"'
    const responseHeaders = headers(requestId, 'public, max-age=0, must-revalidate')
    responseHeaders.set('ETag', etag)
    const matches = request.headers.get('If-None-Match')?.split(',').some((value) => {
      const tag = value.trim()
      return tag === '*' || tag.replace(/^W\//, '') === etag
    })
    return new Response(head || matches ? null : body, { status: matches ? 304 : 200, headers: responseHeaders })
  } catch (error) { return snapshotErrorResponse(error, requestId, head) }
}
