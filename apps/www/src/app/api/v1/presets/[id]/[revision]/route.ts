import { handleSnapshotRead, handleSnapshotUnsupportedMethod } from '../../../../../../snapshots/server/http'
import { createRequestSnapshotService } from '../../../../../../snapshots/server/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string; revision: string }> }): Promise<Response> {
  return handleSnapshotRead(request, await context.params, createRequestSnapshotService())
}

export const HEAD = GET

export async function POST(request: Request): Promise<Response> {
  return handleSnapshotUnsupportedMethod(request, 'GET, HEAD, OPTIONS')
}

export const PUT = POST
export const PATCH = POST
export const DELETE = POST
export const OPTIONS = POST
