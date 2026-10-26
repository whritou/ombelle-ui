import { expect, it } from 'vitest'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from './model.js'
import {
  acceptPreviewRender,
  isPreviewReady,
  isPreviewInit,
  validatePreviewCompileResult,
} from './preview-protocol.js'

async function renderMessage() {
  const recipe = createEditorDraft('flat').recipe
  const result = await compileRecipe({ recipe })
  return {
    type: 'render' as const,
    requestId: 1,
    scope: result.scope,
    state: {
      recipe,
      css: result.artifacts.find((artifact) => artifact.kind === 'style')!.content,
      mode: 'light' as const,
      viewport: 'wide' as const,
      forcedState: 'none' as const,
      requestId: 1,
    },
  }
}

it('accepts a valid render payload and its next request', async () => {
  const first = await renderMessage()
  expect(acceptPreviewRender(first, 0)).toEqual(first)
  expect(acceptPreviewRender({ ...first, requestId: 2, state: { ...first.state, requestId: 2 } }, 1)?.requestId).toBe(2)
  expect(acceptPreviewRender({ ...first, requestId: 2, state: { ...first.state, mode: 'dark', viewport: 'narrow', forcedState: 'focus', requestId: 2 } }, 1)?.requestId).toBe(2)
})

it('rejects malformed recipe, mode, forced state, and scope', async () => {
  const message = await renderMessage()
  expect(acceptPreviewRender({ ...message, state: { ...message.state, recipe: { ...message.state.recipe, content: '' } } }, 0)).toBeNull()
  expect(acceptPreviewRender({ ...message, state: { ...message.state, mode: 'sepia' } }, 0)).toBeNull()
  expect(acceptPreviewRender({ ...message, state: { ...message.state, forcedState: 'active' } }, 0)).toBeNull()
  expect(acceptPreviewRender({ ...message, scope: 'not-a-scope' }, 0)).toBeNull()
})

it('ignores duplicate, stale, and mismatched request IDs', async () => {
  const message = await renderMessage()
  expect(acceptPreviewRender(message, 1)).toBeNull()
  expect(acceptPreviewRender(message, 2)).toBeNull()
  expect(acceptPreviewRender({ ...message, state: { ...message.state, requestId: 2 } }, 0)).toBeNull()
})

it('rejects malformed ready and init messages', () => {
  expect(isPreviewReady({ type: 'ombelle-preview-ready', version: 1 })).toBe(true)
  expect(isPreviewReady({ type: 'ombelle-preview-ready' })).toBe(false)
  expect(isPreviewReady({ type: 'ombelle-preview-ready', version: 1, port: true })).toBe(false)
  expect(isPreviewInit({ type: 'ombelle-preview-init', version: 1 })).toBe(true)
  expect(isPreviewInit({ type: 'ombelle-preview-init', version: 2 })).toBe(false)
})

it('rejects an incomplete nested compiler result before preview use', async () => {
  const result = await compileRecipe({ recipe: createEditorDraft('flat').recipe })
  expect(validatePreviewCompileResult(result)).toEqual(result)
  expect(validatePreviewCompileResult({ ...result, preset: { ...result.preset, data: { ...result.preset.data, modes: null } } })).toBeNull()
  expect(validatePreviewCompileResult({ ...result, recipe: { ...result.recipe, data: { ...result.recipe.data, props: { ...result.recipe.data.props, size: 'huge' } } } })).toBeNull()
  expect(validatePreviewCompileResult({ ...result, artifacts: result.artifacts.map((artifact, index) => index ? artifact : { ...artifact, sha256: 42 }) })).toBeNull()
  expect(validatePreviewCompileResult({ ...result, artifacts: result.artifacts.map((artifact) =>
    artifact.kind === 'component' ? { ...artifact, kind: 'usage' } : artifact,
  ) })).toBeNull()
})
