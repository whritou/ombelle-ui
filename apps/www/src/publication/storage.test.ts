import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { normalizePublishedPreset } from '@ombelle/compiler'
import { presetPublication } from '../snapshots/publication-kind'
import { recipePublication } from '../recipe-snapshots/publication-kind'
import { createPublishAttempt, type PublishAttempt } from './attempt'
import { readPublishAttempt, writePublishAttempt } from './storage'
import { kinds, storage, type Any } from './test-kinds'

/** Content pinned to a compiler the site does not publish, per kind. */
const unsupported: Record<string, (data: Record<string, unknown>) => unknown> = {
  preset: (data) => ({ ...data, compilerVersion: '9.0.0' }),
  recipe: (data) => ({
    ...data,
    presetRef: { ...(data.presetRef as object), compilerVersion: '9.0.0' },
  }),
}

describe.each(kinds)('$name publish attempt storage', ({ name, kind, draft }) => {
  it('round-trips retry content and rejects expiry, future clocks and malformed records', async () => {
    const attempt = createPublishAttempt(kind, await draft(), 100)
    const session = storage()
    writePublishAttempt(kind, session, attempt)
    expect(readPublishAttempt(kind, session, 101)).toEqual(attempt)
    expect(readPublishAttempt(kind, session, 100 + 86_400_000)).toBeNull()
    writePublishAttempt(kind, session, attempt)
    expect(readPublishAttempt(kind, session, 99)).toBeNull()
    let nested: unknown = 0
    for (let index = 0; index < 18; index++) nested = { child: nested }
    const data = attempt[kind.field] as Record<string, unknown>
    for (const raw of [
      '{',
      JSON.stringify({ ...attempt, storageVersion: 2 }),
      JSON.stringify({ ...attempt, key: 'bad' }),
      JSON.stringify({ ...attempt, createdAt: 200 }),
      JSON.stringify({ ...attempt, [kind.hashField]: 'bad' }),
      JSON.stringify({ ...attempt, secret: 'extra' }),
      JSON.stringify({ ...attempt, [kind.field]: unsupported[name](data) }),
      JSON.stringify({ ...attempt, [kind.field]: { ...data, overrides: nested } }),
      'é'.repeat(70_000),
    ]) {
      session.setItem(kind.storageKey, raw)
      expect(readPublishAttempt(kind, session, 101)).toBeNull()
      expect(session.getItem(kind.storageKey)).toBeNull()
    }
  })
  it('does not write an envelope over the UTF-8 budget', async () => {
    const attempt = createPublishAttempt(kind, await draft(), 100)
    const session = storage()
    expect(() =>
      writePublishAttempt(kind, session, {
        ...attempt,
        [kind.field]: { ...attempt[kind.field], name: 'é'.repeat(70_000) },
      } as PublishAttempt<Any>),
    ).toThrow()
    expect(session.length).toBe(0)
  })
  it('writes only its own key and honours a caller storage key', async () => {
    const attempt = createPublishAttempt(kind, await draft(), 100)
    const session = storage()
    session.setItem('ombelle.button-editor.draft', 'draft sentinel')
    for (const other of [presetPublication, recipePublication])
      if (other.storageKey !== kind.storageKey)
        session.setItem(other.storageKey, 'other kind sentinel')
    writePublishAttempt(kind, session, attempt)
    writePublishAttempt(kind, session, attempt, 'custom:publication')
    expect(readPublishAttempt(kind, session, 101, 'custom:publication')).toEqual(attempt)
    expect(readPublishAttempt(kind, session, 101)).toEqual(attempt)
    expect(session.getItem('ombelle.button-editor.draft')).toBe('draft sentinel')
    expect(
      [presetPublication, recipePublication]
        .filter((other) => other.storageKey !== kind.storageKey)
        .map((other) => session.getItem(other.storageKey)),
    ).toEqual(['other kind sentinel'])
  })
})

it('keeps the storage keys saved drafts already use', () => {
  expect(presetPublication.storageKey).toBe('ombelle:preset-editor:publication:v1')
  expect(recipePublication.storageKey).toBe('ombelle:recipe-editor:publication:v1')
})

it('round-trips a publish attempt for a preset that uses font pairs under schema version 1.1', async () => {
  const ombelle = getCatalog('0.1.0').presets.ombelle
  const attempt = createPublishAttempt(
    presetPublication,
    await normalizePublishedPreset({
      ...structuredClone(ombelle),
      schemaVersion: '1.1',
      design: { ...ombelle.design, fontFamilyId: 'inter', headingFontFamilyId: 'fraunces' },
    }),
    100,
  )
  const session = storage()
  writePublishAttempt(presetPublication, session, attempt)
  expect(readPublishAttempt(presetPublication, session, 101)).toEqual(attempt)
})
