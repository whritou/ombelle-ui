'use client'
import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { Radio } from '@base-ui/react/radio'
import { cn } from './utils.js'
import './radio-group.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's data-checked/data-unchecked,
// so the shared stylesheet applies. A custom render prop replaces this bridge.
const checkedState = (checked: boolean) => (checked ? 'checked' : 'unchecked')

/** Generic over the value type, like Base UI's RadioGroup. */
export type RadioGroupProps<Value = string> = Omit<
  RadioGroupPrimitive.Props<Value>,
  'className'
> & { className?: string }

export function RadioGroup<Value = string>({
  className,
  ...props
}: RadioGroupProps<Value>) {
  return (
    <RadioGroupPrimitive
      className={cn(className)}
      {...props}
      data-slot="radio-group"
    />
  )
}

export function RadioGroupItem({
  className,
  ...props
}: Part<typeof Radio.Root>) {
  return (
    <Radio.Root
      className={cn(className)}
      render={(itemProps, state) => (
        <span {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
      data-slot="radio-group-item"
    >
      <Radio.Indicator
        data-slot="radio-group-indicator"
        render={(indicatorProps, state) => (
          <span {...indicatorProps} data-state={checkedState(state.checked)} />
        )}
      />
    </Radio.Root>
  )
}

/** A selectable row: wrap a RadioGroupItem with its label and description. */
export function RadioGroupOption({
  className,
  ...props
}: React.ComponentProps<'label'>) {
  return (
    <label
      className={cn(className)}
      {...props}
      data-slot="radio-group-option"
    />
  )
}

export function RadioGroupOptionLabel({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(className)}
      {...props}
      data-slot="radio-group-option-label"
    />
  )
}

export function RadioGroupOptionDescription({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(className)}
      {...props}
      data-slot="radio-group-option-description"
    />
  )
}
