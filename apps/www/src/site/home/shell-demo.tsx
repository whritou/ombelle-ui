'use client'

import { ChevronDown, LayoutGrid, List, Palette, PanelLeft } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useLanding } from './landing-state'
import { familyMeta } from './landing-theme'

/** Catalog components with the dependency their Radix edition installs (CHANGELOG.md). */
const rows = [
  { name: 'Data Table', release: '0.9.0', dependency: 'TanStack Table 9.3.1' },
  { name: 'Resizable', release: '0.9.0', dependency: 'react-resizable-panels 4.17.0' },
  { name: 'Navigation Menu', release: '0.9.0', dependency: '@radix-ui/react-navigation-menu 1.4.1' },
  { name: 'Menubar', release: '0.9.0', dependency: '@radix-ui/react-menubar 1.2.1' },
  { name: 'Toolbar', release: '0.7.6', dependency: '@radix-ui/react-toolbar 1.2.1' },
  { name: 'Carousel', release: '0.7.6', dependency: 'none' },
  { name: 'Code Block', release: '0.7.5', dependency: '@radix-ui/react-tabs 1.2.1' },
  { name: 'Scroll Area', release: '0.7.5', dependency: '@radix-ui/react-scroll-area 1.4.0' },
  { name: 'Calendar', release: '0.7.3', dependency: 'react-day-picker 10.0.2' },
  { name: 'Command', release: '0.7.3', dependency: 'cmdk 1.1.1' },
] as const
type Row = (typeof rows)[number]
type SortKey = keyof Row

const columns: readonly { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Component' },
  { key: 'release', label: 'Added in' },
  { key: 'dependency', label: 'Radix edition dependency' },
]

const releases = [
  { version: '0.9.0', date: '19 November 2026', what: 'App shell: Sidebar, Navigation Menu, Resizable, Data Table, Menubar and Prose' },
  { version: '0.8.2', date: '17 November 2026', what: 'Retro futurism, the seventh stable family' },
  { version: '0.8.1', date: '16 November 2026', what: 'The Organic family and DM Mono' },
  { version: '0.8.0', date: '15 November 2026', what: 'The Papier family and per-style palettes' },
  { version: '0.7.8', date: '14 November 2026', what: 'Font pairs from 19 self-hosted fonts' },
] as const

const views = [
  { id: 'components', label: 'Components', description: 'A sortable, filterable Data Table.', icon: LayoutGrid },
  { id: 'presets', label: 'Presets', description: 'Palettes and presets of the current family.', icon: Palette },
  { id: 'releases', label: 'Releases', description: 'What shipped, and when.', icon: List },
] as const
type View = (typeof views)[number]['id']
type Menu = 'nav' | 'file' | 'edit' | 'view' | null

const paneLimits = { min: 220, max: 460 }
const clampPane = (width: number) => Math.max(paneLimits.min, Math.min(paneLimits.max, width))

/**
 * The six 0.9 app shell components as one small working app. It is an
 * illustration drawn with the landing kit, not the installed components.
 */
export function ShellSection() {
  const { family, look, setLook, lookOptions } = useLanding()
  const [view, setView] = useState<View>('components')
  const [menu, setMenu] = useState<Menu>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [paneShown, setPaneShown] = useState(true)
  const [pane, setPane] = useState(300)
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; direction: 1 | -1 }>({ key: 'release', direction: -1 })
  const drag = useRef<{ x: number; width: number } | null>(null)

  const query = filter.trim().toLowerCase()
  const shown = rows
    .filter((row) => !query || `${row.name} ${row.release} ${row.dependency}`.toLowerCase().includes(query))
    .sort((a, b) => (a[sort.key].localeCompare(b[sort.key]) || a.name.localeCompare(b.name)) * sort.direction)

  const toggleMenu = (id: Exclude<Menu, null>) => setMenu(menu === id ? null : id)
  // A menu item runs its action, then closes its menu.
  const act = (action: () => void) => () => {
    action()
    setMenu(null)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && menu) setMenu(null)
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault()
      setCollapsed(!collapsed)
    }
  }
  const onHandleKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') setPane(clampPane(pane + 20))
    else if (event.key === 'ArrowRight') setPane(clampPane(pane - 20))
  }
  const onDragStart = (event: PointerEvent<HTMLButtonElement>) => {
    drag.current = { x: event.clientX, width: pane }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onDragMove = (event: PointerEvent) => {
    if (drag.current) setPane(clampPane(drag.current.width - (event.clientX - drag.current.x)))
  }

  return (
    <section className="ol-sec" id="shell" aria-labelledby="shell-title">
      <div className="ol-wrap">
        <div className="rv">
          <p className="ol-eye">New in 0.9 · the app shell</p>
          <h2 className="ol-h2" id="shell-title">Six components that make it an app.</h2>
          <p className="ol-lead">Navigation Menu, Menubar, Sidebar, Data Table, Resizable and Prose, in every family and both editions. All six are live here: open the menus, switch views, sort and filter, drag the divider.</p>
        </div>
        <div className="ol-card ol-ws rv" data-collapsed={collapsed} data-pane={paneShown} onKeyDown={onKeyDown}>
          <div className="ol-ws-top">
            <b>Acme</b>
            <button type="button" aria-expanded={menu === 'nav'} aria-controls="shell-nav-panel" onClick={() => toggleMenu('nav')}>Workspace<ChevronDown size={14} strokeWidth={2.4} aria-hidden /></button>
            <a href="#get-started">Get the code</a>
            <span className="ol-mono ol-mfg" style={{ marginLeft: 'auto', fontSize: 12 }}>Navigation Menu</span>
          </div>
          {menu === 'nav' && (
            <div className="ol-ws-panel" id="shell-nav-panel">
              {views.map((item) => (
                <button type="button" key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={act(() => setView(item.id))}><b>{item.label}</b>{item.description}</button>
              ))}
            </div>
          )}
          <div className="ol-ws-menu" role="group" aria-label="Menubar">
            <button type="button" aria-expanded={!collapsed} aria-label="Toggle sidebar" onClick={() => setCollapsed(!collapsed)}><PanelLeft size={18} aria-hidden /></button>
            <div className="ol-ws-mi">
              <button type="button" aria-expanded={menu === 'file'} onClick={() => toggleMenu('file')}>File</button>
              {menu === 'file' && (
                <div className="ol-ws-dd">
                  <button type="button" onClick={act(() => { setFilter(''); setView('components') })}>Clear the filter</button>
                  <button type="button" onClick={act(() => setView('releases'))}>Open releases</button>
                </div>
              )}
            </div>
            <div className="ol-ws-mi">
              <button type="button" aria-expanded={menu === 'edit'} onClick={() => toggleMenu('edit')}>Edit</button>
              {menu === 'edit' && (
                <div className="ol-ws-dd">
                  <button type="button" onClick={act(() => { setSort({ key: 'name', direction: 1 }); setView('components') })}>Sort by name</button>
                  <button type="button" onClick={act(() => { setSort({ key: 'release', direction: -1 }); setView('components') })}>Sort by newest</button>
                </div>
              )}
            </div>
            <div className="ol-ws-mi">
              <button type="button" aria-expanded={menu === 'view'} onClick={() => toggleMenu('view')}>View</button>
              {menu === 'view' && (
                <div className="ol-ws-dd">
                  <button type="button" onClick={act(() => setCollapsed(!collapsed))}>{collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}<span>Ctrl B</span></button>
                  <button type="button" onClick={act(() => setPaneShown(!paneShown))}>{paneShown ? 'Hide the preview panel' : 'Show the preview panel'}</button>
                </div>
              )}
            </div>
            <span>Menubar</span>
          </div>
          <div className="ol-ws-body">
            <nav className="ol-ws-side ol-ws-nav" aria-label="Workspace">
              {views.map((item) => (
                <button type="button" key={item.id} aria-current={view === item.id ? 'page' : undefined} aria-label={item.label} onClick={() => setView(item.id)}><item.icon size={18} aria-hidden /><span>{item.label}</span></button>
              ))}
            </nav>
            <div className="ol-ws-main">
              {view === 'components' && (
                <>
                  <div className="ol-ws-tools">
                    <label className="ol-sr" htmlFor="shell-filter">Filter components</label>
                    <input className="ol-in" id="shell-filter" type="search" placeholder="Filter components" value={filter} onChange={(event) => setFilter(event.target.value)} />
                    <span className="ol-mfg" style={{ fontSize: 14 }} aria-live="polite">{shown.length} of {rows.length} shown</span>
                  </div>
                  <div className="ol-tblw">
                    <table className="ol-tbl">
                      <thead>
                        <tr>
                          {columns.map((column) => {
                            const active = sort.key === column.key
                            return (
                              <th scope="col" key={column.key} aria-sort={active ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}>
                                <button type="button" onClick={() => setSort({ key: column.key, direction: active && sort.direction === 1 ? -1 : 1 })}>
                                  {column.label}<span aria-hidden="true">{active ? (sort.direction === 1 ? '↑' : '↓') : '↕'}</span>
                                </button>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((row) => <tr key={row.name}><td>{row.name}</td><td className="ol-mono">{row.release}</td><td className="ol-mono ol-mfg">{row.dependency}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {view === 'presets' && (
                <div className="ol-ws-view">
                  <p className="ol-lb">{familyMeta[family].name} · choose a look for the whole page</p>
                  {lookOptions(family).map((option, index) => (
                    <button className="ol-ws-pre" type="button" key={option.name} aria-pressed={(look[family] ?? 0) === index} onClick={() => setLook(family, index)}>{option.name}</button>
                  ))}
                </div>
              )}
              {view === 'releases' && (
                <div className="ol-ws-view">
                  {releases.map((release) => (
                    <div className="ol-ws-rel" key={release.version}><b>{release.version}</b><span>{release.what}</span><span /><span className="ol-mfg">{release.date}</span></div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="ol-ws-handle"
              type="button"
              aria-label="Resize the preview panel. Use the left and right arrow keys."
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={() => { drag.current = null }}
              onKeyDown={onHandleKey}
            />
            <aside className="ol-ws-pane" aria-label="Prose preview" style={{ flexBasis: pane }}>
              <p className="ol-lb">Prose</p>
              <h3 className="ol-h3">Readable by default</h3>
              <p>Long-form text gets headings, lists and <code>inline code</code> in the family voice, with <a className="ol-link" href="#styles">links that match</a>.</p>
              <p className="ol-mfg" style={{ fontSize: 14 }}>Resizable uses react-resizable-panels 4.17.0. Data Table uses TanStack Table 9.3.1.</p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}
