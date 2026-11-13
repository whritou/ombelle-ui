import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { describeComponentRecipe } from '../src/index.js'

export const variants076Components = ['sheet', 'card', 'slider', 'progress', 'meter', 'code-block', 'tooltip'] as const

/** The default recipe specimen of each 0.7.6 variant component in each family, keyed `family/component`. */
export function variants076DefaultSpecimens(): Record<string, unknown> {
  const catalog = getCatalog('0.1.0')
  const out: Record<string, unknown> = {}
  for (const family of styleFamilies) {
    const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
    for (const component of variants076Components) {
      const fields = componentRecipeFields(component)
      const recipe = validateComponentRecipe({ schemaVersion: '2.0', id: 'v076_' + component.replace('-', '_'), revision: 1, component,
        presetRef: { id, revision, catalogRelease, compilerVersion },
        props: defaultRecipeFields(fields.props), content: defaultRecipeFields(fields.content) }) as ComponentRecipe
      out[`${family}/${component}`] = JSON.parse(JSON.stringify(describeComponentRecipe(recipe)))
    }
  }
  return out
}
