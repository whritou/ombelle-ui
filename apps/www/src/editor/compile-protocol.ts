import { compileRecipe } from '@ombelle/compiler'
import { FoundationError, validateRecipe, type RecipeCompileResult } from '@ombelle/contracts'

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
