import {
  FoundationError, normalizeRecipe, parseRecipeSnapshotReference, validateRecipe, validateRecipeSnapshot,
  validateInstallableRecipe, validateInstallableRecipeSnapshot,
  type RecipeSnapshot, type RecipeCompileResult, type InstallableRecipeSnapshot, type InstallableRecipeCompileResult,
} from '@ombelle/contracts'
import { canonicalize } from './canonicalize.js'
import { sha256 } from './hash.js'
import { assertStoredPresetNormalized } from './snapshot.js'
import { compileRecipe } from './recipe.js'
import { compileInstallableRecipe } from './component-recipe.js'

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
  return verifySnapshot(validateRecipeSnapshot(input), expected)
}

export async function normalizePublishedInstallableRecipe(input: unknown): Promise<InstallableRecipeCompileResult> {
  const recipe = validateInstallableRecipe(input)
  assertPayloadSize(recipe, 65_536)
  const compiled = await compileInstallableRecipe({ recipe })
  assertPayloadSize(compiled.recipe.data, 65_536)
  return compiled
}

export async function verifyInstallableRecipeSnapshot(
  input: unknown,
  expected?: { reference: string; recipeHash: string },
): Promise<InstallableRecipeSnapshot> {
  return verifySnapshot(validateInstallableRecipeSnapshot(input), expected)
}

async function verifySnapshot<T extends InstallableRecipeSnapshot>(
  snapshot: T,
  expected?: { reference: string; recipeHash: string },
): Promise<T> {
  assertPayloadSize(snapshot, 128 * 1024)
  if (expected) {
    const reference = parseRecipeSnapshotReference(expected.reference)
    if (snapshot.id !== reference.id || snapshot.revision !== reference.revision)
      throw new FoundationError('INVALID_DATA', 'Recipe snapshot does not match the requested reference', '/id')
    if (snapshot.recipeHash !== expected.recipeHash)
      throw new FoundationError('INVALID_DATA', 'Recipe snapshot does not match the expected recipe hash', '/recipeHash')
  }
  // A snapshot is identified by its stored bytes (decision 0009). The stored recipe and preset are checked
  // against their own hashes and normal form, never against today's built-in preset or catalog defaults.
  const recipe = validateInstallableRecipe(snapshot.recipe)
  const normalized = recipe.schemaVersion === '2.0'
    ? recipe
    : normalizeRecipe(recipe, snapshot.preset.componentDefaults?.button)
  if (canonicalize(normalized) !== canonicalize(snapshot.recipe) ||
    await sha256(canonicalize(snapshot.recipe)) !== snapshot.recipeHash)
    throw new FoundationError('INVALID_DATA', 'Recipe snapshot must contain normalized recipe bytes with their canonical hash', '/recipe')
  assertStoredPresetNormalized(snapshot.preset, '/preset')
  const ref = recipe.presetRef
  if (snapshot.preset.id !== ref.id || snapshot.preset.revision !== ref.revision ||
    snapshot.preset.catalogRelease !== ref.catalogRelease || snapshot.preset.compilerVersion !== ref.compilerVersion ||
    await sha256(canonicalize(snapshot.preset)) !== snapshot.presetHash)
    throw new FoundationError('INVALID_DATA', 'Recipe snapshot preset must be the built-in preset its recipe names, with its canonical hash', '/preset')
  return snapshot
}
