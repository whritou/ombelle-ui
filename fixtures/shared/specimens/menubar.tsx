'use client'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarShortcut, MenubarTrigger } from '@/components/ui/menubar'

export function Specimen() {
  return (
    <section aria-label="Menubar" data-component="menubar">
      <h2>Menubar</h2>
      <Menubar aria-label="Gallery editor">
        <MenubarMenu><MenubarTrigger>File</MenubarTrigger><MenubarContent><MenubarItem>Download JSON<MenubarShortcut>Ctrl+S</MenubarShortcut></MenubarItem></MenubarContent></MenubarMenu>
        <MenubarMenu><MenubarTrigger>Edit</MenubarTrigger><MenubarContent><MenubarItem>Undo<MenubarShortcut>Ctrl+Z</MenubarShortcut></MenubarItem></MenubarContent></MenubarMenu>
        <MenubarMenu><MenubarTrigger>View</MenubarTrigger><MenubarContent><MenubarItem>Grid</MenubarItem></MenubarContent></MenubarMenu>
      </Menubar>
    </section>
  )
}
