import {
  FoundationError, validateRecipeSnapshotSource,
  type InstallPlan, type ProjectContext, type ProjectLock,
} from '@ombelle/contracts'
import { canonicalize, normalizePublishedRecipe } from '@ombelle/compiler'
import { fileChange } from '../plan/components.js'
import type { ResolvedRecipeInput } from './recipe-input.js'

/** Validate source hashes against installed normalized bytes without network access. */
export async function validateRecipeSnapshotSources(lock: ProjectLock): Promise<void> {
  if (lock.recipeSources === undefined) return
  try {
    if (!lock.recipeSources || typeof lock.recipeSources !== 'object' || Array.isArray(lock.recipeSources))
      throw new Error('Invalid map')
    for (const [key, value] of Object.entries(lock.recipeSources)) {
      const source = validateRecipeSnapshotSource(value)
      const installed = Object.hasOwn(lock.recipes ?? {}, key) ? lock.recipes![key] : undefined
      if (!installed) throw new Error('Orphan source')
      const compiled = await normalizePublishedRecipe(installed.recipe.data)
      if (key !== compiled.recipe.data.id + '@' + compiled.recipe.data.revision ||
        canonicalize(compiled.recipe.data) !== canonicalize(installed.recipe.data) ||
        source.recipeHash !== compiled.recipe.hash || source.recipeHash !== installed.recipe.hash)
        throw new Error('Source hash mismatch')
    }
  } catch {
    throw new FoundationError('UNSUPPORTED_PROJECT', 'Invalid recipe snapshot source provenance in the project lock', '/recipeSources', 'Restore the committed lockfile before installing.')
  }
}

export async function applyRecipeSourceToPlan(
  plan: InstallPlan, context: ProjectContext, input: ResolvedRecipeInput,
): Promise<void> {
  if (!input.source || plan.diagnostics.length || plan.changes.some(change => change.action === 'conflict')) return
  const index = plan.changes.findIndex(change => change.kind === 'lock')
  const state = plan.changes[index]
  if (!state) throw new FoundationError('INTERNAL_ERROR', 'Recipe plan is missing its lock change')
  const lock = JSON.parse(state.afterContent) as ProjectLock
  const key = input.recipe.id + '@' + input.recipe.revision
  if (lock.recipes?.[key]?.recipe.hash !== input.source.recipeHash)
    throw new FoundationError('FILE_CONFLICT', 'Recipe source does not match the planned bytes', key)
  lock.recipeSources = {
    ...lock.recipeSources,
    [key]: lock.recipeSources?.[key] ?? structuredClone(input.source),
  }
  const next = await fileChange(context.root, state.path, canonicalize(lock) + '\n', 'lock')
  if (next.beforeHash !== state.beforeHash)
    throw new FoundationError('FILE_CONFLICT', 'Lock changed while planning recipe source provenance', state.path)
  plan.changes[index] = next
}
