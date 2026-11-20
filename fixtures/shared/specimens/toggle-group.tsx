'use client'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function Specimen() {
  return (
    <section aria-label="Toggle Group" data-component="toggle-group">
      <h2>Toggle Group</h2>
      <ToggleGroup type="single" defaultValue="week" aria-label="Calendar view"><ToggleGroupItem value="day">Day</ToggleGroupItem><ToggleGroupItem value="week">Week</ToggleGroupItem><ToggleGroupItem value="month">Month</ToggleGroupItem></ToggleGroup>
      <div className="preset-variant">
        <ToggleGroup type="multiple" variant="toolbar" defaultValue={['bold']} aria-label="Text formatting"><ToggleGroupItem value="bold" aria-label="Bold"><b aria-hidden="true">B</b></ToggleGroupItem><ToggleGroupItem value="italic" aria-label="Italic"><i aria-hidden="true">I</i></ToggleGroupItem><ToggleGroupItem value="underline" aria-label="Underline"><u aria-hidden="true">U</u></ToggleGroupItem></ToggleGroup>
      </div>
    </section>
  )
}
