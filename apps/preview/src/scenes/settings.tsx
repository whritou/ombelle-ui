import { Alert, AlertDescription, AlertTitle } from '../generated/preset-gallery/components/ui/alert'
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
import { Switch } from '../generated/preset-gallery/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../generated/preset-gallery/components/ui/tabs'
import { Textarea } from '../generated/preset-gallery/components/ui/textarea'
import { gate, type SceneProps } from './shared'

export function SettingsScene(props: SceneProps) {
  const show = gate(props)
  return (
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
                  <Button type="submit">Save profile</Button>
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
                      <RadioGroupOption>
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
                <Button variant="destructive">Delete workspace</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="members">
          <div className="scene-stack">
            Invite people from the members page.
            {show('separator', 'Separator', <Separator />)}
            Members you remove keep access until the end of the day.
          </div>
        </TabsContent>
        <TabsContent value="billing">Your plan renews on the first of the month.</TabsContent>
      </Tabs>
    </main>
  )
}
