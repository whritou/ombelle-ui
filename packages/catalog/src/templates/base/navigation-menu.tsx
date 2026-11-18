'use client'
import * as React from 'react'
import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from './utils.js'
import './navigation-menu.css'

/** Whether a NavigationMenuIndicator is present, so the popup draws its arrow. */
const IndicatorContext = React.createContext<((present: boolean) => void) | null>(null)

export type NavigationMenuProps = React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  /** Base UI always opens panels in one shared viewport; the attribute keeps the styles the same as the Radix edition. */
  viewport?: boolean
}

/** A site header's links and panels: hover or click opens a panel, arrow keys move between items, Escape closes. */
export function NavigationMenu({ viewport = true, className, children, ...props }: NavigationMenuProps) {
  const [indicator, setIndicator] = React.useState(false)
  return (
    <IndicatorContext.Provider value={setIndicator}>
      <NavigationMenuPrimitive.Root {...props} data-slot="navigation-menu" data-viewport={viewport} className={cn(className)}>
        {children}
        <NavigationMenuPrimitive.Portal>
          <NavigationMenuPrimitive.Positioner sideOffset={8} align="start" data-navigation-menu-position="">
            <NavigationMenuPrimitive.Popup data-navigation-menu-popup="">
              {indicator ? <NavigationMenuPrimitive.Arrow data-slot="navigation-menu-indicator"><span data-navigation-menu-arrow="" /></NavigationMenuPrimitive.Arrow> : null}
              <NavigationMenuViewport />
            </NavigationMenuPrimitive.Popup>
          </NavigationMenuPrimitive.Positioner>
        </NavigationMenuPrimitive.Portal>
      </NavigationMenuPrimitive.Root>
    </IndicatorContext.Provider>
  )
}

export function NavigationMenuList({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return <NavigationMenuPrimitive.List {...props} data-slot="navigation-menu-list" className={cn(className)} />
}

export function NavigationMenuItem({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return <NavigationMenuPrimitive.Item {...props} data-slot="navigation-menu-item" className={cn(className)} />
}

/** Opens its item's panel; the chevron turns while the panel is open. */
export function NavigationMenuTrigger({ className, children, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger {...props} data-slot="navigation-menu-trigger" className={cn(className)}>
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
