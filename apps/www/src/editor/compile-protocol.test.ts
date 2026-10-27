import { expect, it } from 'vitest'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from './model.js'
import { compileEditorRecipe, handleCompileMessage } from './compile-protocol.js'
import { isCompileResponse } from './use-compiler.js'

it('returns the shared compiler artifacts with their exact paths, bytes, hashes, and request ID', async () => {
  const recipe = createEditorDraft('flat').recipe
  const direct = await compileRecipe({ recipe })
  const response = await compileEditorRecipe({ type: 'compile', requestId: 42, recipe })

  expect(response).toEqual({ type: 'compiled', requestId: 42, result: direct })
  if (response.type === 'compiled') {
    expect(response.result.artifacts.map(({ logicalPath, content, sha256 }) => ({ logicalPath, content, sha256 })))
      .toEqual(direct.artifacts.map(({ logicalPath, content, sha256 }) => ({ logicalPath, content, sha256 })))
  }
})

it('reports a recipe field path without returning artifacts for invalid input', async () => {
  const recipe = { ...createEditorDraft('flat').recipe, content: 17 }
  const response = await compileEditorRecipe({ type: 'compile', requestId: 7, recipe })

  expect(response).toMatchObject({
    type: 'invalid',
    requestId: 7,
    diagnostic: { code: 'INVALID_DATA', path: '/content' },
  })
  expect(response).not.toHaveProperty('result')
})

it('rejects unknown and malformed protocol messages with serializable diagnostics', async () => {
  const unknown = await handleCompileMessage({ type: 'execute', requestId: 9, source: 'alert(1)' })
  const malformed = await handleCompileMessage({ type: 'compile', requestId: -1, recipe: {} })

  expect(unknown).toMatchObject({ type: 'invalid', requestId: 9, diagnostic: { code: 'INVALID_MESSAGE' } })
  expect(malformed).toMatchObject({ type: 'invalid', diagnostic: { code: 'INVALID_MESSAGE' } })
  expect(() => structuredClone(unknown)).not.toThrow()
  expect(() => structuredClone(malformed)).not.toThrow()
})

it('rejects malformed worker responses before they enter editor state', async () => {
  const recipe = createEditorDraft('flat').recipe
  const valid = await compileEditorRecipe({ type: 'compile', requestId: 4, recipe })

  expect(isCompileResponse(valid)).toBe(true)
  expect(isCompileResponse({ type: 'compiled', requestId: 4, result: { artifacts: [{ logicalPath: 'x', content: 17 }] } })).toBe(false)
  expect(isCompileResponse({ type: 'invalid', requestId: 4, diagnostic: { code: 'BAD', message: 17 } })).toBe(false)
})
