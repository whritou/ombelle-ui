import { officialSnapshotOrigin, validateRecipeSnapshotSource, type RecipeSnapshotSource } from '@ombelle/contracts'
import { installerRunner } from '../snapshots/install-command'
export function recipeSnapshotInstallCommand(source: RecipeSnapshotSource, release?: { packageName: string; version: string }): string {
  const { origin, reference, recipeHash } = validateRecipeSnapshotSource(source)
  if (!/^https?:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::[0-9]+)?$/.test(origin))
    throw new Error('Recipe origin cannot be represented safely in a command.')
  const pins = origin === officialSnapshotOrigin ? '' : ` --snapshot-origin '${origin}' --recipe-hash ${recipeHash}`
  return `${installerRunner(release)} add --recipe ${reference}${pins}`
}
