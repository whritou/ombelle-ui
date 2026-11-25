'use client'
/**
 * settings-01: account settings with Profile, Notifications and a Danger zone behind a
 * confirm dialog. Tabs group the sections from 768px; on phones the tab list is hidden and
 * all three sections stack (see settings-01.css).
 *
 * Example only: Save and "Delete account" never contact a server. They call
 * showExampleNotice(), which shows a Toast. Replace that function with your own save and
 * delete calls. The layout lives in settings-01.css; the look comes from your preset's components.
 */
import * as React from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldControl, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem, RadioGroupOption, RadioGroupOptionDescription, RadioGroupOptionLabel } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast'
import './settings-01.css'

const exampleData = {
  title: 'Account settings',
  description: 'Manage your Ombelle profile, notifications and account.',
  person: { name: 'Jordan Lee', initials: 'JL', email: 'jordan@ombelle.dev', bio: 'Designer on the Ombelle team.' },
  saved: 'Example only: nothing was saved',
  deleted: 'Example only: no account was deleted',
}

export function Settings01() {
  const [notice, setNotice] = React.useState<{ id: number; title: string; message: string } | null>(null)
  const titleId = React.useId()
  const timeZoneId = React.useId()

  // Replace with your save and delete calls. It is the only example-only code in this block.
  function showExampleNotice(title: string, message: string) {
    setNotice((current) => ({ id: (current?.id ?? 0) + 1, title, message }))
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    showExampleNotice('Nothing was saved', exampleData.saved)
  }

  return (
    <ToastProvider>
      <section data-block="settings-01" aria-labelledby={titleId}>
        <Card data-block-part="card">
          <CardHeader>
            <CardTitle level={2} id={titleId}>
              {exampleData.title}
            </CardTitle>
            <CardDescription>{exampleData.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" data-block-part="tabs">
              <TabsList data-block-part="tab-list">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="danger">Danger zone</TabsTrigger>
              </TabsList>
              {/* Every panel stays mounted: on phones the CSS shows them all, stacked. */}
              <TabsContent value="profile" forceMount data-block-part="panel">
                <p data-block-part="panel-title">Profile</p>
                <form data-block-part="form" onSubmit={save}>
                  <div data-block-part="identity">
                    <Avatar size="lg">
                      <AvatarFallback>{exampleData.person.initials}</AvatarFallback>
                    </Avatar>
                    <p>
                      <strong>{exampleData.person.name}</strong>
                      <span>{exampleData.person.email}</span>
                    </p>
                  </div>
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <FieldControl>
                      <Input name="name" autoComplete="name" defaultValue={exampleData.person.name} />
                    </FieldControl>
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <FieldControl>
                      <Input type="email" name="email" autoComplete="email" defaultValue={exampleData.person.email} />
                    </FieldControl>
                  </Field>
                  <Field>
                    <FieldLabel id={timeZoneId}>Time zone</FieldLabel>
                    <Select name="timezone" defaultValue="europe-paris">
                      <SelectTrigger aria-labelledby={timeZoneId}>
                        <SelectValue placeholder="Choose a time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="europe-paris">Paris (UTC+1)</SelectItem>
                        <SelectItem value="europe-london">London (UTC+0)</SelectItem>
                        <SelectItem value="america-new-york">New York (UTC-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Bio</FieldLabel>
                    <FieldControl>
                      <Textarea name="bio" rows={3} defaultValue={exampleData.person.bio} />
                    </FieldControl>
                    <FieldDescription>A line or two that teammates see on your profile.</FieldDescription>
                  </Field>
                  <div data-block-part="actions">
                    <Button type="submit">Save changes</Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="notifications" forceMount data-block-part="panel">
                <p data-block-part="panel-title">Notifications</p>
                <form data-block-part="form" onSubmit={save}>
                  <Field orientation="horizontal">
                    <FieldLabel>Product updates by email</FieldLabel>
                    <FieldControl>
                      <Switch name="product-updates" defaultChecked />
                    </FieldControl>
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel>Security alerts</FieldLabel>
                    <FieldControl>
                      <Switch name="security-alerts" defaultChecked />
                    </FieldControl>
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel>Mentions in comments</FieldLabel>
                    <FieldControl>
                      <Switch name="mentions" />
                    </FieldControl>
                  </Field>
                  <Separator />
                  <FieldSet>
                    <FieldLegend>Digest frequency</FieldLegend>
                    <RadioGroup name="digest" defaultValue="weekly">
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
                          <RadioGroupOptionDescription>Mondays, with a summary of the week</RadioGroupOptionDescription>
                        </span>
                      </RadioGroupOption>
                      <RadioGroupOption>
                        <RadioGroupItem value="never" />
                        <span>
                          <RadioGroupOptionLabel>Never</RadioGroupOptionLabel>
                          <RadioGroupOptionDescription>Only the alerts above</RadioGroupOptionDescription>
                        </span>
                      </RadioGroupOption>
                    </RadioGroup>
                  </FieldSet>
                  <div data-block-part="actions">
                    <Button type="submit">Save preferences</Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="danger" forceMount data-block-part="panel">
                <p data-block-part="panel-title">Danger zone</p>
                <div data-block-part="danger">
                  <div>
                    <p>
                      <strong>Delete account</strong>
                    </p>
                    <p>Removes your profile and every project you own. You can't undo this.</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes {exampleData.person.name}'s profile and every project they own.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="outline">Keep account</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button
                            variant="destructive"
                            onClick={() => showExampleNotice('Nothing was deleted', exampleData.deleted)}
                          >
                            Delete account
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        {notice ? (
          <Toast key={notice.id} defaultOpen onOpenChange={(open) => !open && setNotice(null)}>
            <ToastTitle>{notice.title}</ToastTitle>
            <ToastDescription>{notice.message}</ToastDescription>
            <ToastClose />
          </Toast>
        ) : null}
        {/* Rendered even when empty, so the live region exists before the first toast. */}
        <ToastViewport />
      </section>
    </ToastProvider>
  )
}
