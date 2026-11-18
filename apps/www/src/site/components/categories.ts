import { componentCategories } from './component-names'
import { componentDocs, type ComponentDoc } from './catalog'

export { componentCategories } from './component-names'

/** The catalog's components grouped by category, alphabetical by name inside each group. */
export function componentGroups(docs: readonly ComponentDoc[] = componentDocs): { title: string; docs: ComponentDoc[] }[] {
  return componentCategories.map(category => ({
    title: category.title,
    docs: docs.filter(doc => category.ids.includes(doc.id)).sort((a, b) => a.name.localeCompare(b.name)),
  }))
}
