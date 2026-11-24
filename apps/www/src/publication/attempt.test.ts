import { describe, expect, it } from 'vitest'
import {
  attemptData,
  attemptHash,
  createPublishAttempt,
  initialPublication,
  reducePublication,
  type PublicationAction,
  type PublicationState,
} from './attempt'
import { kinds, type Any } from './test-kinds'

describe.each(kinds)('$name publish attempt', ({ kind, draft, envelope }) => {
  const reduce = (state: PublicationState<Any>, action: PublicationAction<Any>) =>
    reducePublication(kind, state, action)

  it('captures detached content and creates a new key for every new intent', async () => {
    const p = await draft()
    const first = createPublishAttempt(kind, p, 100),
      second = createPublishAttempt(kind, p, 101)
    expect(first.key).not.toBe(second.key)
    expect(attemptHash(kind, first)).toBe(p.hash)
    expect(attemptData(kind, first)).toEqual(p.data)
    expect(attemptData(kind, first)).not.toBe(p.data)
    expect(Object.keys(first)).toEqual([
      'storageVersion',
      'key',
      'createdAt',
      kind.field,
      kind.hashField,
    ])
  })
  it('refuses a draft it cannot publish', async () => {
    const p = await draft()
    expect(() => createPublishAttempt(kind, { ...p, hash: 'bad' }, 100)).toThrow(
      `The current ${kind.noun} cannot be published.`,
    )
  })
  it('new draft ignores an older successful response', async () => {
    const p = await draft()
    const attempt = createPublishAttempt(kind, p, 100)
    let state: PublicationState<Any> = reduce(initialPublication(), {
      type: 'draft',
      draftHash: p.hash,
    })
    state = reduce(state, { type: 'confirm', attempt, operationId: 1 })
    state = reduce(state, { type: 'publishing', operationId: 1, draftHash: p.hash })
    expect(state.status).toBe('publishing')
    state = reduce(state, { type: 'draft', draftHash: 'f'.repeat(64) })
    expect(
      reduce(state, {
        type: 'published',
        operationId: 1,
        draftHash: p.hash,
        snapshot: envelope(p),
      }).status,
    ).not.toBe('published')
    expect(
      reduce(state, { type: 'failed', operationId: 1, draftHash: p.hash, error: 'old' }),
    ).toBe(state)
  })
  it('rejects an older operation for the same draft and retains verified publication identity after edits', async () => {
    const p = await draft()
    const attempt = createPublishAttempt(kind, p, 100)
    const snapshot = envelope(p)
    let state: PublicationState<Any> = reduce(initialPublication(), {
      type: 'draft',
      draftHash: p.hash,
    })
    state = reduce(state, { type: 'confirm', attempt, operationId: 1 })
    state = reduce(state, { type: 'confirm', attempt, operationId: 2 })
    state = reduce(state, { type: 'publishing', operationId: 2, draftHash: p.hash })
    expect(
      reduce(state, { type: 'published', operationId: 1, draftHash: p.hash, snapshot }),
    ).toBe(state)
    state = reduce(state, { type: 'published', operationId: 2, draftHash: p.hash, snapshot })
    expect(state.status).toBe('published')
    state = reduce(state, { type: 'draft', draftHash: null })
    expect(state.status).toBe('idle')
    expect(state.lastPublished).toEqual(snapshot)
  })
})
