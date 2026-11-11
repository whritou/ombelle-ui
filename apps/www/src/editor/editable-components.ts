import { componentRecipeComponents, type ComponentId } from '@ombelle/contracts'
import { catalogRecipesAvailable } from '../snapshots/install-command'

export const componentEditorLink = { href: '/editor/component', label: 'Component editor' } as const

const base = [
  { id: 'button', label: 'Button' },
] as const
function title(id: string): string {
  return id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
}
/** Every component editor, in alphabetical order. */
export const editableComponents: readonly { id: ComponentId; label: string; href: string }[] =
  [...base, ...(catalogRecipesAvailable ? componentRecipeComponents.map(id => ({ id, label: title(id) })) : [])].map(component => ({
  ...component,
  href: `${componentEditorLink.href}/${component.id}`,
})).sort((a, b) => a.label.localeCompare(b.label, 'en'))
