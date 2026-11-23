# Command

Command is a keyboard-first command menu: a search box over a filtered list of grouped commands, shown inline or in a dialog. It is available in all eight families (the seven stable families and liquid glass) in light and dark mode, with Radix and Base UI editions; the template is a client component.

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

- `Command` takes `label` (the search box's name, default "Commands"), `filter` (set `false` when the items are already filtered), `defaultSearch`, and `search` with `onSearchChange` to keep the search text yourself. `onSearchChange` also works without `search`, to read what is typed.
- `CommandItem` takes `value` (the text the search matches, default its text), `keywords`, `disabled` and `onSelect`, which runs on Enter or click.
- `CommandGroup` takes a `heading` and hides itself when none of its commands match. `CommandSeparator` is hidden while searching; it is drawn only, since a list box holds options and groups.
- `CommandShortcut` shows "Ctrl+T" as one `<kbd>` per key.
- `CommandDialog` takes `open`, `onOpenChange` and `title` (default "Command menu", read by assistive technology, not shown). The search box has focus when it opens, and closing returns focus to what had it before. `CommandDialogTrigger`, placed inside it, is a button that opens it.
- `CommandList` takes `label`, the list box's name (default "Suggestions").
- The search box is a `combobox` that controls the list box; Up and Down move the highlight. The first command starts highlighted (marked `aria-selected`), and while nothing matches the search box points at no option.
- `CommandEmpty` is a polite live region that is always present. Place it after `CommandList`.

### Items filtered elsewhere

With `filter={false}` the menu shows the items you render. Read the search text with `onSearchChange` and render the matching items yourself, for example from a server:

```tsx
export function ProjectSearch() {
  const [search, setSearch] = React.useState('')
  const projects = useProjects(search) // your own data hook
  return (
    <Command label="Projects" filter={false} search={search} onSearchChange={setSearch}>
      <CommandInput placeholder="Search projects" />
      <CommandList>
        {projects.map(project => <CommandItem key={project.id} value={project.name}>{project.name}</CommandItem>)}
      </CommandList>
      <CommandEmpty>No projects found.</CommandEmpty>
    </Command>
  )
}
```

## Recipe

The recipe editor sets the presentation (inline or dialog), the placeholder and empty text, and up to four groups of commands with optional shortcuts. Compilation emits `components/ui/command.tsx`, `components/ui/command.css` and `examples/command.tsx`.

Runtime dependencies of the Radix edition are React 19.3.1, cmdk 1.1.1 (MIT), @radix-ui/react-dialog 1.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. The Base UI edition uses @base-ui/react 1.9.0 and does not install cmdk.

## Editions

- **Radix edition (cmdk):** cmdk filters, scores and moves the highlight; Radix Dialog holds the dialog.
- **Base UI edition (Autocomplete):** an inline, always-open Base UI Autocomplete keeps the list box semantics and the highlight; the template filters the commands written as elements. Commands that your own component renders count for the empty text; a group heading hides only when the commands written directly inside it do not match.

Part names and `data-slot` values are the same in both editions.

## Liquid glass

Liquid glass is supported for Command without an accessibility guarantee, as for every glass component; only its contrast findings, which depend on the backdrop, are advisory in the specimen audit. See [liquid glass](liquid-glass.md).

See [overlays and search evidence](../evidence/overlays-search-073.md) for the board comparison, the specimen audit and the browser tests.
