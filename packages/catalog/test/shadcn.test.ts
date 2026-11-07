import { it, expect } from 'vitest'
import { PRESET_STYLES } from 'shadcn/preset'
import { shadcnBaseStyles, shadcnRadixStyles } from '../src/index.js'

it('lists exactly the base styles of the pinned shadcn', () => {
  const parsed = PRESET_STYLES.map((style: string) => 'base-' + style)
  expect([...shadcnBaseStyles].sort()).toEqual([...parsed].sort())
  expect(shadcnBaseStyles).toContain('base-sera')
})

it('keeps the verified Radix styles', () => {
  expect(shadcnRadixStyles).toEqual(['radix-nova', 'new-york'])
})
