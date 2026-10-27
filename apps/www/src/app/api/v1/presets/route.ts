import { handleSnapshotPublish, handleSnapshotUnsupportedMethod } from '../../../../snapshots/server/http'
import { createRequestSnapshotService } from '../../../../snapshots/server/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  return handleSnapshotPublish(request, createRequestSnapshotService())
}

export async function GET(request: Request): Promise<Response> {
  return handleSnapshotUnsupportedMethod(request, 'POST, OPTIONS')
}

export const HEAD = GET
export const PUT = GET
export const PATCH = GET
export const DELETE = GET
export const OPTIONS = GET
