'use client'

import dynamic from 'next/dynamic'
import { ChevronLeft, Ellipsis, Redo2, Search, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { editableComponents } from '../editor/editable-components'
import { isCommandShortcut, paletteGroups, type PaletteGroup } from './command-groups'
import styles from './editor-shell.module.css'
import { MoreActionsSheet, type MoreLink } from './more-sheet'
import { SiteMenu } from './site-menu'
import { useViewportClass } from './breakpoints'
import { returnTarget } from './history-focus'
import { Button } from '../generated/ui/components/ui/button'
import { ButtonGroup } from '../generated/ui/components/ui/button-group'
import { Toolbar, ToolbarButton, ToolbarOverflow, ToolbarOverflowItem } from '../generated/ui/components/ui/toolbar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../generated/ui/components/ui/breadcrumb'
import { Menubar, MenubarContent, MenubarGroup, MenubarItem, MenubarLabel, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarTrigger } from '../generated/ui/components/ui/menubar'

// The palette and its command menu load on first open, so they add nothing to the first page load.
const CommandPalette = dynamic(() => import('./command-palette'), { ssr: false })

/** One preview control in the desktop View menu, as a group of radio items. */
export type ViewGroup = {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange(value: string): void
}

/** Actions that undo work go to Edit; the rest, downloads and details, to File. */
export const editMenuItem = (item: OverflowItem) => /reset|clear|restore/.test(item.id)

/** An action in the top bar's menu. */
export type OverflowItem = {
  id: string
  label: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

type HistoryAction = {
  disabled: boolean
  onClick(): void
  buttonRef: Ref<HTMLButtonElement>
}

/** Undo and Redo's keys as this platform writes them. Only read inside an open menu, which renders in the browser. */
function historyKeys() {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return mac ? { undo: '⌘Z', redo: '⇧⌘Z' } : { undo: 'Ctrl+Z', redo: 'Shift+Ctrl+Z' }
}

export function EditorTopBar({
  crumbs,
  nameField,
  revision,
  status,
  undo,
  redo,
  menu,
  primary,
  extra,
  commands,
  back,
  switcher,
  links,
  view = [],
}: {
  /** The trail, ending with the current page; an ancestor with an href is a link. */
  crumbs: readonly (string | { label: string; href: string })[]
  nameField: {
    id: string
    label: string
    value: string
    maxLength: number
    invalid?: boolean
    readOnly?: boolean
    onChange(value: string): void
  }
  revision: string
  status: string
  undo: HistoryAction
  redo: HistoryAction
  menu: { label: string; items: readonly OverflowItem[] }
  primary: ReactNode
  extra?: ReactNode
  /** The editor's own command groups for the Ctrl+K palette, such as its style families. */
  commands?: readonly PaletteGroup[]
  /** A link to the page above this editor, shown before the trail on phones and tablets. */
  back?: { label: string; href: string }
  /** Replaces the trail's current page, such as the component switcher. */
  switcher?: ReactNode
  /** Links the phone's More actions sheet lists, such as the editor's guide. */
  links?: readonly MoreLink[]
  /** The preview controls the desktop View menu offers, as radio groups. */
  view?: readonly ViewGroup[]
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreButton = useRef<HTMLButtonElement>(null)
  const viewport = useViewportClass()
  // The More actions sheet belongs to the phone: a wider screen closes it for good.
  useEffect(() => { if (viewport !== 'phone') setMoreOpen(false) }, [viewport])
  const bar = useStickyBarHeight()
  const [palette, setPalette] = useState(false)
  const [paletteLoaded, setPaletteLoaded] = useState(false)
  const openPalette = (open: boolean) => {
    if (open) setPaletteLoaded(true)
    setPalette(open)
  }
  useEffect(() => {
    if (!commands) return
    const toggle = (event: KeyboardEvent) => {
      if (!isCommandShortcut(event)) return
      // Ctrl+K also works from text fields; the browser's own use of it gives way.
      event.preventDefault()
      setPaletteLoaded(true)
      setPalette(open => !open)
    }
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [commands])
  return (
    <header ref={bar} className={styles.topBar}>
      {/* Below 1200px the site header is not shown; its links live in this menu. */}
      <SiteMenu />
      {back && <a href={back.href} className={styles.backLink} aria-label={back.label}><ChevronLeft aria-hidden="true" size={18} /></a>}
      {/* A trail that is only the current page's name, with no link or switcher, is left out on a phone. */}
      <Breadcrumb collapse="auto" className={`${styles.crumbs} ${!switcher && crumbs.every(crumb => typeof crumb === 'string') ? styles.labelOnlyTrail : ''}`}>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const label = typeof crumb === 'string' ? crumb : crumb.label
            const last = index === crumbs.length - 1
            return (
              <BreadcrumbItem key={`${index}-${label}`}>
                {last ? (switcher ?? <BreadcrumbPage>{label}</BreadcrumbPage>)
                  : typeof crumb === 'string' ? <span>{label}</span>
                  : <BreadcrumbLink href={crumb.href}>{label}</BreadcrumbLink>}
              </BreadcrumbItem>
            )
          }).flatMap((item, index) => index ? [<BreadcrumbSeparator key={`separator-${index}`} />, item] : [item])}
        </BreadcrumbList>
      </Breadcrumb>
      {/* On a phone the name, revision and status wrap into a strip under the bar. */}
      <span className={styles.rowBreak} aria-hidden="true" />
      <div className={styles.nameField}>
        <label htmlFor={nameField.id}>{nameField.label}</label>
        <input
          id={nameField.id}
          type="text"
          value={nameField.value}
          maxLength={nameField.maxLength}
          readOnly={nameField.readOnly}
          aria-invalid={nameField.invalid ? true : undefined}
          onChange={(event) => nameField.onChange(event.target.value)}
        />
      </div>
      <span className={styles.revision}>{revision}</span>
      <span role="status" className={styles.status}>
        {status}
      </span>
      <div className={styles.topActions}>
        <Toolbar aria-label="Editor actions" className={styles.actionsToolbar}>
        <ButtonGroup aria-label="History" className={styles.historyGroup}>
          <ToolbarButton asChild><Button
            variant="ghost"
            size="icon-sm"
            ref={undo.buttonRef}
            className={styles.iconButton}
            aria-label="Undo"
            disabled={undo.disabled}
            onClick={undo.onClick}
          >
            <Undo2 aria-hidden="true" size={16} />
          </Button></ToolbarButton>
          <ToolbarButton asChild><Button
            variant="ghost"
            size="icon-sm"
            ref={redo.buttonRef}
            className={`${styles.iconButton} ${styles.phoneHidden}`}
            aria-label="Redo"
            disabled={redo.disabled}
            onClick={redo.onClick}
          >
            <Redo2 aria-hidden="true" size={16} />
          </Button></ToolbarButton>
        </ButtonGroup>
        {commands && (
          // Compact, so the bar keeps one row: the icon and the shortcut. Its name, "Commands Ctrl K",
          // includes the keys it shows.
          <ToolbarButton className={`${styles.commandsButton} ${styles.phoneHidden}`} title="Commands (Ctrl+K)" menuLabel="Commands"
            aria-keyshortcuts="Control+K Meta+K" onClick={() => openPalette(true)}>
            <Search aria-hidden="true" size={14} />
            <span className="sr-only">Commands </span>
            <span className={styles.commandsKeys}><kbd>Ctrl</kbd> <kbd>K</kbd></span>
          </ToolbarButton>
        )}
        {/* Below 1200px the actions are this overflow menu; from 1200px the File / Edit / View menubar. Both render
            at every width and CSS picks one, so nothing swaps when the viewport class settles after hydration. */}
        <ToolbarOverflow label={menu.label}>
          {menu.items.map((item) => (
            <ToolbarOverflowItem key={item.id} onSelect={item.onSelect} destructive={item.destructive} disabled={item.disabled}>
              {item.label}
            </ToolbarOverflowItem>
          ))}
        </ToolbarOverflow>
        </Toolbar>
        {/* From 1200px the actions and the preview controls are a File / Edit / View menubar. */}
        {(
          <Menubar aria-label="Editor menus" className={styles.menubar}>
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                {menu.items.filter(item => !editMenuItem(item)).map(item => (
                  <MenubarItem key={item.id} onSelect={item.onSelect} disabled={item.disabled} variant={item.destructive ? 'destructive' : 'default'}>{item.label}</MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem disabled={undo.disabled} onSelect={undo.onClick}>Undo<MenubarShortcut>{historyKeys().undo}</MenubarShortcut></MenubarItem>
                <MenubarItem disabled={redo.disabled} onSelect={redo.onClick}>Redo<MenubarShortcut>{historyKeys().redo}</MenubarShortcut></MenubarItem>
                {menu.items.some(editMenuItem) && <MenubarSeparator />}
                {menu.items.filter(editMenuItem).map(item => (
                  <MenubarItem key={item.id} onSelect={item.onSelect} disabled={item.disabled} variant={item.destructive ? 'destructive' : 'default'}>{item.label}</MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
            {view.length > 0 && (
              <MenubarMenu>
                <MenubarTrigger>View</MenubarTrigger>
                <MenubarContent>
                  {view.map((group, index) => (
                    <MenubarGroup key={group.label} aria-label={group.label}>
                      {index > 0 && <MenubarSeparator />}
                      <MenubarLabel>{group.label}</MenubarLabel>
                      <MenubarRadioGroup value={group.value} onValueChange={value => group.onChange(String(value))}>
                        {group.options.map(option => <MenubarRadioItem key={option.value} value={option.value}>{option.label}</MenubarRadioItem>)}
                      </MenubarRadioGroup>
                    </MenubarGroup>
                  ))}
                </MenubarContent>
              </MenubarMenu>
            )}
          </Menubar>
        )}
        <Button ref={moreButton} variant="ghost" size="icon" className={`${styles.iconButton} ${styles.phoneMore}`} aria-label="More actions" data-phone-more=""
          aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
          <Ellipsis aria-hidden="true" size={18} />
        </Button>
        {extra && <span className={styles.extra}>{extra}</span>}
        {primary}
      </div>
      <MoreActionsSheet open={moreOpen && viewport === 'phone'} onOpenChange={setMoreOpen} returnFocus={moreButton} redo={redo} items={menu.items} links={links}
        onCommands={commands ? () => openPalette(true) : undefined} />
      {commands && paletteLoaded && (
        <CommandPalette open={palette} onOpenChange={openPalette}
          groups={paletteGroups(commands, menu.items, editableComponents, typeof window === 'undefined' ? '' : window.location.pathname)} />
      )}
    </header>
  )
}

/** CSS variable holding the pinned top bar's height, for sticky panels below it. */
export const editorBarHeightVar = '--editor-bar-height'

// The bar wraps on narrow screens, so its height is measured, not assumed.
function useStickyBarHeight() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const update = () =>
      root.style.setProperty(editorBarHeightVar, `${element.getBoundingClientRect().height}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty(editorBarHeightVar)
    }
  }, [])
  return ref
}
