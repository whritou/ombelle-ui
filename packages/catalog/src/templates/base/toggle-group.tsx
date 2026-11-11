'use client'
import * as React from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import { Toggle } from '@base-ui/react/toggle'
import { cn } from './utils.js'
import './toggle-group.css'

type Variant = 'segmented' | 'toolbar'
type GroupState = { type: 'single' | 'multiple'; variant: Variant; values: readonly string[] }
const ToggleGroupState = React.createContext<GroupState>({ type: 'single', variant: 'segmented', values: [] })

type Common = Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'dir'> & {
  /** segmented: one bar with a raised selected item; toolbar: separate square buttons. */
  variant?: Variant
  orientation?: 'horizontal' | 'vertical'
  disabled?: boolean
}
export type ToggleGroupProps = Common & (
  | { type: 'single'; value?: string; defaultValue?: string; onValueChange?(value: string): void }
  | { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?(value: string[]): void }
)

const asList = (value: string | string[] | undefined) =>
  value === undefined ? undefined : Array.isArray(value) ? value : value ? [value] : []

/**
 * A row of toggle buttons with one Tab stop and arrow-key movement, on Base UI ToggleGroup.
 * type="single" is a radio group (aria-checked); type="multiple" is a toolbar of pressed buttons,
 * as in the Radix edition. Name it with aria-label.
 */
export function ToggleGroup(props: ToggleGroupProps) {
  const { className, variant = 'segmented', type, orientation = 'horizontal', disabled, value, defaultValue, onValueChange, ...rest } = props
  const [own, setOwn] = React.useState<string[]>(asList(defaultValue) ?? [])
  const values = asList(value) ?? own
  return (
    <ToggleGroupState.Provider value={{ type, variant, values }}>
      <ToggleGroupPrimitive
        {...rest}
        value={values}
        multiple={type === 'multiple'}
        orientation={orientation}
        disabled={disabled}
        onValueChange={(next: string[]) => {
          if (value === undefined) setOwn(next)
          if (type === 'single') (onValueChange as ((value: string) => void) | undefined)?.(next[0] ?? '')
          else (onValueChange as ((value: string[]) => void) | undefined)?.(next)
        }}
        role={type === 'single' ? 'radiogroup' : 'toolbar'}
        data-slot="toggle-group"
        data-variant={variant}
        data-type={type}
        className={cn(className)}
      />
    </ToggleGroupState.Provider>
  )
}

export type ToggleGroupItemProps = Omit<React.ComponentProps<'button'>, 'value' | 'className'> & { value: string; className?: string }

/** One option. Give an icon-only item an aria-label. */
export function ToggleGroupItem({ className, value, ...props }: ToggleGroupItemProps) {
  const { type, variant, values } = React.useContext(ToggleGroupState)
  const on = values.includes(value)
  // A single choice is announced as a radio, as Radix does, so both editions read the same.
  const single = type === 'single' ? { role: 'radio', 'aria-checked': on, 'aria-pressed': undefined } : {}
  return (
    <Toggle
      {...props}
      value={value}
      {...single}
      data-slot="toggle-group-item"
      data-variant={variant}
      data-state={on ? 'on' : 'off'}
      className={cn(className)}
    />
  )
}
