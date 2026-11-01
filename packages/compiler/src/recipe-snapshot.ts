import {
  FoundationError, parseRecipeSnapshotReference, validateRecipe, validateRecipeSnapshot,
  type RecipeSnapshot, type RecipeCompileResult,
} from '@ombelle/contracts'
import { canonicalize } from './canonicalize.js'
import { compileRecipe } from './recipe.js'

function assertPayloadSize(value: unknown, limit: number): void {
  if (new TextEncoder().encode(canonicalize(value)).byteLength > limit)
    throw new FoundationError('INVALID_DATA', `Recipe publication exceeds the ${limit}-byte UTF-8 limit`, '/recipe')
}

export async function normalizePublishedRecipe(input: unknown): Promise<RecipeCompileResult> {
  const recipe = validateRecipe(input)
  assertPayloadSize(recipe, 65_536)
  const compiled = await compileRecipe({ recipe })
  assertPayloadSize(compiled.recipe.data, 65_536)
  return compiled
}

export async function verifyRecipeSnapshot(
  input: unknown,
  expected?: { reference: string; recipeHash: string },
): Promise<RecipeSnapshot> {
  const snapshot = validateRecipeSnapshot(input)
  assertPayloadSize(snapshot, 128 * 1024)
  if (expected) {
    const reference = parseRecipeSnapshotReference(expected.reference)
    if (snapshot.id !== reference.id || snapshot.revision !== reference.revision)
      throw new FoundationError('INVALID_DATA', 'Recipe snapshot does not match the requested reference', '/id')
    if (snapshot.recipeHash !== expected.recipeHash)
      throw new FoundationError('INVALID_DATA', 'Recipe snapshot does not match the expected recipe hash', '/recipeHash')
  }
  const compiled = await normalizePublishedRecipe(snapshot.recipe)
  if (canonicalize(compiled.recipe.data) !== canonicalize(snapshot.recipe) || compiled.recipe.hash !== snapshot.recipeHash)
    throw new FoundationError('INVALID_DATA', 'Recipe snapshot must contain normalized recipe bytes with their canonical hash', '/recipe')
  if (canonicalize(compiled.preset.data) !== canonicalize(snapshot.preset) || compiled.preset.hash !== snapshot.presetHash)
    throw new FoundationError('INVALID_DATA', 'Recipe snapshot preset must match its resolved built-in preset', '/preset')
  return snapshot
}
