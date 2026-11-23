'use client'
import * as React from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import { Toggle } from '@base-ui/react/toggle'
import { cn } from './utils.js'
import './toggle-group.css'

type Variant = 'segmented' | 'toolbar'
type GroupState = {
  type: 'single' | 'multiple'
  variant: Variant
  values: readonly string[]
  disabled: boolean
  /** The value of the item Tab enters on while focus is outside the group, if any. */
  tabStop: string | undefined
  register(id: string, value: string, enabled: boolean): () => void
}
const ToggleGroupState = React.createContext<GroupState>({
  type: 'single', variant: 'segmented', values: [], disabled: false, tabStop: undefined, register: () => () => {},
})
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

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
  const { className, variant = 'segmented', type, orientation = 'horizontal', disabled, value, defaultValue, onValueChange, onFocus, onBlur, ...rest } = props
  const [own, setOwn] = React.useState<string[]>(asList(defaultValue) ?? [])
  const values = asList(value) ?? own
  // While focus is outside, a radio group's tab stop is its checked item, as in the Radix
  // edition (Base UI's roving focus starts on the first item); inside, the arrow keys move it
  // as usual. Items register so a checked value with no enabled item leaves Base UI's stop.
  const [focusWithin, setFocusWithin] = React.useState(false)
  const items = React.useRef(new Map<string, { value: string; enabled: boolean }>())
  const [, refresh] = React.useReducer((count: number) => count + 1, 0)
  const register = React.useCallback((id: string, itemValue: string, enabled: boolean) => {
    items.current.set(id, { value: itemValue, enabled })
    refresh()
    return () => {
      items.current.delete(id)
      refresh()
    }
  }, [])
  const checked = values[0]
  const tabStop = type === 'single' && !focusWithin && checked !== undefined &&
    [...items.current.values()].some(item => item.enabled && item.value === checked) ? checked : undefined
  return (
    <ToggleGroupState.Provider value={{ type, variant, values, disabled: Boolean(disabled), tabStop, register }}>
      <ToggleGroupPrimitive
        {...rest}
        onFocus={(event: React.FocusEvent<HTMLDivElement>) => {
          onFocus?.(event)
          setFocusWithin(true)
        }}
        onBlur={(event: React.FocusEvent<HTMLDivElement>) => {
          onBlur?.(event)
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false)
        }}
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
  const { type, variant, values, disabled, tabStop, register } = React.useContext(ToggleGroupState)
  const on = values.includes(value)
  const id = React.useId()
  const enabled = !disabled && !props.disabled
  useIsomorphicLayoutEffect(() => register(id, value, enabled), [id, value, enabled, register])
  // A single choice is announced as a radio, as Radix does, so both editions read the same.
  const single = type === 'single' ? { role: 'radio', 'aria-checked': on, 'aria-pressed': undefined } : {}
  // Tab enters a radio group on its checked item.
  const entry = tabStop === undefined ? {} : { tabIndex: value === tabStop ? 0 : -1 }
  return (
    <Toggle
      {...props}
      value={value}
      {...single}
      {...entry}
      data-slot="toggle-group-item"
      data-variant={variant}
      data-state={on ? 'on' : 'off'}
      className={cn(className)}
    />
  )
}
