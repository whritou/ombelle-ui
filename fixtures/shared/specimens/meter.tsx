'use client'
import { Meter, MeterLabel, MeterValue, MeterSegment, MeterLegend, MeterLegendItem } from '@/components/ui/meter'

export function Specimen() {
  return (
    <section aria-label="Meter" data-component="meter">
      <h2>Meter</h2>
      <Meter value={128} max={200} segments={10} warningAt={0.6}><MeterLabel>Deploys this month</MeterLabel><MeterValue /></Meter>
      <Meter max={10}><MeterLabel>Storage</MeterLabel><MeterValue>7 / 10 GB</MeterValue><MeterSegment value={4} tone="primary" /><MeterSegment value={2} tone="info" /><MeterSegment value={1} tone="success" />
        <MeterLegend><MeterLegendItem tone="primary">Builds</MeterLegendItem><MeterLegendItem tone="info">Assets</MeterLegendItem><MeterLegendItem tone="success">Logs</MeterLegendItem></MeterLegend></Meter>
      <div data-component="meter~circle"><Meter value={72} max={100} shape="circle"><MeterLabel>Storage used</MeterLabel></Meter></div>
    </section>
  )
}
