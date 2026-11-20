'use client'
import * as React from 'react'
import { GalleryGate, createGate } from './specimens/shared'
import { Specimen as InputGroupSpecimen } from './specimens/input-group'
import { Specimen as BreadcrumbSpecimen } from './specimens/breadcrumb'
import { Specimen as PaginationSpecimen } from './specimens/pagination'
import { Specimen as SheetSpecimen } from './specimens/sheet'
import { Specimen as AlertDialogSpecimen } from './specimens/alert-dialog'
import { Specimen as ToastSpecimen } from './specimens/toast'
import { Specimen as SpinnerSpecimen } from './specimens/spinner'
import { Specimen as KbdSpecimen } from './specimens/kbd'
import { Specimen as EmptySpecimen } from './specimens/empty'
import { Specimen as FieldSpecimen } from './specimens/field'
import { Specimen as MeterSpecimen } from './specimens/meter'
import { Specimen as StepperSpecimen } from './specimens/stepper'
import { Specimen as SliderSpecimen } from './specimens/slider'
import { Specimen as ToggleGroupSpecimen } from './specimens/toggle-group'
import { Specimen as ChipSpecimen } from './specimens/chip'
import { Specimen as TagInputSpecimen } from './specimens/tag-input'
import { Specimen as InputOtpSpecimen } from './specimens/input-otp'
import { Specimen as ComboboxSpecimen } from './specimens/combobox'
import { Specimen as CommandSpecimen } from './specimens/command'
import { Specimen as CalendarSpecimen } from './specimens/calendar'
import { Specimen as HoverCardSpecimen } from './specimens/hover-card'
import { Specimen as ContextMenuSpecimen } from './specimens/context-menu'
import { Specimen as ToggleSpecimen } from './specimens/toggle'
import { Specimen as CollapsibleSpecimen } from './specimens/collapsible'
import { Specimen as ScrollAreaSpecimen } from './specimens/scroll-area'
import { Specimen as ButtonGroupSpecimen } from './specimens/button-group'
import { Specimen as ItemSpecimen } from './specimens/item'
import { Specimen as NumberInputSpecimen } from './specimens/number-input'
import { Specimen as ColorPickerSpecimen } from './specimens/color-picker'
import { Specimen as PasswordFieldSpecimen } from './specimens/password-field'
import { Specimen as CarouselSpecimen } from './specimens/carousel'
import { Specimen as AspectRatioSpecimen } from './specimens/aspect-ratio'
import { Specimen as ToolbarSpecimen } from './specimens/toolbar'
import { Specimen as ProseSpecimen } from './specimens/prose'
import { Specimen as NavigationMenuSpecimen } from './specimens/navigation-menu'
import { Specimen as SidebarSpecimen } from './specimens/sidebar'
import { Specimen as ResizableSpecimen } from './specimens/resizable'
import { Specimen as MenubarSpecimen } from './specimens/menubar'
import { Specimen as DataTableSpecimen } from './specimens/data-table'
import { Specimen as CodeBlockSpecimen } from './specimens/code-block'
import { Specimen as ButtonSpecimen } from './specimens/button'
import { Specimen as BadgeSpecimen } from './specimens/badge'
import { Specimen as AlertSpecimen } from './specimens/alert'
import { Specimen as AvatarSpecimen } from './specimens/avatar'
import { Specimen as CardSpecimen } from './specimens/card'
import { Specimen as TabsSpecimen } from './specimens/tabs'
import { Specimen as TooltipSpecimen } from './specimens/tooltip'
import { Specimen as DropdownMenuSpecimen } from './specimens/dropdown-menu'
import { Specimen as PopoverSpecimen } from './specimens/popover'
import { Specimen as SeparatorSpecimen } from './specimens/separator'
import { Specimen as TableSpecimen } from './specimens/table'
import { Specimen as AccordionSpecimen } from './specimens/accordion'
import { Specimen as ProgressSpecimen } from './specimens/progress'
import { Specimen as SkeletonSpecimen } from './specimens/skeleton'
import { Specimen as DialogSpecimen } from './specimens/dialog'
import { Specimen as ProjectFormSpecimen } from './specimens/project-form'

// Family-independent: callers pass the component ids their family cannot
// style (from the shared support table) and the family's display name.
export type PresetGalleryProps = {
  unavailable?: readonly string[]
  familyLabel?: string
}

export function PresetGallery({
  unavailable = [],
  familyLabel = '',
}: PresetGalleryProps = {}) {
  const gate = createGate(unavailable, familyLabel)
  return (
    <GalleryGate.Provider value={{ unavailable, familyLabel }}>
      <main
        className="preset-gallery"
        data-testid="preset-gallery"
        aria-label="Preset component gallery"
      >
        <header>
          <h1>Your design system</h1>
          <p>A working collection of components in your project theme.</p>
        </header>
        {gate('input-group', 'Input Group', <InputGroupSpecimen />)}
        {gate('breadcrumb', 'Breadcrumb', <BreadcrumbSpecimen />)}
        {gate('pagination', 'Pagination', <PaginationSpecimen />)}
        {gate('sheet', 'Sheet', <SheetSpecimen />)}
        {gate('alert-dialog', 'Alert Dialog', <AlertDialogSpecimen />)}
        {gate('toast', 'Toast', <ToastSpecimen />)}
        {gate('spinner', 'Spinner', <SpinnerSpecimen />)}
        {gate('kbd', 'Kbd', <KbdSpecimen />)}
        {gate('empty', 'Empty State', <EmptySpecimen />)}
        {gate('field', 'Field', <FieldSpecimen />)}
        {gate('meter', 'Meter', <MeterSpecimen />)}
        {gate('stepper', 'Stepper', <StepperSpecimen />)}
        {gate('slider', 'Slider', <SliderSpecimen />)}
        {gate('toggle-group', 'Toggle Group', <ToggleGroupSpecimen />)}
        {gate('chip', 'Chip', <ChipSpecimen />)}
        {gate('tag-input', 'Tag Input', <TagInputSpecimen />)}
        {gate('input-otp', 'Input OTP', <InputOtpSpecimen />)}
        <div data-testid="overlays-search" className="preset-sections">
          {gate('combobox', 'Combobox', <ComboboxSpecimen />)}
          {gate('command', 'Command', <CommandSpecimen />)}
          {gate('calendar', 'Calendar', <CalendarSpecimen />)}
          {gate('hover-card', 'Hover Card', <HoverCardSpecimen />)}
          {gate('context-menu', 'Context Menu', <ContextMenuSpecimen />)}
          {gate('toggle', 'Toggle', <ToggleSpecimen />)}
          {gate('collapsible', 'Collapsible', <CollapsibleSpecimen />)}
          {gate('scroll-area', 'Scroll Area', <ScrollAreaSpecimen />)}
          {gate('button-group', 'Button Group', <ButtonGroupSpecimen />)}
          {gate('item', 'Item', <ItemSpecimen />)}
          {gate('number-input', 'Number Input', <NumberInputSpecimen />)}
          {gate('color-picker', 'Color Picker', <ColorPickerSpecimen />)}
          {gate('password-field', 'Password Field', <PasswordFieldSpecimen />)}
          {gate('carousel', 'Carousel', <CarouselSpecimen />)}
          {gate('aspect-ratio', 'Aspect Ratio', <AspectRatioSpecimen />)}
          {gate('toolbar', 'Toolbar', <ToolbarSpecimen />)}
          {gate('prose', 'Prose', <ProseSpecimen />)}
          {gate('navigation-menu', 'Navigation Menu', <NavigationMenuSpecimen />)}
          {gate('sidebar', 'Sidebar', <SidebarSpecimen />)}
          {gate('resizable', 'Resizable', <ResizableSpecimen />)}
          {gate('menubar', 'Menubar', <MenubarSpecimen />)}
          {gate('data-table', 'Data Table', <DataTableSpecimen />)}
          {gate('code-block', 'Code Block', <CodeBlockSpecimen />)}
        </div>
        <ButtonSpecimen />
        <BadgeSpecimen />
        {gate('alert', 'Alert', <AlertSpecimen />)}
        {gate('avatar', 'Avatar', <AvatarSpecimen />)}
        <CardSpecimen />
        <ProjectFormSpecimen />
        <TabsSpecimen />
        <TooltipSpecimen />
        {gate('dropdown-menu', 'Dropdown Menu', <DropdownMenuSpecimen />)}
        {gate('popover', 'Popover', <PopoverSpecimen />)}
        {gate('separator', 'Separator', <SeparatorSpecimen />)}
        {gate('table', 'Table', <TableSpecimen />)}
        {gate('accordion', 'Accordion', <AccordionSpecimen />)}
        {gate('progress', 'Progress', <ProgressSpecimen />)}
        {gate('skeleton', 'Skeleton', <SkeletonSpecimen />)}
        <DialogSpecimen />
      </main>
    </GalleryGate.Provider>
  )
}
