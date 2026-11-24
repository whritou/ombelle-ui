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

/**
 * The component an element renders. Parts written in a Server Component, such as a Next.js
 * App Router page, reach this client file as lazy client references rather than as the
 * components, so `element.type` is resolved before it is compared.
 */
function partType(element: React.ReactElement): unknown {
  const type = element.type as unknown as { $$typeof?: symbol; _init?: (payload: unknown) => unknown; _payload?: unknown } | null
  if (typeof type === 'object' && type !== null && type.$$typeof === Symbol.for('react.lazy') && typeof type._init === 'function') {
    try { return type._init(type._payload) } catch { return undefined }
  }
  return element.type
}

type Scan = { labels: Map<string, string>; create: boolean }
/**
 * The options written as elements below `children`, in order, and whether a create row is
 * present, so the field knows them before the list opens and on the server.
 */
function scan(children: React.ReactNode, found: Scan = { labels: new Map(), create: false }): Scan {
  React.Children.forEach(children, child => {
    if (!React.isValidElement<{ children?: React.ReactNode; value?: string }>(child)) return
    if (partType(child) === ComboboxItem) found.labels.set(child.props.value!, textOf(child.props.children))
    else if (partType(child) === ComboboxCreate) found.create = true
    else scan(child.props.children, found)
  })
  return found
}
/** Sets every ref it is given. */
function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (element: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(element)
      else if (ref) (ref as React.RefObject<T | null>).current = element
    }
  }
}

/** Runs the caller's handler, then the part's own unless the caller prevented it. */
function compose<E extends { defaultPrevented: boolean }>(theirs: ((event: E) => void) | undefined, ours: (event: E) => void) {
  return (event: E) => {
    theirs?.(event)
    if (!event.defaultPrevented) ours(event)
  }
}

/** Calls onReset when the form that holds the element is reset. */
function useFormReset(ref: React.RefObject<HTMLElement | null>, onReset: () => void) {
  const latest = React.useRef(onReset)
  React.useEffect(() => { latest.current = onReset })
  React.useEffect(() => {
    const form = ref.current?.closest('form')
    if (!form) return
    const reset = () => latest.current()
    form.addEventListener('reset', reset)
    return () => form.removeEventListener('reset', reset)
  }, [ref])
}

/** Hidden from view and from assistive technology, but still validated by the form. */
const validationOnly: React.CSSProperties = { position: 'absolute', inlineSize: 1, blockSize: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0, opacity: 0, pointerEvents: 'none' }

const matches = (query: string, label: string) => !query.trim() || label.toLowerCase().includes(query.trim().toLowerCase())
const CREATE = '__combobox-create__'

type ComboboxState = {
  multiple: boolean
  values: string[]
  labels: Map<string, string>
  query: string
  /** The field's text: the query while the person types, else the chosen option's label. */
  text: string
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
  required: boolean
  setInputRequired(required: boolean): void
  strings: Required<ComboboxLabels>
  inputRef: React.RefObject<HTMLInputElement | null>
  fieldRef: React.RefObject<HTMLDivElement | null>
}
const ComboboxContext = React.createContext<ComboboxState | null>(null)

function useCombobox(part: string): ComboboxState {
  const state = React.useContext(ComboboxContext)
  if (!state) throw new Error(`${part} must be used inside <Combobox>`)
  return state
}

/** The words the combobox shows or speaks; each has an English default. */
export type ComboboxLabels = {
  /** Names the list of chips in multiple mode; default "Selected". */
  selected?: string
  /** Names a chip's remove button; default "Remove <label>". */
  remove?(label: string): string
  /** The create row's text; default “Create "<query>"”. */
  create?(query: string): string
}
const defaultLabels: Required<ComboboxLabels> = {
  selected: 'Selected',
  remove: label => `Remove ${label}`,
  create: query => `Create “${query}”`,
}

type Common = {
  disabled?: boolean
  /**
   * A value must be chosen before the form submits; typed text that matches no option does not count.
   * A required ComboboxInput, for example inside a required Field, sets it too.
   */
  required?: boolean
  labels?: ComboboxLabels
  /** Submits each value as a hidden input with this name. */
  name?: string
  /**
   * Called with the trimmed query when the person chooses ComboboxCreate. Without it, the typed
   * name becomes the value.
   */
  onCreate?(query: string): void
  /** The search text on the first render. */
  defaultQuery?: string
  /** sm, default or lg on the shared size scale; default follows the density's control height. */
  size?: 'sm' | 'default' | 'lg'
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
  const { disabled = false, required = false, labels: strings, name, onCreate, defaultQuery, size = 'default', className, children } = props
  const multiple = props.multiple === true
  const { labels, create: hasCreate } = scan(children)
  // The value a form reset returns to: the default on the first render, as for a native field.
  const [initial] = React.useState<string | string[]>(() => props.defaultValue ?? (multiple ? [] : ''))
  const [own, setOwn] = React.useState<string | string[]>(initial)
  const [inputRequired, setInputRequired] = React.useState(false)
  const current = props.value ?? own
  const values = Array.isArray(current) ? current : current ? [current] : []
  const [query, setQueryState] = React.useState(defaultQuery ?? (!multiple && values[0] ? labels.get(values[0]) ?? values[0] : ''))
  const [open, setOpenState] = React.useState(false)
  // Opening shows every option; typing filters them. A starting query filters at once.
  const [typing, setTyping] = React.useState(defaultQuery !== undefined)
  const search = typing ? query : ''
  const setOpen = (next: boolean) => {
    // Opening shows every option; closing a single combobox without a choice shows its value again.
    if ((next && !open) || (!next && !multiple)) setTyping(false)
    setOpenState(next)
  }
  const [picked, setHighlight] = React.useState<string>()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const fieldRef = React.useRef<HTMLDivElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const baseId = React.useId()
  const order = [...labels.keys()]
  const visible = [
    ...order.filter(value => matches(search, labels.get(value)!)),
    ...(hasCreate && shouldOfferCreate(search, [...labels.values()]) ? [CREATE] : []),
  ]
  // The first option is highlighted until the person moves, as in a native list.
  // The current value is highlighted until the person types or moves, so Enter keeps it.
  const resting = !typing && !multiple && values[0] !== undefined && visible.includes(values[0]) ? values[0] : visible[0]
  const highlight = picked !== undefined && visible.includes(picked) ? picked : resting
  const text = typing ? query : multiple || values[0] === undefined ? '' : labels.get(values[0]) ?? values[0]
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
  // A form reset returns to the default value and its text, as it does for the native fields beside it.
  useFormReset(rootRef, () => {
    const start = Array.isArray(initial) ? initial : initial ? [initial] : []
    if (start.join('\n') !== values.join('\n')) commit(start)
    setQueryState(defaultQuery ?? (!multiple && start[0] ? labels.get(start[0]) ?? start[0] : ''))
    setTyping(defaultQuery !== undefined)
    setHighlight(undefined)
    setOpenState(false)
  })
  const isRequired = required || inputRequired
  const state: ComboboxState = {
    multiple, values, labels, query, text, search, setQuery, open, setOpen, visible, highlight, setHighlight, disabled, inputRef, fieldRef,
    required: isRequired, setInputRequired, strings: { ...defaultLabels, ...strings },
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
      <div ref={rootRef} data-slot="combobox" data-size={size !== 'default' ? size : undefined} data-disabled={disabled || undefined} className={cn(className)}>
        <PopoverPrimitive.Root open={open && !disabled} onOpenChange={setOpen}>{children}</PopoverPrimitive.Root>
        {name && values.map(value => <input key={value} type="hidden" name={name} value={value} />)}
        {/* Hidden inputs take no part in validation: this one carries the chosen value, and sends focus to the field. */}
        {isRequired && (
          <input aria-hidden="true" tabIndex={-1} required disabled={disabled} value={values.join(',')} onChange={() => {}}
            onFocus={() => inputRef.current?.focus()} style={validationOnly} />
        )}
      </div>
    </ComboboxContext.Provider>
  )
}

/** The chosen options of a multiple combobox; ComboboxInput shows them for you. */
export function ComboboxChips({ className, ...props }: React.ComponentProps<'ul'>) {
  const { values, labels, remove, disabled, strings } = useCombobox('ComboboxChips')
  if (!values.length) return null
  return (
    <ul aria-label={strings.selected} {...props} data-slot="combobox-chips" className={cn(className)}>
      {values.map(value => {
        const label = labels.get(value) ?? value
        return (
          <li key={value} data-slot="combobox-chip">
            <span>{label}</span>
            <button type="button" aria-label={strings.remove(label)} disabled={disabled} data-slot="combobox-chip-remove" onClick={() => remove(value)}>
              <XIcon aria-hidden="true" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** The text field. It takes the label and description, for example from FieldControl. */
export function ComboboxInput({ className, onKeyDown, onClick, onChange, ref, required, ...props }: Omit<React.ComponentProps<'input'>, 'value'>) {
  const state = useCombobox('ComboboxInput')
  // Any typed text would satisfy required on the text field, so the combobox validates the chosen value instead.
  const { setInputRequired } = state
  React.useEffect(() => { setInputRequired(!!required) }, [required, setInputRequired])
  const setRef = React.useMemo(() => mergeRefs(state.inputRef, ref), [state.inputRef, ref])
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
          aria-required={state.required || undefined}
          {...props}
          ref={setRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? state.listId : undefined}
          aria-activedescendant={expanded && state.highlight !== undefined ? state.optionId(state.highlight) : undefined}
          data-slot="combobox-input"
          disabled={state.disabled}
          value={state.text}
          className={cn(className)}
          onChange={(event) => {
            onChange?.(event)
            // Open first: opening resets the typing flag, and the query must set it after that,
            // or the first character typed into a closed field is lost.
            state.setOpen(true)
            state.setQuery(event.target.value)
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
            } else if (event.key === 'Backspace' && state.multiple && !state.text && state.values.length) {
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
export function ComboboxContent({ className, align = 'start', sideOffset = 6, onOpenAutoFocus, onCloseAutoFocus, onInteractOutside, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const state = useCombobox('ComboboxContent')
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        // The listbox inside is the popup; focus never enters this wrapper, so it is not a dialog.
        role="presentation"
        align={align}
        sideOffset={sideOffset}
        className={cn(className)}
        {...props}
        // Focus stays in the field while the list is open; a caller's handlers run first.
        onOpenAutoFocus={(event) => { onOpenAutoFocus?.(event); event.preventDefault() }}
        onCloseAutoFocus={(event) => { onCloseAutoFocus?.(event); event.preventDefault() }}
        onInteractOutside={(event) => {
          onInteractOutside?.(event)
          if (state.fieldRef.current?.contains(event.target as Node)) event.preventDefault()
        }}
        data-slot="combobox-content"
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
function Option({ optionKey, className, children, checked, ref: callerRef, onMouseDown, onMouseMove, onClick, ...props }: React.ComponentProps<'div'> & {
  optionKey: string
  checked?: boolean
  'data-slot': string
}) {
  const state = useCombobox('ComboboxItem')
  const ref = React.useRef<HTMLDivElement>(null)
  const setRef = React.useMemo(() => mergeRefs(ref, callerRef), [callerRef])
  const highlighted = state.highlight === optionKey
  React.useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView?.({ block: 'nearest' })
  }, [highlighted])
  return (
    <div
      ref={setRef}
      role="option"
      id={state.optionId(optionKey)}
      aria-selected={highlighted}
      aria-checked={state.multiple ? checked : undefined}
      data-highlighted={highlighted || undefined}
      data-checked={checked || undefined}
      {...props}
      className={cn(className)}
      // Keep focus in the field while choosing with the pointer. A caller's handlers run first.
      onMouseDown={(event) => { onMouseDown?.(event); event.preventDefault() }}
      onMouseMove={compose(onMouseMove, () => { if (!highlighted) state.setHighlight(optionKey) })}
      onClick={compose(onClick, () => state.choose(optionKey))}
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
    <Option optionKey={value} checked={checked} {...props} data-slot="combobox-item">
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
    <Option optionKey={CREATE} {...props} data-slot="combobox-create">
      <PlusIcon aria-hidden="true" />
      {state.strings.create(state.query.trim())}
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
