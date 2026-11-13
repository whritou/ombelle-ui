# Password Field

Password Field is a password input with a show toggle, a Caps Lock notice and an optional strength meter. Showing the value keeps the caret, the selection and the input element, so password managers keep working, and the value is hidden again whenever its form submits. It is available in all five families in light and dark mode; one client template serves the Radix and Base UI editions.

This component requires CLI **0.7.6** or later: `npx @ombelle-ui/cli@0.7.6 add password-field`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add password-field --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add password-field --cwd APP --yes
```

```tsx
import {
  PasswordField, PasswordFieldCapsLock, PasswordFieldControl, PasswordFieldInput, PasswordFieldStrength, PasswordFieldToggle,
} from '@/components/ui/password-field'

const checks = [
  { label: 'at least 12 characters', test: (value: string) => value.length >= 12 },
  { label: 'a number', test: (value: string) => /\d/.test(value) },
  { label: 'add a symbol', match: '[^A-Za-z0-9]' },
]

export function NewPassword() {
  return (
    <PasswordField>
      <label htmlFor="new-password">Password</label>
      <PasswordFieldControl>
        <PasswordFieldInput id="new-password" name="password" autoComplete="new-password" />
        <PasswordFieldToggle />
      </PasswordFieldControl>
      <PasswordFieldCapsLock />
      <PasswordFieldStrength checks={checks} />
    </PasswordField>
  )
}
```

## API and accessibility

- `PasswordField` holds the state; `PasswordFieldControl` is the box around the input and its toggle, drawn like Input Group.
- `PasswordFieldInput` takes every input prop except `type`. `autoComplete` defaults to `current-password`; use `new-password` when setting one.
- `PasswordFieldToggle` is a toggle button named "Show password" with `aria-pressed` and `aria-controls` pointing at the input. Pressing it switches the type between `password` and `text` without remounting the input, and puts back the caret and selection.
- The value is hidden again on its form's `submit` event, even when the submit is stopped by validation.
- `PasswordFieldCapsLock` is a polite status that reads "Caps Lock is on" while Caps Lock is on and the input has focus, read from key events; it clears on blur. Pass children to change the text.
- `PasswordFieldStrength` takes `checks`, each `{ label, test(value) }` or `{ label, match }` with a regular expression source. It is a `role="meter"` named "Password strength": its value is the number of checks passed, and its value text is the word (Weak, Fair, Strong or Very strong) and the first check that fails, for example "Strong · add a symbol to reach the last check". The component ships no password-strength library.

## Recipe

The recipe editor sets `strength`, `capsLockNotice` and `confirm` (a second "Confirm password" field) and the label. Compilation emits `components/ui/password-field.tsx`, `components/ui/password-field.css` and `examples/password-field.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

## Base UI edition

The Base UI edition uses the same template. Radix's `PasswordToggleField` is a preview package, so neither edition depends on it.

## Liquid glass

Liquid glass support is experimental: the box follows the family's Input Group glass, and its blur stays inside the family's `@supports` fallback.
