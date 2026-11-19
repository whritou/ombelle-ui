'use client'
import { Toolbar, ToolbarButton, ToolbarLink, ToolbarOverflow, ToolbarSeparator, ToolbarToggleGroup, ToolbarToggleItem } from '@/components/ui/toolbar'

export function Specimen() {
  return (
    <section aria-label="Toolbar" data-component="toolbar">
      <h2>Toolbar</h2>
      <Toolbar aria-label="Preset editor">
        <ToolbarButton>Undo</ToolbarButton>
        <ToolbarButton>Redo</ToolbarButton>
        <ToolbarSeparator />
        <ToolbarToggleGroup type="single" defaultValue="light" aria-label="Theme">
          <ToolbarToggleItem value="light">Light</ToolbarToggleItem>
          <ToolbarToggleItem value="dark">Dark</ToolbarToggleItem>
        </ToolbarToggleGroup>
        <ToolbarSeparator />
        <ToolbarToggleGroup type="multiple" defaultValue={['grid']} aria-label="Guides">
          <ToolbarToggleItem value="grid">Grid</ToolbarToggleItem>
        </ToolbarToggleGroup>
        <ToolbarLink href="#preview">Open preview</ToolbarLink>
        <ToolbarOverflow />
      </Toolbar>
    </section>
  )
}
