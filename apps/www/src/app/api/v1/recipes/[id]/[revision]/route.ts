import { handleRecipeSnapshotRead } from '../../../../../../snapshots/server/recipe-http'
import { handleSnapshotUnsupportedMethod } from '../../../../../../snapshots/server/http'
import { createRequestRecipeSnapshotService } from '../../../../../../snapshots/server/recipe-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params: Promise<{ id: string; revision: string }> }): Promise<Response> {
  return handleRecipeSnapshotRead(request, await context.params, createRequestRecipeSnapshotService())
}
export const HEAD = GET
export async function POST(request: Request): Promise<Response> {
  return handleSnapshotUnsupportedMethod(request, 'GET, HEAD, OPTIONS')
}
export const PUT = POST
export const PATCH = POST
export const DELETE = POST
export const OPTIONS = POST
