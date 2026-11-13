import * as React from 'react'
import { Checkbox, CheckboxGroup, CheckboxGroupParent, CheckboxOption } from '@/components/ui/checkbox'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Toolbar, ToolbarButton, ToolbarLink, ToolbarOverflow, ToolbarSeparator, ToolbarToggleGroup, ToolbarToggleItem } from '@/components/ui/toolbar'
import { Carousel, CarouselContent, CarouselCounter, CarouselDots, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { PasswordField, PasswordFieldCapsLock, PasswordFieldControl, PasswordFieldInput, PasswordFieldStrength, PasswordFieldToggle, type PasswordCheck } from '@/components/ui/password-field'
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet, Form, FormErrorSummary, type FormErrors } from '@/components/ui/field'

// The 0.7.6 components in both editions (tests/e2e/components-076.spec.ts).
// scripts/generate-preview.ts copies this file next to each edition's scenario.
function EmailField() {
  return (
    <Field name="email">
      <FieldLabel>Email</FieldLabel>
      <FieldControl><input type="email" /></FieldControl>
      <FieldError />
    </Field>
  )
}

function SavePresetForm() {
  const [errors, setErrors] = React.useState<FormErrors | undefined>()
  const [saved, setSaved] = React.useState(0)
  return (
    <Form
      data-testid="c076-form"
      summaryAction="saving"
      errors={errors}
      onSubmit={event => {
        event.preventDefault()
        setSaved(count => count + 1)
      }}
    >
      <FormErrorSummary />
      <Field name="name" required>
        <FieldLabel>Preset name</FieldLabel>
        <FieldControl><input type="text" /></FieldControl>
        <FieldError />
      </Field>
      <Field name="radius">
        <FieldLabel>Radius</FieldLabel>
        <FieldControl><input type="number" min={0} max={48} /></FieldControl>
        <FieldError />
      </Field>
      <EmailField />
      <Field name="description">
        <FieldLabel>Description</FieldLabel>
        <FieldControl><input type="text" /></FieldControl>
        <FieldDescription>Shown in the preset list.</FieldDescription>
      </Field>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit">Save preset</button>
        <button type="button" onClick={() => setErrors({ name: 'A preset with this name already exists.', ghost: 'Unknown field error.' })}>Return server errors</button>
      </div>
      <p role="status">{saved ? `Saved ${saved}` : ''}</p>
    </Form>
  )
}

const passwordChecks: PasswordCheck[] = [
  { label: 'at least 12 characters', test: value => value.length >= 12 },
  { label: 'a number', test: value => /\d/.test(value) },
  { label: 'add a symbol', test: value => /[^A-Za-z0-9]/.test(value) },
]

function PasswordForm() {
  return (
    <form data-testid="c076-password" onSubmit={event => event.preventDefault()} style={{ display: 'grid', gap: '0.75rem' }}>
      <PasswordField>
        <label htmlFor="c076-new-password">Password</label>
        <PasswordFieldControl>
          <PasswordFieldInput id="c076-new-password" name="password" autoComplete="new-password" />
          <PasswordFieldToggle />
        </PasswordFieldControl>
        <PasswordFieldCapsLock />
        <PasswordFieldStrength checks={passwordChecks} />
      </PasswordField>
      <PasswordField>
        <label htmlFor="c076-confirm-password">Confirm password</label>
        <PasswordFieldControl>
          <PasswordFieldInput id="c076-confirm-password" name="confirm" autoComplete="new-password" />
          <PasswordFieldToggle />
        </PasswordFieldControl>
      </PasswordField>
      <button type="submit">Set password</button>
    </form>
  )
}

const kits = ['Ombelle', 'Flat', 'Minimalist', 'Neo brutalism', 'Liquid glass', 'Studio warm']
const kitCard = { display: 'grid', placeItems: 'center', blockSize: '8rem', border: '1px solid currentColor', borderRadius: '0.75rem' } as const

function KitCarousel() {
  const [count, setCount] = React.useState(5)
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <Carousel aria-label="UI kits" data-testid="c076-carousel">
        <CarouselContent>
          {kits.slice(0, count).map(kit => <CarouselItem key={kit}><div style={kitCard}>{kit}</div></CarouselItem>)}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
        <CarouselDots />
        <CarouselCounter />
      </Carousel>
      <button type="button" onClick={() => setCount(6)}>Add a slide</button>
      <Carousel aria-label="Kit pairs" slidesPerView={2} data-testid="c076-carousel-pairs">
        <CarouselContent>
          {kits.slice(0, 4).map(kit => <CarouselItem key={kit}><div style={kitCard}>{kit}</div></CarouselItem>)}
        </CarouselContent>
        <CarouselDots />
        <CarouselCounter />
      </Carousel>
      <Carousel aria-label="One kit" data-testid="c076-carousel-one">
        <CarouselContent><CarouselItem><div style={kitCard}>Ombelle</div></CarouselItem></CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  )
}

function RefCheckbox() {
  const ref = React.useRef<HTMLButtonElement>(null)
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Checkbox ref={ref} aria-label="Terms by ref" />
      <button type="button" onClick={() => ref.current?.focus()}>Focus the terms checkbox</button>
    </div>
  )
}

function ViewToolbar() {
  const [width, setWidth] = React.useState(640)
  const [extra, setExtra] = React.useState(false)
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        Toolbar width
        <input type="range" min={160} max={640} step={10} value={width} onChange={event => setWidth(Number(event.target.value))} />
      </label>
      <button type="button" onClick={() => setExtra(true)}>Add a tool</button>
      <div data-testid="c076-toolbar" style={{ inlineSize: width + 'px' }}>
        <Toolbar aria-label="View options">
          <ToolbarToggleGroup type="single" defaultValue="light" aria-label="Theme">
            <ToolbarToggleItem value="light">Light</ToolbarToggleItem>
            <ToolbarToggleItem value="dark">Dark</ToolbarToggleItem>
          </ToolbarToggleGroup>
          <ToolbarSeparator />
          <ToolbarToggleGroup type="multiple" aria-label="Guides">
            <ToolbarToggleItem value="grid">Grid</ToolbarToggleItem>
          </ToolbarToggleGroup>
          <ToolbarLink href="#preview">Open preview</ToolbarLink>
          {extra && <ToolbarButton>Export as image</ToolbarButton>}
          <ToolbarOverflow />
        </Toolbar>
      </div>
    </div>
  )
}

export function ComponentsScenario076() {
  const stack = { display: 'grid', gap: '1rem', maxInlineSize: '28rem' } as const
  return (
    <section aria-label="0.7.6 components" data-testid="components-076" style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={stack}>
        <SavePresetForm />
        <PasswordForm />
      </div>
      <ViewToolbar />
      <div style={{ maxInlineSize: '36rem' }}>
        <KitCarousel />
      </div>
      <div data-testid="c076-aspect" style={{ inlineSize: '240px' }}>
        <AspectRatio>
          <img alt="A striped placeholder" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='18'%3E%3Crect width='32' height='18' fill='%23c9c2b8'/%3E%3C/svg%3E" />
        </AspectRatio>
      </div>
      <div style={stack} data-testid="c076-checkbox-group">
        <FieldSet>
          <FieldLegend>Overlays to install</FieldLegend>
          <CheckboxGroup defaultValue={['dialog', 'popover']}>
            <CheckboxGroupParent title="All overlays" />
            <CheckboxOption value="dialog" title="Dialog" />
            <CheckboxOption value="popover" title="Popover" disabled />
            <CheckboxOption value="sheet" title="Sheet" />
            <CheckboxOption value="tooltip" title="Tooltip" />
          </CheckboxGroup>
        </FieldSet>
        <FieldSet disabled data-testid="c076-editions">
          <FieldLegend>Editions · locked by the project</FieldLegend>
          <CheckboxOption title="Radix" defaultChecked />
          <CheckboxOption title="Base UI" />
          <Field>
            <FieldLabel>Project path</FieldLabel>
            <FieldControl><input type="text" defaultValue="apps/web" /></FieldControl>
          </Field>
        </FieldSet>
        <Checkbox aria-label="Unrelated" />
        <RefCheckbox />
      </div>
    </section>
  )
}
