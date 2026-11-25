// Placeholder: replaced by the real settings-01 block.
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Toast } from '@/components/ui/toast'

const parts = [AlertDialog, Avatar, Button, Card, Field, Input, RadioGroup, Select, Separator, Switch, Tabs, Textarea, Toast]

export function Block() {
  void parts
  return (
    <section data-block="settings-01">
      <h2>Ombelle account settings</h2>
    </section>
  )
}
