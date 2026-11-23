'use client'
import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'
import { ChevronDownIcon, PanelLeftIcon } from 'lucide-react'
import { cn } from './utils.js'
import './sidebar.css'

type SidebarState = {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen(open: boolean): void
  openMobile: boolean
  setOpenMobile(open: boolean): void
  isMobile: boolean
  toggleSidebar(): void
  /** True after the first render in the browser: the phone CSS and inert apply only from then on. */
  hydrated: boolean
  /** The sidebar's id, which the trigger's aria-controls points at. */
  sidebarId: string
  setSidebarId(id: string): void
}

const SidebarContext = React.createContext<SidebarState | null>(null)

/** The sidebar's open state, its phone sheet and whether the phone layout applies; use inside SidebarProvider. */
export function useSidebar(): SidebarState {
  const state = React.useContext(SidebarContext)
  if (!state) throw new Error('useSidebar must be used inside <SidebarProvider>')
  return state
}

/** False on the server and before hydration, so the first render matches the CSS-only phone layout. */
function useIsMobile(breakpoint: number): boolean {
  const [mobile, setMobile] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`)
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [breakpoint])
  return mobile
}

/** True when a key press is typing: the shortcut never steals a key from a field. */
function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
}

export type SidebarProviderProps = React.ComponentProps<'div'> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Below this width, in px, the sidebar opens as a sheet. CSS uses 768 px before hydration. */
  mobileBreakpoint?: number
  /** Ctrl or Cmd + B toggles the sidebar, except while typing in a field. */
  shortcut?: boolean
}

export function SidebarProvider({ open: openProp, defaultOpen = true, onOpenChange, mobileBreakpoint = 768, shortcut = true, className, style, children, ...props }: SidebarProviderProps) {
  const isMobile = useIsMobile(mobileBreakpoint)
  const [sidebarId, setSidebarId] = React.useState(React.useId() + '-sidebar')
  const [hydrated, setHydrated] = React.useState(false)
  React.useEffect(() => setHydrated(true), [])
  const [openMobile, setOpenMobile] = React.useState(false)
  const [internal, setInternal] = React.useState(defaultOpen)
  const open = openProp ?? internal
  const setOpen = React.useCallback((next: boolean) => {
    if (openProp === undefined) setInternal(next)
    onOpenChange?.(next)
  }, [openProp, onOpenChange])
  const toggleSidebar = React.useCallback(() => (isMobile ? setOpenMobile(value => !value) : setOpen(!open)), [isMobile, open, setOpen])
  React.useEffect(() => {
    if (!shortcut) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'b' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || typing(event.target)) return
      event.preventDefault()
      toggleSidebar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcut, toggleSidebar])
  const value = React.useMemo<SidebarState>(() => ({ state: open ? 'expanded' : 'collapsed', open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar, hydrated, sidebarId, setSidebarId }),
    [open, setOpen, openMobile, isMobile, toggleSidebar, hydrated, sidebarId])
  return (
    <SidebarContext.Provider value={value}>
      <TooltipPrimitive.Provider delay={0}>
        <div {...props} data-slot="sidebar-wrapper" data-mobile={isMobile ? '' : undefined} data-hydrated={hydrated ? '' : undefined} className={cn(className)} style={style}>{children}</div>
      </TooltipPrimitive.Provider>
    </SidebarContext.Provider>
  )
}

export type SidebarProps = React.ComponentProps<'div'> & {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'floating' | 'inset'
  /** offcanvas slides it away, icon keeps a strip of icons, none keeps it open. */
  collapsible?: 'offcanvas' | 'icon' | 'none'
  /** Names the phone sheet for assistive technology. */
  label?: string
}

export function Sidebar({ side = 'left', variant = 'sidebar', collapsible = 'offcanvas', label = 'Sidebar', className, children, ...props }: SidebarProps) {
  const { state, isMobile, openMobile, setOpenMobile, hydrated, sidebarId, setSidebarId } = useSidebar()
  // A caller's id names the sidebar for the trigger's aria-controls.
  React.useEffect(() => { if (props.id) setSidebarId(props.id) }, [props.id, setSidebarId])
  if (isMobile)
    return (
      <DialogPrimitive.Root open={openMobile} onOpenChange={open => setOpenMobile(open)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop data-slot="sidebar-sheet-overlay" />
          <DialogPrimitive.Popup {...props} id={props.id ?? sidebarId} data-slot="sidebar-sheet" data-side={side} className={cn(className)}
            onClick={event => { if ((event.target as HTMLElement).closest('a[href]')) setOpenMobile(false) }}>
            <DialogPrimitive.Title data-sidebar-sheet-title="">{label}</DialogPrimitive.Title>
            <div data-sidebar-inner="">{children}</div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  const hidden = collapsible === 'offcanvas' && state === 'collapsed'
  return (
    <div {...props} id={props.id ?? sidebarId} data-slot="sidebar" data-state={collapsible === 'none' ? 'expanded' : state} data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-side={side} data-variant={variant} aria-label={props['aria-label'] ?? label} role={props.role ?? 'navigation'} data-hydrated={hydrated ? '' : undefined} inert={(hidden && hydrated) || undefined} className={cn(className)}>
      <div data-sidebar-inner="">{children}</div>
    </div>
  )
}

/** Toggles the sidebar, or opens the phone sheet. */
export function SidebarTrigger({ className, onClick, children, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar, open, isMobile, openMobile, sidebarId } = useSidebar()
  return (
    // The phone sheet is not in the page while it is closed, so the trigger points at it only while it is open.
    <button type="button" aria-controls={isMobile && !openMobile ? undefined : sidebarId} {...props} data-slot="sidebar-trigger" aria-expanded={isMobile ? openMobile : open} className={cn(className)}
      onClick={event => { onClick?.(event); if (!event.defaultPrevented) toggleSidebar() }}>
      {children ?? <><PanelLeftIcon aria-hidden="true" /><span data-sidebar-sr="">Toggle sidebar</span></>}
    </button>
  )
}

/** A thin edge that toggles the sidebar on click; pointer only, the trigger and shortcut cover the keyboard. */
export function SidebarRail({ className, onClick, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar()
  return <button type="button" {...props} data-slot="sidebar-rail" aria-hidden="true" tabIndex={-1} className={cn(className)}
    onClick={event => { onClick?.(event); if (!event.defaultPrevented) toggleSidebar() }} />
}

/** The main area beside the sidebar. */
export function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return <main {...props} data-slot="sidebar-inset" className={cn(className)} />
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="sidebar-header" className={cn(className)} />
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="sidebar-footer" className={cn(className)} />
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="sidebar-content" className={cn(className)} />
}

/** A search field sized for the sidebar; give it a label or aria-label. */
export function SidebarInput({ className, ...props }: React.ComponentProps<'input'>) {
  return <input {...props} data-slot="sidebar-input" className={cn(className)} />
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="group" {...props} data-slot="sidebar-group" className={cn(className)} />
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="sidebar-group-label" className={cn(className)} />
}

/** A small button beside a group label, such as Add project; give it an aria-label. */
export function SidebarGroupAction({ className, ...props }: React.ComponentProps<'button'>) {
  return <button type="button" {...props} data-slot="sidebar-group-action" className={cn(className)} />
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="sidebar-group-content" className={cn(className)} />
}

/** A group whose items fold under its label. */
export function SidebarGroupCollapsible({ className, ...props }: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Root>, 'className'> & { className?: string }) {
  return <CollapsiblePrimitive.Root {...props} data-slot="sidebar-group-collapsible" className={cn(className)}
    render={(rootProps, state) => <div {...rootProps} data-state={state.open ? 'open' : 'closed'} />} />
}

export function SidebarGroupCollapsibleTrigger({ className, children, ...props }: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Trigger>, 'className'> & { className?: string }) {
  return (
    <CollapsiblePrimitive.Trigger {...props} data-slot="sidebar-group-collapsible-trigger" className={cn(className)}>
      {children}
      <ChevronDownIcon aria-hidden="true" data-sidebar-chevron="" />
    </CollapsiblePrimitive.Trigger>
  )
}

export function SidebarGroupCollapsibleContent({ className, ...props }: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Panel>, 'className'> & { className?: string }) {
  return <CollapsiblePrimitive.Panel {...props} data-slot="sidebar-group-collapsible-content" className={cn(className)} />
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul {...props} data-slot="sidebar-menu" className={cn(className)} />
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li {...props} data-slot="sidebar-menu-item" className={cn(className)} />
}

type SidebarMenuButtonCommon = {
  /** Marks the current page with aria-current. */
  isActive?: boolean
  /** Shown beside the icon while the sidebar is collapsed to icons. */
  tooltip?: string
}
/** A button by default, a link with href, or the render element; ref and handlers are typed for the element rendered. */
export type SidebarMenuButtonProps = SidebarMenuButtonCommon & (
  | (Omit<React.ComponentProps<'button'>, 'type'> & { href?: undefined; type?: 'button' | 'submit' | 'reset'; render?: undefined })
  /** Renders a link instead of a button. */
  | (React.ComponentProps<'a'> & { href: string; render?: undefined })
  /** Renders this element, such as a framework link, with the item's look and the children: Base UI render. Handlers on both run. */
  | (React.HTMLAttributes<HTMLElement> & { render: React.ReactElement<Record<string, unknown>>; href?: string; ref?: React.Ref<HTMLElement> })
)

type Handler = (...args: unknown[]) => unknown
/** Sets every ref it is given. */
function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (element: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(element)
      else if (ref) (ref as React.RefObject<T | null>).current = element
    }
  }
}

/**
 * Passes the item's props to its only child element, as Radix Slot does: the child's props win, class names
 * and styles merge, both refs are set, and when both have a handler for an event the child's runs, then the item's.
 */
function MenuButtonSlot({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) {
  if (!React.isValidElement<Record<string, unknown>>(children)) return null
  const own = children.props
  const merged: Record<string, unknown> = { ...props, ...own }
  for (const key of Object.keys(props)) {
    const outer = props[key], inner = own[key]
    if (/^on[A-Z]/.test(key) && typeof outer === 'function' && typeof inner === 'function')
      merged[key] = (...args: unknown[]) => { const result = (inner as Handler)(...args); (outer as Handler)(...args); return result }
  }
  merged.className = cn(props.className as string, own.className as string)
  if (props.style && own.style) merged.style = { ...(props.style as React.CSSProperties), ...(own.style as React.CSSProperties) }
  if (props.ref && own.ref) merged.ref = mergeRefs(props.ref as React.Ref<unknown>, own.ref as React.Ref<unknown>)
  return React.cloneElement(children, merged)
}

/** An item: a link when it has an href, otherwise a button. Collapsed to icons, its label hides and the tooltip names it. */
export function SidebarMenuButton({ isActive = false, tooltip, render, className, children, ...props }: SidebarMenuButtonProps) {
  const { state, isMobile } = useSidebar()
  const [tip, setTip] = React.useState(false)
  const active = { 'data-active': isActive ? '' : undefined, 'aria-current': isActive ? ('page' as const) : undefined }
  const button = props as Omit<React.ComponentProps<'button'>, 'type'> & { type?: 'button' | 'submit' | 'reset' }
  const element = render
    ? <MenuButtonSlot {...props} {...active} data-slot="sidebar-menu-button" className={cn(className)}>{React.cloneElement(render, {}, children)}</MenuButtonSlot>
    : props.href !== undefined
    ? <a {...(props as React.ComponentProps<'a'>)} {...active} data-slot="sidebar-menu-button" className={cn(className)}>{children}</a>
    : <button {...button} {...active} type={button.type ?? 'button'} data-slot="sidebar-menu-button" className={cn(className)}>{children}</button>
  if (!tooltip) return element
  return (
    // Expanded, the label is visible, so the tooltip stays closed; the wrapper stays mounted so focus is kept on toggle.
    // A hover while expanded is not kept: the primitive never reports closing a tooltip it was not showing,
    // so a kept hover would open every tooltip hovered before collapsing.
    <TooltipPrimitive.Root open={tip && state === 'collapsed' && !isMobile} onOpenChange={open => setTip(open && state === 'collapsed' && !isMobile)}>
      <TooltipPrimitive.Trigger render={element} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="right" align="center" sideOffset={8}>
          <TooltipPrimitive.Popup data-slot="sidebar-tooltip">{tooltip}</TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/** A small button at the end of an item, such as More; give it an aria-label. */
export function SidebarMenuAction({ className, ...props }: React.ComponentProps<'button'>) {
  return <button type="button" {...props} data-slot="sidebar-menu-action" className={cn(className)} />
}

export function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="sidebar-menu-badge" className={cn(className)} />
}

export function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul {...props} data-slot="sidebar-menu-sub" className={cn(className)} />
}

export function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li {...props} data-slot="sidebar-menu-sub-item" className={cn(className)} />
}

export type SidebarMenuSubButtonProps = React.ComponentProps<'a'> & { isActive?: boolean }

export function SidebarMenuSubButton({ isActive = false, className, ...props }: SidebarMenuSubButtonProps) {
  return <a {...props} data-slot="sidebar-menu-sub-button" data-active={isActive ? '' : undefined} aria-current={isActive ? 'page' : undefined} className={cn(className)} />
}
