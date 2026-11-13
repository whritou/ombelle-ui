import { describe, expect, it } from 'vitest'
import defaults from './fixtures/components-076-default-specimens.json'
import { components076DefaultSpecimens } from './components-076-defaults.js'

describe('0.7.6 component specimens', () => {
  it('keeps the default Field and Checkbox specimens as they were before the parts', () => {
    expect(components076DefaultSpecimens()).toEqual(defaults)
  })
})
