import type { SnapshotService } from './service'
import { snapshotErrorResponse, SnapshotServiceError } from './errors'
import { randomUUID } from 'node:crypto'
import { parseSnapshotReference } from '@ombelle/contracts'
import { publicationHeaders as headers, handlePublicationPublish, handlePublicationRead } from './publication-http'

export async function handleSnapshotUnsupportedMethod(request: Request, allow: string): Promise<Response> {
  const requestId = randomUUID()
  const response = request.method === 'OPTIONS'
    ? new Response(null, { status: 204, headers: headers(requestId, 'no-store') })
    : snapshotErrorResponse(new SnapshotServiceError({ status: 405, code: 'METHOD_NOT_ALLOWED' }), requestId, request.method === 'HEAD')
  response.headers.set('Allow', allow)
  return response
}

export async function handleSnapshotPublish(request: Request, service: SnapshotService): Promise<Response> {
  return handlePublicationPublish(request, service, 'presets')
}

export async function handleSnapshotRead(request: Request, params: { id: string; revision: string }, service: SnapshotService): Promise<Response> {
  return handlePublicationRead(request, params, service, parseSnapshotReference)
}
