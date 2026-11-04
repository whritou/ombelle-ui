import { expect, it } from 'vitest'
import { forcedStateSelector } from './forced-states'

const scope = '[data-slot="recipe-button"][data-ombelle-recipe="abc"]'

it('maps hover, keyboard focus and press to the forced-state attribute', () => {
  expect(forcedStateSelector(`${scope}:not(:disabled):hover`)).toBe(
    `${scope}:not(:disabled)[data-forced-state="hover"]`,
  )
  expect(forcedStateSelector(`${scope}:focus-visible`)).toBe(`${scope}[data-forced-state="focus"]`)
  expect(forcedStateSelector(`${scope}[data-variant="ghost"]:not(:disabled):active`)).toBe(
    `${scope}[data-variant="ghost"]:not(:disabled)[data-forced-state="active"]`,
  )
})

it('keeps only the selectors of a list that use a state, without splitting inside :not()', () => {
  expect(
    forcedStateSelector(`${scope}:not(:disabled, [aria-busy]):hover, ${scope}[data-size="sm"]`),
  ).toBe(`${scope}:not(:disabled, [aria-busy])[data-forced-state="hover"]`)
  expect(forcedStateSelector(`${scope}:hover, ${scope}:active`)).toBe(
    `${scope}[data-forced-state="hover"], ${scope}[data-forced-state="active"]`,
  )
})

it('ignores rules without hover, focus or press', () => {
  expect(forcedStateSelector(`${scope}:disabled`)).toBeNull()
  expect(forcedStateSelector(`${scope}[data-variant="outline"]`)).toBeNull()
})
