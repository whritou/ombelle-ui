import { supportedStyleFamilies } from '@ombelle/contracts'
import { expect, it } from 'vitest'
import { familyFontIds, fontLoaders } from './family-fonts'

it('has a loader for every font a built-in family uses', () => {
  for (const family of supportedStyleFamilies)
    for (const id of familyFontIds(family)) expect(fontLoaders, `${family} uses ${id}`).toHaveProperty([id])
})
