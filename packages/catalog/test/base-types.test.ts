import { it, expect } from 'vitest'
import { createElement, type Dispatch, type SetStateAction } from 'react'
import { Select } from '../src/templates/base/select.js'
import { RadioGroup } from '../src/templates/base/radio-group.js'

// Type-level check (pnpm typecheck): Radix-edition handlers such as
// `onValueChange={setValue}` must type-check against the Base UI edition.
// createElement cannot infer a generic component's type argument (JSX can),
// so the value type is given explicitly.
declare const setValue: Dispatch<SetStateAction<string>>
const onString = (value: string) => value.length

it('accepts string value handlers on Base UI Select and RadioGroup', () => {
  const elements = [
    createElement(Select<string>, { defaultValue: 'a', onValueChange: (v) => onString(v ?? '') }),
    createElement(Select<string>, { value: 'a', onValueChange: (v: string | null) => setValue(v ?? '') }),
    createElement(RadioGroup<string>, { defaultValue: 'a', onValueChange: onString }),
    createElement(RadioGroup<string>, { value: 'a', onValueChange: (v: string) => setValue(v) }),
  ]
  expect(elements).toHaveLength(4)
})
