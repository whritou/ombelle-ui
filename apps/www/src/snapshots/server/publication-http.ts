import { createHash, randomUUID } from 'node:crypto'
import { canonicalize } from '@ombelle/compiler'
import type { PresetSnapshot, InstallableRecipeSnapshot, SnapshotReference } from '@ombelle/contracts'
import { snapshotErrorResponse, SnapshotServiceError } from './errors'

type Envelope = PresetSnapshot | InstallableRecipeSnapshot
type PublicationService<S extends Envelope> = {
  publish(request: Request): Promise<{ snapshot: S; replayed: boolean }>
  read(ref: SnapshotReference): Promise<S>
}
export function publicationHeaders(requestId: string, cacheControl: string): Headers {
  return new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'X-Request-ID': requestId, 'Cache-Control': cacheControl })
}
export async function handlePublicationPublish<S extends Envelope>(request: Request, service: PublicationService<S>, collection: 'presets' | 'recipes'): Promise<Response> {
  const requestId = randomUUID()
  try {
    const { snapshot, replayed } = await service.publish(request)
    const headers = publicationHeaders(requestId, 'no-store')
    headers.set('Location', `/api/v1/${collection}/${snapshot.id}/${snapshot.revision}`)
    return new Response(canonicalize(snapshot), { status: replayed ? 200 : 201, headers })
  } catch (error) { return snapshotErrorResponse(error, requestId) }
}
export async function handlePublicationRead<S extends Envelope>(
  request: Request, params: { id: string; revision: string }, service: PublicationService<S>,
  parseReference: (value: string) => SnapshotReference,
): Promise<Response> {
  const requestId = randomUUID(), head = request.method === 'HEAD'
  try {
    let ref
    try { ref = parseReference(`${params.id}@${params.revision}`) }
    catch { throw new SnapshotServiceError({ status: 400, code: 'INVALID_REFERENCE' }) }
    // Availability and integrity always precede a conditional cache success.
    const snapshot = await service.read(ref), body = canonicalize(snapshot)
    const etag = '"' + createHash('sha256').update(body).digest('hex') + '"'
    const headers = publicationHeaders(requestId, 'public, max-age=0, must-revalidate')
    headers.set('ETag', etag)
    const matches = request.headers.get('If-None-Match')?.split(',').some(value => {
      const tag = value.trim()
      return tag === '*' || tag.replace(/^W\//, '') === etag
    })
    return new Response(head || matches ? null : body, { status: matches ? 304 : 200, headers })
  } catch (error) { return snapshotErrorResponse(error, requestId, head) }
}
