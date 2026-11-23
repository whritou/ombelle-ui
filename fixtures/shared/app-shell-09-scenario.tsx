import * as React from 'react'
import { Prose, ProseLead } from '@/components/ui/prose'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupCollapsible, SidebarGroupCollapsibleContent, SidebarGroupCollapsibleTrigger, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from '@/components/ui/sidebar'
import { Box, FolderOpen, LayoutDashboard, Palette } from 'lucide-react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from '@/components/ui/menubar'
import { DataTable, DataTableRowAction, DataTableRowActions, actionsColumn, type DataTableColumn } from '@/components/ui/data-table'
import { NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu'

// The 0.9 app shell components in both editions (tests/e2e/app-shell-09.spec.ts).
// scripts/generate-preview.ts copies this file next to each edition's scenario.

function ProseArticle() {
  const [measure, setMeasure] = React.useState<'narrow' | 'default' | 'wide'>('default')
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div role="group" aria-label="Measure" style={{ display: 'flex', gap: '0.5rem' }}>
        {(['narrow', 'default', 'wide'] as const).map(value => (
          <button key={value} type="button" aria-pressed={measure === value} onClick={() => setMeasure(value)}>{value}</button>
        ))}
      </div>
      <Prose data-testid="s09-prose" measure={measure}>
        <h1>Building an app shell</h1>
        <ProseLead>A sidebar, a header and a content area that reads well at any width.</ProseLead>
        <h2>Install</h2>
        <p>Add the <code>sidebar</code> component, press <kbd>Ctrl</kbd> + <kbd>B</kbd> to fold it, and read <a href="#install">the install guide</a>.</p>
        <p>Long addresses wrap: https://ombelle.dev/docs/components/sidebar/collapsible-icon-mode-with-tooltips-and-a-phone-sheet</p>
        <h3>What changes</h3>
        <ul><li>Collapses to icons on desktop<ul><li>Names stay in tooltips</li></ul></li><li>Opens as a sheet on phones</li></ul>
        <ol><li>Install</li><li>Wrap the layout</li></ol>
        <blockquote>Keep navigation where people expect it.<footer>Sidebar design notes</footer></blockquote>
        <hr />
        <h4>Sizes</h4>
        {/* A wide table scrolls in its own box: focusable and named, so a keyboard can scroll it. */}
        <table data-testid="s09-prose-table" tabIndex={0} aria-label="Sizes">
          <thead><tr>{Array.from({ length: 12 }, (_, index) => <th key={index}>Column {index + 1}</th>)}</tr></thead>
          <tbody><tr>{Array.from({ length: 12 }, (_, index) => <td key={index}>{index * 16}px</td>)}</tr></tbody>
        </table>
      </Prose>
    </div>
  )
}

const docLinks = [
  { href: '#introduction', title: 'Introduction', description: 'What Ombelle is and how it works' },
  { href: '#installation', title: 'Installation', description: 'Add Ombelle to a project' },
  { href: '#theming', title: 'Theming', description: 'Presets, families and tokens' },
]

function SiteNavigation() {
  return (
    <div data-testid="s09-nav" style={{ minBlockSize: '18rem' }}>
      <NavigationMenu aria-label="Main">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
            <NavigationMenuContent>
              {docLinks.map(link => (
                <NavigationMenuLink key={link.href} href={link.href}><span>{link.title}</span><p>{link.description}</p></NavigationMenuLink>
              ))}
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Components</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#button"><span>Button</span></NavigationMenuLink>
              <NavigationMenuLink href="#sidebar"><span>Sidebar</span></NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#blog" variant="trigger" active>Blog</NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuIndicator />
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

const workspace = [
  { href: '#overview', label: 'Overview', icon: LayoutDashboard },
  { href: '#projects', label: 'Projects', icon: FolderOpen },
  { href: '#presets', label: 'Presets', icon: Palette },
  { href: '#components', label: 'Components', icon: Box },
]

function EditorSidebar() {
  return (
    <div data-testid="s09-sidebar" style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
      <SidebarProvider style={{ '--sidebar-height': '24rem' } as React.CSSProperties}>
        <Sidebar collapsible="icon" label="Workspace">
          <SidebarHeader><SidebarInput aria-label="Search the workspace" placeholder="Search" /></SidebarHeader>
          <SidebarContent>
            <SidebarGroup aria-label="Workspace">
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {workspace.map((item, index) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton href={item.href} isActive={index === 0} tooltip={item.label}>
                        <item.icon aria-hidden="true" /><span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.label === 'Presets' ? <SidebarMenuBadge>12</SidebarMenuBadge> : null}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroupCollapsible>
              <SidebarGroupCollapsibleTrigger>Archive</SidebarGroupCollapsibleTrigger>
              <SidebarGroupCollapsibleContent>
                <SidebarMenu><SidebarMenuItem><SidebarMenuButton href="#old-presets"><span>Old presets</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
              </SidebarGroupCollapsibleContent>
            </SidebarGroupCollapsible>
          </SidebarContent>
          <SidebarFooter><span>Signed in</span></SidebarFooter>
          <SidebarRail />
        </Sidebar>
        {/* SidebarInset renders the page's main. This demo sits inside the scenario page's main, so it takes the
            inset's look on a div instead of nesting a second main landmark, as docs/components/sidebar.md advises. */}
        <div data-slot="sidebar-inset">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}>
            <SidebarTrigger />
            <input aria-label="Preset name" defaultValue="" />
            <textarea aria-label="Notes" rows={1} />
            <div contentEditable suppressContentEditableWarning aria-label="Caption" role="textbox" style={{ minInlineSize: '6rem', border: '1px solid var(--border)' }} />
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}

function SplitPanes() {
  return (
    <div data-testid="s09-resizable" style={{ blockSize: '14rem', inlineSize: '40rem', maxInlineSize: '100%', border: '1px solid var(--border)' }}>
      <ResizablePanelGroup direction="horizontal" autoSaveId="s09-split">
        <ResizablePanel id="preview" defaultSize="60%" minSize="20%"><div style={{ padding: '1rem' }}>Preview</div></ResizablePanel>
        <ResizableHandle withHandle aria-label="Resize preview and controls" />
        <ResizablePanel id="controls" defaultSize="40%" minSize="20%" collapsible collapsedSize="8%"><div data-testid="s09-controls" style={{ padding: '1rem' }}>Controls</div></ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

function EditorMenubar() {
  const [grid, setGrid] = React.useState(true)
  const [mode, setMode] = React.useState('light')
  return (
    <div data-testid="s09-menubar" style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
      <Menubar aria-label="Editor">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New preset<MenubarShortcut>Ctrl+N</MenubarShortcut></MenubarItem>
            <MenubarItem>Download JSON<MenubarShortcut>Ctrl+S</MenubarShortcut></MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Export</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>CSS variables</MenubarItem>
                <MenubarItem>Tailwind theme</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Undo<MenubarShortcut>Ctrl+Z</MenubarShortcut></MenubarItem>
            <MenubarItem>Redo</MenubarItem>
            <MenubarSeparator />
            <MenubarItem variant="destructive">Reset</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked={grid} onCheckedChange={value => setGrid(value === true)}>Grid</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarRadioGroup value={mode} onValueChange={value => setMode(String(value))}>
              <MenubarRadioItem value="light">Light</MenubarRadioItem>
              <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <output data-testid="s09-menubar-state">{`grid ${grid ? 'on' : 'off'}, ${mode}`}</output>
      <button type="button">After the menubar</button>
    </div>
  )
}

type PresetRow = { name: string; family: string; status: string }
const families = ['Ombelle', 'Flat', 'Papier', 'Organic']
const presetRows: PresetRow[] = Array.from({ length: 40 }, (_, index) => ({
  name: `Preset ${String(index + 1).padStart(2, '0')}`,
  family: families[index % families.length]!,
  status: index % 5 === 4 ? 'Accessibility caveat' : 'Stable',
}))
const presetColumns: DataTableColumn<PresetRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'family', header: 'Family' },
  { accessorKey: 'status', header: 'Status' },
  actionsColumn<PresetRow>(row => (
    <DataTableRowActions label={`Actions for ${row.original.name}`}>
      <DataTableRowAction>Open</DataTableRowAction>
      <DataTableRowAction variant="destructive">Delete</DataTableRowAction>
    </DataTableRowActions>
  )),
]

function PresetTable() {
  return (
    <div data-testid="s09-data-table">
      <DataTable aria-label="Presets" columns={presetColumns} data={presetRows} getRowId={row => row.name} selectable filterColumn="name" filterLabel="Filter presets"
        facets={[{ column: 'status', title: 'Status' }]} columnVisibility pagination pageSize={10} />
    </div>
  )
}

export function AppShellScenario09() {
  return (
    <section aria-label="0.9 app shell" data-testid="app-shell-09" style={{ display: 'grid', gap: '1.5rem', minInlineSize: 0 }}>
      <SiteNavigation />
      <EditorSidebar />
      <SplitPanes />
      <EditorMenubar />
      <PresetTable />
      <ProseArticle />
    </section>
  )
}
