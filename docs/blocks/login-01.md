# login-01

A centred sign-in card: email, a password with show and hide, remember me, a forgot-password link, a sign-up line and an error alert. It is a block, a composed section installed with `ombelle add login-01`. It looks like the project preset: a Papier project gets a Papier card, a Neo-brutalism project a Neo-brutalism one. It is available in every style family, both editions, light and dark. Liquid glass carries its usual accessibility caveat; see [Liquid glass](../components/liquid-glass.md).

## Install

```bash
ombelle add login-01 --dry-run
ombelle add login-01 --yes
```

```tsx
import { Login01 } from '@/components/blocks/login-01'

export default function SignInPage() {
  return (
    <main>
      <h1 className="sr-only">Sign in</h1>
      <Login01 />
    </main>
  )
}
```

The block files go to `<components parent>/blocks/`: with the default `src/components/ui` that is `src/components/blocks/login-01.tsx` and `src/components/blocks/login-01.css`. They are managed files recorded in the lock, so `update` refreshes them while you have not edited them. `ombelle diff login-01` shows where they stand. See [Blocks](../05-cli-specification.md#blocks) for the planning rules. Use CLI 1.1 or later in a project with blocks.

## What it installs

The block and these components, each planned as `add <component>` would plan it: Alert, Button, Card, Checkbox, Field, Input, Label, Password Field and Separator. A component you already edited is kept as it is (notice `BLOCK_COMPONENT_EDITED`).

## Example only

Nothing here signs anyone in. Submit, "Forgot password?" and "Sign up" call `showExampleNotice()`, which shows the alert "Example only: this form doesn't sign anyone in". The alert appears on submit; it is not a prop. The file header says the same.

To wire it up, replace `showExampleNotice()` in `login-01.tsx` with your sign-in call, and point the forgot-password and sign-up links at your routes.

## Layout and keyboard

- One `h2` and a labelled section; your page owns the `h1`.
- Works at 320px without horizontal scroll.
- Tab order follows the page: email, password, the show/hide button, remember me, forgot-password, submit, sign-up. Enter submits from either field. Space toggles remember me and the show/hide button.
