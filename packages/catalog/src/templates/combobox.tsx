'use client'
import * as React from 'react'
import { Command as CommandPrimitive, useCommandState } from 'cmdk'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { CheckIcon, ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './combobox.css'

/** Wraps the first case-insensitive occurrence of the trimmed query in a mark. */
export function highlightMatch(text: string, query: string): React.ReactNode {
  const needle = query.trim().toLowerCase()
  const start = needle ? text.toLowerCase().indexOf(needle) : -1
  if (start < 0) return text
  return (
    <>
      {text.slice(0, start)}
      <mark data-slot="combobox-match">{text.slice(start, start + needle.length)}</mark>
      {text.slice(start + needle.length)}
    </>
  )
}

/** True when the query is not blank and no label equals it, ignoring case and outer spaces. */
export function shouldOfferCreate(query: string, labels: readonly string[]): boolean {
  const name = query.trim().toLowerCase()
  return name !== '' && !labels.some(label => label.trim().toLowerCase() === name)
}

/** The visible text of an item. */
function textOf(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) return textOf(child.props.children)
    return ''
  }).join('').trim()
}

/** The items written as elements below `children`, so labels are known before the list opens. */
function labelsIn(children: React.ReactNode, labels = new Map<string, string>()): Map<string, string> {
  React.Children.forEach(children, child => {
    if (!React.isValidElement<{ children?: React.ReactNode; value?: string }>(child)) return
    if (child.type === ComboboxItem) labels.set(child.props.value!, textOf(child.props.children))
    else labelsIn(child.props.children, labels)
  })
  return labels
}

type ComboboxState = {
  multiple: boolean
  values: string[]
  labels: Map<string, string>
  query: string
  setQuery(query: string): void
  open: boolean
  setOpen(open: boolean): void
  select(value: string): void
  remove(value: string): void
  create?(query: string): void
  disabled: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  fieldRef: React.RefObject<HTMLDivElement | null>
}
const ComboboxContext = React.createContext<ComboboxState | null>(null)

function useCombobox(part: string): ComboboxState {
  const state = React.useContext(ComboboxContext)
  if (!state) throw new Error(`${part} must be used inside <Combobox>`)
  return state
}

type Common = {
  disabled?: boolean
  /** Submits each value as a hidden input with this name. */
  name?: string
  /** Called with the trimmed query when the person chooses ComboboxCreate. */
  onCreate?(query: string): void
  /** The search text on the first render. */
  defaultQuery?: string
  className?: string
  children?: React.ReactNode
}
export type ComboboxProps = Common & (
  | { multiple?: false; value?: string; defaultValue?: string; onValueChange?(value: string): void }
  | { multiple: true; value?: string[]; defaultValue?: string[]; onValueChange?(value: string[]): void }
)

/**
 * A text field that filters a list of options. In multiple mode the chosen options show as
 * chips in the field, and Backspace in the empty field removes the last one.
 */
export function Combobox(props: ComboboxProps) {
  const { disabled = false, name, onCreate, defaultQuery, className, children } = props
  const multiple = props.multiple === true
  const labels = labelsIn(children)
  const [own, setOwn] = React.useState<string | string[]>(props.defaultValue ?? (multiple ? [] : ''))
  const current = props.value ?? own
  const values = Array.isArray(current) ? current : current ? [current] : []
  const [query, setQuery] = React.useState(defaultQuery ?? (!multiple && values[0] ? labels.get(values[0]) ?? values[0] : ''))
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const fieldRef = React.useRef<HTMLDivElement>(null)
  const commit = (next: string[]) => {
    const value = multiple ? next : next[0] ?? ''
    if (props.value === undefined) setOwn(value)
    ;(props.onValueChange as ((value: string | string[]) => void) | undefined)?.(value)
  }
  const state: ComboboxState = {
    multiple, values, labels, query, setQuery, open, setOpen, disabled, inputRef, fieldRef,
    select(value) {
      if (multiple) {
        commit(values.includes(value) ? values.filter(item => item !== value) : [...values, value])
        setQuery('')
      } else {
        commit([value])
        setQuery(labels.get(value) ?? value)
        setOpen(false)
      }
    },
    remove(value) {
      commit(values.filter(item => item !== value))
      inputRef.current?.focus()
    },
    create: onCreate && ((text) => {
      onCreate(text.trim())
      if (multiple) setQuery('')
      else setOpen(false)
    }),
  }
  return (
    <ComboboxContext.Provider value={state}>
      <CommandPrimitive
        data-slot="combobox"
        data-disabled={disabled || undefined}
        className={cn(className)}
        // Plain substring matching, so the filter agrees with highlightMatch.
        filter={(_, search, keywords) => (keywords ?? []).some(text => text.toLowerCase().includes(search.trim().toLowerCase())) ? 1 : 0}
        // Arrow keys move through the list only while it is open.
        onKeyDown={(event) => { if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) event.preventDefault() }}
      >
        <PopoverPrimitive.Root open={open && !disabled} onOpenChange={setOpen}>{children}</PopoverPrimitive.Root>
        {name && values.map(value => <input key={value} type="hidden" name={name} value={value} />)}
      </CommandPrimitive>
    </ComboboxContext.Provider>
  )
}

/** The chosen options of a multiple combobox; ComboboxInput shows them for you. */
export function ComboboxChips({ className, ...props }: React.ComponentProps<'ul'>) {
  const { values, labels, remove, disabled } = useCombobox('ComboboxChips')
  if (!values.length) return null
  return (
    <ul aria-label="Selected" {...props} data-slot="combobox-chips" className={cn(className)}>
      {values.map(value => {
        const label = labels.get(value) ?? value
        return (
          <li key={value} data-slot="combobox-chip">
            <span>{label}</span>
            <button type="button" aria-label={`Remove ${label}`} disabled={disabled} data-slot="combobox-chip-remove" onClick={() => remove(value)}>
              <XIcon aria-hidden="true" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** The text field. It takes the label and description, for example from FieldControl. */
export function ComboboxInput({ className, onKeyDown, onClick, onChange, ...props }: Omit<React.ComponentProps<'input'>, 'value'>) {
  const state = useCombobox('ComboboxInput')
  return (
    <PopoverPrimitive.Anchor asChild>
      <div ref={state.fieldRef} data-slot="combobox-field" data-disabled={state.disabled || undefined} onClick={(event) => {
        if (event.target === event.currentTarget) state.inputRef.current?.focus()
      }}>
        {state.multiple && <ComboboxChips />}
        {/* cmdk sets its own id, name and expanded state after the props it is given; as a child,
            this input's attributes win instead. */}
        <CommandPrimitive.Input
          asChild
          value={state.query}
          onValueChange={(query) => {
            state.setQuery(query)
            state.setOpen(true)
          }}
        >
          <input
          {...props}
          ref={state.inputRef}
          data-slot="combobox-input"
          aria-labelledby={props['aria-labelledby']}
          aria-expanded={state.open}
          id={props.id}
          disabled={state.disabled}
          value={state.query}
          className={cn(className)}
          onChange={onChange}
          onClick={(event) => {
            onClick?.(event)
            if (!event.defaultPrevented) state.setOpen(true)
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (event.defaultPrevented) return
            if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !state.open) state.setOpen(true)
            else if (event.key === 'Escape' && state.open) {
              event.preventDefault()
              state.setOpen(false)
            } else if (event.key === 'Backspace' && state.multiple && !state.query && state.values.length)
              state.remove(state.values.at(-1)!)
            else if (event.key === 'Tab') state.setOpen(false)
          }}
          />
        </CommandPrimitive.Input>
        <ChevronDownIcon aria-hidden="true" data-slot="combobox-chevron" />
      </div>
    </PopoverPrimitive.Anchor>
  )
}

/** The popup holding ComboboxList and ComboboxEmpty. */
export function ComboboxContent({ className, align = 'start', sideOffset = 6, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const state = useCombobox('ComboboxContent')
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="combobox-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(className)}
        // Focus stays in the field while the list is open.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (state.fieldRef.current?.contains(event.target as Node)) event.preventDefault()
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export function ComboboxList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List data-slot="combobox-list" className={cn(className)} {...props} />
}

export function ComboboxGroup({ className, heading, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="combobox-group"
      heading={heading === undefined ? undefined : <span data-slot="combobox-group-heading">{heading}</span>}
      className={cn(className)}
      {...props}
    />
  )
}

export type ComboboxItemProps = Omit<React.ComponentProps<typeof CommandPrimitive.Item>, 'value' | 'onSelect'> & {
  value: string
}

/** One option. Its text is matched against the query and the match is marked. */
export function ComboboxItem({ className, value, children, ...props }: ComboboxItemProps) {
  const state = useCombobox('ComboboxItem')
  const selected = state.values.includes(value)
  return (
    <CommandPrimitive.Item asChild value={value} keywords={[textOf(children)]} onSelect={() => state.select(value)} {...props}>
      {/* aria-selected tells whether the option is chosen; cmdk would set it for the highlight,
          which data-selected already shows. */}
      <div data-slot="combobox-item" aria-selected={selected} data-checked={selected || undefined} className={cn(className)}>
        {typeof children === 'string' ? highlightMatch(children, state.query) : children}
        {selected && <CheckIcon aria-hidden="true" data-slot="combobox-item-indicator" />}
      </div>
    </CommandPrimitive.Item>
  )
}

/** Offers to create the typed name when no option has it. Needs onCreate on Combobox. */
export function ComboboxCreate({ className, ...props }: Omit<React.ComponentProps<typeof CommandPrimitive.Item>, 'value' | 'onSelect' | 'children'>) {
  const state = useCombobox('ComboboxCreate')
  if (!state.create || !shouldOfferCreate(state.query, [...state.labels.values()])) return null
  const name = state.query.trim()
  return (
    <CommandPrimitive.Item
      data-slot="combobox-create"
      value="__combobox-create__"
      forceMount
      onSelect={() => state.create!(name)}
      className={cn(className)}
      {...props}
    >
      <PlusIcon aria-hidden="true" />
      {`Create “${name}”`}
    </CommandPrimitive.Item>
  )
}

/**
 * Shown when no option matches, in a polite live region that is always present so the change
 * is announced. Place it after ComboboxList, inside ComboboxContent.
 */
export function ComboboxEmpty({ className, children, ...props }: React.ComponentProps<'div'>) {
  const none = useCommandState(state => state.filtered.count === 0)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const empty = mounted && none
  return (
    <div role="status" aria-live="polite" {...props} data-slot="combobox-empty" data-empty={empty || undefined} className={cn(className)}>
      {empty ? children : null}
    </div>
  )
}
