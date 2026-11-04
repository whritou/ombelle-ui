import { afterEach, expect, it, vi } from 'vitest'
import { readDrawerOpen, useDrawerState, writeDrawerOpen } from './use-drawer-state'

afterEach(() => vi.unstubAllGlobals())

const throwing = {
  get localStorage(): Storage {
    throw new Error('blocked')
  },
}

it('exports the hook', () => {
  expect(typeof useDrawerState).toBe('function')
})

it('falls back to the initial value when storage throws', () => {
  vi.stubGlobal('window', throwing)
  expect(readDrawerOpen('k', true)).toBe(true)
  expect(readDrawerOpen('k', false)).toBe(false)
  expect(() => writeDrawerOpen('k', true)).not.toThrow()
})

it('round-trips through storage when available', () => {
  const data = new Map<string, string>()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  })
  expect(readDrawerOpen('k', false)).toBe(false)
  writeDrawerOpen('k', true)
  expect(readDrawerOpen('k', false)).toBe(true)
  writeDrawerOpen('k', false)
  expect(readDrawerOpen('k', true)).toBe(false)
})

it('uses the initial value when there is no window', () => {
  expect(readDrawerOpen('k', true)).toBe(true)
})
