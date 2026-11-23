'use client'
import * as React from 'react'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { SearchIcon } from 'lucide-react'
import { cn } from './utils.js'
import './command.css'

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

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}

type SearchState = {
  search: string
  query: string
  label: string
  inDialog: boolean
  /** How many commands match, or null while it is not known. */
  count: number | null
  register(id: string, matched: boolean): () => void
}
const SearchContext = React.createContext<SearchState>({ search: '', query: '', label: 'Commands', inDialog: false, count: null, register: () => () => {} })
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect
const DialogContext = React.createContext(false)

/** The visible text of an item, without its shortcut. */
function textOf(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && partType(child) !== CommandShortcut) return textOf(child.props.children)
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
    if (partType(child) === CommandItem) return [entryOf(child.props as CommandItemProps)]
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
  /** The search text, when you keep it yourself; pair it with onSearchChange. */
  search?: string
  /** Called with the new search text as the user types, for example to fetch filtered items. */
  onSearchChange?(search: string): void
}

/** A keyboard-first command menu: a search box over a filtered list of commands. */
export function Command({ className, filter = true, defaultSearch = '', search: searchProp, onSearchChange, label = 'Commands', children, ...props }: CommandProps) {
  const [ownSearch, setOwnSearch] = React.useState(defaultSearch)
  const search = searchProp ?? ownSearch
  const setSearch = (next: string) => {
    if (searchProp === undefined) setOwnSearch(next)
    onSearchChange?.(next)
  }
  const inDialog = React.useContext(DialogContext)
  const query = filter ? search.trim().toLowerCase() : ''
  // Each command registers whether it matches, so commands inside your own components count too.
  // Before that (on the server), the commands written as elements stand in; with none, the count
  // is not known and the list is not called empty.
  const registry = React.useRef(new Map<string, boolean>())
  const [mounted, setMounted] = React.useState(false)
  const [, refresh] = React.useReducer((value: number) => value + 1, 0)
  useIsomorphicLayoutEffect(() => setMounted(true), [])
  const register = React.useCallback((id: string, matched: boolean) => {
    registry.current.set(id, matched)
    refresh()
    return () => {
      registry.current.delete(id)
      refresh()
    }
  }, [])
  const written = entriesIn(children)
  const count = mounted ? [...registry.current.values()].filter(Boolean).length
    : written.length ? written.filter(entry => matches(query, entry)).length : null
  return (
    <SearchContext.Provider value={{ search, query, label, inDialog, count, register }}>
      <Autocomplete.Root
        inline
        open
        filter={null}
        // The first command starts highlighted, as in the Radix edition.
        autoHighlight="always"
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

/** A button that opens the dialog. Place it inside CommandDialog, next to the Command. */
export function CommandDialogTrigger({ className, ...props }: Part<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger className={cn(className)} {...props} data-slot="command-dialog-trigger" />
}

/**
 * Command inside a modal dialog. Open it with CommandDialogTrigger or from your own shortcut,
 * such as Ctrl+K, through open and onOpenChange.
 */
export function CommandDialog({ title = 'Command menu', className, children, ...props }: CommandDialogProps) {
  const all = React.Children.toArray(children as React.ReactNode)
  const triggers = all.filter(child => React.isValidElement(child) && partType(child) === CommandDialogTrigger)
  return (
    <DialogPrimitive.Root {...props}>
      {triggers}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop data-slot="command-dialog-overlay" />
        <DialogPrimitive.Popup data-slot="command-dialog" className={cn(className)}>
          <DialogPrimitive.Title data-slot="command-dialog-title">{title}</DialogPrimitive.Title>
          <DialogContext.Provider value={true}>{all.filter(child => !triggers.includes(child))}</DialogContext.Provider>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function CommandInput({ className, ...props }: Omit<Part<typeof Autocomplete.Input>, 'value' | 'defaultValue'>) {
  const { label, inDialog, count } = React.useContext(SearchContext)
  return (
    <div data-slot="command-search">
      <SearchIcon aria-hidden="true" />
      <Autocomplete.Input
        aria-label={label}
        className={cn(className)}
        // Base UI keeps pointing at the first option after the last match is gone; with no
        // options there is nothing to point at.
        {...(count === 0 && { 'aria-activedescendant': undefined })}
        {...props}
        data-slot="command-input"
      />
      {inDialog && <kbd aria-hidden="true">Esc</kbd>}
    </div>
  )
}

export type CommandListProps = Part<typeof Autocomplete.List> & {
  /** The list box's name; default "Suggestions", as in the Radix edition. */
  label?: string
}

export function CommandList({ className, label = 'Suggestions', ...props }: CommandListProps) {
  return <Autocomplete.List aria-label={label} className={cn(className)} {...props} data-slot="command-list" />
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
    <Autocomplete.Group className={cn(className)} {...props} data-slot="command-group">
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
  const { query, register } = React.useContext(SearchContext)
  const entry = entryOf({ value, keywords, children })
  const matched = matches(query, entry)
  const id = React.useId()
  useIsomorphicLayoutEffect(() => register(id, matched), [id, matched, register])
  if (!matched) return null
  return (
    <Autocomplete.Item
      value={entry.text}
      className={cn(className)}
      // The highlighted command is the selected option, as in the Radix edition.
      render={(itemProps, state) => <div {...itemProps} aria-selected={state.highlighted} />}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onSelect?.(entry.text)
      }}
      {...props}
      data-slot="command-item"
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

/**
 * Separates groups; hidden while searching, as in the Radix edition. It is drawn only: a list
 * box may hold options and groups, not separators.
 */
export function CommandSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  const { query } = React.useContext(SearchContext)
  if (query) return null
  return <div role="none" {...props} data-slot="command-separator" className={cn(className)} />
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
