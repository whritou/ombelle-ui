import * as React from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from './utils.js'
import './native-select.css'

export type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  size?: 'sm' | 'default'
}

export function NativeSelect({
  className,
  size = 'default',
  ...props
}: NativeSelectProps) {
  return (
    <div data-slot="native-select-wrapper">
      <select
        {...props}
        data-slot="native-select"
        data-size={size}
        className={cn(className)}
      />
      <ChevronDownIcon data-slot="native-select-icon" aria-hidden="true" />
    </div>
  )
}

export function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<'option'>) {
  return (
    <option
      {...props}
      data-slot="native-select-option"
      className={cn(className)}
    />
  )
}

export function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<'optgroup'>) {
  return (
    <optgroup
      {...props}
      data-slot="native-select-optgroup"
      className={cn(className)}
    />
  )
}
