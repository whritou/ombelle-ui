# Button Group

Button Group joins its direct children into one control: Buttons, Inputs, Select triggers and Input Groups, with an optional separator and static text. It is available in all five families in light and dark mode. One template serves both editions.

This component requires CLI **0.7.5** or later: `npx @ombelle-ui/cli@0.7.5 add button-group`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add button-group --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add button-group --cwd APP --yes
```

```tsx
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@/components/ui/button-group'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Actions() {
  return (
    <>
      <ButtonGroup aria-label="History">
        <Button variant="outline">Undo</Button>
        <ButtonGroupSeparator />
        <Button variant="outline">Redo</Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Website">
        <ButtonGroupText>https://</ButtonGroupText>
        <Input aria-label="Domain" defaultValue="ombelle.dev" />
        <Button variant="outline">Copy</Button>
      </ButtonGroup>
    </>
  )
}
```

## Split button

A split button is a composition, not a part: a Button followed by a Dropdown Menu trigger around an icon Button. Install `button` and `dropdown-menu` with it.

```tsx
import { ButtonGroup } from '@/components/ui/button-group'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDownIcon } from 'lucide-react'

export function Install() {
  return (
    <ButtonGroup aria-label="Install">
      <Button>Install</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" aria-label="More install options">
            <ChevronDownIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Install with npm</DropdownMenuItem>
          <DropdownMenuItem>Install with pnpm</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}
```

In the Base UI edition, write the trigger as `<DropdownMenuTrigger render={<Button size="icon" aria-label="More install options" />}>`.

## API and accessibility

- `ButtonGroup` is a `div` with `role="group"` and `data-orientation` (`horizontal` or `vertical`). Name each group with `aria-label` or `aria-labelledby`.
- Children are joined by a `-1px` margin, so each keeps its own edge, and only the outer corners stay rounded. A single child keeps all four corners.
- A disabled child keeps the joined border. The focused child's ring is drawn above its neighbours.
- `ButtonGroupSeparator` is a rule between two children with `role="separator"`. Pass the group's `orientation`: the separator's `aria-orientation` crosses it. Between outline buttons it takes the colour of their edge.
- `ButtonGroupText` is static text attached to a control, such as a unit or a URL prefix.
- In the ombelle and neo-brutalism families the group casts one shadow, and default, secondary and destructive buttons inside it do not lift on hover or press, so the shadow stays whole at the joins. Use outline or filled buttons in a group: the shadow is also cast behind a group of ghost or link buttons.
- A button group is a `group`, not a toolbar: it adds no arrow-key navigation, and each child is its own Tab stop.

## Recipe

The recipe editor sets `mode` (`toolbar`, `split` or `input`), `orientation`, the label and one to five items. A recipe compiles only its own component, so its buttons and input are native elements marked for the group's styles, and the split mode shows a down arrow instead of a menu. Compilation emits `components/ui/button-group.tsx`, `components/ui/button-group.css` and `examples/button-group.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0.

## Base UI edition

Button Group has no Base UI-specific template: the same component serves both editions. Only the split-button trigger differs, as above.

## Liquid glass

Liquid glass is experimental for Button Group, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [primitives evidence](../evidence/primitives-075.md) for the specimen audit, the board comparison and the differences that remain.
