import type { OverflowItem } from './overflow-menu'

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
