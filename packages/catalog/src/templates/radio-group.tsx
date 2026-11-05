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
      data-slot="radio-group"
      className={cn(className)}
      {...props}
    />
  )
}

export function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(className)}
      {...props}
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
