import { componentEditorLink } from '../editor/editable-components'

export const repository = 'https://github.com/whritou/ombelle-ui'

export const primaryLinks = [
  { href: '/#get-started', label: 'Get started' },
  { href: '/components', label: 'Components' },
  { href: '/editor/preset', label: 'Preset editor' },
  componentEditorLink,
] as const
