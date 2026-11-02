import type { RecipeSnapshot, RecipeSnapshotSource } from '@ombelle/contracts'
import { readPublicationCache, writePublicationCache } from './cache.js'
export async function readRecipeSnapshotCache(root: string, key: RecipeSnapshotSource): Promise<RecipeSnapshot | null> {
  return readPublicationCache(root, key) as Promise<RecipeSnapshot | null>
}
export async function writeRecipeSnapshotCache(root: string, key: RecipeSnapshotSource, snapshot: RecipeSnapshot): Promise<void> {
  return writePublicationCache(root, key, snapshot)
}
