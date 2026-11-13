'use client'
import * as React from 'react'
import { Field as FieldPrimitive } from '@base-ui/react/field'
import { Fieldset as FieldsetPrimitive } from '@base-ui/react/fieldset'
import { CircleAlertIcon } from 'lucide-react'
import { cn } from './utils.js'
import './field.css'

const FieldFlags = React.createContext<{ invalid: boolean; required: boolean; disabled: boolean; controlId?: string; message?: string }>({ invalid: false, required: false, disabled: false })

export type FieldProps = Omit<FieldPrimitive.Root.Props, 'className'> & {
  className?: string
  orientation?: 'vertical' | 'horizontal'
  invalid?: boolean
  required?: boolean
}

/**
 * Wires a label, hint and error to one control through Base UI's Field. The
 * control is wrapped in FieldControl.
 */
export function Field({ className, name, orientation = 'vertical', invalid: ownInvalid = false, required = false, disabled = false, onChange, ...props }: FieldProps) {
  const form = React.useContext(FormContext)
  const inForm = form !== null && name !== undefined
  const message = inForm ? form.message(name) : undefined
  const invalid = ownInvalid || message !== undefined
  return (
    <FieldFlags.Provider value={{ invalid, required, disabled, ...(inForm ? { controlId: form.idFor(name), message } : {}) }}>
      <FieldPrimitive.Root
        {...props}
        name={name}
        onChange={inForm ? (event: Parameters<NonNullable<FieldProps['onChange']>>[0]) => {
          onChange?.(event)
          form.clear(name)
        } : onChange}
        invalid={invalid}
        disabled={disabled}
        data-slot="field"
        data-orientation={orientation}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        className={cn(className)}
      />
    </FieldFlags.Provider>
  )
}

export function FieldLabel({ className, children, ...props }: Omit<FieldPrimitive.Label.Props, 'className'> & { className?: string }) {
  const { required, disabled } = React.useContext(FieldFlags)
  return (
    <FieldPrimitive.Label {...props} data-slot="field-label" data-disabled={disabled || undefined} className={cn(className)}>
      {children}
      {required && <span aria-hidden="true">*</span>}
    </FieldPrimitive.Label>
  )
}

type ControlProps = { id?: string; 'aria-describedby'?: string }

/**
 * Renders the wrapped control through Field.Control, which supplies its id and description ids.
 * Field.Control lets the rendered element's own props win, so the control's id and description
 * move onto Field.Control: the label then follows that id, and the hint and error ids are added
 * after the control's own description.
 */
export function FieldControl({ children }: { children: React.ReactElement<ControlProps> }) {
  const { required, controlId } = React.useContext(FieldFlags)
  const { id, 'aria-describedby': describedBy, ...rest } = children.props
  return (
    <FieldPrimitive.Control
      render={React.createElement(children.type, { ...rest, key: children.key })}
      id={id ?? controlId}
      aria-describedby={describedBy}
      required={required || undefined}
    />
  )
}

export function FieldDescription({ className, ...props }: Omit<FieldPrimitive.Description.Props, 'className'> & { className?: string }) {
  return <FieldPrimitive.Description {...props} data-slot="field-description" className={cn(className)} />
}

/** Shown only while the field is invalid. */
export function FieldError({ className, children, ...props }: Omit<FieldPrimitive.Error.Props, 'className' | 'match'> & { className?: string }) {
  const { invalid, message } = React.useContext(FieldFlags)
  if (!invalid) return null
  return (
    <FieldPrimitive.Error {...props} match data-slot="field-error" className={cn(className)}>
      <CircleAlertIcon aria-hidden="true" />
      {children ?? message}
    </FieldPrimitive.Error>
  )
}

/** Names a group of fields or controls; disabled, it disables every control inside. */
export function FieldSet({ className, ...props }: React.ComponentProps<typeof FieldsetPrimitive.Root>) {
  return <FieldsetPrimitive.Root {...props} data-slot="field-set" className={cn(className as string)} />
}

export function FieldLegend({ className, ...props }: React.ComponentProps<typeof FieldsetPrimitive.Legend>) {
  return <FieldsetPrimitive.Legend {...props} data-slot="field-legend" className={cn(className as string)} />
}

export type FormErrors = Record<string, string | readonly string[]>
export type FormValues = Record<string, FormDataEntryValue | FormDataEntryValue[]>

type SummaryLine = { name: string; label: string; message: string; known: boolean }
type FormState = {
  idFor(name: string): string
  message(name: string): string | undefined
  clear(name: string): void
  lines: readonly SummaryLine[]
  summaryAction: 'saving' | 'submitting'
  summaryRef: React.RefObject<HTMLDivElement | null>
}

const FormContext = React.createContext<FormState | null>(null)

const firstMessage = (value: string | readonly string[] | undefined) => (typeof value === 'string' ? value : value?.[0]) || undefined

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

function labelOf(children: React.ReactNode): string | undefined {
  let label: string | undefined
  React.Children.forEach(children, child => {
    if (label !== undefined || !React.isValidElement<{ children?: React.ReactNode }>(child)) return
    label = child.type === FieldLabel ? textOf(child.props.children).trim() : labelOf(child.props.children)
  })
  return label
}

/** The named fields inside a form, in order, found while rendering so the summary is right in server HTML. */
function collectFields(children: React.ReactNode, out: { name: string; label: string }[] = []) {
  React.Children.forEach(children, child => {
    if (!React.isValidElement<{ name?: unknown; children?: React.ReactNode }>(child)) return
    if (child.type === Field && typeof child.props.name === 'string') out.push({ name: child.props.name, label: labelOf(child.props.children) || child.props.name })
    else collectFields(child.props.children, out)
  })
  return out
}

function formValues(form: HTMLFormElement): FormValues {
  const values: FormValues = {}
  for (const [name, value] of new FormData(form)) {
    const previous = values[name]
    values[name] = previous === undefined ? value : [...(Array.isArray(previous) ? previous : [previous]), value]
  }
  return values
}

export type FormProps = Omit<React.ComponentProps<'form'>, 'noValidate'> & {
  /** Errors returned by the server, keyed by field name. A new object shows them again. */
  errors?: FormErrors
  /** The form's own checks, run after the browser's constraints on submit. */
  validate?(values: FormValues): FormErrors | undefined | void
  /** The summary reads "Fix 2 fields before saving" or "… before submitting". */
  summaryAction?: 'saving' | 'submitting'
}

/**
 * Collects the errors of its named Fields on submit. Before hydration the browser validates; after
 * it, the form reads each control's constraints, then `validate`, and a failed submit focuses the
 * FormErrorSummary. A field's error clears when its value changes.
 */
export function Form({ errors, validate, summaryAction = 'submitting', onSubmit, id, className, children, ...props }: FormProps) {
  const generated = React.useId()
  const formId = id ?? generated
  const [hydrated, setHydrated] = React.useState(false)
  React.useEffect(() => setHydrated(true), [])
  const [client, setClient] = React.useState<Readonly<Record<string, string>>>({})
  const [cleared, setCleared] = React.useState<ReadonlySet<string>>(new Set())
  const [shownErrors, setShownErrors] = React.useState(errors)
  // A new errors object shows every server error again.
  if (shownErrors !== errors) {
    setShownErrors(errors)
    setCleared(new Set())
  }
  const [focusRequest, setFocusRequest] = React.useState(0)
  const summaryRef = React.useRef<HTMLDivElement | null>(null)
  const fields = collectFields(children)
  const idFor = (name: string) => `${formId}-field-${name.replace(/[^A-Za-z0-9_-]/g, '-')}`

  const shown: Record<string, string> = {}
  for (const [name, value] of Object.entries(errors ?? {})) {
    const message = firstMessage(value)
    if (message && !cleared.has(name)) shown[name] = message
  }
  // The form's own messages, constraints first, win over the server's.
  Object.assign(shown, client)
  const lines: SummaryLine[] = [
    ...fields.filter(field => shown[field.name]).map(field => ({ name: field.name, label: field.label, message: shown[field.name], known: true })),
    ...Object.keys(shown).filter(name => !fields.some(field => field.name === name)).map(name => ({ name, label: name, message: shown[name], known: false })),
  ]

  React.useEffect(() => {
    if (focusRequest === 0) return
    if (summaryRef.current) summaryRef.current.focus()
    else {
      const first = lines.find(line => line.known)
      if (first) document.getElementById(idFor(first.name))?.focus()
    }
    // Only a new submit moves focus.
  }, [focusRequest])

  const state: FormState = {
    idFor,
    message: name => shown[name],
    clear: name => {
      setCleared(previous => (previous.has(name) ? previous : new Set(previous).add(name)))
      setClient(previous => {
        if (!(name in previous)) return previous
        const next = { ...previous }
        delete next[name]
        return next
      })
    },
    lines,
    summaryAction,
    summaryRef,
  }

  return (
    <FormContext.Provider value={state}>
      <form
        {...props}
        id={id}
        noValidate={hydrated || undefined}
        data-slot="form"
        className={cn(className)}
        onSubmit={(event) => {
          const form = event.currentTarget
          const constraint: Record<string, string> = {}
          for (const field of fields) {
            const control = form.ownerDocument.getElementById(idFor(field.name)) as HTMLInputElement | null
            if (control && typeof control.checkValidity === 'function' && !control.checkValidity()) constraint[field.name] = control.validationMessage
          }
          const custom: Record<string, string> = {}
          for (const [name, value] of Object.entries(validate?.(formValues(form)) ?? {})) {
            const message = firstMessage(value)
            if (message) custom[name] = message
          }
          const next = { ...custom, ...constraint }
          setClient(next)
          if (Object.keys(next).length > 0) {
            event.preventDefault()
            setFocusRequest(count => count + 1)
            return
          }
          onSubmit?.(event)
        }}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

const summaryText = (line: SummaryLine) =>
  `${line.label}: ${line.message.charAt(0).toLowerCase()}${line.message.slice(1).replace(/\.$/, '')}`

/** Lists every invalid field after a failed submit; it takes focus, and each line moves focus to its field. */
export function FormErrorSummary({ className, ...props }: React.ComponentProps<'div'>) {
  const form = React.useContext(FormContext)
  if (!form) throw new Error('FormErrorSummary must be used inside <Form>')
  const titleId = React.useId()
  if (form.lines.length === 0) return null
  const count = form.lines.length
  return (
    <div {...props} ref={form.summaryRef} role="region" tabIndex={-1} aria-labelledby={titleId} data-slot="form-error-summary" className={cn(className)}>
      <CircleAlertIcon aria-hidden="true" />
      <p id={titleId} data-slot="form-error-summary-title">{`Fix ${count} ${count === 1 ? 'field' : 'fields'} before ${form.summaryAction}`}</p>
      <ul data-slot="form-error-summary-list">
        {form.lines.map(line => (
          <li key={line.name}>
            {line.known ? (
              <a
                href={'#' + form.idFor(line.name)}
                onClick={(event) => {
                  const control = document.getElementById(form.idFor(line.name))
                  if (!control) return
                  event.preventDefault()
                  control.focus()
                }}
              >
                {summaryText(line)}
              </a>
            ) : summaryText(line)}
          </li>
        ))}
      </ul>
    </div>
  )
}
