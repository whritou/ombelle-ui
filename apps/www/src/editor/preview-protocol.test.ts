import { expect, it } from 'vitest'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from './model.js'
import {
  acceptPreviewRender,
  isPreviewReady,
  isPreviewInit,
  validatePreviewCompileResult,
  verifyPreviewCompileResult,
  verifyPreviewRender,
  verifyButtonMatrixRender,
  isPreviewAck,
} from './preview-protocol.js'

async function renderMessage(family: 'flat' | 'liquid-glass' = 'flat') {
  const recipe = createEditorDraft(family).recipe
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

it('accepts every forced state, including active', async () => {
  const message = await renderMessage()
  for (const forcedState of ['none', 'hover', 'focus', 'active', 'disabled', 'loading'])
    expect(acceptPreviewRender({ ...message, state: { ...message.state, forcedState } }, 0)).not.toBeNull()
})

it('accepts a liquid-glass Button render', async () => {
  const message = await renderMessage('liquid-glass')
  expect(acceptPreviewRender(message, 0)).toEqual(message)
})

it('rejects malformed recipe, mode, forced state, and scope', async () => {
  const message = await renderMessage()
  expect(acceptPreviewRender({ ...message, state: { ...message.state, recipe: { ...message.state.recipe, content: '' } } }, 0)).toBeNull()
  expect(acceptPreviewRender({ ...message, state: { ...message.state, mode: 'sepia' } }, 0)).toBeNull()
  expect(acceptPreviewRender({ ...message, state: { ...message.state, forcedState: 'pressed' } }, 0)).toBeNull()
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
  expect(isPreviewAck({ type: 'render-ack', requestId: 3, status: 'rejected' })).toBe(true)
  expect(isPreviewAck({ type: 'render-ack', requestId: 3, status: 'unknown' })).toBe(false)
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

it('rejects CSS content and cross-result tampering even when hashes retain valid shape', async () => {
  const recipe = createEditorDraft('flat').recipe
  const result = await compileRecipe({ recipe })
  expect(await verifyPreviewCompileResult(result)).toEqual(result)
  const injected = { ...result, artifacts: result.artifacts.map((artifact) => artifact.kind === 'style'
    ? { ...artifact, content: artifact.content + '\nbody { display: none; }' }
    : artifact) }
  expect(await verifyPreviewCompileResult(injected)).toBeNull()
  const different = await compileRecipe({ recipe: createEditorDraft('minimalist').recipe })
  expect(await verifyPreviewCompileResult({ ...result, scope: different.scope })).toBeNull()
  const message = await renderMessage()
  expect(await verifyPreviewRender(message, 0)).toEqual(message)
  expect(await verifyPreviewRender({ ...message, state: { ...message.state, css: message.state.css + '\nbody { display: none; }' } }, 0)).toBeNull()
})

it('accepts the reduced-transparency flag only as true', async () => {
  const message = await renderMessage('liquid-glass')
  const flagged = { ...message, state: { ...message.state, reducedTransparency: true } }
  expect(acceptPreviewRender(flagged, 0)).toEqual(flagged)
  for (const reducedTransparency of [false, 'yes', 1])
    expect(acceptPreviewRender({ ...message, state: { ...message.state, reducedTransparency } }, 0)).toBeNull()
  expect(acceptPreviewRender(message, 0)).toEqual(message)
})

async function matrixMessage() {
  const draft = createEditorDraft('flat')
  const cell = async (variant: string, current: boolean) => {
    const recipe = { ...draft.recipe, props: { ...draft.recipe.props, variant } } as typeof draft.recipe
    const result = await compileRecipe({ recipe })
    return { row: variant, column: 'default', current, scope: result.scope, css: result.artifacts.find((a) => a.kind === 'style')!.content, recipe: result.recipe.data }
  }
  return { type: 'matrix-render', requestId: 1, rows: 'variant', columns: 'size', cells: [await cell('default', true), await cell('outline', false)],
    states: true, mode: 'light', viewport: 'wide' }
}

it('verifies a Button matrix and rejects malformed ones', async () => {
  const message = await matrixMessage()
  expect(await verifyButtonMatrixRender(message, 0)).toEqual(message)
  expect(await verifyButtonMatrixRender({ ...message, cells: [] }, 0)).toBeNull()
  expect(await verifyButtonMatrixRender({ ...message, cells: Array(49).fill(message.cells[0]) }, 0)).toBeNull()
  expect(await verifyButtonMatrixRender({ ...message, cells: message.cells.map((cell) => ({ ...cell, current: true })) }, 0)).toBeNull()
  expect(await verifyButtonMatrixRender({ ...message, extra: 1 }, 0)).toBeNull()
  expect(await verifyButtonMatrixRender({ ...message, cells: [{ ...message.cells[0]!, css: message.cells[0]!.css + ' ' }, message.cells[1]] }, 0)).toBeNull()
  expect(await verifyButtonMatrixRender({ ...message, reducedTransparency: true }, 0)).not.toBeNull()
  expect(await verifyButtonMatrixRender({ ...message, reducedTransparency: false }, 0)).toBeNull()
  expect(await verifyButtonMatrixRender(message, 1)).toBeNull()
})

it('a Button matrix carries the axes the reader chose, including no columns', async () => {
  const message = await matrixMessage()
  const swapped = { ...message, rows: 'size', columns: 'variant' }
  expect(await verifyButtonMatrixRender(swapped, 0)).toEqual(swapped)
  const single = { ...message, columns: null, cells: message.cells.map((cell) => ({ ...cell, column: null })) }
  expect(await verifyButtonMatrixRender(single, 0)).toEqual(single)
  expect(await verifyButtonMatrixRender({ ...message, rows: 'loading' }, 0)).toBeNull()
})
