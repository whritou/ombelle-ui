'use client'
import { NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu'

export function Specimen() {
  return (
    <section aria-label="Navigation Menu" data-component="navigation-menu">
      <h2>Navigation Menu</h2>
      <NavigationMenu aria-label="Gallery site">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#introduction"><span>Introduction</span><p>What Ombelle is</p></NavigationMenuLink>
              <NavigationMenuLink href="#theming"><span>Theming</span><p>Presets and tokens</p></NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem><NavigationMenuLink href="#components" variant="trigger" active>Components</NavigationMenuLink></NavigationMenuItem>
          <NavigationMenuItem><NavigationMenuLink href="#blog" variant="trigger">Blog</NavigationMenuLink></NavigationMenuItem>
          <NavigationMenuIndicator />
        </NavigationMenuList>
      </NavigationMenu>
    </section>
  )
}
