import type { PresetScene } from './preview-protocol'

/** Pages offered in the preset editor. The gallery stays reachable with ?page=gallery. */
export const sceneOptions: { value: PresetScene; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'settings', label: 'Settings' },
  { value: 'sign-in', label: 'Sign in' },
]

/** The catalog components each preview page uses, shown under the frame. */
export const sceneComponents: Record<PresetScene, string> = {
  gallery: 'All twelve catalog components',
  dashboard: 'Tabs, Card, Badge, Button, Switch, Tooltip',
  settings:
    'Tabs, Card, Label, Input, Native Select, Textarea, Checkbox, Switch, Button',
  'sign-in': 'Card, Label, Input, Checkbox, Button',
}
