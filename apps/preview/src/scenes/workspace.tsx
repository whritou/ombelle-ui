import * as React from 'react'
import { DataTable, type DataTableColumn } from '../generated/preset-gallery/components/ui/data-table'
import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from '../generated/preset-gallery/components/ui/menubar'
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '../generated/preset-gallery/components/ui/navigation-menu'
import { Prose, ProseLead } from '../generated/preset-gallery/components/ui/prose'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../generated/preset-gallery/components/ui/resizable'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '../generated/preset-gallery/components/ui/sidebar'
import { gate, type SceneProps } from './shared'

type Release = { name: string; area: string; status: string }
const releases: Release[] = [
  { name: 'Sidebar', area: 'Navigation', status: 'Shipped' },
  { name: 'Navigation Menu', area: 'Navigation', status: 'Shipped' },
  { name: 'Resizable', area: 'Layout', status: 'Shipped' },
  { name: 'Data Table', area: 'Data', status: 'Shipped' },
  { name: 'Menubar', area: 'Navigation', status: 'In review' },
  { name: 'Prose', area: 'Typography', status: 'In review' },
  { name: 'Blocks', area: 'Layout', status: 'Planned' },
]
const columns: DataTableColumn<Release>[] = [
  { accessorKey: 'name', header: 'Component' },
  { accessorKey: 'area', header: 'Area' },
  { accessorKey: 'status', header: 'Status' },
]
const places = ['Overview', 'Releases', 'Presets', 'Members']
// Side by side, a phone leaves each pane a word wide: there the split stacks, table above notes.
const stacked = '(max-width: 640px)'

function useStacked() {
  const [matches, setMatches] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(stacked).matches)
  React.useEffect(() => {
    const query = window.matchMedia(stacked)
    const update = () => setMatches(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return matches
}

/** An app shell: header navigation, a menubar, a sidebar and a split between a release table and its notes. */
export function WorkspaceScene(props: SceneProps) {
  const show = gate(props)
  const vertical = useStacked()
  return (
    <main className="preset-scene" data-testid="preset-scene" data-scene="workspace">
      <header className="scene-header">
        {show('navigation-menu', 'Navigation Menu',
          <NavigationMenu aria-label="Acme">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Product</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuLink href="#editor"><span>Editor</span><p>Presets and components</p></NavigationMenuLink>
                  <NavigationMenuLink href="#cli"><span>CLI</span><p>Install into a project</p></NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem><NavigationMenuLink href="#releases" variant="trigger" active>Releases</NavigationMenuLink></NavigationMenuItem>
              <NavigationMenuItem><NavigationMenuLink href="#docs" variant="trigger">Docs</NavigationMenuLink></NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>)}
        {show('menubar', 'Menubar',
          <Menubar aria-label="Workspace">
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>New release<MenubarShortcut>Ctrl+N</MenubarShortcut></MenubarItem>
                <MenubarItem>Export CSV</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>View</MenubarTrigger>
              <MenubarContent>
                <MenubarCheckboxItem checked>Show notes</MenubarCheckboxItem>
                <MenubarSeparator />
                <MenubarItem>Reset layout</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>)}
      </header>
      {show('sidebar', 'Sidebar',
        <SidebarProvider className="scene-workspace" style={{ '--sidebar-height': '34rem' } as React.CSSProperties}>
          <Sidebar collapsible="icon" label="Acme">
            <SidebarHeader><strong>Acme</strong></SidebarHeader>
            <SidebarContent>
              <SidebarGroup aria-label="Workspace">
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {places.map((place, index) => (
                      <SidebarMenuItem key={place}>
                        <SidebarMenuButton href={`#${place.toLowerCase()}`} isActive={index === 1} tooltip={place}>
                          <span aria-hidden="true" data-sidebar-initial="">{place.slice(0, 1)}</span><span>{place}</span>
                        </SidebarMenuButton>
                        {place === 'Releases' ? <SidebarMenuBadge>7</SidebarMenuBadge> : null}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="scene-workspace-bar"><SidebarTrigger /><span>Releases</span></div>
            {show('resizable', 'Resizable',
              <div className="scene-workspace-split" data-stacked={vertical ? '' : undefined}>
              <ResizablePanelGroup key={vertical ? 'vertical' : 'horizontal'} direction={vertical ? 'vertical' : 'horizontal'}>
                <ResizablePanel defaultSize="60%" minSize="35%">
                  <div className="scene-workspace-pane">{show('data-table', 'Data Table',
                    <DataTable aria-label="Releases" columns={columns} data={releases} filterColumn="name" filterLabel="Filter releases"
                      facets={[{ column: 'status', title: 'Status' }]} pagination pageSize={5} />)}</div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="40%" minSize="25%">
                  <div className="scene-workspace-pane">{show('prose', 'Prose',
                    <Prose measure="narrow">
                      <h2>0.9 app shell</h2>
                      <ProseLead>Six components for the frame around your content.</ProseLead>
                      <p>The sidebar folds to icons with <kbd>Ctrl</kbd> + <kbd>B</kbd>, and opens as a sheet on phones.</p>
                      <ul><li>Data Table builds on Table</li><li>Menubar shares the menu look</li></ul>
                    </Prose>)}</div>
                </ResizablePanel>
              </ResizablePanelGroup>
              </div>)}
          </SidebarInset>
        </SidebarProvider>)}
    </main>
  )
}
