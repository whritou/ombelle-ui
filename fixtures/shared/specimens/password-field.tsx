'use client'
import { Label } from '@/components/ui/label'
import { PasswordField, PasswordFieldCapsLock, PasswordFieldControl, PasswordFieldInput, PasswordFieldStrength, PasswordFieldToggle } from '@/components/ui/password-field'

export function Specimen() {
  return (
    <section aria-label="Password Field" data-component="password-field">
      <h2>Password Field</h2>
      <PasswordField>
        <Label htmlFor="gallery-password">Password</Label>
        <PasswordFieldControl>
          <PasswordFieldInput id="gallery-password" defaultValue="correct-horse-7" autoComplete="new-password" />
          <PasswordFieldToggle />
        </PasswordFieldControl>
        <PasswordFieldCapsLock />
        <PasswordFieldStrength checks={[{ label: 'at least 12 characters', match: '^.{12,}$' }, { label: 'a number', match: '\\d' }, { label: 'add a symbol', match: '[^A-Za-z0-9]' }]} />
      </PasswordField>
    </section>
  )
}
