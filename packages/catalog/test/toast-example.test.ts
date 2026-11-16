import { describe, it, expect } from 'vitest'
import {
  expansionExamples,
  baseToastExample,
} from '../src/expansion-examples.js'
describe('Toast example close control', () => {
  it.each([
    ['radix', expansionExamples.toast],
    ['base', baseToastExample],
  ])(
    '%s uses the icon close control in the fixed-size close slot',
    (_edition, example) => {
      expect(example).toContain('<ToastClose />')
      expect(example).not.toContain('<ToastClose>Dismiss</ToastClose>')
    },
  )
})
