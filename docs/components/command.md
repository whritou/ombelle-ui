# Command

Command is a keyboard-first command menu: a search box over a filtered list of grouped commands, shown inline or in a dialog. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add command`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add command --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add command --cwd APP --yes
```

The dialog opens from your own shortcut. Ctrl+K, or Command+K on macOS, is the usual one:

```tsx
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(value => !value)
      }
    }
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [])
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command label="Commands">
        <CommandInput placeholder="Search commands" />
        <CommandList>
          <CommandGroup heading="Components">
            <CommandItem onSelect={() => setOpen(false)}>Add Button<CommandShortcut>↵</CommandShortcut></CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>Add Dialog</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => setOpen(false)}>Add theme from preset<CommandShortcut>Ctrl+T</CommandShortcut></CommandItem>
          </CommandGroup>
        </CommandList>
        <CommandEmpty>No results.</CommandEmpty>
      </Command>
    </CommandDialog>
  )
}
```

## API and accessibility

- `Command` takes `label` (the search box's name, default "Commands"), `filter` (set `false` when the items are already filtered) and `defaultSearch`.
- `CommandItem` takes `value` (the text the search matches, default its text), `keywords`, `disabled` and `onSelect`, which runs on Enter or click.
- `CommandGroup` takes a `heading` and hides itself when none of its commands match. `CommandSeparator` is hidden while searching; it is drawn only, since a list box holds options and groups.
- `CommandShortcut` shows "Ctrl+T" as one `<kbd>` per key.
- `CommandDialog` takes `open`, `onOpenChange` and `title` (default "Command menu", read by assistive technology, not shown). The search box has focus when it opens, and closing returns focus to what had it before. `CommandDialogTrigger`, placed inside it, is a button that opens it.
- The search box is a `combobox` that controls the list box; Up and Down move the highlight.
- `CommandEmpty` is a polite live region that is always present. Place it after `CommandList`.

## Recipe

The recipe editor sets the presentation (inline or dialog), the placeholder and empty text, and up to four groups of commands with optional shortcuts. Compilation emits `components/ui/command.tsx`, `components/ui/command.css` and `examples/command.tsx`.

Runtime dependencies of the Radix edition are React 19.3.1, cmdk 1.1.1 (MIT), @radix-ui/react-dialog 1.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. The Base UI edition uses @base-ui/react 1.9.0 and does not install cmdk.

## Editions

- **Radix edition (cmdk):** cmdk filters, scores and moves the highlight; Radix Dialog holds the dialog.
- **Base UI edition (Autocomplete):** an inline, always-open Base UI Autocomplete keeps the list box semantics and the highlight; the template filters the commands written as elements. Commands that your own component renders count for the empty text; a group heading hides only when the commands written directly inside it do not match.

Part names and `data-slot` values are the same in both editions.

## Liquid glass

Liquid glass is experimental for Command, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [overlays and search evidence](../evidence/overlays-search-073.md) for the board comparison, the specimen audit and the browser tests.
