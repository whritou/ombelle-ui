import type { OverflowItem } from './top-bar'

export type PaletteCommand = { id: string; label: string; keywords?: string[]; shortcut?: string; run(): void }
export type PaletteGroup = { heading: string; commands: readonly PaletteCommand[] }

/**
 * The command palette's groups: the editor's own (such as its style families), then the actions
 * of its More actions menu, then the other component pages.
 */
export function paletteGroups(
  extra: readonly PaletteGroup[],
  menuItems: readonly OverflowItem[],
  pages: readonly { id: string; label: string; href: string }[],
  currentPath: string,
): PaletteGroup[] {
  const actions = menuItems.filter(item => !item.disabled).map(item => ({ id: `action-${item.id}`, label: item.label, run: item.onSelect }))
  const components = pages.filter(page => page.href !== currentPath.replace(/\/$/, '')).map(page => ({
    id: `component-${page.id}`, label: page.label, keywords: ['component', 'editor'],
    run: () => window.location.assign(page.href),
  }))
  return [...extra, { heading: 'Actions', commands: actions }, { heading: 'Components', commands: components }]
    .filter(group => group.commands.length)
}

/** Ctrl+K, or Command+K on macOS, without other modifiers. */
export function isCommandShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): boolean {
  return event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
}

/** A Families group that switches the editor to each style family except the current one. */
export function familyCommands<Family extends string>(families: readonly Family[], current: Family, names: Record<Family, string>, choose: (family: Family) => void): PaletteGroup {
  return {
    heading: 'Families',
    commands: families.filter(family => family !== current).map(family => ({
      id: `family-${family}`, label: `Switch to ${names[family]}`, keywords: ['family', 'style'], run: () => choose(family),
    })),
  }
}

/**
 * The palette's own search. An exact name comes first, then names that start with the query, then
 * names with a word that starts with it, then names or keywords that contain it; ties keep their
 * order. Groups keep their order and empty ones are dropped, so Enter picks the best match.
 */
export function filterPalette(groups: readonly PaletteGroup[], query: string): PaletteGroup[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...groups]
  const rank = (command: PaletteCommand) => {
    const label = command.label.toLowerCase()
    if (label === needle) return 0
    if (label.startsWith(needle)) return 1
    if (label.split(/\s+/).some(word => word.startsWith(needle))) return 2
    if (label.includes(needle)) return 3
    if (command.keywords?.some(keyword => keyword.toLowerCase().includes(needle))) return 4
    return -1
  }
  return groups.map((group, order) => {
    const ranked = group.commands.map((command, index) => ({ command, index, rank: rank(command) }))
      .filter(entry => entry.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
    return { order, best: ranked[0]?.rank ?? Infinity, group: { ...group, commands: ranked.map(entry => entry.command) } }
  }).filter(entry => entry.group.commands.length)
    // The group holding the best match comes first, so Enter picks it.
    .sort((a, b) => a.best - b.best || a.order - b.order)
    .map(entry => entry.group)
}
