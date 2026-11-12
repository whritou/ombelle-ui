'use client'
import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckIcon, MinusIcon } from 'lucide-react'
import { cn } from './utils.js'
import './checkbox.css'

type CheckedState = boolean | 'indeterminate'
export type CheckboxProps = Omit<
  React.ComponentProps<typeof CheckboxPrimitive.Root>,
  'className' | 'checked' | 'defaultChecked' | 'indeterminate' | 'onCheckedChange'
> & {
  className?: string
  /** `'indeterminate'` shows the mixed state, as in the Radix edition. */
  checked?: CheckedState
  defaultChecked?: CheckedState
  onCheckedChange?: (checked: boolean) => void
}

// Radix-compatible data-state next to Base UI's data-checked, data-unchecked
// and data-indeterminate, so the shared stylesheet applies.
const checkedState = (state: { checked: boolean; indeterminate: boolean }) =>
  state.indeterminate ? 'indeterminate' : state.checked ? 'checked' : 'unchecked'

export function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  // An uncontrolled indeterminate checkbox becomes checked on its first change.
  const [mixed, setMixed] = React.useState(defaultChecked === 'indeterminate')
  const controlled = checked !== undefined
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(className)}
      {...(controlled
        ? { checked: checked === true, indeterminate: checked === 'indeterminate' }
        : { defaultChecked: defaultChecked === true, indeterminate: mixed })}
      onCheckedChange={(next) => {
        setMixed(false)
        onCheckedChange?.(next)
      }}
      render={(rootProps, state) => (
        <span {...rootProps} data-state={checkedState(state)} />
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        render={(indicatorProps, state) => (
          <span {...indicatorProps} data-state={checkedState(state)} />
        )}
      >
        <CheckIcon data-checkbox-mark="checked" aria-hidden="true" />
        <MinusIcon data-checkbox-mark="indeterminate" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export type CheckboxOptionProps = CheckboxProps & {
  title: React.ReactNode
  description?: React.ReactNode
  appearance?: 'row' | 'card'
}

/** A checkbox with its title and description, as a row or a card; the whole label toggles it. */
export function CheckboxOption({
  title,
  description,
  appearance = 'row',
  className,
  'aria-describedby': describedBy,
  ...props
}: CheckboxOptionProps) {
  const descriptionId = React.useId()
  const described = [describedBy, description != null ? descriptionId : undefined].filter(Boolean).join(' ') || undefined
  return (
    <label data-slot="checkbox-option" data-appearance={appearance} className={cn(className)}>
      <Checkbox {...props} aria-describedby={described} />
      <span data-slot="checkbox-option-title">{title}</span>
      {description != null && (
        <span data-slot="checkbox-option-description" id={descriptionId}>
          {description}
        </span>
      )}
    </label>
  )
}
