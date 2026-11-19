'use client'
import { Calendar, DatePicker } from '@/components/ui/calendar'

export function Specimen() {
  return (
    <section aria-label="Calendar" data-component="calendar">
      <h2>Calendar</h2>
      <Calendar mode="range" today="2026-11-10" defaultMonth="2026-11-01" aria-label="Stay" selected={{ from: '2026-11-12', to: '2026-11-18' }} />
      <div className="preset-variant">
        <p id="gallery-due" className="preset-label">Due date</p>
        <DatePicker aria-labelledby="gallery-due" defaultValue="2026-11-12" calendar={{ today: '2026-11-10' }} />
      </div>
    </section>
  )
}
