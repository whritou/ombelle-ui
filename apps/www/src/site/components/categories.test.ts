import { expect, it } from 'vitest'
import { supportedComponentIds } from '@ombelle/contracts'
import { componentDocs } from './catalog'
import { componentCategories, componentGroups } from './categories'
import { categoryNames, componentNames } from './component-names'

it('puts every catalog component in exactly one category', () => {
  const listed = componentCategories.flatMap(category => category.ids)
  expect([...listed].sort()).toEqual([...supportedComponentIds].sort())
  expect(new Set(listed).size).toBe(listed.length)
})

it('lists the categories in their order and the components alphabetically inside each', () => {
  const groups = componentGroups()
  expect(groups.map(group => group.title)).toEqual(['Actions', 'Forms', 'Navigation', 'Overlays', 'Data display', 'Feedback', 'Layout', 'Typography'])
  for (const group of groups) {
    const names = group.docs.map(doc => doc.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  }
  expect(groups.find(group => group.title === 'Navigation')!.docs.map(doc => doc.id)).toContain('sidebar')
})

it('keeps the header names map equal to the catalog docs', () => {
  expect(componentNames).toEqual(Object.fromEntries(componentDocs.map(doc => [doc.id, doc.name])))
  expect(categoryNames()).toEqual(componentGroups().map(group => ({ title: group.title, names: group.docs.map(doc => doc.name) })))
})
