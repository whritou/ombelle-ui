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
  const value = React.useMemo<SidebarState>(() => ({ state: open ? 'expanded' : 'collapsed', open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar, hydrated }),
    [open, setOpen, openMobile, isMobile, toggleSidebar, hydrated])
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
  const { state, isMobile, openMobile, setOpenMobile, hydrated } = useSidebar()
  if (isMobile)
    return (
      <DialogPrimitive.Root open={openMobile} onOpenChange={open => setOpenMobile(open)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop data-slot="sidebar-sheet-overlay" />
          <DialogPrimitive.Popup {...props} data-slot="sidebar-sheet" data-side={side} className={cn(className)}
            onClick={event => { if ((event.target as HTMLElement).closest('a[href]')) setOpenMobile(false) }}>
            <DialogPrimitive.Title data-sidebar-sheet-title="">{label}</DialogPrimitive.Title>
            <div data-sidebar-inner="">{children}</div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  const hidden = collapsible === 'offcanvas' && state === 'collapsed'
  return (
    <div {...props} data-slot="sidebar" data-state={collapsible === 'none' ? 'expanded' : state} data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-side={side} data-variant={variant} aria-label={props['aria-label'] ?? label} role={props.role ?? 'navigation'} data-hydrated={hydrated ? '' : undefined} inert={(hidden && hydrated) || undefined} className={cn(className)}>
      <div data-sidebar-inner="">{children}</div>
    </div>
  )
}

/** Toggles the sidebar, or opens the phone sheet. */
export function SidebarTrigger({ className, onClick, children, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar, open, isMobile, openMobile } = useSidebar()
  return (
    <button type="button" {...props} data-slot="sidebar-trigger" aria-expanded={isMobile ? openMobile : open} className={cn(className)}
      onClick={event => { onClick?.(event); if (!event.defaultPrevented) toggleSidebar() }}>
      {children ?? <><PanelLeftIcon aria-hidden="true" /><span data-sidebar-sr="">Toggle sidebar</span></>}
    </button>
  )
}

/** A thin edge that toggles the sidebar on click; pointer only, the trigger and shortcut cover the keyboard. */
export function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar()
  return <button type="button" {...props} data-slot="sidebar-rail" aria-hidden="true" tabIndex={-1} onClick={toggleSidebar} className={cn(className)} />
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

export type SidebarMenuButtonProps = Omit<React.ComponentProps<'button'> & React.ComponentProps<'a'>, 'type'> & {
  /** Marks the current page with aria-current. */
  isActive?: boolean
  /** Shown beside the icon while the sidebar is collapsed to icons. */
  tooltip?: string
  /** Renders a link instead of a button. */
  href?: string
  type?: 'button' | 'submit' | 'reset'
  /** Renders this element, such as a framework link, with the item's look and the children: Base UI render. */
  render?: React.ReactElement<Record<string, unknown>>
}

/** Passes the item's props to its only child element, merging class names. */
function MenuButtonSlot({ children, className, ...props }: { children?: React.ReactNode; className?: string } & Record<string, unknown>) {
  if (!React.isValidElement<Record<string, unknown>>(children)) return null
  return React.cloneElement(children, { ...props, ...children.props, className: cn(className, children.props.className as string) })
}

/** An item: a link when it has an href, otherwise a button. Collapsed to icons, its label hides and the tooltip names it. */
export function SidebarMenuButton({ isActive = false, tooltip, href, type = 'button', render, className, children, ...props }: SidebarMenuButtonProps) {
  const { state, isMobile } = useSidebar()
  const [tip, setTip] = React.useState(false)
  const active = { 'data-active': isActive ? '' : undefined, 'aria-current': isActive ? ('page' as const) : undefined }
  const element = render
    ? <MenuButtonSlot {...props} {...active} data-slot="sidebar-menu-button" className={cn(className)}>{React.cloneElement(render, {}, children)}</MenuButtonSlot>
    : href !== undefined
    ? <a {...(props as React.ComponentProps<'a'>)} {...active} href={href} data-slot="sidebar-menu-button" className={cn(className)}>{children}</a>
    : <button {...(props as React.ComponentProps<'button'>)} {...active} type={type} data-slot="sidebar-menu-button" className={cn(className)}>{children}</button>
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
