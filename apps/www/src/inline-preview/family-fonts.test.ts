import { supportedStyleFamilies } from '@ombelle/contracts'
import { expect, it } from 'vitest'
import { familyFontIds, fontLoaders, loadFamilyFonts } from './family-fonts'

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
