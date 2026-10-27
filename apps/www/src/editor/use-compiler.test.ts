import { expect, it } from 'vitest'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from './model.js'
import { acceptCompileResponse, type CompilerState } from './use-compiler.js'

const empty: CompilerState = { status: 'compiling', result: null, diagnostic: null, stale: false }

it('keeps the newest result when worker responses arrive in reverse order', async () => {
  const older = await compileRecipe({ recipe: createEditorDraft('flat').recipe })
  const newer = await compileRecipe({ recipe: createEditorDraft('minimalist').recipe })
  const accepted = acceptCompileResponse(empty, { type: 'compiled', requestId: 2, result: newer }, 2)
  const afterOlder = acceptCompileResponse(accepted, { type: 'compiled', requestId: 1, result: older }, 2)

  expect(accepted.result).toEqual(newer)
  expect(afterOlder).toBe(accepted)
})

it('retains last valid output as stale when the current request is invalid', async () => {
  const valid = await compileRecipe({ recipe: createEditorDraft('flat').recipe })
  const compiled = acceptCompileResponse(empty, { type: 'compiled', requestId: 1, result: valid }, 1)
  const invalid = acceptCompileResponse(compiled, {
    type: 'invalid', requestId: 2, diagnostic: { code: 'INVALID_DATA', message: 'invalid', path: '/content' },
  }, 2)

  expect(invalid).toMatchObject({ status: 'invalid', result: valid, stale: true })
  expect(acceptCompileResponse(invalid, { type: 'compiled', requestId: 1, result: valid }, 2)).toBe(invalid)
})

it('rejects a compiler result with invalid nested preset data', async () => {
  const result = await compileRecipe({ recipe: createEditorDraft('flat').recipe })
  const malformed = { ...result, preset: { ...result.preset, data: { ...result.preset.data, modes: null } } }
  expect(acceptCompileResponse(empty, { type: 'compiled', requestId: 1, result: malformed }, 1)).toBe(empty)
})
