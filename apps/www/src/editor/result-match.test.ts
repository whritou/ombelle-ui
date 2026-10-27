import { describe, expect, it } from 'vitest'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from './model.js'
import { resultMatchesDraft } from './result-match.js'

describe('compiled result and current draft matching', () => {
  it('accepts the complete normalized result of a sparse validated recipe', async () => {
    const draft = createEditorDraft('flat')
    const recipe = { ...draft.recipe, props: {} }
    const result = await compileRecipe({ recipe })
    expect(resultMatchesDraft(result, recipe)).toBe(true)
  })

  it('rejects a stale result with an extra prop after undo restores a sparse recipe', async () => {
    const draft = createEditorDraft('flat')
    const recipe = { ...draft.recipe, props: {} }
    const edited = { ...recipe, props: { loading: true } }
    const stale = await compileRecipe({ recipe: edited })
    expect(resultMatchesDraft(stale, recipe)).toBe(false)
  })
})
