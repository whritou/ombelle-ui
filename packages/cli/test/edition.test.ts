import { it, expect } from 'vitest'
import { shadcnBaseStyles } from '@ombelle/catalog'
import { detectEdition } from '../src/project/edition.js'

it('treats projects without a shadcn style as Radix', () => {
  expect(detectEdition(undefined)).toBe('radix')
})

it.each(['radix-nova', 'new-york'])('detects %s as Radix', (style) => {
  expect(detectEdition(style)).toBe('radix')
})

it.each([...shadcnBaseStyles])('detects %s as Base UI', (style) => {
  expect(detectEdition(style)).toBe('base')
})

it.each(['base-unknown', 'radix-lyra', ''])('rejects %j', (style) => {
  expect(detectEdition(style)).toBeUndefined()
})
