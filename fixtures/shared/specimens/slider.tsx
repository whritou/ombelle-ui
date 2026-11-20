'use client'
import { Slider, SliderTicks, SliderValue } from '@/components/ui/slider'

export function Specimen() {
  return (
    <section aria-label="Slider" data-component="slider">
      <h2>Slider</h2>
      <Slider defaultValue={[12]} max={24} aria-label="Border radius" getValueText={value => `${value} pixels`} />
      <Slider defaultValue={[20, 80]} thumbLabels={['Minimum price', 'Maximum price']} />
      <SliderTicks values={[0, 25, 50, 75, 100]} />
      <div data-component="slider~readout"><Slider defaultValue={[12]} max={48} aria-labelledby="gallery-slider-radius" getValueText={value => `${value} px`}>
        <span id="gallery-slider-radius">Radius</span><SliderValue /></Slider></div>
      <div data-component="slider~editable"><Slider defaultValue={[0.75]} max={1} step={0.05} aria-labelledby="gallery-slider-shadow">
        <span id="gallery-slider-shadow">Shadow opacity</span><SliderValue editable /></Slider></div>
    </section>
  )
}
