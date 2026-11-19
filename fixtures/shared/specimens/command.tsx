'use client'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'

export function Specimen() {
  return (
    <section aria-label="Command" data-component="command">
      <h2>Command</h2>
      <Command label="Commands">
        <CommandInput placeholder="Search commands" />
        <CommandList>
          <CommandGroup heading="Components">
            <CommandItem>Add Button<CommandShortcut>↵</CommandShortcut></CommandItem>
            <CommandItem>Add Dialog</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem>Add theme from preset<CommandShortcut>Ctrl+T</CommandShortcut></CommandItem>
          </CommandGroup>
        </CommandList>
        <CommandEmpty>No results.</CommandEmpty>
      </Command>
    </section>
  )
}
