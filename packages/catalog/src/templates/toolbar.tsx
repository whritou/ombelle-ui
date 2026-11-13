'use client'
import * as React from 'react'
import * as ToolbarPrimitive from '@radix-ui/react-toolbar'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { CheckIcon, EllipsisIcon } from 'lucide-react'
import { cn } from './utils.js'
import './toolbar.css'

/** How many leading items fit: all of them without the trigger, or as many as fit beside it. */
export function fitCount(widths: readonly number[], available: number, triggerWidth: number, gap: number): number {
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * gap
  if (total <= available) return widths.length
  let used = triggerWidth
  let count = 0
  for (const width of widths) {
    if (used + width + gap > available) break
    used += width + gap
    count++
  }
  return count
}

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
  const triggerWidth = React.useRef(34)
  const measure = React.useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const entries = [...root.querySelectorAll<HTMLElement>(entrySelector)].filter(element => element.closest('[data-slot="toolbar"]') === root)
    const focused = entries.find(element => element.contains(document.activeElement))
    for (const element of entries) element.hidden = false
    const trigger = triggerRef.current
    if (trigger && !trigger.hidden) triggerWidth.current = trigger.getBoundingClientRect().width || triggerWidth.current
    const style = getComputedStyle(root)
    const gap = parseFloat(style.columnGap) || 0
    const available = root.clientWidth - (parseFloat(style.paddingInlineStart) || 0) - (parseFloat(style.paddingInlineEnd) || 0)
    const widths = entries.map(element => element.getBoundingClientRect().width)
    let fit = persistent
      ? fitCount(widths, available - triggerWidth.current - gap, 0, gap)
      : fitCount(widths, available, triggerWidth.current + gap, gap)
    // A separator never ends the visible row.
    while (fit > 0 && fit < entries.length && entries[fit - 1].hasAttribute('data-toolbar-separator')) fit--
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

export type ToolbarProps = React.ComponentProps<typeof ToolbarPrimitive.Root>

/** One Tab stop for the whole bar; arrow keys move between items, and items that do not fit move into ToolbarOverflow. */
export function Toolbar({ className, ref, children, ...props }: ToolbarProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const [persistent, setPersistent] = React.useState(false)
  const { overflowed, focusTrigger } = useOverflow(rootRef, triggerRef, persistent)
  return (
    <ToolbarContext.Provider value={{ overflowed, triggerRef, setPersistent, focusTrigger }}>
      <ToolbarPrimitive.Root
        {...props}
        ref={(node) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        data-slot="toolbar"
        className={cn(className)}
      >
        {children}
      </ToolbarPrimitive.Root>
    </ToolbarContext.Provider>
  )
}

type ItemProps = { menuLabel?: string }

export function ToolbarButton({ className, menuLabel, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Button> & ItemProps) {
  return <ToolbarPrimitive.Button {...props} data-slot="toolbar-button" data-toolbar-item="" data-toolbar-kind="button" data-menu-label={menuLabel} className={cn(className)} />
}

export function ToolbarLink({ className, menuLabel, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Link> & ItemProps) {
  return <ToolbarPrimitive.Link {...props} data-slot="toolbar-link" data-toolbar-item="" data-toolbar-kind="link" data-menu-label={menuLabel} className={cn(className)} />
}

export function ToolbarToggleGroup({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.ToggleGroup>) {
  return <ToolbarPrimitive.ToggleGroup {...props} data-slot="toolbar-toggle-group" className={cn(className)} />
}

export function ToolbarToggleItem({ className, menuLabel, ...props }: React.ComponentProps<typeof ToolbarPrimitive.ToggleItem> & ItemProps) {
  return <ToolbarPrimitive.ToggleItem {...props} data-slot="toolbar-toggle-item" data-toolbar-item="" data-toolbar-kind="toggle" data-menu-label={menuLabel} className={cn(className)} />
}

export function ToolbarSeparator({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Separator>) {
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
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <ToolbarPrimitive.Button ref={triggerRef} aria-label={label} hidden={!show} data-slot="toolbar-overflow-trigger" className={cn(className)}>
          <EllipsisIcon aria-hidden="true" />
        </ToolbarPrimitive.Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content align="end" sideOffset={6} loop data-slot="toolbar-overflow-content" aria-label={label}>
          {toolbar.overflowed.map((element, index) => {
            const entry = menuEntry(element)
            return entry.kind === 'toggle'
              ? (
                  <DropdownMenuPrimitive.CheckboxItem key={index} checked={entry.pressed} disabled={entry.disabled} onSelect={() => element.click()} data-slot="toolbar-overflow-item">
                    <span data-slot="toolbar-overflow-indicator">
                      <DropdownMenuPrimitive.ItemIndicator><CheckIcon aria-hidden="true" /></DropdownMenuPrimitive.ItemIndicator>
                    </span>
                    {entry.label}
                  </DropdownMenuPrimitive.CheckboxItem>
                )
              : (
                  <DropdownMenuPrimitive.Item key={index} disabled={entry.disabled} onSelect={() => element.click()} data-slot="toolbar-overflow-item">
                    <span data-slot="toolbar-overflow-indicator" />
                    {entry.label}
                  </DropdownMenuPrimitive.Item>
                )
          })}
          {toolbar.overflowed.length > 0 && regular.length > 0 && <DropdownMenuPrimitive.Separator data-slot="toolbar-overflow-separator" />}
          {regular}
          {destructive.length > 0 && (toolbar.overflowed.length > 0 || regular.length > 0) && <DropdownMenuPrimitive.Separator data-slot="toolbar-overflow-separator" />}
          {destructive}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export type ToolbarOverflowItemProps = Omit<React.ComponentProps<typeof DropdownMenuPrimitive.Item>, 'onSelect'> & {
  onSelect(): void
  destructive?: boolean
}

export function ToolbarOverflowItem({ onSelect, destructive = false, className, children, ...props }: ToolbarOverflowItemProps) {
  return (
    <DropdownMenuPrimitive.Item {...props} onSelect={() => onSelect()} data-slot="toolbar-overflow-item" data-variant={destructive ? 'destructive' : undefined} className={cn(className)}>
      <span data-slot="toolbar-overflow-indicator" />
      {children}
    </DropdownMenuPrimitive.Item>
  )
}
