'use client'
import { Checkbox, CheckboxGroup, CheckboxGroupParent, CheckboxOption } from '@/components/ui/checkbox'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { RadioGroup, RadioGroupItem, RadioGroupOption, RadioGroupOptionDescription, RadioGroupOptionLabel } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch, SwitchThumb } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useGate } from './shared'

// The settings form holds several component parts. Given `only`, it renders
// the wrapper and that one part, plus the standalone Label part when it names
// the chosen control (the Input), so a control keeps its accessible name.
const labelledBy: Record<string, string> = { input: 'label' }

export function Specimen({ only }: { only?: string } = {}) {
  const gate = useGate()
  const visible = (part: string) => only === undefined || part === only || labelledBy[only] === part
  return (
    <form
      className="preset-form"
      onSubmit={(event) => event.preventDefault()}
      aria-label="Project settings"
    >
      <h2>Project settings</h2>
      {visible('label') && gate(
        'label',
        'Label',
        <div data-component="label">
          <Label htmlFor="preset-project-name">Project name</Label>
        </div>,
      )}
      {visible('input') && gate(
        'input',
        'Input',
        <div data-component="input">
          <Input id="preset-project-name" defaultValue="Ombelle workspace" />
          <Input size="sm" aria-label="Small input" placeholder="Small" />
          <Input size="lg" aria-label="Large input" placeholder="Large" />
          <Label htmlFor="preset-email">Email</Label>
          <Input
            id="preset-email"
            type="email"
            defaultValue="invalid"
            aria-invalid="true"
            aria-describedby="preset-email-error"
          />
          <p id="preset-email-error">Enter a valid email address.</p>
        </div>,
      )}
      {visible('textarea') && gate(
        'textarea',
        'Textarea',
        <div data-component="textarea">
          <Label htmlFor="preset-description">Description</Label>
          <Textarea
            id="preset-description"
            defaultValue="A small idea, ready to grow."
          />
        </div>,
      )}
      {visible('native-select') && gate(
        'native-select',
        'Native Select',
        <div data-component="native-select">
          <Label htmlFor="preset-region">Region</Label>
          <NativeSelect id="preset-region" defaultValue="eu">
            <NativeSelectOption value="eu">Europe</NativeSelectOption>
            <NativeSelectOption value="us">United States</NativeSelectOption>
          </NativeSelect>
        </div>,
      )}
      {visible('checkbox') && gate(
        'checkbox',
        'Checkbox',
        <div className="preset-row" data-component="checkbox">
          <Checkbox id="preset-terms" defaultChecked />
          <Label htmlFor="preset-terms">Accept project guidelines</Label>
        </div>,
      )}
      {visible('checkbox~option') && gate(
        'checkbox',
        'Checkbox',
        <div className="preset-stack" data-component="checkbox~option">
          <CheckboxOption title="Include examples" description="Adds examples next to each component." defaultChecked />
          <CheckboxOption appearance="card" title="Vite" description="React 19" />
        </div>,
      )}
      {visible('checkbox~group') && gate(
        'checkbox',
        'Checkbox',
        <FieldSet data-component="checkbox~group">
          <FieldLegend>Overlays to install</FieldLegend>
          <CheckboxGroup defaultValue={['dialog', 'popover']}>
            <CheckboxGroupParent title="All overlays" />
            <CheckboxOption value="dialog" title="Dialog" />
            <CheckboxOption value="popover" title="Popover" />
            <CheckboxOption value="sheet" title="Sheet" />
            <CheckboxOption value="tooltip" title="Tooltip" />
          </CheckboxGroup>
        </FieldSet>,
      )}
      {visible('switch') && gate(
        'switch',
        'Switch',
        <div className="preset-row" data-component="switch">
          <Switch id="preset-notifications" defaultChecked>
            <SwitchThumb />
          </Switch>
          <Label htmlFor="preset-notifications">Enable notifications</Label>
        </div>,
      )}
      {visible('switch~sm') && gate(
        'switch',
        'Switch',
        <div className="preset-row" data-component="switch~sm">
          <Switch id="preset-transparency" size="sm" />
          <Label htmlFor="preset-transparency">Reduced transparency</Label>
        </div>,
      )}
      {visible('select') && gate(
        'select',
        'Select',
        <div data-component="select">
          <Label id="preset-role-label">Role</Label>
          <Select defaultValue="designer">
            <SelectTrigger aria-labelledby="preset-role-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="designer">Designer</SelectItem>
              <SelectItem value="engineer">Engineer</SelectItem>
              <SelectItem value="product">Product manager</SelectItem>
              <SelectItem value="researcher" disabled hint="Seat limit">
                Researcher
              </SelectItem>
            </SelectContent>
          </Select>
        </div>,
      )}
      {visible('radio-group') && gate(
        'radio-group',
        'Radio Group',
        <div data-component="radio-group">
          <Label id="preset-plan-label">Plan</Label>
          <RadioGroup defaultValue="team" aria-labelledby="preset-plan-label">
            <RadioGroupOption>
              <RadioGroupItem value="starter" />
              <span>
                <RadioGroupOptionLabel>Starter</RadioGroupOptionLabel>
                <RadioGroupOptionDescription>
                  One project, community support
                </RadioGroupOptionDescription>
              </span>
            </RadioGroupOption>
            <RadioGroupOption>
              <RadioGroupItem value="team" />
              <span>
                <RadioGroupOptionLabel>Team</RadioGroupOptionLabel>
                <RadioGroupOptionDescription>
                  Unlimited projects and shared presets
                </RadioGroupOptionDescription>
              </span>
            </RadioGroupOption>
            <RadioGroupOption aria-disabled="true">
              <RadioGroupItem value="enterprise" disabled />
              <span>
                <RadioGroupOptionLabel>Enterprise</RadioGroupOptionLabel>
                <RadioGroupOptionDescription>
                  Contact sales to enable
                </RadioGroupOptionDescription>
              </span>
            </RadioGroupOption>
          </RadioGroup>
        </div>,
      )}
    </form>
  )
}
