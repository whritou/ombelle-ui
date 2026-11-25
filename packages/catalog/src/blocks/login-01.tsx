// Placeholder: replaced by the real login-01 block.
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordField } from '@/components/ui/password-field'
import { Separator } from '@/components/ui/separator'

const parts = [Alert, Button, Card, Checkbox, Field, Input, Label, PasswordField, Separator]

export function Block() {
  void parts
  return (
    <section data-block="login-01">
      <h2>Sign in to Ombelle</h2>
    </section>
  )
}
