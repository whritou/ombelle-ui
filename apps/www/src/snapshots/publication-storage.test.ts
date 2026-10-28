import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { normalizePublishedPreset } from '@ombelle/compiler'
import { createPublishAttempt } from './publication'
import {
  publicationStorageKey,
  readPublishAttempt,
  writePublishAttempt,
} from './publication-storage'

export function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}
it('round-trips retry content and rejects expiry, future clocks and malformed records', async () => {
  const attempt = createPublishAttempt(
    await normalizePublishedPreset(getCatalog('0.1.0').presets.flat),
    100,
  )
  const storage = memoryStorage()
  writePublishAttempt(storage, attempt)
  expect(readPublishAttempt(storage, 101)).toEqual(attempt)
  expect(readPublishAttempt(storage, 100 + 86_400_000)).toBeNull()
  writePublishAttempt(storage, attempt)
  expect(readPublishAttempt(storage, 99)).toBeNull()
  for (const raw of [
    '{',
    JSON.stringify({ ...attempt, storageVersion: 2 }),
    JSON.stringify({ ...attempt, key: 'bad' }),
    JSON.stringify({ ...attempt, presetHash: 'bad' }),
    JSON.stringify({ ...attempt, secret: 'extra' }),
    JSON.stringify({
      ...attempt,
      preset: { ...attempt.preset, compilerVersion: '9.0.0' },
    }),
    'é'.repeat(70_000),
  ]) {
    storage.setItem(publicationStorageKey, raw)
    expect(readPublishAttempt(storage, 101)).toBeNull()
  }
})
it('does not write an envelope over the UTF-8 budget', async () => {
  const attempt = createPublishAttempt(
    await normalizePublishedPreset(getCatalog('0.1.0').presets.flat),
    100,
  )
  const storage = memoryStorage()
  expect(() =>
    writePublishAttempt(storage, {
      ...attempt,
      preset: { ...attempt.preset, name: 'é'.repeat(70_000) },
    }),
  ).toThrow()
  expect(storage.length).toBe(0)
})
