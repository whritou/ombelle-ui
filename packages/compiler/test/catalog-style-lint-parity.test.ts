import fs from 'node:fs'
import { expect, it } from 'vitest'
import { getCatalog, getTemplate } from '@ombelle/catalog'
import { supportedComponentIds } from '@ombelle/contracts'
import { templateSlots } from '../../../scripts/catalog-style-lint.ts'
import { componentSlots } from '../../catalog/src/component-slots.js'
import { recipeTemplateSlots } from '../src/component-recipe-source.js'

// The build-time style lint reads slots itself; it must agree with what the recipe scoper keeps.
it.each(supportedComponentIds)('%s: the style lint and the recipe scoper read the same slots', id => {
  const catalog = getCatalog('0.1.0')
  const sources = ['packages/catalog/src/templates/' + id + '.tsx', 'packages/catalog/src/templates/base/' + id + '.tsx']
    .filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file, 'utf8'))
  const scoper = new Set((['radix', 'base'] as const).flatMap(edition => recipeTemplateSlots(getTemplate(catalog, id, edition))))
  expect(new Set(templateSlots(id, sources, componentSlots[id]))).toEqual(scoper)
})
