'use client'
import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon, MinusIcon } from 'lucide-react'
import { cn } from './utils.js'
import './checkbox.css'

export type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
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
