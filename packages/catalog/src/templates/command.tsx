'use client'
import * as React from 'react'
import { Command as CommandPrimitive, useCommandState } from 'cmdk'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { SearchIcon } from 'lucide-react'
import { cn } from './utils.js'
import './command.css'

// The search text lives here so it can start filled (defaultSearch) and the input can show
// the dialog's Esc hint.
const SearchContext = React.createContext<{ search: string; setSearch(search: string): void; inDialog: boolean }>({
  search: '', setSearch: () => {}, inDialog: false,
})
const DialogContext = React.createContext(false)

/** The visible text of an item, without its shortcut. */
function textOf(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type !== CommandShortcut) return textOf(child.props.children)
    return ''
  }).join('').trim()
}

export type CommandProps = Omit<React.ComponentProps<typeof CommandPrimitive>, 'shouldFilter' | 'filter'> & {
  /** Set false when the items are already filtered, for example by a server. */
  filter?: boolean
  /** The search text on the first render. */
  defaultSearch?: string
}

/** A keyboard-first command menu: a search box over a filtered list of commands. */
export function Command({ className, filter = true, defaultSearch = '', label = 'Commands', ...props }: CommandProps) {
  const [search, setSearch] = React.useState(defaultSearch)
  const inDialog = React.useContext(DialogContext)
  return (
    <SearchContext.Provider value={{ search, setSearch, inDialog }}>
      <CommandPrimitive data-slot="command" label={label} shouldFilter={filter} className={cn(className)} {...props} />
    </SearchContext.Provider>
  )
}

export type CommandDialogProps = React.ComponentProps<typeof DialogPrimitive.Root> & {
  /** The dialog's name for assistive technology; it is not shown. */
  title?: string
  className?: string
}

/** A button that opens the dialog. Place it inside CommandDialog, next to the Command. */
export function CommandDialogTrigger({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="command-dialog-trigger" className={cn(className)} {...props} />
}

/**
 * Command inside a modal dialog. Open it with CommandDialogTrigger or from your own shortcut,
 * such as Ctrl+K, through open and onOpenChange.
 */
export function CommandDialog({ title = 'Command menu', className, children, ...props }: CommandDialogProps) {
  const all = React.Children.toArray(children)
  const triggers = all.filter(child => React.isValidElement(child) && child.type === CommandDialogTrigger)
  // Radix Dialog returns focus only to its own trigger; a dialog opened from a shortcut returns
  // it to whatever had focus before.
  const returnTo = React.useRef<HTMLElement | null>(null)
  return (
    <DialogPrimitive.Root {...props}>
      {triggers}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-slot="command-dialog-overlay" />
        <DialogPrimitive.Content
          data-slot="command-dialog"
          aria-describedby={undefined}
          className={cn(className)}
          onOpenAutoFocus={() => { returnTo.current = document.activeElement as HTMLElement | null }}
          onCloseAutoFocus={(event) => {
            if (triggers.length || !returnTo.current?.isConnected) return
            event.preventDefault()
            returnTo.current.focus()
          }}
        >
          <DialogPrimitive.Title data-slot="command-dialog-title">{title}</DialogPrimitive.Title>
          <DialogContext.Provider value={true}>{all.filter(child => !triggers.includes(child))}</DialogContext.Provider>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function CommandInput({ className, ...props }: Omit<React.ComponentProps<typeof CommandPrimitive.Input>, 'value' | 'onValueChange'>) {
  const { search, setSearch, inDialog } = React.useContext(SearchContext)
  return (
    <div data-slot="command-search">
      <SearchIcon aria-hidden="true" />
      <CommandPrimitive.Input data-slot="command-input" value={search} onValueChange={setSearch} className={cn(className)} {...props} />
      {inDialog && <kbd aria-hidden="true">Esc</kbd>}
    </div>
  )
}

export function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List data-slot="command-list" className={cn(className)} {...props} />
}

export function CommandGroup({ className, heading, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      heading={heading === undefined ? undefined : <span data-slot="command-group-heading">{heading}</span>}
      className={cn(className)}
      {...props}
    />
  )
}

export type CommandItemProps = React.ComponentProps<typeof CommandPrimitive.Item>

/** One command. onSelect runs on Enter or click; the search matches its text and keywords. */
export function CommandItem({ className, value, children, ...props }: CommandItemProps) {
  return (
    <CommandPrimitive.Item data-slot="command-item" value={value ?? textOf(children)} className={cn(className)} {...props}>
      {children}
    </CommandPrimitive.Item>
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

export function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator data-slot="command-separator" className={cn(className)} {...props} />
}

/**
 * Shown when nothing matches, in a polite live region that is always present so the change is
 * announced. Place it after CommandList, not inside it.
 */
export function CommandEmpty({ className, children, ...props }: React.ComponentProps<'div'>) {
  const none = useCommandState(state => state.filtered.count === 0)
  // cmdk counts items once they mount, so the server render would otherwise show the text.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const empty = mounted && none
  return (
    <div role="status" aria-live="polite" {...props} data-slot="command-empty" data-empty={empty || undefined} className={cn(className)}>
      {empty ? children : null}
    </div>
  )
}
