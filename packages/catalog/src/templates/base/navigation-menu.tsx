'use client'
import * as React from 'react'
import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from './utils.js'
import './navigation-menu.css'

/** Whether a NavigationMenuIndicator is present, so the popup draws its arrow. */
const IndicatorContext = React.createContext<((present: boolean) => void) | null>(null)
/** The menu's orientation, for the key that moves from an open trigger into its panel. */
const OrientationContext = React.createContext<'horizontal' | 'vertical'>('horizontal')

/** The elements Tab can reach inside a panel; Base UI keeps all but one panel link at tabindex -1. */
const panelFocusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export type NavigationMenuProps = React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  /** Base UI always opens panels in one shared viewport; the attribute keeps the styles the same as the Radix edition. */
  viewport?: boolean
}

/** A site header's links and panels: hover or click opens a panel, arrow keys move between items, Escape closes. */
export function NavigationMenu({ viewport = true, className, children, ...props }: NavigationMenuProps) {
  const [indicator, setIndicator] = React.useState(false)
  return (
    <IndicatorContext.Provider value={setIndicator}>
      <OrientationContext.Provider value={props.orientation ?? 'horizontal'}>
        <NavigationMenuPrimitive.Root {...props} data-slot="navigation-menu" data-viewport={viewport} className={cn(className)}>
          {children}
          <NavigationMenuPrimitive.Portal>
            <NavigationMenuPrimitive.Positioner sideOffset={8} align="start" data-navigation-menu-position="">
              {/* A div, not Base UI's nav: the open trigger already owns the panel inside the menu's
                  named navigation landmark, so a second, unnamed one would only add noise. */}
              <NavigationMenuPrimitive.Popup render={<div />} data-navigation-menu-popup="">
                {indicator ? <NavigationMenuPrimitive.Arrow data-slot="navigation-menu-indicator"><span data-navigation-menu-arrow="" /></NavigationMenuPrimitive.Arrow> : null}
                <NavigationMenuViewport />
              </NavigationMenuPrimitive.Popup>
            </NavigationMenuPrimitive.Positioner>
          </NavigationMenuPrimitive.Portal>
        </NavigationMenuPrimitive.Root>
      </OrientationContext.Provider>
    </IndicatorContext.Provider>
  )
}

/** Home and End move to the first and last top-level item, as in the Radix edition. */
export function NavigationMenuList({ className, onKeyDown, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || (event.key !== 'Home' && event.key !== 'End')) return
        const list = event.currentTarget
        // The first focusable element of each item; panels are portalled, so they are not in here.
        const items = [...list.children].flatMap(item => {
          const target = item.querySelector<HTMLElement>('a[href], button:not([disabled])')
          return target ? [target] : []
        })
        // Keys typed inside an open panel reach here through React's tree; leave them to the panel.
        if (!items.includes(event.target as HTMLElement)) return
        event.preventDefault()
        items[event.key === 'Home' ? 0 : items.length - 1]?.focus()
      }}
      {...props}
      data-slot="navigation-menu-list"
      className={cn(className)}
    />
  )
}

export function NavigationMenuItem({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return <NavigationMenuPrimitive.Item {...props} data-slot="navigation-menu-item" className={cn(className)} />
}

/** Opens its item's panel; the chevron turns while the panel is open. With the panel open, ArrowDown (ArrowRight in a vertical menu) moves into it, as in the Radix edition. */
export function NavigationMenuTrigger({ className, children, onKeyDown, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  const orientation = React.useContext(OrientationContext)
  return (
    <NavigationMenuPrimitive.Trigger
      onKeyDown={(event) => {
        onKeyDown?.(event)
        const trigger = event.currentTarget
        const rtl = trigger.closest('[dir]')?.getAttribute('dir') === 'rtl'
        const entryKey = orientation === 'vertical' ? (rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown'
        if (event.defaultPrevented || event.key !== entryKey || trigger.getAttribute('aria-expanded') !== 'true') return
        const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '')
        const first = panel?.querySelector<HTMLElement>(panelFocusable)
        if (!first) return
        event.preventDefault()
        // Base UI's own ArrowDown handler would only reopen the open panel.
        event.preventBaseUIHandler()
        first.focus()
      }}
      {...props}
      data-slot="navigation-menu-trigger"
      className={cn(className)}
    >
      {children}
      <NavigationMenuPrimitive.Icon render={<ChevronDownIcon aria-hidden="true" data-navigation-menu-chevron="" />} />
    </NavigationMenuPrimitive.Trigger>
  )
}

export function NavigationMenuContent({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return <NavigationMenuPrimitive.Content {...props} data-slot="navigation-menu-content" className={cn(className)} />
}

export type NavigationMenuLinkProps = React.ComponentProps<typeof NavigationMenuPrimitive.Link> & {
  /** Draws a top-level link like a trigger, for items without a panel. */
  variant?: 'default' | 'trigger'
}

/** A real link, usable before hydration; `active` marks the current page with aria-current. */
export function NavigationMenuLink({ variant = 'default', className, ...props }: NavigationMenuLinkProps) {
  return <NavigationMenuPrimitive.Link {...props} data-slot="navigation-menu-link" data-variant={variant} className={cn(className)} />
}

/** A small arrow under the open trigger, pointing at the panel. Base UI draws it on the popup. */
export function NavigationMenuIndicator(_props: { className?: string }) {
  const setIndicator = React.useContext(IndicatorContext)
  React.useEffect(() => {
    setIndicator?.(true)
    return () => setIndicator?.(false)
  }, [setIndicator])
  return null
}

/** The shared panel the open content renders into; NavigationMenu adds it. */
export function NavigationMenuViewport({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return <NavigationMenuPrimitive.Viewport {...props} data-slot="navigation-menu-viewport" className={cn(className)} />
}
