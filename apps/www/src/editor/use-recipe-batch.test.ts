import { expect, it } from 'vitest'
import { currentBatch } from './use-recipe-batch'

it('results answer only the recipes they were compiled for', () => {
  const asked = [{ a: 1 }]
  const results = [{ scope: 'x' }] as never[]
  const settled = { results, for: asked, pending: false, error: null }
  expect(currentBatch(settled, asked).results).toBe(results)
  // An edit makes a new recipes array: the old compiles no longer answer it.
  expect(currentBatch(settled, [{ a: 2 }]).results).toBeNull()
  expect(currentBatch(settled, null).results).toBeNull()
})
