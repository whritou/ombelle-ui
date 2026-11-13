import { describe, expect, it } from 'vitest'
import defaults from './fixtures/variants-076-default-specimens.json'
import { variants076DefaultSpecimens } from './variants-076-defaults.js'

describe('0.7.6 variant specimens', () => {
  it('keeps every default specimen as it was before the variants', () => {
    expect(variants076DefaultSpecimens()).toEqual(defaults)
  })
})
