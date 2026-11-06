import type { InstallableRecipeSnapshot, RecipeSnapshotSource } from '@ombelle/contracts'
import { readPublicationCache, writePublicationCache } from './cache.js'
export async function readRecipeSnapshotCache(root: string, key: RecipeSnapshotSource): Promise<InstallableRecipeSnapshot | null> {
  return readPublicationCache(root, key) as Promise<InstallableRecipeSnapshot | null>
}
export async function writeRecipeSnapshotCache(root: string, key: RecipeSnapshotSource, snapshot: InstallableRecipeSnapshot): Promise<void> {
  return writePublicationCache(root, key, snapshot)
}
