import { handleRecipeSnapshotPublish } from '../../../../snapshots/server/recipe-http'
import { handleSnapshotUnsupportedMethod } from '../../../../snapshots/server/http'
import { createRequestRecipeSnapshotService } from '../../../../snapshots/server/recipe-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request): Promise<Response> {
  return handleRecipeSnapshotPublish(request, createRequestRecipeSnapshotService())
}
export async function GET(request: Request): Promise<Response> {
  return handleSnapshotUnsupportedMethod(request, 'POST, OPTIONS')
}
export const HEAD = GET
export const PUT = GET
export const PATCH = GET
export const DELETE = GET
export const OPTIONS = GET
