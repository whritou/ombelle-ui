# Input OTP

Input OTP takes a one-time code in separate slots. Typing moves along the slots, and pasting a code fills them all. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later. Until 0.7.3 is published, install it from a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add input-otp --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add input-otp --cwd APP --yes
```

```tsx
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'

export function VerificationCode() {
  return (
    <>
      <p id="code-label">Verification code</p>
      <InputOTP maxLength={6} aria-labelledby="code-label">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </>
  )
}
```

## API and accessibility

- `maxLength` sets the number of characters. `value` or `defaultValue`, `onChange`, `onComplete`, `disabled`, `name` and `autoComplete` (default `one-time-code`) are also available.
- `pattern` defaults to digits only. A pasted "12-34 56789" keeps its digits and fills the slots with "123456". Pass `pattern="^[a-zA-Z0-9]+$"` to allow letters. The Base UI edition supports these two patterns and treats any other as allowing every character.
- `InputOTPSlot` takes the `index` of the character it shows, and `InputOTPSeparator` is a decorative dash.
- Name the code with `aria-label` or `aria-labelledby`.
- The caret's blink stops under reduced motion.

## Recipe

The recipe editor sets the `length` (4 to 8), the slot after which the separator falls (0 for none), and the label.

Compilation emits `components/ui/input-otp.tsx`, `components/ui/input-otp.css` and `examples/input-otp.tsx`. Runtime dependencies of the Radix edition are React 19.3.1, input-otp 1.5.0 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0. The Base UI edition uses @base-ui/react 1.9.0 and does not install input-otp.

## Editions

- **Radix edition (input-otp):** the code is one input laid over the slots, so assistive technology meets one field with its name. The slots are drawn, not focusable. The active slot shows a caret, and the whole code is ringed while the input has focus.
- **Base UI edition (OTP Field):** each slot is its own input. The first is named by the code's label, and the others by their position, such as "Digit 2 of 6". Base UI filters pasted and typed characters by the pattern.

Part names and `data-slot` values are the same in both editions.

## Liquid glass

Liquid glass is experimental for Input OTP, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [form controls evidence](../evidence/form-controls-073.md) for the board comparison, the specimen audit and the browser tests.
