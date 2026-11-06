import type { ComponentId } from '@ombelle/contracts'

export const componentEditorLink = { href: '/editor/component', label: 'Component editor' } as const

export const editableComponents = ([
  { id: 'button', label: 'Button' },
] as const satisfies readonly { id: ComponentId; label: string }[]).map(component => ({
  ...component,
  href: `${componentEditorLink.href}/${component.id}`,
}))
