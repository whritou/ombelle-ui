# Navigation Menu

Navigation Menu is a website header: links, and triggers whose panels open on hover or click. Arrow keys move between the top-level items and Escape closes a panel. It is available in all eight families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.9.0** or later: `npx @ombelle-ui/cli@0.9.0 add navigation-menu`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add navigation-menu --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add navigation-menu --cwd APP --yes
```

```tsx
import { NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu'

export function SiteHeader() {
  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/docs"><span>Introduction</span><p>What Ombelle is and how it works</p></NavigationMenuLink>
            <NavigationMenuLink href="/docs/theming"><span>Theming</span><p>Presets, families and tokens</p></NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem><NavigationMenuLink href="/components" variant="trigger" active>Components</NavigationMenuLink></NavigationMenuItem>
        <NavigationMenuIndicator />
      </NavigationMenuList>
    </NavigationMenu>
  )
}
```

## API and accessibility

- `NavigationMenu` takes `viewport` (default true: every panel opens in one shared panel below the list) and the primitive's `value`, `defaultValue` and `onValueChange`. Name it with `aria-label`.
- `NavigationMenuTrigger` is a button that opens its item's panel; its chevron turns while open.
- `NavigationMenuLink` is a real link, so it works before hydration. `active` marks the current page with `aria-current="page"`. `variant="trigger"` draws a top-level link like a trigger.
- `NavigationMenuIndicator` draws a small arrow under the open trigger.
- Keyboard: Left and Right (Up and Down in a vertical menu) move between top-level items, Home and End go to the first and last, Down on an open trigger (Right in a vertical menu) moves into its panel, and Escape closes the panel and returns focus to its trigger.
- Triggers need JavaScript to open their panel. Make every page a panel leads to reachable from a real link too, such as a section index page or the footer.
- On narrow screens the panel stacks its links in one column. The component does not turn into a phone menu by itself; on phones, put the same links in a Sheet:

```tsx
<Sheet><SheetTrigger aria-label="Menu"><MenuIcon /></SheetTrigger><SheetContent side="inline-end"><nav aria-label="Main">…links…</nav></SheetContent></Sheet>
```

## Recipe

The recipe sets `indicator`, `viewport`, the label and up to five items, each a link or a panel of up to six links. Compilation emits `components/ui/navigation-menu.tsx`, `components/ui/navigation-menu.css` and `examples/navigation-menu.tsx`. Runtime dependencies are React 19.3.1, @radix-ui/react-navigation-menu 1.4.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. Triggers repeat the family's Toolbar button styles and the panel its Dropdown Menu styles, under their own slots.

## Base UI edition

The Base UI edition uses `NavigationMenu` from `@base-ui/react`. It always opens panels in one shared popup, and `NavigationMenuIndicator` draws the popup's arrow. Base UI 1.9.0 lacks two of the Radix keys, so the template adds them: Home and End on the list, and Down on an open trigger to move into the panel. The popup renders as a `div` rather than Base UI's `nav`, so an open panel adds no second, unnamed navigation landmark; it stays part of the menu's own named one.

## Liquid glass

Liquid glass is supported, without an accessibility guarantee.
