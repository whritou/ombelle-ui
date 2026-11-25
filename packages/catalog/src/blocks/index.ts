import type { BlockId, ComponentId } from '@ombelle/contracts'

export type BlockMeta = {
  id: BlockId
  title: string
  description: string
  /** Every catalog component the block imports, sorted. The build fails when the template's imports differ. */
  components: readonly ComponentId[]
  /** Flows the block fakes, shown on the site and in the file header. */
  exampleOnly: readonly string[]
}

const componentImport = /from\s+(['"])@\/components\/ui\/([a-z][a-z0-9-]*)\1/g

/** The catalog components a block source imports from `@/components/ui/<id>`, sorted and unique. */
export function blockImports(source: string): ComponentId[] {
  return [...new Set(Array.from(source.matchAll(componentImport), (match) => match[2] as ComponentId))].sort()
}

export const blockManifest: Record<BlockId, BlockMeta> = {
  'login-01': {
    id: 'login-01',
    title: 'Sign in',
    description:
      'A centred sign-in card with email, password and show/hide, remember me, a forgot-password link, a sign-up line and an error alert.',
    components: ['alert', 'button', 'card', 'checkbox', 'field', 'input', 'label', 'password-field', 'separator'],
    exampleOnly: ['sign-in submit', 'forgot password', 'sign-up link'],
  },
  'settings-01': {
    id: 'settings-01',
    title: 'Account settings',
    description:
      'Account settings with Profile, Notifications and a Danger zone behind a confirm dialog, grouped by tabs on desktop and stacked on phones.',
    components: [
      'alert-dialog', 'avatar', 'button', 'card', 'field', 'input', 'radio-group', 'select', 'separator',
      'switch', 'tabs', 'textarea', 'toast',
    ],
    exampleOnly: ['save', 'delete account'],
  },
  'pricing-01': {
    id: 'pricing-01',
    title: 'Pricing',
    description:
      'Three plans with a monthly or yearly toggle, a highlighted plan, feature lists and a comparison note.',
    components: ['badge', 'button', 'card', 'separator', 'toast', 'toggle-group'],
    exampleOnly: ['plan selection'],
  },
  'dashboard-01': {
    id: 'dashboard-01',
    title: 'Dashboard overview',
    description:
      'An overview content area with four stat cards, a usage meter, a recent-activity table and a tabbed range, without a sidebar shell.',
    components: ['avatar', 'badge', 'button', 'card', 'dropdown-menu', 'meter', 'progress', 'table', 'tabs', 'toast'],
    exampleOnly: ['all data'],
  },
}
