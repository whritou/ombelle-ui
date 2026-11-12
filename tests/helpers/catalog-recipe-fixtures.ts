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
  spinner: 'label', kbd: 'keys', empty: 'title', field: 'label', meter: 'label',
  slider: 'label', 'toggle-group': 'label', chip: 'label', 'tag-input': 'label', 'input-otp': 'label',
  calendar: 'label', combobox: 'label', command: 'placeholder', 'hover-card': 'title', 'context-menu': 'zoneText',
  toggle: 'label', collapsible: 'label', 'scroll-area': 'label', 'button-group': 'label', item: 'title',
  'number-input': 'label', 'color-picker': 'label',
  'code-block': 'title',
} as const satisfies Record<Exclude<ComponentRecipe['component'], 'accordion' | 'tabs' | 'stepper'>, string>

export function catalogRecipeFixtures(): readonly ComponentRecipe[] {
  return componentRecipeComponents.map(id => {
    const recipe = createCatalogDraft(id).recipe
    if (recipe.component === 'stepper') {
      const [first, ...steps] = recipe.content.steps
      return validateComponentRecipe({ ...recipe, content: { steps: [{ ...first, title: `Edited ${id}` }, ...steps] } })
    }
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
