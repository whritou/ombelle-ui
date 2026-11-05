import type { PresetScene } from './preview-protocol'

/** Pages offered in the preset editor. The gallery stays reachable with ?page=gallery. */
export const sceneOptions: { value: PresetScene; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'settings', label: 'Settings' },
  { value: 'sign-in', label: 'Sign in' },
]

/** The catalog components each preview page uses, shown under the frame. */
export const sceneComponents: Record<PresetScene, string> = {
  gallery: 'All twenty-three catalog components',
  dashboard: 'Alert, Popover, Input, Avatar, Progress, Tabs, Card, Badge, Button, Switch, Tooltip, Dropdown Menu, Table',
  settings:
    'Tabs, Card, Label, Input, Select, Native Select, Textarea, Checkbox, Switch, Radio Group, Alert, Separator, Skeleton, Accordion, Button',
  'sign-in': 'Card, Alert, Label, Input, Checkbox, Button, Separator',
}
