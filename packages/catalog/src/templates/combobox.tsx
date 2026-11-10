'use client'
import * as React from 'react'
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

type Scan = { labels: Map<string, string>; create: boolean }
/**
 * The options written as elements below `children`, in order, and whether a create row is
 * present, so the field knows them before the list opens and on the server.
 */
function scan(children: React.ReactNode, found: Scan = { labels: new Map(), create: false }): Scan {
  React.Children.forEach(children, child => {
    if (!React.isValidElement<{ children?: React.ReactNode; value?: string }>(child)) return
    if (child.type === ComboboxItem) found.labels.set(child.props.value!, textOf(child.props.children))
    else if (child.type === ComboboxCreate) found.create = true
    else scan(child.props.children, found)
  })
  return found
}
const matches = (query: string, label: string) => !query.trim() || label.toLowerCase().includes(query.trim().toLowerCase())
const CREATE = '__combobox-create__'

type ComboboxState = {
  multiple: boolean
  values: string[]
  labels: Map<string, string>
  query: string
  /** The text the options are filtered by: the query once the person types, else nothing. */
  search: string
  setQuery(query: string): void
  open: boolean
  setOpen(open: boolean): void
  /** The options that match the query, in order, then the create row when it is offered. */
  visible: string[]
  highlight: string | undefined
  setHighlight(key: string): void
  optionId(key: string): string
  listId: string
  choose(key: string): void
  remove(value: string): void
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
  /**
   * Called with the trimmed query when the person chooses ComboboxCreate. Without it, the typed
   * name becomes the value.
   */
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
  const { labels, create: hasCreate } = scan(children)
  const [own, setOwn] = React.useState<string | string[]>(props.defaultValue ?? (multiple ? [] : ''))
  const current = props.value ?? own
  const values = Array.isArray(current) ? current : current ? [current] : []
  const [query, setQueryState] = React.useState(defaultQuery ?? (!multiple && values[0] ? labels.get(values[0]) ?? values[0] : ''))
  const [open, setOpenState] = React.useState(false)
  // Opening shows every option; typing filters them. A starting query filters at once.
  const [typing, setTyping] = React.useState(defaultQuery !== undefined)
  const search = typing ? query : ''
  const setOpen = (next: boolean) => {
    if (next && !open) setTyping(false)
    setOpenState(next)
  }
  const [picked, setHighlight] = React.useState<string>()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const fieldRef = React.useRef<HTMLDivElement>(null)
  const baseId = React.useId()
  const order = [...labels.keys()]
  const visible = [
    ...order.filter(value => matches(search, labels.get(value)!)),
    ...(hasCreate && shouldOfferCreate(search, [...labels.values()]) ? [CREATE] : []),
  ]
  // The first option is highlighted until the person moves, as in a native list.
  const highlight = picked !== undefined && visible.includes(picked) ? picked : visible[0]
  const setQuery = (next: string) => {
    setQueryState(next)
    setTyping(true)
    setHighlight(undefined)
  }
  const commit = (next: string[]) => {
    const value = multiple ? next : next[0] ?? ''
    if (props.value === undefined) setOwn(value)
    ;(props.onValueChange as ((value: string | string[]) => void) | undefined)?.(value)
  }
  const finish = (text: string) => {
    setQueryState(multiple ? '' : text)
    setTyping(false)
    setHighlight(undefined)
    if (!multiple) setOpen(false)
  }
  const state: ComboboxState = {
    multiple, values, labels, query, search, setQuery, open, setOpen, visible, highlight, setHighlight, disabled, inputRef, fieldRef,
    listId: baseId + '-list',
    optionId: (key) => key === CREATE ? baseId + '-create' : `${baseId}-option-${order.indexOf(key)}`,
    choose(key) {
      if (key === CREATE) {
        const text = query.trim()
        // Without onCreate, the typed name itself becomes a value.
        if (onCreate) onCreate(text)
        else commit(multiple ? (values.includes(text) ? values : [...values, text]) : [text])
        finish(text)
      } else if (multiple) {
        commit(values.includes(key) ? values.filter(item => item !== key) : [...values, key])
        finish('')
      } else {
        commit([key])
        finish(labels.get(key) ?? key)
      }
    },
    remove(value) {
      commit(values.filter(item => item !== value))
      inputRef.current?.focus()
    },
  }
  return (
    <ComboboxContext.Provider value={state}>
      <div data-slot="combobox" data-disabled={disabled || undefined} className={cn(className)}>
        <PopoverPrimitive.Root open={open && !disabled} onOpenChange={setOpen}>{children}</PopoverPrimitive.Root>
        {name && values.map(value => <input key={value} type="hidden" name={name} value={value} />)}
      </div>
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
  const move = (step: number) => {
    const at = state.highlight === undefined ? -1 : state.visible.indexOf(state.highlight)
    const next = state.visible[Math.min(Math.max(at + step, 0), state.visible.length - 1)]
    if (next !== undefined) state.setHighlight(next)
  }
  const expanded = state.open && !state.disabled
  return (
    <PopoverPrimitive.Anchor asChild>
      <div ref={state.fieldRef} data-slot="combobox-field" data-disabled={state.disabled || undefined} onClick={(event) => {
        if (event.target === event.currentTarget) state.inputRef.current?.focus()
      }}>
        {state.multiple && <ComboboxChips />}
        <input
          type="text"
          autoComplete="off"
          {...props}
          ref={state.inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? state.listId : undefined}
          aria-activedescendant={expanded && state.highlight !== undefined ? state.optionId(state.highlight) : undefined}
          data-slot="combobox-input"
          disabled={state.disabled}
          value={state.query}
          className={cn(className)}
          onChange={(event) => {
            onChange?.(event)
            state.setQuery(event.target.value)
            state.setOpen(true)
          }}
          onClick={(event) => {
            onClick?.(event)
            if (!event.defaultPrevented) state.setOpen(true)
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (event.defaultPrevented || event.nativeEvent.isComposing) return
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              if (!state.open) state.setOpen(true)
              else move(event.key === 'ArrowDown' ? 1 : -1)
            } else if (event.key === 'Enter' && state.open && state.highlight !== undefined) {
              event.preventDefault()
              state.choose(state.highlight)
            } else if (event.key === 'Escape' && state.open) {
              event.preventDefault()
              state.setOpen(false)
            } else if (event.key === 'Backspace' && state.multiple && !state.query && state.values.length) {
              event.preventDefault()
              state.remove(state.values.at(-1)!)
            } else if (event.key === 'Tab') state.setOpen(false)
          }}
        />
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

export function ComboboxList({ className, ...props }: React.ComponentProps<'div'>) {
  const state = useCombobox('ComboboxList')
  return (
    <div
      role="listbox"
      id={state.listId}
      aria-multiselectable={state.multiple || undefined}
      {...props}
      data-slot="combobox-list"
      className={cn(className)}
    />
  )
}

export type ComboboxGroupProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  heading?: React.ReactNode
  children?: React.ReactNode
}

/** A named group of options. It hides itself when none of its options match. */
export function ComboboxGroup({ className, heading, children, ...props }: ComboboxGroupProps) {
  const state = useCombobox('ComboboxGroup')
  const headingId = React.useId()
  if (![...scan(children).labels.values()].some(label => matches(state.search, label))) return null
  return (
    <div role="group" aria-labelledby={heading === undefined ? undefined : headingId} {...props} data-slot="combobox-group" className={cn(className)}>
      {heading !== undefined && <div id={headingId}><span data-slot="combobox-group-heading">{heading}</span></div>}
      {children}
    </div>
  )
}

/** Shared option markup for items and the create row. */
function Option({ optionKey, className, children, checked, ...props }: React.ComponentProps<'div'> & {
  optionKey: string
  checked?: boolean
  'data-slot': string
}) {
  const state = useCombobox('ComboboxItem')
  const ref = React.useRef<HTMLDivElement>(null)
  const highlighted = state.highlight === optionKey
  React.useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView?.({ block: 'nearest' })
  }, [highlighted])
  return (
    <div
      ref={ref}
      role="option"
      id={state.optionId(optionKey)}
      aria-selected={highlighted}
      aria-checked={state.multiple ? checked : undefined}
      data-highlighted={highlighted || undefined}
      data-checked={checked || undefined}
      {...props}
      className={cn(className)}
      // Keep focus in the field while choosing with the pointer.
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={() => { if (!highlighted) state.setHighlight(optionKey) }}
      onClick={() => state.choose(optionKey)}
    >
      {children}
    </div>
  )
}

export type ComboboxItemProps = Omit<React.ComponentProps<'div'>, 'onSelect'> & { value: string }

/** One option. Its text is matched against the query and the match is marked. */
export function ComboboxItem({ value, children, ...props }: ComboboxItemProps) {
  const state = useCombobox('ComboboxItem')
  if (!matches(state.search, textOf(children))) return null
  const checked = state.values.includes(value)
  return (
    <Option optionKey={value} data-slot="combobox-item" checked={checked} {...props}>
      {/* One span, so the option's flex layout keeps the mark inline and the name whole. */}
      {typeof children === 'string' ? <span>{highlightMatch(children, state.search)}</span> : children}
      {checked && <CheckIcon aria-hidden="true" data-slot="combobox-item-indicator" />}
    </Option>
  )
}

/** Offers the typed name when no option has it; see onCreate on Combobox. */
export function ComboboxCreate(props: Omit<React.ComponentProps<'div'>, 'children'>) {
  const state = useCombobox('ComboboxCreate')
  if (!state.visible.includes(CREATE)) return null
  return (
    <Option optionKey={CREATE} data-slot="combobox-create" {...props}>
      <PlusIcon aria-hidden="true" />
      {`Create “${state.query.trim()}”`}
    </Option>
  )
}

/**
 * Shown when no option matches, in a polite live region that is always present so the change
 * is announced. Place it after ComboboxList, inside ComboboxContent.
 */
export function ComboboxEmpty({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { labels, search } = useCombobox('ComboboxEmpty')
  const empty = ![...labels.values()].some(label => matches(search, label))
  return (
    <div role="status" aria-live="polite" {...props} data-slot="combobox-empty" data-empty={empty || undefined} className={cn(className)}>
      {empty ? children : null}
    </div>
  )
}
