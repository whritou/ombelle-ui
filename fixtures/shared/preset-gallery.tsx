'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupOption,
  RadioGroupOptionLabel,
  RadioGroupOptionDescription,
} from '@/components/ui/radio-group'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Switch, SwitchThumb } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// Family-independent: callers pass the component ids their family cannot
// style (from the shared support table) and the family's display name.
export type PresetGalleryProps = {
  unavailable?: readonly string[]
  familyLabel?: string
}

function Unavailable({
  id,
  name,
  familyLabel,
}: {
  id: string
  name: string
  familyLabel: string
}) {
  return (
    <div
      className="preset-unavailable"
      data-component={id}
      data-unavailable=""
      aria-disabled="true"
    >
      <strong>{name}</strong>
      <span>Unavailable in {familyLabel}</span>
    </div>
  )
}

export function PresetGallery({
  unavailable = [],
  familyLabel = '',
}: PresetGalleryProps = {}) {
  const gate = (id: string, name: string, node: React.ReactNode) =>
    unavailable.includes(id) ? (
      <Unavailable id={id} name={name} familyLabel={familyLabel} />
    ) : (
      node
    )
  return (
    <main
      className="preset-gallery"
      data-testid="preset-gallery"
      aria-label="Preset component gallery"
    >
      <header>
        <h1>Your design system</h1>
        <p>A working collection of components in your project theme.</p>
      </header>
      <section aria-label="Actions" data-component="button">
        <h2>Actions</h2>
        <div className="preset-row">
          <Button data-testid="preset-button">Save changes</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button disabled>Disabled</Button>
          <Button disabled aria-busy="true">
            Saving…
          </Button>
        </div>
      </section>
      <section aria-label="Status" data-component="badge">
        <h2>Status</h2>
        <div className="preset-row">
          <Badge>Up to date</Badge>
          <Badge variant="destructive">Needs attention</Badge>
        </div>
      </section>
      {gate(
        'alert',
        'Alert',
        <section aria-label="Messages" data-component="alert">
          <h2>Messages</h2>
          <div className="preset-stack">
            <Alert>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <AlertTitle>Preset saved</AlertTitle>
              <AlertDescription>
                New components in this project now use your preset.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              <AlertTitle>Install blocked</AlertTitle>
              <AlertDescription>
                button.tsx was edited locally. Review the change before replacing
                it.
              </AlertDescription>
            </Alert>
          </div>
        </section>,
      )}
      <section aria-label="Project card" data-component="card">
        <h2>Project card</h2>
        <Card>
          <CardHeader>
            <CardTitle level={3}>Website refresh</CardTitle>
            <CardDescription>
              A shared workspace for your next release.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>All components use your project preset.</p>
          </CardContent>
          <CardFooter>Updated today</CardFooter>
        </Card>
      </section>
      <form
        className="preset-form"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Project settings"
      >
        <h2>Project settings</h2>
        {gate(
          'label',
          'Label',
          <div data-component="label">
            <Label htmlFor="preset-project-name">Project name</Label>
          </div>,
        )}
        {gate(
          'input',
          'Input',
          <div data-component="input">
            <Input id="preset-project-name" defaultValue="Ombelle workspace" />
            <Label htmlFor="preset-email">Email</Label>
            <Input
              id="preset-email"
              type="email"
              defaultValue="invalid"
              aria-invalid="true"
              aria-describedby="preset-email-error"
            />
            <p id="preset-email-error">Enter a valid email address.</p>
          </div>,
        )}
        {gate(
          'textarea',
          'Textarea',
          <div data-component="textarea">
            <Label htmlFor="preset-description">Description</Label>
            <Textarea
              id="preset-description"
              defaultValue="A small idea, ready to grow."
            />
          </div>,
        )}
        {gate(
          'native-select',
          'Native Select',
          <div data-component="native-select">
            <Label htmlFor="preset-region">Region</Label>
            <NativeSelect id="preset-region" defaultValue="eu">
              <NativeSelectOption value="eu">Europe</NativeSelectOption>
              <NativeSelectOption value="us">United States</NativeSelectOption>
            </NativeSelect>
          </div>,
        )}
        {gate(
          'checkbox',
          'Checkbox',
          <div className="preset-row" data-component="checkbox">
            <Checkbox id="preset-terms" defaultChecked />
            <Label htmlFor="preset-terms">Accept project guidelines</Label>
          </div>,
        )}
        {gate(
          'switch',
          'Switch',
          <div className="preset-row" data-component="switch">
            <Switch id="preset-notifications" defaultChecked>
              <SwitchThumb />
            </Switch>
            <Label htmlFor="preset-notifications">Enable notifications</Label>
          </div>,
        )}
        {gate(
          'select',
          'Select',
          <div data-component="select">
            <Label id="preset-role-label">Role</Label>
            <Select defaultValue="designer">
              <SelectTrigger aria-labelledby="preset-role-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="product">Product manager</SelectItem>
                <SelectItem value="researcher" disabled hint="Seat limit">
                  Researcher
                </SelectItem>
              </SelectContent>
            </Select>
          </div>,
        )}
        {gate(
          'radio-group',
          'Radio Group',
          <div data-component="radio-group">
            <Label id="preset-plan-label">Plan</Label>
            <RadioGroup defaultValue="team" aria-labelledby="preset-plan-label">
              <RadioGroupOption>
                <RadioGroupItem value="starter" />
                <span>
                  <RadioGroupOptionLabel>Starter</RadioGroupOptionLabel>
                  <RadioGroupOptionDescription>
                    One project, community support
                  </RadioGroupOptionDescription>
                </span>
              </RadioGroupOption>
              <RadioGroupOption>
                <RadioGroupItem value="team" />
                <span>
                  <RadioGroupOptionLabel>Team</RadioGroupOptionLabel>
                  <RadioGroupOptionDescription>
                    Unlimited projects and shared presets
                  </RadioGroupOptionDescription>
                </span>
              </RadioGroupOption>
              <RadioGroupOption>
                <RadioGroupItem value="enterprise" disabled />
                <span>
                  <RadioGroupOptionLabel>Enterprise</RadioGroupOptionLabel>
                  <RadioGroupOptionDescription>
                    Contact sales to enable
                  </RadioGroupOptionDescription>
                </span>
              </RadioGroupOption>
            </RadioGroup>
          </div>,
        )}
      </form>
      <section aria-label="Project sections" data-component="tabs">
        <h2>Project sections</h2>
        <Tabs defaultValue="overview">
          <TabsList aria-label="Project sections">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings" disabled>
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            Your project is ready to preview.
          </TabsContent>
          <TabsContent value="activity">
            Your latest changes are saved.
          </TabsContent>
        </Tabs>
      </section>
      <section aria-label="Help" data-component="tooltip">
        <h2>Help</h2>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Preview help</Button>
            </TooltipTrigger>
            <TooltipContent>
              Inspect your components in both color modes.
              <TooltipArrow />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </section>
      {gate(
        'dropdown-menu',
        'Dropdown Menu',
        <section aria-label="Project actions" data-component="dropdown-menu">
          <h2>Project actions</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Project actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Project</DropdownMenuLabel>
              <DropdownMenuItem>
                Rename<DropdownMenuShortcut>F2</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Duplicate<DropdownMenuShortcut>Ctrl D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>,
      )}
      <section aria-label="Dialog" data-component="dialog">
        <h2>Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ready to publish?</DialogTitle>
              <DialogDescription>
                This is a preview. Your preset stays on this device until you
                download it.
              </DialogDescription>
            </DialogHeader>
            <p className="preset-dialog-copy">
              Review your choices and close this dialog to continue editing.
            </p>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  )
}
