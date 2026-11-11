'use client'
import * as React from 'react'
import { CircleAlertIcon } from 'lucide-react'
import { cn } from './utils.js'
import './field.css'

type FieldState = {
  controlId: string
  descriptionId?: string
  errorId?: string
  invalid: boolean
  required: boolean
  disabled: boolean
}

const FieldContext = React.createContext<FieldState | null>(null)

function useField(part: string): FieldState {
  const state = React.useContext(FieldContext)
  if (!state) throw new Error(`${part} must be used inside <Field>`)
  return state
}

/** Whether the tree contains an element of the given component, found while rendering so server HTML is correct. */
function contains(children: React.ReactNode, type: React.ElementType): boolean {
  return React.Children.toArray(children).some(child => React.isValidElement<{ children?: React.ReactNode }>(child) &&
    (child.type === type || contains(child.props.children, type)))
}

export type FieldProps = React.ComponentProps<'div'> & {
  orientation?: 'vertical' | 'horizontal'
  invalid?: boolean
  required?: boolean
  disabled?: boolean
}

/**
 * Wires a label, hint and error to one control. The control is wrapped in
 * FieldControl, which passes it the id, aria-describedby, aria-invalid,
 * required and disabled.
 */
export function Field({
  className,
  orientation = 'vertical',
  invalid = false,
  required = false,
  disabled = false,
  children,
  ...props
}: FieldProps) {
  const id = React.useId()
  const state: FieldState = {
    controlId: id + '-control',
    descriptionId: contains(children, FieldDescription) ? id + '-description' : undefined,
    errorId: invalid ? id + '-error' : undefined,
    invalid,
    required,
    disabled,
  }
  return (
    <FieldContext.Provider value={state}>
      <div
        role="group"
        {...props}
        data-slot="field"
        data-orientation={orientation}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        className={cn(className)}
      >
        {children}
      </div>
    </FieldContext.Provider>
  )
}

export function FieldLabel({ className, children, ...props }: React.ComponentProps<'label'>) {
  const field = useField('FieldLabel')
  return (
    <label {...props} htmlFor={field.controlId} data-slot="field-label" data-disabled={field.disabled || undefined} className={cn(className)}>
      {children}
      {field.required && <span aria-hidden="true">*</span>}
    </label>
  )
}

type ControlProps = {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  required?: boolean
  disabled?: boolean
}

/** Passes the field's wiring to the single control it wraps, keeping the control's own description ids first. */
export function FieldControl({ children }: { children: React.ReactElement<ControlProps> }) {
  const field = useField('FieldControl')
  const own = children.props['aria-describedby']
  const describedBy = [own, field.descriptionId, field.errorId].filter(Boolean).join(' ') || undefined
  return React.cloneElement(children, {
    // FieldLabel points at this id, so it always wins over the control's own.
    id: field.controlId,
    'aria-describedby': describedBy,
    ...(field.invalid ? { 'aria-invalid': true } : {}),
    ...(field.required ? { required: true } : {}),
    ...(field.disabled ? { disabled: true } : {}),
  })
}

export function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const field = useField('FieldDescription')
  return <p {...props} id={field.descriptionId} data-slot="field-description" className={cn(className)} />
}

/** Shown only while the field is invalid. */
export function FieldError({ className, children, ...props }: React.ComponentProps<'p'>) {
  const field = useField('FieldError')
  if (!field.invalid) return null
  return (
    <p {...props} id={field.errorId} data-slot="field-error" className={cn(className)}>
      <CircleAlertIcon aria-hidden="true" />
      {children}
    </p>
  )
}
