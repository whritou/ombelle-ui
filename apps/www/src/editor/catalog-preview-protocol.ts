import { canonicalize, compileComponentRecipe } from '@ombelle/compiler'
import { validateComponentRecipe, type ComponentRecipe, type ComponentRecipeCompileResult } from '@ombelle/contracts'

export type CatalogPreviewRender = {
  type: 'catalog-render'
  component: ComponentRecipe['component']
  requestId: number
  result: ComponentRecipeCompileResult
  mode: 'light' | 'dark'
  viewport: 'wide' | 'narrow'
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export async function verifyCatalogCompileResult(input: unknown, component: ComponentRecipe['component']): Promise<ComponentRecipeCompileResult | null> {
  if (!record(input) || !record(input.recipe)) return null
  try {
    const recipe = validateComponentRecipe(input.recipe.data)
    if (recipe.component !== component || input.darkSelector !== '.dark') return null
    const expected = await compileComponentRecipe({ recipe })
    return canonicalize(expected) === canonicalize(input) ? expected : null
  } catch {
    return null
  }
}

export async function verifyCatalogPreviewRender(input: unknown, activeComponent: ComponentRecipe['component'], previousRequestId: number): Promise<CatalogPreviewRender | null> {
  if (!record(input) || input.type !== 'catalog-render' || input.component !== activeComponent ||
    Object.keys(input).length !== 6 ||
    typeof input.requestId !== 'number' || !Number.isSafeInteger(input.requestId) || input.requestId <= previousRequestId ||
    (input.mode !== 'light' && input.mode !== 'dark') || (input.viewport !== 'wide' && input.viewport !== 'narrow')) return null
  const result = await verifyCatalogCompileResult(input.result, activeComponent)
  return result ? { type: 'catalog-render', component: activeComponent, requestId: input.requestId,
    mode: input.mode, viewport: input.viewport, result } : null
}
