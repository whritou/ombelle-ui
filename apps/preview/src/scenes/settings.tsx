import * as React from 'react'
import { Alert, AlertDescription, AlertTitle } from '../generated/preset-gallery/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../generated/preset-gallery/components/ui/alert-dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../generated/preset-gallery/components/ui/accordion'
import { Button } from '../generated/preset-gallery/components/ui/button'
import { Separator } from '../generated/preset-gallery/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../generated/preset-gallery/components/ui/card'
import { Checkbox } from '../generated/preset-gallery/components/ui/checkbox'
import { Input } from '../generated/preset-gallery/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../generated/preset-gallery/components/ui/input-group'
import { Label } from '../generated/preset-gallery/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '../generated/preset-gallery/components/ui/native-select'
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupOption,
  RadioGroupOptionDescription,
  RadioGroupOptionLabel,
} from '../generated/preset-gallery/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../generated/preset-gallery/components/ui/select'
import { Skeleton } from '../generated/preset-gallery/components/ui/skeleton'
import { Switch } from '../generated/preset-gallery/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../generated/preset-gallery/components/ui/tabs'
import { Textarea } from '../generated/preset-gallery/components/ui/textarea'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '../generated/preset-gallery/components/ui/toast'
import { gate, type SceneProps } from './shared'

export function SettingsScene(props: SceneProps) {
  const show = gate(props)
  const [saved, setSaved] = React.useState(false)
  return (
    <ToastProvider>
    <main className="preset-scene" data-testid="preset-scene" data-scene="settings">
      <header className="scene-header">
        <div>
          <h1>Settings</h1>
          <p className="scene-muted">Manage your profile and workspace.</p>
        </div>
      </header>
      <Tabs defaultValue="general" className="scene-tabs">
        <TabsList aria-label="Settings sections">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="scene-stack">
            <Card>
              <form
                className="scene-form"
                aria-label="Profile"
                onSubmit={(event) => event.preventDefault()}
              >
                <CardHeader>
                  <CardTitle level={2}>Profile</CardTitle>
                  <CardDescription>How you appear to your team.</CardDescription>
                </CardHeader>
                <CardContent className="scene-fields">
                  {show(
                    'input',
                    'Input',
                    <div className="scene-columns">
                      <div className="scene-field">
                        <Label htmlFor="scene-name">Full name</Label>
                        <Input id="scene-name" defaultValue="Ada Lovelace" autoComplete="name" />
                      </div>
                      <div className="scene-field">
                        <Label htmlFor="scene-email">Email</Label>
                        <Input id="scene-email" type="email" defaultValue="ada@acme.test" autoComplete="email" />
                      </div>
                    </div>,
                  )}
                  {show(
                    'select',
                    'Select',
                    <div className="scene-field">
                      <Label id="scene-role-label">Role</Label>
                      <Select defaultValue="designer">
                        <SelectTrigger aria-labelledby="scene-role-label">
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
                  {show(
                    'native-select',
                    'Native Select',
                    <div className="scene-field">
                      <Label htmlFor="scene-language">Language</Label>
                      <NativeSelect id="scene-language" defaultValue="en">
                        <NativeSelectOption value="en">English</NativeSelectOption>
                        <NativeSelectOption value="fr">French</NativeSelectOption>
                      </NativeSelect>
                    </div>,
                  )}
                  {show(
                    'textarea',
                    'Textarea',
                    <div className="scene-field">
                      <Label htmlFor="scene-bio">Bio</Label>
                      <Textarea id="scene-bio" defaultValue="Designing systems that stay calm under change." />
                    </div>,
                  )}
                </CardContent>
                <CardFooter className="scene-actions scene-actions-end">
                  <Button type="button" variant="outline">Cancel</Button>
                  <Button type="submit" onClick={() => setSaved(true)}>Save profile</Button>
                </CardFooter>
              </form>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle level={2}>Notifications</CardTitle>
                <CardDescription>Choose what reaches your inbox.</CardDescription>
              </CardHeader>
              <CardContent className="scene-fields">
                {show(
                  'checkbox',
                  'Checkbox',
                  <div className="scene-inline">
                    <Checkbox id="scene-digest" defaultChecked />
                    <Label htmlFor="scene-digest">Send me a weekly digest</Label>
                  </div>,
                )}
                {show(
                  'switch',
                  'Switch',
                  <div className="scene-inline">
                    <Switch id="scene-mentions" defaultChecked />
                    <Label htmlFor="scene-mentions">Notify me when I am mentioned</Label>
                  </div>,
                )}
                {show(
                  'radio-group',
                  'Radio Group',
                  <div className="scene-field">
                    <Label id="scene-digest-label">Digest frequency</Label>
                    <RadioGroup defaultValue="weekly" aria-labelledby="scene-digest-label">
                      <RadioGroupOption>
                        <RadioGroupItem value="daily" />
                        <span>
                          <RadioGroupOptionLabel>Daily</RadioGroupOptionLabel>
                          <RadioGroupOptionDescription>Every morning at 9:00</RadioGroupOptionDescription>
                        </span>
                      </RadioGroupOption>
                      <RadioGroupOption>
                        <RadioGroupItem value="weekly" />
                        <span>
                          <RadioGroupOptionLabel>Weekly</RadioGroupOptionLabel>
                          <RadioGroupOptionDescription>Mondays, with a summary of reviews</RadioGroupOptionDescription>
                        </span>
                      </RadioGroupOption>
                      <RadioGroupOption aria-disabled="true">
                        <RadioGroupItem value="realtime" disabled />
                        <span>
                          <RadioGroupOptionLabel>Real time</RadioGroupOptionLabel>
                          <RadioGroupOptionDescription>Available on the Team plan</RadioGroupOptionDescription>
                        </span>
                      </RadioGroupOption>
                    </RadioGroup>
                  </div>,
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle level={2}>Delete workspace</CardTitle>
                <CardDescription>
                  Removes every project and member. This cannot be undone.
                </CardDescription>
              </CardHeader>
              {show(
                'alert',
                'Alert',
                <CardContent>
                  <Alert variant="destructive" role="note">
                    <AlertTitle>3 projects are still deploying</AlertTitle>
                    <AlertDescription>Wait for them to finish before you delete this workspace.</AlertDescription>
                  </Alert>
                </CardContent>,
              )}
              <CardFooter>
                {show(
                  'alert-dialog',
                  'Alert Dialog',
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete workspace</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete the Acme workspace?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Every project and member is removed. This preview does not delete any data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction>Delete workspace</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>,
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="members">
          <div className="scene-stack">
            {show(
              'input-group',
              'Input Group',
              <form className="scene-field" aria-label="Invite" onSubmit={(event) => event.preventDefault()}>
                <Label htmlFor="scene-invite">Invite by email</Label>
                <InputGroup>
                  <InputGroupInput id="scene-invite" type="email" placeholder="name@acme.test" />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton type="submit">Invite</InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </form>,
            )}
            {show('separator', 'Separator', <Separator />)}
            Members you remove keep access until the end of the day.
            {show(
              'skeleton',
              'Skeleton',
              <div className="scene-stack" aria-busy="true" aria-label="Loading members">
                <Skeleton style={{ inlineSize: '60%' }} />
                <Skeleton style={{ inlineSize: '40%' }} />
              </div>,
            )}
          </div>
        </TabsContent>
        <TabsContent value="billing">
          <div className="scene-stack">
            Your plan renews on the first of the month.
            {show(
              'accordion',
              'Accordion',
              <Accordion type="single" collapsible defaultValue="invoices">
                <AccordionItem value="invoices">
                  <AccordionTrigger level={2}>Where are my invoices?</AccordionTrigger>
                  <AccordionContent>Invoices are emailed to the billing contact and listed here each month.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="seats">
                  <AccordionTrigger level={2}>How are seats counted?</AccordionTrigger>
                  <AccordionContent>Every member with edit access uses one seat. Viewers are free.</AccordionContent>
                </AccordionItem>
              </Accordion>,
            )}
          </div>
        </TabsContent>
      </Tabs>
    </main>
    {show(
      'toast',
      'Toast',
      <>
        <Toast open={saved} onOpenChange={setSaved} variant="success">
          <ToastTitle>Profile saved</ToastTitle>
          <ToastDescription>Your team sees the new details.</ToastDescription>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </>,
    )}
    </ToastProvider>
  )
}
