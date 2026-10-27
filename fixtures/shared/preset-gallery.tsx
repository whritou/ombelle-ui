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
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export function PresetGallery() {
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
        <div data-component="label">
          <Label htmlFor="preset-project-name">Project name</Label>
        </div>
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
        </div>
        <div data-component="textarea">
          <Label htmlFor="preset-description">Description</Label>
          <Textarea
            id="preset-description"
            defaultValue="A small idea, ready to grow."
          />
        </div>
        <div data-component="native-select">
          <Label htmlFor="preset-region">Region</Label>
          <NativeSelect id="preset-region" defaultValue="eu">
            <NativeSelectOption value="eu">Europe</NativeSelectOption>
            <NativeSelectOption value="us">United States</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="preset-row" data-component="checkbox">
          <Checkbox id="preset-terms" defaultChecked />
          <Label htmlFor="preset-terms">Accept project guidelines</Label>
        </div>
        <div className="preset-row" data-component="switch">
          <Switch id="preset-notifications" defaultChecked>
            <SwitchThumb />
          </Switch>
          <Label htmlFor="preset-notifications">Enable notifications</Label>
        </div>
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
      <section aria-label="Dialog" data-component="dialog">
        <h2>Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Ready to publish?</DialogTitle>
            <DialogDescription>
              This is a preview. Your preset stays on this device until you
              download it.
            </DialogDescription>
            <p className="preset-dialog-copy">
              Review your choices and close this dialog to continue editing.
            </p>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  )
}
