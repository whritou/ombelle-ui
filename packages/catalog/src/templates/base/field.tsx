'use client'
import * as React from 'react'
import { Field as FieldPrimitive } from '@base-ui/react/field'
import { CircleAlertIcon } from 'lucide-react'
import { cn } from './utils.js'
import './field.css'

const FieldFlags = React.createContext({ invalid: false, required: false })

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
export function Field({ className, orientation = 'vertical', invalid = false, required = false, disabled = false, ...props }: FieldProps) {
  return (
    <FieldFlags.Provider value={{ invalid, required }}>
      <FieldPrimitive.Root
        {...props}
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
  const { required } = React.useContext(FieldFlags)
  return (
    <FieldPrimitive.Label {...props} data-slot="field-label" className={cn(className)}>
      {children}
      {required && <span aria-hidden="true">*</span>}
    </FieldPrimitive.Label>
  )
}

/** Renders the wrapped control through Field.Control, which supplies its id and description ids. */
export function FieldControl({ children }: { children: React.ReactElement }) {
  const { required } = React.useContext(FieldFlags)
  return <FieldPrimitive.Control render={children} required={required || undefined} />
}

export function FieldDescription({ className, ...props }: Omit<FieldPrimitive.Description.Props, 'className'> & { className?: string }) {
  return <FieldPrimitive.Description {...props} data-slot="field-description" className={cn(className)} />
}

/** Shown only while the field is invalid. */
export function FieldError({ className, children, ...props }: Omit<FieldPrimitive.Error.Props, 'className' | 'match'> & { className?: string }) {
  const { invalid } = React.useContext(FieldFlags)
  if (!invalid) return null
  return (
    <FieldPrimitive.Error {...props} match data-slot="field-error" className={cn(className)}>
      <CircleAlertIcon aria-hidden="true" />
      {children}
    </FieldPrimitive.Error>
  )
}
