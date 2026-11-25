import { expect, it } from 'vitest'
import lockSchema from '../../../schemas/project-lock.schema.json'
import { isBlockId, supportedBlockIds, supportedComponentIds } from '../src/index.js'

it('lists the four block ids in order', () => {
  expect(supportedBlockIds).toEqual(['login-01', 'settings-01', 'pricing-01', 'dashboard-01'])
})

it('keeps block ids disjoint from component ids', () => {
  for (const id of supportedBlockIds) expect((supportedComponentIds as readonly string[]).includes(id)).toBe(false)
})

it('narrows block ids', () => {
  expect(isBlockId('login-01')).toBe(true)
  expect(isBlockId('button')).toBe(false)
})

it('allows the block kind in the lock schema', () => {
  expect(lockSchema.$defs.artifact.properties.kind.enum).toContain('block')
})
