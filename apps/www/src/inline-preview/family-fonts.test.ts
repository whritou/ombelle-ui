// @vitest-environment jsdom
import { supportedStyleFamilies } from '@ombelle/contracts'
import { expect, it, vi } from 'vitest'
import { familyFontIds, fontLoaders, fontTimeoutMs, loadFamilyFonts } from './family-fonts'

it('has a loader for every font a built-in family uses', () => {
  for (const family of supportedStyleFamilies)
    for (const id of familyFontIds(family)) expect(fontLoaders, `${family} uses ${id}`).toHaveProperty([id])
})

it('retries a font whose load failed', async () => {
  const ids = familyFontIds('ombelle')
  const saved = Object.fromEntries(ids.map((id) => [id, fontLoaders[id]!]))
  let calls = 0
  for (const id of ids) fontLoaders[id] = () => Promise.resolve()
  fontLoaders[ids[0]!] = () => (++calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve())
  try {
    await expect(loadFamilyFonts('ombelle')).rejects.toThrow('offline')
    await expect(loadFamilyFonts('ombelle')).resolves.toBeUndefined()
    expect(calls).toBe(2)
  } finally {
    Object.assign(fontLoaders, saved)
  }
})

it("fetches the font files, not only their rules, before resolving", async () => {
  const ids = familyFontIds('papier')
  const saved = Object.fromEntries(ids.map((id) => [id, fontLoaders[id]!]))
  for (const id of ids) fontLoaders[id] = () => Promise.resolve()
  const loaded: string[] = []
  Object.defineProperty(document, 'fonts', { configurable: true, value: { load: async (font: string) => { loaded.push(font); return [] } } })
  try {
    await loadFamilyFonts('papier')
    expect(loaded).toEqual(expect.arrayContaining(["400 1em 'Instrument Sans Variable'", "400 1em 'Fraunces Variable'", "400 1em 'IBM Plex Mono'", "600 1em 'IBM Plex Mono'"]))
  } finally {
    Object.assign(fontLoaders, saved)
    delete (document as { fonts?: unknown }).fonts
  }
})

it('gives up waiting on a stalled font after the timeout, so the stage still switches', async () => {
  vi.useFakeTimers()
  const ids = familyFontIds('organic')
  const saved = Object.fromEntries(ids.map((id) => [id, fontLoaders[id]!]))
  for (const id of ids) fontLoaders[id] = () => new Promise(() => {})
  try {
    let settled = false
    const load = loadFamilyFonts('organic').then(() => { settled = true })
    await vi.advanceTimersByTimeAsync(fontTimeoutMs - 1)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await load
    expect(settled).toBe(true)
    expect(fontTimeoutMs).toBeLessThanOrEqual(3000)
  } finally {
    Object.assign(fontLoaders, saved)
    vi.useRealTimers()
  }
})
