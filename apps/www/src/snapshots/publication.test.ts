import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { normalizePublishedPreset } from '@ombelle/compiler'
import type { PresetSnapshot } from '@ombelle/contracts'
import {
  createPublishAttempt,
  initialPublication,
  reducePublication,
} from './publication'

it('captures detached content and creates a new key for every new intent', async () => {
  const preset = await normalizePublishedPreset(
    getCatalog('0.1.0').presets.flat,
  )
  const first = createPublishAttempt(preset, 100),
    second = createPublishAttempt(preset, 101)
  expect(first.key).not.toBe(second.key)
  expect(first.presetHash).toBe(preset.hash)
  expect(first.preset).not.toBe(preset.data)
})
it('new draft ignores an older successful response', async () => {
  const preset = await normalizePublishedPreset(
    getCatalog('0.1.0').presets.flat,
  )
  const attempt = createPublishAttempt(preset, 100)
  let state = reducePublication(initialPublication(), {
    type: 'draft',
    draftHash: preset.hash,
  })
  state = reducePublication(state, { type: 'confirm', attempt, operationId: 1 })
  state = reducePublication(state, {
    type: 'publishing',
    operationId: 1,
    draftHash: preset.hash,
  })
  expect(state.status).toBe('publishing')
  state = reducePublication(state, { type: 'draft', draftHash: 'f'.repeat(64) })
  const snapshot = {
    id: 'ps_' + '0'.repeat(32),
    presetHash: preset.hash,
  } as never
  expect(
    reducePublication(state, {
      type: 'published',
      operationId: 1,
      draftHash: preset.hash,
      snapshot,
    }).status,
  ).not.toBe('published')
  expect(
    reducePublication(state, {
      type: 'failed',
      operationId: 1,
      draftHash: preset.hash,
      error: 'old',
    }),
  ).toBe(state)
})

it('rejects an older operation for the same draft and retains verified publication identity after edits', async () => {
  const preset = await normalizePublishedPreset(
    getCatalog('0.1.0').presets.flat,
  )
  const attempt = createPublishAttempt(preset, 100)
  const snapshot: PresetSnapshot = {
    snapshotVersion: '1.0',
    id: 'ps_0123456789abcdef0123456789abcdef',
    revision: 1,
    preset: preset.data,
    presetHash: preset.hash,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    createdAt: '2026-10-27T12:34:56.000Z',
    validationStatus: 'draft',
  }
  let state = reducePublication(initialPublication(), {
    type: 'draft',
    draftHash: preset.hash,
  })
  state = reducePublication(state, { type: 'confirm', attempt, operationId: 1 })
  state = reducePublication(state, { type: 'confirm', attempt, operationId: 2 })
  state = reducePublication(state, {
    type: 'publishing',
    operationId: 2,
    draftHash: preset.hash,
  })
  expect(
    reducePublication(state, {
      type: 'published',
      operationId: 1,
      draftHash: preset.hash,
      snapshot,
    }),
  ).toBe(state)
  state = reducePublication(state, {
    type: 'published',
    operationId: 2,
    draftHash: preset.hash,
    snapshot,
  })
  expect(state.status).toBe('published')
  state = reducePublication(state, { type: 'draft', draftHash: null })
  expect(state.status).toBe('idle')
  expect(state.lastPublished).toEqual(snapshot)
})
