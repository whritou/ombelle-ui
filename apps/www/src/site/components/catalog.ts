import { supportedComponentIds, type ComponentId } from '@ombelle/contracts'

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
}

export const componentDocs: ComponentDoc[] = supportedComponentIds
  .map((id) => ({ id, ...docs[id] }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function componentDoc(id: string): ComponentDoc | undefined {
  return componentDocs.find((doc) => doc.id === id)
}
