import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js'
import type { FromSchema } from 'json-schema-to-ts'
import { FoundationError } from './diagnostics.js'
import { presetSchema } from './preset-schema.js'
import { recipeSchema } from './recipe-schema.js'
import { recipeSnapshotSchema } from './recipe-snapshot-schema.js'
import { recipeSnapshotSourceSchema } from './recipe-snapshot-source-schema.js'
import { normalizeSnapshotOrigin, type AbsolutePresetReferences, type SnapshotReference } from './snapshot.js'
import { validatePreset } from './validate.js'
import { validateRecipe } from './recipe.js'

// Qualify the referenced recipe's local pointers for type inference, as for presets.
type AbsoluteRecipeReferences<T> = {
  [K in keyof T]: K extends '$ref'
    ? T[K] extends `#${string}` ? `${typeof recipeSchema.$id}${T[K]}` : T[K]
    : T[K] extends object ? AbsoluteRecipeReferences<T[K]> : T[K]
}
export type RecipeSnapshot = FromSchema<typeof recipeSnapshotSchema, {
  references: [AbsolutePresetReferences<typeof presetSchema>, AbsoluteRecipeReferences<typeof recipeSchema>]
}>
export type RecipeSnapshotSource = FromSchema<typeof recipeSnapshotSourceSchema>
const ajv = new Ajv2020({ allErrors: true, strict: true }).addSchema(presetSchema).addSchema(recipeSchema)
const checkSnapshot = ajv.compile(recipeSnapshotSchema)
const checkSource = ajv.compile(recipeSnapshotSourceSchema)

function assertSchema(check: ValidateFunction, input: unknown): void {
  if (check(input)) return
  const error = check.errors![0]
  const suffix = error.keyword === 'additionalProperties' ? '/' + error.params.additionalProperty
    : error.keyword === 'required' ? '/' + error.params.missingProperty : ''
  throw new FoundationError('INVALID_DATA', error.message ?? 'Invalid recipe snapshot', error.instancePath + suffix)
}

export function parseRecipeSnapshotReference(value: string): SnapshotReference {
  if (typeof value !== 'string' || value.length !== 37 || !/^rc_[0-9a-f]{32}@1$/.test(value))
    throw new FoundationError('INVALID_REFERENCE', 'Expected a recipe reference rc_<32 lowercase hexadecimal digits>@1', '/reference')
  return { id: value.slice(0, 35), revision: 1 }
}

export function validateRecipeSnapshot(input: unknown): RecipeSnapshot {
  assertSchema(checkSnapshot, input)
  const snapshot = input as RecipeSnapshot
  validateRecipe(snapshot.recipe)
  validatePreset(snapshot.preset)
  for (const field of ['catalogRelease', 'compilerVersion'] as const)
    if (snapshot.preset[field] !== snapshot[field] || snapshot.recipe.presetRef[field] !== snapshot[field])
      throw new FoundationError('INVALID_DATA', 'Recipe, preset and snapshot releases must match', '/' + field)
  if (snapshot.recipe.presetRef.id !== snapshot.preset.id || snapshot.recipe.presetRef.revision !== snapshot.preset.revision)
    throw new FoundationError('INVALID_DATA', 'Snapshot preset must match the recipe preset reference', '/preset')
  const timestamp = new Date(snapshot.createdAt)
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== snapshot.createdAt)
    throw new FoundationError('INVALID_DATA', 'Expected a valid UTC ISO timestamp', '/createdAt')
  return structuredClone(snapshot)
}

export function validateRecipeSnapshotSource(input: unknown): RecipeSnapshotSource {
  assertSchema(checkSource, input)
  const source = input as RecipeSnapshotSource
  parseRecipeSnapshotReference(source.reference)
  if (normalizeSnapshotOrigin(source.origin) !== source.origin)
    throw new FoundationError('INVALID_DATA', 'Recipe source origin must be canonical', '/origin')
  return structuredClone(source)
}
