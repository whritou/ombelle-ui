import type { ComponentId } from '@ombelle/contracts'
import { catalogRecipesAvailable } from '../snapshots/install-command'

export const componentEditorLink = { href: '/editor/component', label: 'Component editor' } as const

const base = [
  { id: 'button', label: 'Button' },
] as const
export const editableComponents: readonly { id: ComponentId; label: string; href: string }[] =
  [...base, ...(catalogRecipesAvailable ? [{ id: 'badge' as const, label: 'Badge' }] : [])].map(component => ({
  ...component,
  href: `${componentEditorLink.href}/${component.id}`,
}))
