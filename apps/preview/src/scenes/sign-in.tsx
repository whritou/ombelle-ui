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
import { gate, type SceneProps } from './shared'

export function SignInScene(props: SceneProps) {
  const show = gate(props)
  return (
    <main className="preset-scene scene-center" data-testid="preset-scene" data-scene="sign-in">
      <Card className="scene-narrow">
        <form
          className="scene-form"
          aria-label="Sign in"
          onSubmit={(event) => event.preventDefault()}
        >
          <CardHeader>
            <CardTitle level={1}>Sign in to Acme</CardTitle>
            <CardDescription>Welcome back. Pick up where you left off.</CardDescription>
          </CardHeader>
          <CardContent className="scene-fields">
            {show(
              'input',
              'Input',
              <div className="scene-field">
                <Label htmlFor="scene-signin-email">Email</Label>
                <Input id="scene-signin-email" type="email" autoComplete="email" placeholder="you@acme.test" />
                <Label htmlFor="scene-signin-password">Password</Label>
                <Input id="scene-signin-password" type="password" autoComplete="current-password" />
              </div>,
            )}
            {show(
              'checkbox',
              'Checkbox',
              <div className="scene-inline">
                <Checkbox id="scene-keep" />
                <Label htmlFor="scene-keep">Keep me signed in</Label>
              </div>,
            )}
          </CardContent>
          <CardFooter className="scene-actions">
            <Button type="submit">Sign in</Button>
            <Button type="button" variant="outline">Continue with SSO</Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
