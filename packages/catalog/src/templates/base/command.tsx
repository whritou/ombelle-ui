'use client'
import * as React from 'react'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { SearchIcon } from 'lucide-react'
import { cn } from './utils.js'
import './command.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}

type SearchState = { search: string; query: string; label: string; inDialog: boolean; count: number }
const SearchContext = React.createContext<SearchState>({ search: '', query: '', label: 'Commands', inDialog: false, count: 0 })
const DialogContext = React.createContext(false)

/** The visible text of an item, without its shortcut. */
function textOf(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type !== CommandShortcut) return textOf(child.props.children)
    return ''
  }).join('').trim()
}

type Entry = { text: string; keywords: readonly string[] }
const entryOf = (props: CommandItemProps): Entry => ({ text: props.value ?? textOf(props.children), keywords: props.keywords ?? [] })
const matches = (query: string, entry: Entry) =>
  !query || [entry.text, ...entry.keywords].some(text => text.toLowerCase().includes(query))

/**
 * The items written as elements below `children`. Base UI filters a list of values; this edition
 * filters the elements themselves so the parts match the Radix edition. Items that your own
 * component renders still hide themselves, but do not count for groups or the empty text.
 */
function entriesIn(children: React.ReactNode): Entry[] {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return []
    if (child.type === CommandItem) return [entryOf(child.props as CommandItemProps)]
    return entriesIn(child.props.children)
  })
}

export type CommandProps = React.ComponentProps<'div'> & {
  /** The search box's name; default "Commands". */
  label?: string
  /** Set false when the items are already filtered, for example by a server. */
  filter?: boolean
  /** The search text on the first render. */
  defaultSearch?: string
}

/** A keyboard-first command menu: a search box over a filtered list of commands. */
export function Command({ className, filter = true, defaultSearch = '', label = 'Commands', children, ...props }: CommandProps) {
  const [search, setSearch] = React.useState(defaultSearch)
  const inDialog = React.useContext(DialogContext)
  const query = filter ? search.trim().toLowerCase() : ''
  const count = entriesIn(children).filter(entry => matches(query, entry)).length
  return (
    <SearchContext.Provider value={{ search, query, label, inDialog, count }}>
      <Autocomplete.Root
        inline
        open
        filter={null}
        autoHighlight
        value={search}
        onValueChange={(value, details) => {
          // Choosing a command runs it; only typing changes the search.
          if (details.reason !== 'item-press') setSearch(value)
        }}
      >
        <div {...props} data-slot="command" className={cn(className)}>{children}</div>
      </Autocomplete.Root>
    </SearchContext.Provider>
  )
}

export type CommandDialogProps = React.ComponentProps<typeof DialogPrimitive.Root> & {
  /** The dialog's name for assistive technology; it is not shown. */
  title?: string
  className?: string
}

/** Command inside a modal dialog. Open it from your own shortcut, such as Ctrl+K. */
export function CommandDialog({ title = 'Command menu', className, children, ...props }: CommandDialogProps) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop data-slot="command-dialog-overlay" />
        <DialogPrimitive.Popup data-slot="command-dialog" className={cn(className)}>
          <DialogPrimitive.Title data-slot="command-dialog-title">{title}</DialogPrimitive.Title>
          <DialogContext.Provider value={true}>{children as React.ReactNode}</DialogContext.Provider>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function CommandInput({ className, ...props }: Omit<Part<typeof Autocomplete.Input>, 'value' | 'defaultValue'>) {
  const { label, inDialog } = React.useContext(SearchContext)
  return (
    <div data-slot="command-search">
      <SearchIcon aria-hidden="true" />
      <Autocomplete.Input data-slot="command-input" aria-label={label} className={cn(className)} {...props} />
      {inDialog && <kbd aria-hidden="true">Esc</kbd>}
    </div>
  )
}

export function CommandList({ className, ...props }: Part<typeof Autocomplete.List>) {
  return <Autocomplete.List data-slot="command-list" className={cn(className)} {...props} />
}

export type CommandGroupProps = Omit<Part<typeof Autocomplete.Group>, 'children'> & {
  heading?: React.ReactNode
  children?: React.ReactNode
}

/** A named group of commands. It hides itself when none of its commands match. */
export function CommandGroup({ className, heading, children, ...props }: CommandGroupProps) {
  const { query } = React.useContext(SearchContext)
  if (!entriesIn(children).some(entry => matches(query, entry))) return null
  return (
    <Autocomplete.Group data-slot="command-group" className={cn(className)} {...props}>
      {heading !== undefined && (
        <Autocomplete.GroupLabel>
          <span data-slot="command-group-heading">{heading}</span>
        </Autocomplete.GroupLabel>
      )}
      {children}
    </Autocomplete.Group>
  )
}

export type CommandItemProps = Omit<Part<typeof Autocomplete.Item>, 'value' | 'onSelect'> & {
  /** The text the search matches; default the item's text. */
  value?: string
  keywords?: string[]
  disabled?: boolean
  onSelect?(value: string): void
}

/** One command. onSelect runs on Enter or click; the search matches its text and keywords. */
export function CommandItem({ className, value, keywords, onSelect, onClick, children, ...props }: CommandItemProps) {
  const { query } = React.useContext(SearchContext)
  const entry = entryOf({ value, keywords, children })
  if (!matches(query, entry)) return null
  return (
    <Autocomplete.Item
      data-slot="command-item"
      value={entry.text}
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onSelect?.(entry.text)
      }}
      {...props}
    >
      {children}
    </Autocomplete.Item>
  )
}

/** Key hints such as "Ctrl+T", shown as one key per part. */
export function CommandShortcut({ className, children, ...props }: React.ComponentProps<'span'>) {
  const keys = typeof children === 'string' ? children.split('+').filter(Boolean) : null
  return (
    <span {...props} data-slot="command-shortcut" className={cn(className)}>
      {keys ? keys.map((key, index) => <kbd key={index}>{key}</kbd>) : children}
    </span>
  )
}

/** Separates groups; hidden while searching, as in the Radix edition. */
export function CommandSeparator({ className, ...props }: Part<typeof Autocomplete.Separator>) {
  const { query } = React.useContext(SearchContext)
  if (query) return null
  return <Autocomplete.Separator data-slot="command-separator" className={cn(className)} {...props} />
}

/**
 * Shown when nothing matches, in a polite live region that is always present so the change is
 * announced. Place it after CommandList, not inside it.
 */
export function CommandEmpty({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { count } = React.useContext(SearchContext)
  return (
    <div role="status" aria-live="polite" {...props} data-slot="command-empty" data-empty={count === 0 || undefined} className={cn(className)}>
      {count === 0 ? children : null}
    </div>
  )
}
