import type { PresetScene } from './preview-protocol'

/** Pages offered in the preset editor. The gallery stays reachable with ?page=gallery. */
export const sceneOptions: { value: PresetScene; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'settings', label: 'Settings' },
  { value: 'sign-in', label: 'Sign in' },
]

/** The catalog components each preview page uses, shown under the frame. */
export const sceneComponents: Record<PresetScene, string> = {
  gallery: 'All sixteen catalog components',
  dashboard: 'Alert, Tabs, Card, Badge, Button, Switch, Tooltip, Dropdown Menu',
  settings:
    'Tabs, Card, Label, Input, Select, Native Select, Textarea, Checkbox, Switch, Radio Group, Alert, Button',
  'sign-in': 'Card, Alert, Label, Input, Checkbox, Button',
}
