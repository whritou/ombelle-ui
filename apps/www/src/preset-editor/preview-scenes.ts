import type { PresetScene } from './preview-protocol'

/** Pages offered in the preset editor. The gallery stays reachable with ?page=gallery. */
export const sceneOptions: { value: PresetScene; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'projects', label: 'Projects' },
  { value: 'settings', label: 'Settings' },
  { value: 'sign-in', label: 'Sign in' },
]

/** The catalog components each preview page uses, shown under the frame. */
export const sceneComponents: Record<PresetScene, string> = {
  gallery: 'All thirty-five catalog components',
  dashboard:
    'Alert, Popover, Input, Dialog, Label, Avatar, Progress, Tabs, Card, Badge, Button, Switch, Tooltip, Dropdown Menu, Table, Stepper',
  projects: 'Breadcrumb, Input Group, Sheet, Checkbox, Label, Alert, Card, Tabs, Table, Badge, Pagination, Button, Meter, Empty State',
  settings:
    'Tabs, Card, Label, Input, Select, Native Select, Textarea, Toast, Checkbox, Switch, Radio Group, Input Group, Alert, Alert Dialog, Separator, Skeleton, Accordion, Button, Field, Kbd, Spinner',
  'sign-in': 'Card, Alert, Label, Input, Checkbox, Button, Separator',
}
