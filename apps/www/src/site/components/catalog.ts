import { supportedComponentIds, type ComponentId } from '@ombelle/contracts'
import { compareVersions, publishedInstaller } from '../../snapshots/install-command'

export type ComponentDoc = {
  id: ComponentId
  name: string
  description: string
  /** Core API, from the catalog template. */
  api: string
  states: string
  basis: string
  client: boolean
  usage: string
  /** First published installer that can add this component; listed only from then on. */
  minimumCli?: string
}

// Usage mirrors docs/components/*.md where a page exists; API and states follow
// the templates in packages/catalog and docs/03-components-styles-accessibility.md.
const docs: Record<ComponentId, Omit<ComponentDoc, 'id'>> = {
  button: {
    name: 'Button',
    description: 'Triggers an action, or renders a link that looks like a button.',
    api: 'variant (default, secondary, destructive, outline, ghost, link), size (sm, default, lg, icon), asChild',
    states: 'Default, hover, focus, pressed, disabled',
    basis: '<button>, or a valid link through asChild',
    client: true,
    usage: `import { Button } from '@/components/ui/button'

export function Actions() {
  return (
    <>
      <Button>Save changes</Button>
      <Button variant="outline">Cancel</Button>
    </>
  )
}`,
  },
  badge: {
    name: 'Badge',
    description: 'Shows a short status or category as a native span.',
    api: 'variant (default, destructive), className',
    states: 'Default, destructive',
    basis: '<span>; interactive tags need a real button or link',
    client: false,
    usage: `import { Badge } from '@/components/ui/badge'

export function Status() {
  return <>
    <Badge>Synced</Badge>
    <Badge variant="destructive">Needs attention</Badge>
  </>
}`,
  },
  card: {
    name: 'Card',
    description: 'Groups related content with a header, body and footer.',
    api: 'Card (density), CardHeader, CardTitle (level), CardDescription, CardContent, CardFooter',
    states: 'Default, dense',
    basis: '<section> or <div> with deliberate headings',
    client: false,
    usage: `import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card'

export function ProjectSummary() {
  return (
    <Card density="dense">
      <CardHeader>
        <CardTitle level={2}>Website refresh</CardTitle>
        <CardDescription>Design work for the next release.</CardDescription>
      </CardHeader>
      <CardContent><p>Three milestones remain.</p></CardContent>
      <CardFooter>Updated today</CardFooter>
    </Card>
  )
}`,
  },
  checkbox: {
    name: 'Checkbox',
    description: 'A Radix checkbox with checked, unchecked and mixed states.',
    api: 'checked (true, false, "indeterminate"), onCheckedChange, disabled, name, value, required',
    states: 'Unchecked, checked, mixed, focus, invalid',
    basis: 'Radix primitive with verified form behavior',
    client: true,
    usage: `import { Checkbox } from '@/components/ui/checkbox'

export function TermsField() {
  return (
    <>
      <label htmlFor="terms">Accept terms</label>
      <Checkbox id="terms" name="terms" value="accepted" required />
    </>
  )
}`,
  },
  dialog: {
    name: 'Dialog',
    description: 'A modal window that traps focus and returns it when closed.',
    api: 'Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose',
    states: 'Open, closed, scroll, focus return',
    basis: 'Reviewed Radix dialog primitive',
    client: true,
    usage: `import {
  Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

export function Confirm() {
  return (
    <Dialog>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent>
        <DialogTitle>Publish project?</DialogTitle>
        <DialogDescription>Everyone with the link can see it.</DialogDescription>
      </DialogContent>
    </Dialog>
  )
}`,
  },
  input: {
    name: 'Input',
    description: 'A native text input with invalid and disabled styling.',
    api: 'Native input props, aria-invalid, disabled',
    states: 'Empty, filled, focus, invalid, disabled',
    basis: '<input>',
    client: false,
    usage: `import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EmailField() {
  return (
    <>
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" autoComplete="email" />
    </>
  )
}`,
  },
  label: {
    name: 'Label',
    description: 'Names a form control with a native label element.',
    api: 'htmlFor and native label props',
    states: 'Default, required indication',
    basis: '<label>',
    client: false,
    usage: `import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProjectName() {
  return (
    <>
      <Label htmlFor="project-name">
        Project name <span aria-hidden="true">*</span>
      </Label>
      <Input id="project-name" required />
    </>
  )
}`,
  },
  'native-select': {
    name: 'Native Select',
    description: "Styles the browser's own select control.",
    api: 'NativeSelect, NativeSelectOption, NativeSelectOptGroup, native select props',
    states: 'Default, selected, focus, invalid, disabled',
    basis: '<select>',
    client: false,
    usage: `import { Label } from '@/components/ui/label'
import {
  NativeSelect, NativeSelectOptGroup, NativeSelectOption,
} from '@/components/ui/native-select'

export function RegionField() {
  return (
    <>
      <Label htmlFor="region">Region</Label>
      <NativeSelect id="region" name="region" defaultValue="eu">
        <NativeSelectOptGroup label="Europe">
          <NativeSelectOption value="eu">European Union</NativeSelectOption>
          <NativeSelectOption value="uk">United Kingdom</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOption value="us">United States</NativeSelectOption>
      </NativeSelect>
    </>
  )
}`,
  },
  switch: {
    name: 'Switch',
    description: 'A Radix switch for on/off settings.',
    api: 'Switch (checked, onCheckedChange, name, value), SwitchThumb',
    states: 'Off, on, focus, disabled',
    basis: 'Radix primitive with switch semantics',
    client: true,
    usage: `import { Switch, SwitchThumb } from '@/components/ui/switch'

export function NotificationSetting() {
  return (
    <>
      <label htmlFor="notifications">Enable notifications</label>
      <Switch id="notifications" name="notifications" value="enabled">
        <SwitchThumb />
      </Switch>
    </>
  )
}`,
  },
  tabs: {
    name: 'Tabs',
    description: 'Radix tabs for switching between related panels.',
    api: 'Tabs (defaultValue, orientation), TabsList, TabsTrigger, TabsContent',
    states: 'Active, inactive, focus, disabled',
    basis: 'Reviewed Radix tabs primitive',
    client: true,
    usage: `import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export function ProjectSections() {
  return (
    <Tabs defaultValue="overview">
      <TabsList aria-label="Project sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Project overview.</TabsContent>
      <TabsContent value="activity">Recent activity.</TabsContent>
    </Tabs>
  )
}`,
  },
  textarea: {
    name: 'Textarea',
    description: 'A native multi-line text control.',
    api: 'Native textarea props, aria-invalid, disabled',
    states: 'Empty, filled, focus, invalid, disabled',
    basis: '<textarea>',
    client: false,
    usage: `import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function SummaryField() {
  return (
    <>
      <Label htmlFor="summary">Summary</Label>
      <Textarea id="summary" rows={4} />
    </>
  )
}`,
  },
  tooltip: {
    name: 'Tooltip',
    description: 'A Radix tooltip shown on hover and keyboard focus.',
    api: 'TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, TooltipArrow',
    states: 'Keyboard, hover, dismissal',
    basis: 'Reviewed Radix tooltip primitive',
    client: true,
    usage: `import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, TooltipArrow,
} from '@/components/ui/tooltip'

export function ProjectHelp() {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger type="button">Project details</TooltipTrigger>
        <TooltipContent>
          View the project summary.
          <TooltipArrow />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}`,
  },
  select: {
    name: 'Select',
    description: 'A custom listbox for choosing one value, with typeahead and keyboard navigation.',
    api: 'Select, SelectTrigger (size), SelectValue, SelectContent (position), SelectGroup, SelectLabel, SelectItem (hint), SelectSeparator',
    states: 'Open, highlighted, selected, disabled, invalid, focus',
    basis: 'Reviewed Radix select primitive',
    client: true,
    minimumCli: '0.5.0',
    usage: `import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

export function RolePicker() {
  return (
    <Select defaultValue="designer">
      <SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="designer">Designer</SelectItem>
        <SelectItem value="engineer">Engineer</SelectItem>
        <SelectItem value="researcher" disabled hint="Seat limit">Researcher</SelectItem>
      </SelectContent>
    </Select>
  )
}`,
  },
  'radio-group': {
    name: 'Radio Group',
    description: 'Picks one option from a set, as plain radios or selectable option rows.',
    api: 'RadioGroup, RadioGroupItem, RadioGroupOption, RadioGroupOptionLabel, RadioGroupOptionDescription',
    states: 'Checked, unchecked, disabled, invalid, focus',
    basis: 'Reviewed Radix radio group primitive',
    client: true,
    minimumCli: '0.5.0',
    usage: `import {
  RadioGroup, RadioGroupItem, RadioGroupOption, RadioGroupOptionLabel,
} from '@/components/ui/radio-group'

export function PlanPicker() {
  return (
    <RadioGroup defaultValue="team" aria-label="Plan">
      <RadioGroupOption>
        <RadioGroupItem value="starter" />
        <RadioGroupOptionLabel>Starter</RadioGroupOptionLabel>
      </RadioGroupOption>
      <RadioGroupOption>
        <RadioGroupItem value="team" />
        <RadioGroupOptionLabel>Team</RadioGroupOptionLabel>
      </RadioGroupOption>
    </RadioGroup>
  )
}`,
  },
  'dropdown-menu': {
    name: 'Dropdown Menu',
    description: 'A menu of actions opened from a trigger, with submenus, checkbox and radio items.',
    api: 'DropdownMenu, Trigger, Content, Label, Item (variant, inset), CheckboxItem, RadioGroup, RadioItem, Separator, Shortcut, Sub, SubTrigger, SubContent',
    states: 'Open, highlighted, checked, disabled, destructive, focus',
    basis: 'Reviewed Radix dropdown menu primitive',
    client: true,
    minimumCli: '0.5.0',
    usage: `import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function ProjectActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Archive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}`,
  },
  alert: {
    name: 'Alert',
    description: 'A status or error message with an optional icon, title and description.',
    api: 'variant (default, destructive), AlertTitle, AlertDescription',
    states: 'Default (role status), destructive (role alert)',
    basis: '<div> with a live-region role',
    client: false,
    minimumCli: '0.5.0',
    usage: `import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export function SaveStatus() {
  return (
    <Alert>
      <AlertTitle>Preset saved</AlertTitle>
      <AlertDescription>New components now install with this preset.</AlertDescription>
    </Alert>
  )
}`,
  },
  popover: {
    name: 'Popover',
    description: 'A non-modal panel anchored to a trigger, for short forms and details.',
    api: 'Popover, PopoverTrigger, PopoverAnchor, PopoverContent (side, align), PopoverTitle (level), PopoverDescription',
    states: 'Open, closed, focus',
    basis: 'Reviewed Radix popover primitive',
    client: true,
    minimumCli: '0.5.0',
    usage: `import {
  Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

export function SharePreset() {
  return (
    <Popover>
      <PopoverTrigger asChild><Button>Share preset</Button></PopoverTrigger>
      <PopoverContent aria-labelledby="share-title">
        <PopoverTitle id="share-title">Share preset</PopoverTitle>
        <PopoverDescription>Anyone with the link can install this preset.</PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}`,
  },
  avatar: {
    name: 'Avatar',
    description: 'A person\'s image with initials as a fallback, a presence dot and overlapping groups.',
    api: 'Avatar (size, variant), AvatarImage, AvatarFallback, AvatarStatus (status), AvatarGroup',
    states: 'Image, fallback, online, offline',
    basis: 'Reviewed Radix avatar primitive',
    client: true,
    minimumCli: '0.5.0',
    usage: `import { Avatar, AvatarImage, AvatarFallback, AvatarStatus } from '@/components/ui/avatar'

export function Owner() {
  return (
    <Avatar role="img" aria-label="Ada Lovelace, online">
      <AvatarImage src="/ada.png" alt="" />
      <AvatarFallback>AL</AvatarFallback>
      <AvatarStatus />
    </Avatar>
  )
}`,
  },
  separator: {
    name: 'Separator',
    description: 'A horizontal or vertical rule, optionally with a centred label.',
    api: 'orientation (horizontal, vertical), decorative, children as label',
    states: 'Horizontal, vertical, labelled',
    basis: 'Reviewed Radix separator primitive',
    client: true,
    minimumCli: '0.5.0',
    usage: `import { Separator } from '@/components/ui/separator'

export function SignInOptions() {
  return <Separator>or</Separator>
}`,
  },
}

export const componentDocs: ComponentDoc[] = supportedComponentIds
  .map((id) => ({ id, ...docs[id] }))
  .filter((doc) => !doc.minimumCli || compareVersions(publishedInstaller.version, doc.minimumCli) >= 0)
  .sort((a, b) => a.name.localeCompare(b.name))

export function componentDoc(id: string): ComponentDoc | undefined {
  return componentDocs.find((doc) => doc.id === id)
}
