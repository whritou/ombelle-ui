import { parseRecipeSnapshotReference } from '@ombelle/contracts'
import type { RecipeSnapshotService } from './recipe-service'
import { handlePublicationPublish, handlePublicationRead } from './publication-http'

export function handleRecipeSnapshotPublish(request: Request, service: RecipeSnapshotService): Promise<Response> {
  return handlePublicationPublish(request, service, 'recipes')
}
export function handleRecipeSnapshotRead(request: Request, params: { id: string; revision: string }, service: RecipeSnapshotService): Promise<Response> {
  return handlePublicationRead(request, params, service, parseRecipeSnapshotReference)
}
