'use client'
/**
 * login-01: a centred sign-in card with email, password (show/hide), remember me,
 * a forgot-password link and a sign-up line.
 *
 * Example only: submitting, "Forgot password?" and "Sign up" never contact a server.
 * They call showExampleNotice(), which shows the alert below. Replace that function
 * with your own sign-in call, and point the two links at your own routes.
 * The layout lives in login-01.css; the look comes from your preset's components.
 */
import * as React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldControl, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordField, PasswordFieldControl, PasswordFieldInput, PasswordFieldToggle } from '@/components/ui/password-field'
import { Separator } from '@/components/ui/separator'
import './login-01.css'

const exampleData = {
  title: 'Sign in to Ombelle',
  description: 'Use your work email to continue.',
  notice: "Example only: this form doesn't sign anyone in",
}

export function Login01() {
  // Counts example notices. Each one mounts a fresh Alert inside the live region, so a repeated
  // submit is announced again rather than ignored as unchanged text.
  const [noticeCount, setNoticeCount] = React.useState(0)
  const titleId = React.useId()
  const passwordId = React.useId()
  const rememberId = React.useId()

  // Replace with your sign-in call. It is the only example-only code in this block.
  function showExampleNotice() {
    setNoticeCount((count) => count + 1)
  }

  return (
    <section data-block="login-01" aria-labelledby={titleId}>
      <Card data-block-part="card">
        <CardHeader>
          <CardTitle level={2} id={titleId}>
            {exampleData.title}
          </CardTitle>
          <CardDescription>{exampleData.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            data-block-part="form"
            onSubmit={(event) => {
              event.preventDefault()
              showExampleNotice()
            }}
          >
            {/* Always rendered, so the live region exists before the first notice. */}
            <div data-block-part="notice" aria-live="polite">
              {noticeCount > 0 ? (
                <Alert key={noticeCount} role="none">
                  <AlertTitle>Nothing was sent</AlertTitle>
                  <AlertDescription>{exampleData.notice}</AlertDescription>
                </Alert>
              ) : null}
            </div>
            <Field required>
              <FieldLabel>Email</FieldLabel>
              <FieldControl>
                <Input type="email" name="email" autoComplete="email" placeholder="you@example.com" />
              </FieldControl>
            </Field>
            <Field>
              <div data-block-part="label-row">
                <Label htmlFor={passwordId}>Password</Label>
                <a
                  href="#forgot-password"
                  onClick={(event) => {
                    event.preventDefault()
                    showExampleNotice()
                  }}
                >
                  Forgot password?
                </a>
              </div>
              <PasswordField>
                <PasswordFieldControl>
                  <PasswordFieldInput id={passwordId} name="password" autoComplete="current-password" required />
                  <PasswordFieldToggle />
                </PasswordFieldControl>
              </PasswordField>
            </Field>
            <div data-block-part="remember">
              <Checkbox id={rememberId} name="remember" />
              <Label htmlFor={rememberId}>Remember me</Label>
            </div>
            <Button type="submit">Sign in</Button>
          </form>
        </CardContent>
        <CardFooter>
          <div data-block-part="footer">
            <Separator />
            <p>
              New to Ombelle?{' '}
              <a
                href="#sign-up"
                onClick={(event) => {
                  event.preventDefault()
                  showExampleNotice()
                }}
              >
                Sign up
              </a>
            </p>
          </div>
        </CardFooter>
      </Card>
    </section>
  )
}
