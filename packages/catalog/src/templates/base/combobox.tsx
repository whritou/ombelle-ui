'use client'
import * as React from 'react'
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { CheckIcon, ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './combobox.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's data-open/data-closed, so the
// shared stylesheet applies.
const openState = (open: boolean) => (open ? 'open' : 'closed')

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
 * The items written as elements below `children`. Base UI filters a list of values; this edition
 * filters the elements themselves so the parts match the Radix edition.
 */
function labelsIn(children: React.ReactNode, labels = new Map<string, string>()): Map<string, string> {
  return scan(children, { labels, create: false }).labels
}
type Scan = { labels: Map<string, string>; create: boolean }
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
  disabled: boolean
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
  const [query, setQuery] = React.useState(defaultQuery ?? (!multiple && values[0] ? labels.get(values[0]) ?? values[0] : ''))
  const fieldRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)
  const commit = (next: string[]) => {
    const value = multiple ? next : next[0] ?? ''
    if (props.value === undefined) setOwn(value)
    ;(props.onValueChange as ((value: string | string[]) => void) | undefined)?.(value)
  }
  const create = (text: string) => {
    const name = text.trim()
    // Without onCreate, the typed name itself becomes a value.
    if (onCreate) onCreate(name)
    else commit(multiple ? (values.includes(name) ? values : [...values, name]) : [name])
    setQuery(multiple ? '' : name)
  }
  return (
    <ComboboxContext.Provider value={{ multiple, values, labels, query, disabled, fieldRef }}>
      <div data-slot="combobox" data-disabled={disabled || undefined} className={cn(className)}>
        <ComboboxPrimitive.Root
          multiple={multiple}
          disabled={disabled}
          // Base UI navigates the list it is given: the options that match, in the order they
          // render, then the create row when it is offered.
          items={[
            ...[...labels].filter(([, label]) => matches(query, label)).map(([value]) => value),
            ...(hasCreate && shouldOfferCreate(query, [...labels.values()]) ? [CREATE] : []),
          ]}
          filter={null}
          autoHighlight
          value={(multiple ? values : values[0] ?? null) as never}
          onValueChange={(next: unknown) => {
            const list = Array.isArray(next) ? next as string[] : next ? [next as string] : []
            // The create row is an option to Base UI; choosing it creates instead of selecting.
            if (list.includes(CREATE)) create(query)
            else commit(list)
          }}
          inputValue={query}
          onInputValueChange={(text) => setQuery(text)}
          open={open}
          onOpenChange={(next, details) => {
            // A multiple combobox stays open while the person picks several options.
            if (!next && multiple && details.reason === 'item-press') return
            setOpen(next)
          }}
          itemToStringLabel={(value: string) => value === CREATE ? query.trim() : labels.get(value) ?? value}
        >
          {children}
        </ComboboxPrimitive.Root>
        {name && values.map(value => <input key={value} type="hidden" name={name} value={value} />)}
      </div>
    </ComboboxContext.Provider>
  )
}

/** The chosen options of a multiple combobox; ComboboxInput shows them for you. */
export function ComboboxChips({ className, ...props }: React.ComponentProps<'ul'>) {
  const { values, labels, disabled } = useCombobox('ComboboxChips')
  if (!values.length) return null
  return (
    <ul aria-label="Selected" {...props} data-slot="combobox-chips" className={cn(className)}>
      {values.map(value => {
        const label = labels.get(value) ?? value
        return (
          <ComboboxPrimitive.Chip key={value} data-slot="combobox-chip" render={<li />}>
            <span>{label}</span>
            <ComboboxPrimitive.ChipRemove aria-label={`Remove ${label}`} disabled={disabled} data-slot="combobox-chip-remove">
              <XIcon aria-hidden="true" />
            </ComboboxPrimitive.ChipRemove>
          </ComboboxPrimitive.Chip>
        )
      })}
    </ul>
  )
}

/** The text field. It takes the label and description, for example from FieldControl. */
export function ComboboxInput({ className, ...props }: Omit<Part<typeof ComboboxPrimitive.Input>, 'value' | 'defaultValue'>) {
  const state = useCombobox('ComboboxInput')
  const input = <ComboboxPrimitive.Input data-slot="combobox-input" className={cn(className)} {...props} />
  const chevron = <ChevronDownIcon aria-hidden="true" data-slot="combobox-chevron" />
  if (state.multiple)
    return (
      <ComboboxPrimitive.Chips ref={state.fieldRef} data-slot="combobox-field" data-disabled={state.disabled || undefined}>
        <ComboboxChips />
        {input}
        {chevron}
      </ComboboxPrimitive.Chips>
    )
  return (
    <div ref={state.fieldRef} data-slot="combobox-field" data-disabled={state.disabled || undefined}>
      {input}
      {chevron}
    </div>
  )
}

type PositionerProps = React.ComponentProps<typeof ComboboxPrimitive.Positioner>
export type ComboboxContentProps = Part<typeof ComboboxPrimitive.Popup> &
  Pick<PositionerProps, 'side' | 'sideOffset' | 'align' | 'alignOffset' | 'collisionPadding'>

/** The popup holding ComboboxList and ComboboxEmpty. */
export function ComboboxContent({ className, style, side = 'bottom', align = 'start', sideOffset = 6, alignOffset, collisionPadding, ...props }: ComboboxContentProps) {
  const { fieldRef } = useCombobox('ComboboxContent')
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner anchor={fieldRef} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} collisionPadding={collisionPadding}>
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(className)}
          // The shared stylesheet reads Radix's popover size variables.
          style={{
            '--radix-popover-content-available-height': 'var(--available-height)',
            '--radix-popover-trigger-width': 'var(--anchor-width)',
            ...(style as React.CSSProperties),
          } as React.CSSProperties}
          render={(popupProps, state) => <div {...popupProps} data-state={openState(state.open)} data-side={state.side} data-align={state.align} />}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

export function ComboboxList({ className, ...props }: Part<typeof ComboboxPrimitive.List>) {
  return <ComboboxPrimitive.List data-slot="combobox-list" className={cn(className)} {...props} />
}

export type ComboboxGroupProps = Omit<Part<typeof ComboboxPrimitive.Group>, 'children'> & {
  heading?: React.ReactNode
  children?: React.ReactNode
}

/** A named group of options. It hides itself when none of its options match. */
export function ComboboxGroup({ className, heading, children, ...props }: ComboboxGroupProps) {
  const { query } = useCombobox('ComboboxGroup')
  if (![...labelsIn(children).values()].some(label => matches(query, label))) return null
  return (
    <ComboboxPrimitive.Group data-slot="combobox-group" className={cn(className)} {...props}>
      {heading !== undefined && (
        <ComboboxPrimitive.GroupLabel>
          <span data-slot="combobox-group-heading">{heading}</span>
        </ComboboxPrimitive.GroupLabel>
      )}
      {children}
    </ComboboxPrimitive.Group>
  )
}

export type ComboboxItemProps = Omit<Part<typeof ComboboxPrimitive.Item>, 'value'> & { value: string }

/** One option. Its text is matched against the query and the match is marked. */
export function ComboboxItem({ className, value, children, ...props }: ComboboxItemProps) {
  const state = useCombobox('ComboboxItem')
  if (!matches(state.query, textOf(children))) return null
  const selected = state.values.includes(value)
  return (
    <ComboboxPrimitive.Item data-slot="combobox-item" value={value} data-checked={selected || undefined} className={cn(className)} {...props}>
      {typeof children === 'string' ? highlightMatch(children, state.query) : children}
      {selected && <CheckIcon aria-hidden="true" data-slot="combobox-item-indicator" />}
    </ComboboxPrimitive.Item>
  )
}

/** Offers the typed name when no option has it; see onCreate on Combobox. */
export function ComboboxCreate({ className, ...props }: Omit<Part<typeof ComboboxPrimitive.Item>, 'value' | 'children'>) {
  const state = useCombobox('ComboboxCreate')
  if (!shouldOfferCreate(state.query, [...state.labels.values()])) return null
  return (
    <ComboboxPrimitive.Item data-slot="combobox-create" value={CREATE} className={cn(className)} {...props}>
      <PlusIcon aria-hidden="true" />
      {`Create “${state.query.trim()}”`}
    </ComboboxPrimitive.Item>
  )
}

/**
 * Shown when no option matches, in a polite live region that is always present so the change
 * is announced. Place it after ComboboxList, inside ComboboxContent.
 */
export function ComboboxEmpty({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { labels, query } = useCombobox('ComboboxEmpty')
  const empty = ![...labels.values()].some(label => matches(query, label))
  return (
    <div role="status" aria-live="polite" {...props} data-slot="combobox-empty" data-empty={empty || undefined} className={cn(className)}>
      {empty ? children : null}
    </div>
  )
}
