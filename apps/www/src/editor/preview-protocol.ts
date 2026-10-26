import { resolveRecipePreset } from '@ombelle/catalog'
import { validatePreset, validateRecipe, type Recipe, type RecipeCompileResult } from '@ombelle/contracts'

export type PreviewFrameState = {
  recipe: Recipe
  css: string
  mode: 'light' | 'dark'
  viewport: 'wide' | 'narrow'
  forcedState: 'none' | 'focus' | 'hover'
  requestId: number
}

export type PreviewRender = { type: 'render'; requestId: number; scope: string; state: PreviewFrameState }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value)
}

function requestId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function hash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

export function isPreviewReady(input: unknown): boolean {
  return record(input) && exactKeys(input, ['type', 'version']) &&
    input.type === 'ombelle-preview-ready' && input.version === 1
}

export function isPreviewInit(input: unknown): boolean {
  return record(input) && exactKeys(input, ['type', 'version']) &&
    input.type === 'ombelle-preview-init' && input.version === 1
}

export function acceptPreviewRender(input: unknown, previousRequestId: number): PreviewRender | null {
  if (!record(input) || !exactKeys(input, ['type', 'requestId', 'scope', 'state']) ||
    input.type !== 'render' || !requestId(input.requestId) ||
    input.requestId <= previousRequestId || !hash(input.scope) || !record(input.state)) return null
  const state = input.state
  if (!exactKeys(state, ['recipe', 'css', 'mode', 'viewport', 'forcedState', 'requestId']) ||
    state.requestId !== input.requestId || typeof state.css !== 'string' ||
    state.css.length === 0 || state.css.length > 100_000 ||
    !state.css.includes(`[data-ombelle-recipe='${input.scope}']`) ||
    !['light', 'dark'].includes(state.mode as string) ||
    !['wide', 'narrow'].includes(state.viewport as string) ||
    !['none', 'focus', 'hover'].includes(state.forcedState as string)) return null
  try {
    const recipe = validateRecipe(state.recipe)
    const preset = resolveRecipePreset(recipe.presetRef)
    if (!['flat', 'minimalist', 'neo-brutalism'].includes(preset.styleFamily)) return null
  } catch {
    return null
  }
  return input as PreviewRender
}

export function validatePreviewCompileResult(input: unknown): RecipeCompileResult | null {
  if (!record(input) || !exactKeys(input, ['artifacts', 'dependencies', 'recipe', 'preset', 'scope', 'darkSelector', 'provenance']) ||
    !Array.isArray(input.artifacts) || input.artifacts.length !== 4 ||
    !input.artifacts.every((item: unknown) => record(item) && exactKeys(item, ['logicalPath', 'kind', 'content', 'sha256']) &&
      typeof item.logicalPath === 'string' && typeof item.content === 'string' && hash(item.sha256) &&
      ['component', 'style', 'usage', 'utility'].includes(item.kind as string)) ||
    !Array.isArray(input.dependencies) || !input.dependencies.every((item: unknown) => record(item) &&
      exactKeys(item, ['name', 'version']) && typeof item.name === 'string' && typeof item.version === 'string') ||
    !record(input.recipe) || !exactKeys(input.recipe, ['data', 'hash']) || !hash(input.recipe.hash) ||
    !record(input.preset) || !exactKeys(input.preset, ['data', 'hash']) || !hash(input.preset.hash) ||
    !hash(input.scope) || input.darkSelector !== '.dark' || !record(input.provenance) ||
    !exactKeys(input.provenance, ['catalogRelease', 'compilerVersion']) ||
    input.provenance.catalogRelease !== '0.1.0' || input.provenance.compilerVersion !== '0.1.0') return null
  try {
    const recipe = validateRecipe(input.recipe.data)
    const preset = validatePreset(input.preset.data)
    const builtin = resolveRecipePreset(recipe.presetRef)
    if (Object.keys(recipe.props).length !== 5 ||
      !['variant', 'size', 'type', 'disabled', 'loading'].every((key) => key in recipe.props) ||
      preset.id !== builtin.id || preset.revision !== builtin.revision ||
      recipe.presetRef.catalogRelease !== '0.1.0' || recipe.presetRef.compilerVersion !== '0.1.0' ||
      !['component', 'style', 'usage', 'utility'].every((kind) =>
        (input.artifacts as Array<{ kind: string }>).filter((item) => item.kind === kind).length === 1)) return null
  } catch {
    return null
  }
  return input as RecipeCompileResult
}
