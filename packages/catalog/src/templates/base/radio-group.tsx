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

export type RadioGroupProps = Part<typeof RadioGroupPrimitive>

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn(className)}
      {...props}
    />
  )
}

export function RadioGroupItem({
  className,
  ...props
}: Part<typeof Radio.Root>) {
  return (
    <Radio.Root
      data-slot="radio-group-item"
      className={cn(className)}
      render={(itemProps, state) => (
        <span {...itemProps} data-state={checkedState(state.checked)} />
      )}
      {...props}
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
      data-slot="radio-group-option"
      className={cn(className)}
      {...props}
    />
  )
}

export function RadioGroupOptionLabel({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="radio-group-option-label"
      className={cn(className)}
      {...props}
    />
  )
}

export function RadioGroupOptionDescription({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="radio-group-option-description"
      className={cn(className)}
      {...props}
    />
  )
}
