# Menubar

Menubar is a row of menus such as File, Edit and View, with one Tab stop, arrow keys between menus, checkbox and radio items, submenus and shortcut hints. It is available in all eight families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.9.0** or later: `npx @ombelle-ui/cli@0.9.0 add menubar`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add menubar --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add menubar --cwd APP --yes
```

```tsx
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarShortcut, MenubarTrigger } from '@/components/ui/menubar'

export function EditorMenus() {
  return (
    <Menubar aria-label="Editor">
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent><MenubarItem>Download JSON<MenubarShortcut>Ctrl+S</MenubarShortcut></MenubarItem></MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent><MenubarItem>Undo<MenubarShortcut>Ctrl+Z</MenubarShortcut></MenubarItem></MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}
```

## API and accessibility

| Key | Action |
| --- | --- |
| Tab | Moves into the bar once, onto the first or last focused menu, and out again. |
| Left, Right | Move between menus; while a menu is open, open the neighbouring menu. |
| Down, Enter, Space | Open the menu and move into it. |
| Escape | Closes the menu and returns focus to its trigger. |

- The parts follow Dropdown Menu: `MenubarMenu`, `MenubarTrigger`, `MenubarContent`, `MenubarGroup`, `MenubarLabel`, `MenubarItem` (`inset`, `variant="destructive"`), `MenubarCheckboxItem`, `MenubarRadioGroup`, `MenubarRadioItem`, `MenubarSeparator`, `MenubarSub`, `MenubarSubTrigger` and `MenubarSubContent`.
- `MenubarShortcut` only shows a shortcut. Bind the keys yourself.
- No Alt shortcut moves focus to the bar: Alt alone belongs to the browser and the system.

## Recipe

The recipe sets `shortcuts`, the label and up to four menus of up to eight items. Compilation emits `components/ui/menubar.tsx`, `components/ui/menubar.css` and `examples/menubar.tsx`. Runtime dependencies are React 19.3.1, @radix-ui/react-menubar 1.2.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. The bar repeats the family's Toolbar styles and the menus its Dropdown Menu styles, under their own slots.

## Base UI edition

The Base UI edition uses `Menubar` and `Menu` from `@base-ui/react`.

## Liquid glass

Liquid glass is supported, without an accessibility guarantee.
