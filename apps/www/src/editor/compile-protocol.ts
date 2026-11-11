import { compileComponentRecipe, compileRecipe } from '@ombelle/compiler'
import { FoundationError, validateComponentRecipe, validateRecipe, type InstallableRecipeCompileResult, type RecipeCompileResult } from '@ombelle/contracts'

export type CompileRequest = { type: 'compile'; requestId: number; recipe: unknown }
export type CompileDiagnostic = {
  code: string
  message: string
  path?: string
  nextAction?: string
}
export type CompileResponse =
  | { type: 'compiled'; requestId: number; result: RecipeCompileResult }
  | { type: 'invalid'; requestId: number; diagnostic: CompileDiagnostic }

function invalid(requestId: number, diagnostic: CompileDiagnostic): CompileResponse {
  return { type: 'invalid', requestId, diagnostic }
}

export async function compileEditorRecipe(request: CompileRequest): Promise<CompileResponse> {
  try {
    const recipe = validateRecipe(request.recipe)
    return {
      type: 'compiled',
      requestId: request.requestId,
      result: await compileRecipe({ recipe }),
    }
  } catch (error) {
    if (error instanceof FoundationError) {
      return invalid(request.requestId, {
        code: error.code,
        message: error.message,
        ...(error.path !== undefined && { path: error.path }),
        ...(error.nextAction !== undefined && { nextAction: error.nextAction }),
      })
    }
    return invalid(request.requestId, {
      code: 'COMPILE_FAILED',
      message: 'The recipe could not be compiled.',
      nextAction: 'Retry compilation or reset the draft.',
    })
  }
}

export async function handleCompileMessage(input: unknown): Promise<CompileResponse> {
  const requestId =
    typeof input === 'object' && input !== null && 'requestId' in input &&
    typeof input.requestId === 'number' && Number.isSafeInteger(input.requestId) &&
    input.requestId >= 0
      ? input.requestId
      : 0
  if (
    typeof input !== 'object' || input === null ||
    !('type' in input) || input.type !== 'compile' ||
    !('requestId' in input) || input.requestId !== requestId ||
    !('recipe' in input)
  ) {
    return invalid(requestId, {
      code: 'INVALID_MESSAGE',
      message: 'Expected a compile request with a valid request ID and recipe.',
      nextAction: 'Send a valid compile request.',
    })
  }
  return compileEditorRecipe(input as CompileRequest)
}

/** The matrix cells and the catalog default, compiled in one worker round trip. */
export type BatchRequest = { type: 'compile-batch'; requestId: number; kind: 'button' | 'catalog'; recipes: unknown[] }
export type BatchResponse =
  | { type: 'compiled-batch'; requestId: number; results: InstallableRecipeCompileResult[] }
  | { type: 'invalid-batch'; requestId: number; index: number; message: string }

/** The most recipes one batch compiles: the matrix cap. */
export const batchLimit = 48

export async function handleBatchMessage(input: unknown): Promise<BatchResponse> {
  const message = typeof input === 'object' && input !== null ? input as Partial<BatchRequest> : {}
  const requestId = typeof message.requestId === 'number' && Number.isSafeInteger(message.requestId) && message.requestId >= 0 ? message.requestId : 0
  if (message.type !== 'compile-batch' || (message.kind !== 'button' && message.kind !== 'catalog') ||
    !Array.isArray(message.recipes) || message.recipes.length === 0 || message.recipes.length > batchLimit)
    return { type: 'invalid-batch', requestId, index: -1, message: `Expected 1 to ${batchLimit} recipes to compile.` }
  const results: InstallableRecipeCompileResult[] = []
  for (const [index, recipe] of message.recipes.entries()) {
    try {
      if (message.kind === 'catalog') results.push(await compileComponentRecipe({ recipe: validateComponentRecipe(recipe) }))
      else {
        const response = await compileEditorRecipe({ type: 'compile', requestId, recipe })
        if (response.type !== 'compiled') return { type: 'invalid-batch', requestId, index, message: response.diagnostic.message }
        results.push(response.result)
      }
    } catch (error) {
      return { type: 'invalid-batch', requestId, index, message: error instanceof Error ? error.message : 'The recipe could not be compiled.' }
    }
  }
  return { type: 'compiled-batch', requestId, results }
}
