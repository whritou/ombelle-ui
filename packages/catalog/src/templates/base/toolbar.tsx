'use client'
import * as React from 'react'
import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { CheckIcon, EllipsisIcon } from 'lucide-react'
import { cn } from './utils.js'
import './toolbar.css'

type ToolbarState = {
  overflowed: readonly HTMLElement[]
  triggerRef: React.RefObject<HTMLButtonElement | null>
  /** True while a ToolbarOverflow with its own items is present, so the trigger always shows. */
  setPersistent(persistent: boolean): void
  focusTrigger: number
}

const ToolbarContext = React.createContext<ToolbarState | null>(null)

function useToolbar(part: string): ToolbarState {
  const state = React.useContext(ToolbarContext)
  if (!state) throw new Error(`${part} must be used inside <Toolbar>`)
  return state
}

const entrySelector = '[data-toolbar-item], [data-toolbar-separator]'

/**
 * Hides the items that no longer fit, from the end, and returns them in order. Measuring shows every
 * item first, so a widening bar brings items back in the same order.
 */
function useOverflow(rootRef: React.RefObject<HTMLDivElement | null>, triggerRef: React.RefObject<HTMLButtonElement | null>, persistent: boolean) {
  const [overflowed, setOverflowed] = React.useState<readonly HTMLElement[]>([])
  const [focusTrigger, setFocusTrigger] = React.useState(0)
  const measure = React.useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const entries = [...root.querySelectorAll<HTMLElement>(entrySelector)].filter(element => element.closest('[data-toolbar-root]') === root)
    const focused = entries.find(element => element.contains(document.activeElement))
    // Measured on the real layout, so grouped items, gaps and separators count as drawn.
    const fits = () => root.scrollWidth <= root.clientWidth + 1
    for (const element of entries) element.hidden = false
    const trigger = triggerRef.current
    const triggerHidden = trigger?.hidden ?? true
    let fit = entries.length
    if (persistent || !fits()) {
      if (trigger) trigger.hidden = false
      while (fit > 0 && !fits()) entries[--fit].hidden = true
      // A separator never ends the visible row.
      while (fit > 0 && fit < entries.length && entries[fit - 1].hasAttribute('data-toolbar-separator')) entries[--fit].hidden = true
      if (trigger) trigger.hidden = triggerHidden
    }
    entries.forEach((element, index) => {
      element.hidden = index >= fit
      if (index >= fit) element.setAttribute('data-overflowed', '')
      else element.removeAttribute('data-overflowed')
    })
    const next = entries.slice(fit).filter(element => element.hasAttribute('data-toolbar-item'))
    setOverflowed(previous => (previous.length === next.length && previous.every((element, index) => element === next[index]) ? previous : next))
    if (focused && focused.hidden) setFocusTrigger(count => count + 1)
  }, [rootRef, triggerRef, persistent])
  React.useLayoutEffect(() => {
    measure()
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(root)
    if (root.parentElement) observer.observe(root.parentElement)
    return () => observer.disconnect()
  }, [measure, rootRef])
  return { overflowed, focusTrigger }
}

/** How a hidden toolbar item reads in the More menu. */
function menuEntry(element: HTMLElement) {
  const label = element.getAttribute('data-menu-label') || element.getAttribute('aria-label') || element.textContent?.trim() || ''
  const kind = element.getAttribute('data-toolbar-kind') ?? 'button'
  const pressed = element.getAttribute('aria-pressed') === 'true' || element.getAttribute('aria-checked') === 'true' || element.getAttribute('data-state') === 'on'
  const disabled = element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true'
  return { label, kind, pressed, disabled }
}

/** Puts destructive items last, after their own separator, as the editor's menu always has. */
function orderItems(children: React.ReactNode) {
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<{ destructive?: boolean }>[]
  return { regular: items.filter(item => !item.props.destructive), destructive: items.filter(item => item.props.destructive) }
}

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & { className?: string }

export type ToolbarProps = Part<typeof ToolbarPrimitive.Root>

/** One Tab stop for the whole bar; arrow keys move between items, and items that do not fit move into ToolbarOverflow. */
export function Toolbar({ className, ref, children, onKeyDown, ...props }: ToolbarProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const [persistent, setPersistent] = React.useState(false)
  const { overflowed, focusTrigger } = useOverflow(rootRef, triggerRef, persistent)
  return (
    <ToolbarContext.Provider value={{ overflowed, triggerRef, setPersistent, focusTrigger }}>
      <ToolbarPrimitive.Root
        {...props}
        ref={(node: HTMLDivElement | null) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node
        }}
        data-slot="toolbar"
        data-toolbar-root=""
        className={cn(className)}
        onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event as never)
          if (event.defaultPrevented || (event.key !== 'Home' && event.key !== 'End')) return
          // Base UI's toolbar leaves Home and End off; they go to the first and last visible, enabled item.
          const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-toolbar-item], [data-toolbar-overflow-trigger]')]
            .filter(item => !item.hidden && item.closest('[data-toolbar-root]') === event.currentTarget && !item.hasAttribute('data-disabled') && !(item as HTMLButtonElement).disabled)
          const target = event.key === 'Home' ? items[0] : items[items.length - 1]
          if (!target) return
          event.preventDefault()
          target.focus()
        }}
      >
        {children}
      </ToolbarPrimitive.Root>
    </ToolbarContext.Provider>
  )
}

type ItemProps = { menuLabel?: string }

/** Pass `render` to make another element the toolbar button. */
export function ToolbarButton({ className, menuLabel, ...props }: Part<typeof ToolbarPrimitive.Button> & ItemProps) {
  return <ToolbarPrimitive.Button {...props} data-slot="toolbar-button" data-toolbar-item="" data-toolbar-kind="button" data-menu-label={menuLabel} className={cn(className)} />
}

export function ToolbarLink({ className, menuLabel, ...props }: Part<typeof ToolbarPrimitive.Link> & ItemProps) {
  return <ToolbarPrimitive.Link {...props} data-slot="toolbar-link" data-toolbar-item="" data-toolbar-kind="link" data-menu-label={menuLabel} className={cn(className)} />
}

type ToggleGroupValue =
  | { type: 'single'; value?: string; defaultValue?: string; onValueChange?(value: string): void }
  | { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?(value: string[]): void }

export type ToolbarToggleGroupProps = Omit<Part<typeof ToggleGroupPrimitive>, 'value' | 'defaultValue' | 'onValueChange' | 'multiple'> & ToggleGroupValue

/** The Radix value API: one string for `single`, a list for `multiple`. */
export function ToolbarToggleGroup({ className, type, value, defaultValue, onValueChange, ...props }: ToolbarToggleGroupProps) {
  const asList = (entry: string | string[] | undefined) => (entry === undefined ? undefined : Array.isArray(entry) ? entry : entry ? [entry] : [])
  return (
    <ToggleGroupPrimitive
      {...props}
      multiple={type === 'multiple'}
      value={asList(value)}
      defaultValue={asList(defaultValue)}
      onValueChange={(next: string[]) => {
        if (type === 'multiple') (onValueChange as ((value: string[]) => void) | undefined)?.(next)
        else (onValueChange as ((value: string) => void) | undefined)?.(next[0] ?? '')
      }}
      data-slot="toolbar-toggle-group"
      className={cn(className)}
    />
  )
}

export function ToolbarToggleItem({ className, menuLabel, value, children, ...props }: Part<typeof ToolbarPrimitive.Button> & ItemProps & { value: string }) {
  return (
    <ToolbarPrimitive.Button
      {...props}
      render={<TogglePrimitive value={value} />}
      data-slot="toolbar-toggle-item"
      data-toolbar-item=""
      data-toolbar-kind="toggle"
      data-menu-label={menuLabel}
      className={cn(className)}
    >
      {children}
    </ToolbarPrimitive.Button>
  )
}

export function ToolbarSeparator({ className, ...props }: Part<typeof ToolbarPrimitive.Separator>) {
  return <ToolbarPrimitive.Separator {...props} data-slot="toolbar-separator" data-toolbar-separator="" className={cn(className)} />
}

export type ToolbarOverflowProps = {
  /** The trigger's name. */
  label?: string
  /** ToolbarOverflowItem entries that always stay in the menu, after the overflowed items. */
  children?: React.ReactNode
  className?: string
}

/** The More menu: overflowed items in order, then its own items. Its trigger shows only when the menu has something in it. */
export function ToolbarOverflow({ label = 'More', children, className }: ToolbarOverflowProps) {
  const toolbar = useToolbar('ToolbarOverflow')
  const { regular, destructive } = orderItems(children)
  const own = regular.length + destructive.length > 0
  const { setPersistent, triggerRef, focusTrigger } = toolbar
  React.useLayoutEffect(() => setPersistent(own), [own, setPersistent])
  React.useEffect(() => {
    if (focusTrigger) triggerRef.current?.focus()
  }, [focusTrigger, triggerRef])
  const show = own || toolbar.overflowed.length > 0
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        render={<ToolbarPrimitive.Button ref={triggerRef} aria-label={label} hidden={!show} data-slot="toolbar-overflow-trigger" data-toolbar-overflow-trigger="" className={cn(className)} />}
      >
        <EllipsisIcon aria-hidden="true" />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" sideOffset={6}>
          <MenuPrimitive.Popup
            data-slot="toolbar-overflow-content"
            aria-label={label}
            // The shared menu rules read Radix's available-height variable.
            style={{ '--radix-dropdown-menu-content-available-height': 'var(--available-height)' } as React.CSSProperties}
          >
            {toolbar.overflowed.map((element, index) => {
              const entry = menuEntry(element)
              return entry.kind === 'toggle'
                ? (
                    <MenuPrimitive.CheckboxItem
                      key={index}
                      checked={entry.pressed}
                      disabled={entry.disabled}
                      onCheckedChange={() => element.click()}
                      data-slot="toolbar-overflow-item"
                      render={(itemProps, state) => <div {...itemProps} data-state={state.checked ? 'checked' : 'unchecked'} />}
                    >
                      <span data-slot="toolbar-overflow-indicator">
                        <MenuPrimitive.CheckboxItemIndicator><CheckIcon aria-hidden="true" /></MenuPrimitive.CheckboxItemIndicator>
                      </span>
                      {entry.label}
                    </MenuPrimitive.CheckboxItem>
                  )
                : (
                    <MenuPrimitive.Item key={index} disabled={entry.disabled} onClick={() => element.click()} data-slot="toolbar-overflow-item">
                      <span data-slot="toolbar-overflow-indicator" />
                      {entry.label}
                    </MenuPrimitive.Item>
                  )
            })}
            {toolbar.overflowed.length > 0 && regular.length > 0 && <MenuPrimitive.Separator data-slot="toolbar-overflow-separator" />}
            {regular}
            {destructive.length > 0 && (toolbar.overflowed.length > 0 || regular.length > 0) && <MenuPrimitive.Separator data-slot="toolbar-overflow-separator" />}
            {destructive}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}

export type ToolbarOverflowItemProps = Omit<Part<typeof MenuPrimitive.Item>, 'onClick' | 'onSelect'> & {
  onSelect(): void
  destructive?: boolean
}

export function ToolbarOverflowItem({ onSelect, destructive = false, className, children, ...props }: ToolbarOverflowItemProps) {
  return (
    <MenuPrimitive.Item {...props} onClick={() => onSelect()} data-slot="toolbar-overflow-item" data-variant={destructive ? 'destructive' : undefined} className={cn(className)}>
      <span data-slot="toolbar-overflow-indicator" />
      {children}
    </MenuPrimitive.Item>
  )
}
