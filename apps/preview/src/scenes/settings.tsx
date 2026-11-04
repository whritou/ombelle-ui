import { Button } from '../generated/preset-gallery/components/ui/button'
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
                    'native-select',
                    'Native Select',
                    <div className="scene-field">
                      <Label htmlFor="scene-role">Role</Label>
                      <NativeSelect id="scene-role" defaultValue="designer">
                        <NativeSelectOption value="designer">Designer</NativeSelectOption>
                        <NativeSelectOption value="engineer">Engineer</NativeSelectOption>
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle level={2}>Delete workspace</CardTitle>
                <CardDescription>
                  Removes every project and member. This cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="destructive">Delete workspace</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="members">Invite people from the members page.</TabsContent>
        <TabsContent value="billing">Your plan renews on the first of the month.</TabsContent>
      </Tabs>
    </main>
  )
}
