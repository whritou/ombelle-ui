import { it, expect } from 'vitest'
import { supportedComponentIds } from '@ombelle/contracts'
import { componentEditions, getCatalog, getTemplate } from '../src/index.js'
import { catalogData } from '../src/generated.js'
const catalog = getCatalog('0.1.0')
const baseIds = () => supportedComponentIds.filter((id) => componentEditions(id).includes('base'))

it('keeps Radix templates byte for byte', () => {
  for (const id of supportedComponentIds) {
    expect(getTemplate(catalog, id).content, id).toBe(catalogData.templates[id])
    expect(getTemplate(catalog, id, 'radix').content, id).toBe(catalogData.templates[id])
  }
})

it('shares templates without primitive imports across editions', () => {
  const radix = getTemplate(catalog, 'badge', 'radix'),
    base = getTemplate(catalog, 'badge', 'base')
  expect(base.content).toBe(radix.content)
  expect(base.dependencies).toEqual(radix.dependencies)
  expect(componentEditions('badge')).toEqual(['radix', 'base'])
})

it('offers every component in both editions', () => {
  for (const id of supportedComponentIds) expect(componentEditions(id), id).toEqual(['radix', 'base'])
})

it('rejects a component whose Base UI template is missing', () => {
  const withoutSelect = { ...catalog, baseTemplates: { ...catalog.baseTemplates, select: undefined } }
  expect(() => getTemplate(withoutSelect, 'select', 'base')).toThrow(
    expect.objectContaining({
      code: 'UNSUPPORTED_PROJECT',
      message: expect.stringContaining("Component `select` isn't available for Base UI yet; available: "),
    }),
  )
})

it('gives Base UI templates no Radix dependency', () => {
  for (const id of baseIds()) {
    const deps = getTemplate(catalog, id, 'base').dependencies.map((d) => d.name)
    expect(deps.filter((name) => name.startsWith('@radix-ui/')), id).toEqual([])
    expect(getTemplate(catalog, id, 'base').content, id).not.toMatch(/@radix-ui\//)
  }
})
