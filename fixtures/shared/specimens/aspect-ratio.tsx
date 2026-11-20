'use client'
import { AspectRatio } from '@/components/ui/aspect-ratio'

export function Specimen() {
  return (
    <section aria-label="Aspect Ratio" data-component="aspect-ratio">
      <h2>Aspect Ratio</h2>
      <div className="preset-row">
        <AspectRatio ratio={16 / 9} style={{ inlineSize: '12rem' }}><span>16 : 9</span></AspectRatio>
        <AspectRatio ratio={1} style={{ inlineSize: '6rem' }}><span>1 : 1</span></AspectRatio>
        <AspectRatio ratio={4 / 3} style={{ inlineSize: '8rem' }}><span>4 : 3</span></AspectRatio>
      </div>
    </section>
  )
}
