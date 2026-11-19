'use client'
import * as React from 'react'
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from './utils.js'
import './navigation-menu.css'

export type NavigationMenuProps = React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  /** Opens every panel in one shared viewport below the list (default), or each panel under its own trigger. */
  viewport?: boolean
}

/** A site header's links and panels: hover or click opens a panel, arrow keys move between items, Escape closes. */
export function NavigationMenu({ viewport = true, className, children, ...props }: NavigationMenuProps) {
  return (
    <NavigationMenuPrimitive.Root {...props} data-slot="navigation-menu" data-viewport={viewport} className={cn(className)}>
      {children}
      {viewport ? <NavigationMenuViewport /> : null}
    </NavigationMenuPrimitive.Root>
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
      <ChevronDownIcon aria-hidden="true" data-navigation-menu-chevron="" />
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

/** A small arrow under the open trigger, pointing at the viewport. */
export function NavigationMenuIndicator({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator {...props} data-slot="navigation-menu-indicator" className={cn(className)}>
      <span data-navigation-menu-arrow="" />
    </NavigationMenuPrimitive.Indicator>
  )
}

/** The shared panel the open content renders into; NavigationMenu adds it unless viewport is false. */
export function NavigationMenuViewport({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  const position = React.useRef<HTMLDivElement>(null)
  // Radix puts the panel at the start of the menu. This moves it under the open trigger, where the pointer is and where
  // the Base UI edition's positioner puts it, and keeps it inside the window.
  React.useEffect(() => {
    const wrapper = position.current
    // The wrapper is the menu root's child. (No data-slot selectors here: the recipe compiler rewrites those.)
    const root = wrapper?.parentElement
    if (!wrapper || !root) return
    const place = () => {
      const open = root.querySelector<HTMLElement>('button[aria-expanded="true"]')
      const panel = wrapper.firstElementChild as HTMLElement | null
      if (!open || !panel) return
      const rtl = getComputedStyle(root).direction === 'rtl'
      const rootBox = root.getBoundingClientRect()
      const box = open.getBoundingClientRect()
      const width = panel.offsetWidth
      const margin = 8
      const start = rtl
        ? Math.max(rootBox.right - window.innerWidth + margin, Math.min(rootBox.right - box.right, rootBox.right - width - margin))
        : Math.max(margin - rootBox.left, Math.min(box.left - rootBox.left, window.innerWidth - margin - width - rootBox.left))
      wrapper.style.insetInlineStart = Math.round(start) + 'px'
    }
    const mutations = new MutationObserver(place)
    mutations.observe(root, { attributes: true, attributeFilter: ['data-state'], subtree: true })
    const sizes = new ResizeObserver(place)
    if (wrapper.firstElementChild) sizes.observe(wrapper.firstElementChild)
    window.addEventListener('resize', place)
    place()
    return () => {
      mutations.disconnect()
      sizes.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [])
  return (
    <div ref={position} data-navigation-menu-position="">
      <NavigationMenuPrimitive.Viewport {...props} data-slot="navigation-menu-viewport" className={cn(className)} />
    </div>
  )
}
