// CMP-03: schema-2.0 recipe prop defaults are written into normalized, hashed recipe data. Adding or changing
// a default for an existing component changes how already published recipes normalize, so it is a contract
// change (decision 0009), not an ordinary schema edit. New components may add any defaults.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { componentRecipeComponents, componentRecipeFields, defaultRecipeFields } from '@ombelle/contracts'

const fixture = new URL('./fixtures/component-recipe-prop-defaults.json', import.meta.url)

it('keeps the prop defaults of every existing schema-2.0 component', () => {
  const actual = Object.fromEntries(componentRecipeComponents.map(component =>
    [component, defaultRecipeFields(componentRecipeFields(component).props)]))
  if (process.env.OMBELLE_WRITE_FIXTURES === '1' || !existsSync(fixture))
    writeFileSync(fixture, JSON.stringify(actual, null, 2) + '\n')
  const pinned = JSON.parse(readFileSync(fixture, 'utf8')) as Record<string, unknown>
  for (const [component, defaults] of Object.entries(actual))
    if (Object.hasOwn(pinned, component))
      expect(defaults, `${component} prop defaults changed: published recipes would no longer normalize to their ` +
        'stored bytes. Treat this as a contract change (docs/decisions/0009-snapshot-identity-and-contract-version.md).')
        .toEqual(pinned[component])
})
