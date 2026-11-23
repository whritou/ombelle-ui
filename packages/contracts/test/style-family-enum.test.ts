// CMP-08: the preset schema's styleFamily enum duplicates the contracts' style family list. Drift would only
// surface at runtime as INVALID_DATA at /styleFamily, so keep them equal here.
import { expect, it } from 'vitest'
import schema from '../../../schemas/preset.schema.json'
import { styleFamilies } from '../src/index.js'

it('keeps the preset schema styleFamily enum equal to styleFamilies', () => {
  expect([...schema.properties.styleFamily.enum].sort()).toEqual([...styleFamilies].sort())
})
