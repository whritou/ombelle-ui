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

export function Checkbox({ value, id, disabled, checked: ownChecked, onCheckedChange: ownChange, ...rest }: CheckboxProps) {
  const group = React.useContext(CheckboxGroupContext)
  // Inside a CheckboxGroup, a checkbox with a value takes its checked state from the group.
  if (group && typeof value === 'string')
    return (
      <CheckboxControl
        {...rest}
        value={value}
        id={id}
        rootId={id ?? group.idFor(value)}
        disabled={disabled || group.disabled}
        checked={group.value.includes(value)}
        onCheckedChange={(next) => {
          group.setChecked(value, next)
          ownChange?.(next)
        }}
      />
    )
  return <CheckboxControl {...rest} value={value} id={id} disabled={disabled} checked={ownChecked} onCheckedChange={ownChange} />
}

/**
 * Base UI's checkbox is a span, which a disabled native fieldset does not disable; it reads the
 * nearest disabled fieldset after each render instead.
 */
function useFieldsetDisabled(): [boolean, (node: HTMLElement | null) => void] {
  const [disabled, setDisabled] = React.useState(false)
  const node = React.useRef<HTMLElement | null>(null)
  React.useLayoutEffect(() => {
    const next = node.current?.closest('fieldset:disabled') != null
    if (next !== disabled) setDisabled(next)
  })
  return [disabled, (element) => { node.current = element }]
}

function CheckboxControl({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  rootId,
  disabled,
  ...props
}: CheckboxProps & { rootId?: string }) {
  const [inFieldset, fieldsetRef] = useFieldsetDisabled()
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
        // Base UI gives `id` to the hidden input; a grouped checkbox's id names the visible one, for the parent's aria-controls.
        <span {...rootProps} id={rootId ?? rootProps.id} data-state={checkedState(state)} />
      )}
      {...props}
      ref={fieldsetRef}
      disabled={disabled || inFieldset}
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
  const grouped = React.useContext(CheckboxGroupContext) !== null && typeof props.value === 'string'
  return (
    <label data-slot="checkbox-option" data-appearance={appearance} data-checkbox-group-item={grouped ? '' : undefined} className={cn(className)}>
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

type GroupOption = { value: string; disabled: boolean; id?: string }
type GroupState = {
  value: readonly string[]
  disabled: boolean
  options: readonly GroupOption[]
  idFor(value: string): string
  setChecked(value: string, checked: boolean): void
  toggleAll(): void
}

const CheckboxGroupContext = React.createContext<GroupState | null>(null)

function useCheckboxGroup(part: string): GroupState {
  const group = React.useContext(CheckboxGroupContext)
  if (!group) throw new Error(`${part} must be used inside <CheckboxGroup>`)
  return group
}

/** The group's checkboxes, found while rendering so the parent's state and ids are right in server HTML. */
function collectOptions(children: React.ReactNode, out: GroupOption[] = []): GroupOption[] {
  React.Children.forEach(children, child => {
    if (!React.isValidElement<{ value?: unknown; disabled?: boolean; id?: string; children?: React.ReactNode }>(child)) return
    if ((child.type === Checkbox || child.type === CheckboxOption) && typeof child.props.value === 'string')
      out.push({ value: child.props.value, disabled: child.props.disabled === true, id: child.props.id })
    else collectOptions(child.props.children, out)
  })
  return out
}

/** Checked when every child is, unchecked when none is, otherwise mixed. */
function groupState(group: GroupState): CheckedState {
  const checked = group.options.filter(option => group.value.includes(option.value)).length
  if (group.options.length > 0 && checked === group.options.length) return true
  return checked === 0 ? false : 'indeterminate'
}

export type CheckboxGroupProps = Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  value?: string[]
  defaultValue?: string[]
  onValueChange?(value: string[]): void
  /** The values the parent checkbox controls; by default, the values of the checkboxes inside. */
  allValues?: string[]
  disabled?: boolean
}

/** Checkboxes with a `value` inside it share one value list; a CheckboxGroupParent checks or clears them all. */
export function CheckboxGroup({
  value,
  defaultValue,
  onValueChange,
  allValues,
  disabled = false,
  id,
  className,
  children,
  ...props
}: CheckboxGroupProps) {
  const generated = React.useId()
  const groupId = id ?? generated
  const [inner, setInner] = React.useState<readonly string[]>(defaultValue ?? [])
  const current = value ?? inner
  const found = collectOptions(children)
  const options = allValues
    ? allValues.map(item => found.find(option => option.value === item) ?? { value: item, disabled: false })
    : found
  const commit = (next: readonly string[]) => {
    const ordered = [...options.map(option => option.value).filter(item => next.includes(item)), ...next.filter(item => !options.some(option => option.value === item))]
    if (value === undefined) setInner(ordered)
    onValueChange?.(ordered)
  }
  const state: GroupState = {
    value: current,
    disabled,
    options,
    idFor: item => options.find(option => option.value === item)?.id ?? `${groupId}-option-${options.findIndex(option => option.value === item)}`,
    setChecked: (item, checked) => commit(checked ? [...current.filter(entry => entry !== item), item] : current.filter(entry => entry !== item)),
    toggleAll: () => {
      // Disabled children keep their state; the rest follow the parent.
      const enabled = disabled ? [] : options.filter(option => !option.disabled).map(option => option.value)
      const allOn = enabled.every(item => current.includes(item))
      commit(allOn ? current.filter(item => !enabled.includes(item)) : [...current, ...enabled.filter(item => !current.includes(item))])
    },
  }
  return (
    <CheckboxGroupContext.Provider value={state}>
      <div role="group" {...props} id={id} data-slot="checkbox-group" data-disabled={disabled || undefined} className={cn(className)}>
        {children}
      </div>
    </CheckboxGroupContext.Provider>
  )
}

export type CheckboxGroupParentProps = Omit<CheckboxProps, 'checked' | 'defaultChecked' | 'onCheckedChange' | 'value' | 'title'> & {
  title: React.ReactNode
  /** Shows "2 of 4" after the title, inside the label. */
  count?: boolean
}

/** Reads checked, unchecked or mixed from the group, and checks or clears every enabled child. */
export function CheckboxGroupParent({ title, count = true, className, disabled, ...props }: CheckboxGroupParentProps) {
  const group = useCheckboxGroup('CheckboxGroupParent')
  return (
    <label data-slot="checkbox-group-parent" className={cn(className)}>
      <Checkbox
        {...props}
        data-checkbox-group-parent=""
        checked={groupState(group)}
        onCheckedChange={() => group.toggleAll()}
        aria-controls={group.options.map(option => group.idFor(option.value)).join(' ') || undefined}
        disabled={disabled || group.disabled}
      />
      <span data-slot="checkbox-group-parent-title">{title}</span>
      {count && <CheckboxGroupCount />}
    </label>
  )
}

/** "2 of 4": how many of the group's checkboxes are checked. */
export function CheckboxGroupCount({ className, ...props }: React.ComponentProps<'span'>) {
  const group = useCheckboxGroup('CheckboxGroupCount')
  const checked = group.options.filter(option => group.value.includes(option.value)).length
  return <span {...props} data-slot="checkbox-group-count" className={cn(className)}>{`${checked} of ${group.options.length}`}</span>
}
