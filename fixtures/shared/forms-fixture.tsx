import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from '@/components/ui/native-select'

const field = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: 8,
  minWidth: 0,
}
const error = { margin: 0, color: 'var(--destructive)', fontSize: 14 }
const longLabel =
  'Describe how this shared component library should be reviewed, approved and announced to every team before it ships soon'
const longOption =
  'Europe, Middle East and Africa with longer review windows for every regional release train'

export function FormsFixture() {
  return (
    <section
      data-testid="forms-fixture"
      aria-label="Form control examples"
      style={{
        boxSizing: 'border-box',
        width: 440,
        maxWidth: '100%',
        marginTop: 24,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 24,
      }}
    >
      <div style={field}>
        <Label htmlFor="forms-project-name" data-testid="forms-label-required">
          Project name <span aria-hidden="true">*</span>
        </Label>
        <Input id="forms-project-name" required defaultValue="Ombelle" />
      </div>
      <div style={field}>
        <Label htmlFor="forms-long" data-testid="forms-long-label">
          {longLabel}
        </Label>
        <Input id="forms-long" />
      </div>
      <div style={field}>
        <Label htmlFor="forms-email-invalid">Contact email</Label>
        <Input
          id="forms-email-invalid"
          data-testid="forms-input-invalid"
          type="email"
          aria-invalid="true"
          defaultValue="not-an-email"
        />
      </div>
      <div style={field}>
        <Label htmlFor="forms-notes-empty">Notes</Label>
        <Textarea
          id="forms-notes-empty"
          data-testid="forms-textarea-empty"
          placeholder="Add a note for reviewers"
        />
      </div>
      <div style={field}>
        <Label htmlFor="forms-summary">Summary</Label>
        <Textarea
          id="forms-summary"
          data-testid="forms-textarea-filled"
          defaultValue="Shared components, ready for your project."
        />
      </div>
      <div style={field}>
        <Label htmlFor="forms-feedback">Feedback</Label>
        <Textarea
          id="forms-feedback"
          data-testid="forms-textarea-invalid"
          aria-invalid="true"
          aria-describedby="forms-feedback-error"
        />
        <p
          id="forms-feedback-error"
          data-testid="forms-textarea-error"
          style={error}
        >
          Enter feedback before submitting.
        </p>
      </div>
      <div style={field}>
        <Label htmlFor="forms-archived">Archived note</Label>
        <Textarea
          id="forms-archived"
          data-testid="forms-textarea-disabled"
          disabled
          defaultValue="This note is read-only."
        />
      </div>
      <div style={field}>
        <Label htmlFor="forms-region">Region</Label>
        <NativeSelect
          id="forms-region"
          data-testid="forms-select-default"
          defaultValue="eu"
        >
          <NativeSelectOption value="us">United States</NativeSelectOption>
          <NativeSelectOption value="eu">Europe</NativeSelectOption>
          <NativeSelectOption value="apac">Asia Pacific</NativeSelectOption>
        </NativeSelect>
      </div>
      <div style={field}>
        <Label htmlFor="forms-density">Density</Label>
        <NativeSelect
          id="forms-density"
          data-testid="forms-select-sm"
          size="sm"
          defaultValue="comfortable"
        >
          <NativeSelectOption value="compact">Compact</NativeSelectOption>
          <NativeSelectOption value="comfortable">Comfortable</NativeSelectOption>
        </NativeSelect>
      </div>
      <div style={field}>
        <Label htmlFor="forms-plan">Plan</Label>
        <NativeSelect
          id="forms-plan"
          data-testid="forms-select-invalid"
          aria-invalid="true"
          aria-describedby="forms-plan-error"
          defaultValue=""
        >
          <NativeSelectOption value="">Choose a plan</NativeSelectOption>
          <NativeSelectOption value="team">Team</NativeSelectOption>
          <NativeSelectOption value="enterprise">Enterprise</NativeSelectOption>
        </NativeSelect>
        <p id="forms-plan-error" data-testid="forms-select-error" style={error}>
          Choose a plan to continue.
        </p>
      </div>
      <div style={field}>
        <Label htmlFor="forms-owner">Owner</Label>
        <NativeSelect
          id="forms-owner"
          data-testid="forms-select-disabled"
          disabled
          defaultValue="design"
        >
          <NativeSelectOption value="design">Design systems</NativeSelectOption>
        </NativeSelect>
      </div>
      <div style={field}>
        <Label htmlFor="forms-zone">Release zone</Label>
        <NativeSelect
          id="forms-zone"
          data-testid="forms-select-optgroup"
          defaultValue="emea-extended"
        >
          <NativeSelectOptGroup label="Americas">
            <NativeSelectOption value="na">North America</NativeSelectOption>
            <NativeSelectOption value="latam">Latin America</NativeSelectOption>
          </NativeSelectOptGroup>
          <NativeSelectOptGroup label="Europe">
            <NativeSelectOption value="emea">EMEA</NativeSelectOption>
            <NativeSelectOption value="emea-extended">
              {longOption}
            </NativeSelectOption>
          </NativeSelectOptGroup>
        </NativeSelect>
      </div>
      <div style={field}>
        <Label htmlFor="forms-channels">Channels</Label>
        <NativeSelect
          id="forms-channels"
          data-testid="forms-select-multiple"
          multiple
          defaultValue={['email']}
        >
          <NativeSelectOption value="email">Email</NativeSelectOption>
          <NativeSelectOption value="chat">Chat</NativeSelectOption>
          <NativeSelectOption value="sms">SMS</NativeSelectOption>
        </NativeSelect>
      </div>
      <fieldset disabled style={{ ...field, margin: 0, padding: 0, border: 0 }}>
        <legend style={{ padding: 0, marginBottom: 8 }}>Locked settings</legend>
        <Label htmlFor="forms-locked">Locked region</Label>
        <NativeSelect
          id="forms-locked"
          data-testid="forms-select-fieldset"
          defaultValue="eu"
        >
          <NativeSelectOption value="eu">Europe</NativeSelectOption>
        </NativeSelect>
      </fieldset>
    </section>
  )
}
