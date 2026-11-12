import { describe, expect, it } from 'vitest'
import defaults from './fixtures/variants-075-default-specimens.json'
import { variants075DefaultSpecimens } from './variants-075-defaults.js'

describe('0.7.5 variant specimens', () => {
  it('keeps every default specimen as it was before the variants', () => {
    expect(variants075DefaultSpecimens()).toEqual(defaults)
  })
})
