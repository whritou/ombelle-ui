import { componentRecipeComponents, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { createCatalogDraft } from '../../apps/www/src/editor/catalog-draft.js'

const editedFields = {
  'input-group': 'label', sheet: 'trigger', 'alert-dialog': 'trigger', breadcrumb: 'label', pagination: 'label',
  toast: 'title',
  alert: 'title', avatar: 'initials', badge: 'label', card: 'title',
  checkbox: 'label', dialog: 'trigger', 'dropdown-menu': 'trigger', input: 'label',
  label: 'label', 'native-select': 'label', popover: 'trigger', progress: 'label',
  'radio-group': 'label', select: 'label', separator: 'label', skeleton: 'label',
  switch: 'label', table: 'caption', textarea: 'label', tooltip: 'trigger',
} as const satisfies Record<Exclude<ComponentRecipe['component'], 'accordion' | 'tabs'>, string>

export function catalogRecipeFixtures(): readonly ComponentRecipe[] {
  return componentRecipeComponents.map(id => {
    const recipe = createCatalogDraft(id).recipe
    if (recipe.component === 'accordion' || recipe.component === 'tabs') {
      const [first, ...items] = recipe.content.items
      return validateComponentRecipe({ ...recipe, content: { items: [{ ...first, label: `Edited ${id}` }, ...items] } })
    }
    const props = id === 'checkbox' ? { checked: 'indeterminate' }
      : id === 'progress' ? { value: 25, max: 50 }
      : id === 'separator' ? { decorative: false }
      : {}
    return validateComponentRecipe({
      ...recipe, props: { ...recipe.props, ...props },
      content: { ...recipe.content, [editedFields[recipe.component]]: id === 'avatar' ? 'OE' : `Edited ${id}` },
    })
  })
}
