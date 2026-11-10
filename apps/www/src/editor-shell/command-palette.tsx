'use client'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../generated/ui/components/ui/command'
import type { PaletteGroup } from './command-groups'

/** The editor's Ctrl+K command menu. Loaded on first open, so it stays out of the first page load. */
export default function CommandPalette({ open, onOpenChange, groups }: {
  open: boolean
  onOpenChange(open: boolean): void
  groups: readonly PaletteGroup[]
}) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Editor commands">
      <Command label="Search editor commands">
        <CommandInput placeholder="Search components, families and actions" />
        <CommandList>
          {groups.map((group, index) => [
            index > 0 && <CommandSeparator key={`separator-${group.heading}`} />,
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.commands.map(command => (
                <CommandItem key={command.id} value={`${group.heading} ${command.label}`} keywords={command.keywords} onSelect={() => {
                  onOpenChange(false)
                  command.run()
                }}>
                  {command.label}
                  {command.shortcut && <CommandShortcut>{command.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>,
          ])}
        </CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
      </Command>
    </CommandDialog>
  )
}
