'use client'
import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from './utils.js'
import './radio-group.css'

export type RadioGroupProps = React.ComponentProps<
  typeof RadioGroupPrimitive.Root
>

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      className={cn(className)}
      {...props}
      data-slot="radio-group"
    />
  )
}

export function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(className)}
      {...props}
      data-slot="radio-group-item"
    >
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" />
    </RadioGroupPrimitive.Item>
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
