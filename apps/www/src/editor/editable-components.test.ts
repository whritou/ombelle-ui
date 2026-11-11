import { expect, it } from 'vitest'
import { editableComponents } from './editable-components'

it('lists the component editors in alphabetical order', () => {
  const labels = editableComponents.map((component) => component.label)
  expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'en')))
})
