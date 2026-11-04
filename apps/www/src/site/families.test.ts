import { expect, it } from 'vitest'
import { familyList, siteStableFamilies } from './families'
import { offeredStyleFamilies } from '../snapshots/install-command'

it('site copy names exactly the stable families the editors offer', () => {
  expect(siteStableFamilies).toEqual(offeredStyleFamilies().filter((family) => family !== 'liquid-glass'))
  expect(familyList(['flat', 'minimalist', 'neo-brutalism'])).toBe('flat, minimalist and neo-brutalism')
  expect(familyList(['flat', 'minimalist', 'neo-brutalism', 'ombelle'])).toBe('flat, minimalist, neo-brutalism and Ombelle')
  expect(familyList(['flat'])).toBe('flat')
})
