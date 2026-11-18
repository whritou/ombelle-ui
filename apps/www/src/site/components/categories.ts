import type { ComponentId } from '@ombelle/contracts'
import { componentDocs, type ComponentDoc } from './catalog'

/** The component directory's categories, in the order the site lists them. Every catalog component is in exactly one. */
export const componentCategories: readonly { title: string; ids: readonly ComponentId[] }[] = [
  { title: 'Actions', ids: ['button', 'button-group', 'toggle', 'toggle-group', 'toolbar'] },
  { title: 'Forms', ids: ['calendar', 'checkbox', 'color-picker', 'combobox', 'field', 'input', 'input-group', 'input-otp', 'label', 'native-select', 'number-input', 'password-field', 'radio-group', 'select', 'slider', 'switch', 'tag-input', 'textarea'] },
  { title: 'Navigation', ids: ['breadcrumb', 'command', 'menubar', 'navigation-menu', 'pagination', 'sidebar', 'stepper', 'tabs'] },
  { title: 'Overlays', ids: ['alert-dialog', 'context-menu', 'dialog', 'dropdown-menu', 'hover-card', 'popover', 'sheet', 'toast', 'tooltip'] },
  { title: 'Data display', ids: ['avatar', 'badge', 'card', 'carousel', 'chip', 'code-block', 'data-table', 'empty', 'item', 'kbd', 'table'] },
  { title: 'Feedback', ids: ['alert', 'meter', 'progress', 'skeleton', 'spinner'] },
  { title: 'Layout', ids: ['accordion', 'aspect-ratio', 'collapsible', 'resizable', 'scroll-area', 'separator'] },
  { title: 'Typography', ids: ['prose'] },
]

/** The catalog's components grouped by category, alphabetical by name inside each group. */
export function componentGroups(docs: readonly ComponentDoc[] = componentDocs): { title: string; docs: ComponentDoc[] }[] {
  return componentCategories.map(category => ({
    title: category.title,
    docs: docs.filter(doc => category.ids.includes(doc.id)).sort((a, b) => a.name.localeCompare(b.name)),
  }))
}
