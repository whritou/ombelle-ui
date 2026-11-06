import { handleCompileMessage } from './compile-protocol.js'
import { compileComponentRecipe } from '@ombelle/compiler'

self.onmessage = async (event: MessageEvent<unknown>) => {
  const data = event.data
  if (data && typeof data === 'object' && 'type' in data && data.type === 'compile-catalog' &&
    'requestId' in data && Number.isSafeInteger(data.requestId) && 'recipe' in data) {
    try {
      const result = await compileComponentRecipe({ recipe: data.recipe })
      self.postMessage({ type: 'compiled-catalog', requestId: data.requestId, component: result.recipe.data.component, result })
    } catch (error) {
      self.postMessage({ type: 'invalid-catalog', requestId: data.requestId,
        error: error instanceof Error ? error.message : 'The recipe could not be compiled.' })
    }
    return
  }
  self.postMessage(await handleCompileMessage(event.data))
}
