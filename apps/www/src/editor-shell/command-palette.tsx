'use client'

import { useCommandState } from 'cmdk'
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
import { filterPalette, type PaletteGroup } from './command-groups'

/** The palette's groups, ranked by its own search so an exact name is first and Enter opens it. */
function PaletteGroups({ groups, onOpenChange }: { groups: readonly PaletteGroup[]; onOpenChange(open: boolean): void }) {
  const search = useCommandState(state => state.search)
  return filterPalette(groups, search).map((group, index) => [
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
  ])
}

/** The editor's Ctrl+K command menu. Loaded on first open, so it stays out of the first page load. */
export default function CommandPalette({ open, onOpenChange, groups }: {
  open: boolean
  onOpenChange(open: boolean): void
  groups: readonly PaletteGroup[]
}) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Editor commands">
      <Command label="Search editor commands" filter={false}>
        <CommandInput placeholder="Search components, families and actions" />
        <CommandList>
          <PaletteGroups groups={groups} onOpenChange={onOpenChange} />
        </CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
      </Command>
    </CommandDialog>
  )
}
