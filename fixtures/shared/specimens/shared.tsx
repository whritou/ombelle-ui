'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, ToastViewport } from '@/components/ui/toast'

// The board's field trip photos as small 16:9 SVGs, one hue each: the gallery ships no image files.
// The Carousel example's slides: each built-in style family, pictured in its own colours.
export const presetSlides = [
  { id: 'ombelle', name: 'Ombelle', stable: true },
  { id: 'papier', name: 'Papier', stable: true },
  { id: 'organic', name: 'Organic', stable: true },
  { id: 'retro-futurism', name: 'Retro futurism', stable: true },
  { id: 'flat', name: 'Flat', stable: true },
  { id: 'minimalist', name: 'Minimalist', stable: true },
  { id: 'neo-brutalism', name: 'Neo brutalism', stable: true },
  { id: 'liquid-glass', name: 'Liquid glass', stable: false },
] as const
export const fieldTripPhotos = [
  ['A lake below pine hills', 195], ['Sand dunes at dusk', 25], ['A city skyline at night', 240], ['A coastline', 200], ['A field of poppies', 95],
].map(([alt, hue]) => ({ alt: alt as string, src: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'>`
  + `<rect width='16' height='9' fill='hsl(${hue} 70% 82%)'/><path d='M0 6.5Q5 3.5 10 6t6-1V9H0z' fill='hsl(${hue} 45% 38%)'/></svg>`) }))

export function ToastExample() {
  const [open, setOpen] = React.useState(false)
  return <><Button variant="outline" onClick={() => setOpen(true)}>Show notification</Button>
    <Toast open={open} onOpenChange={setOpen} variant="success">
      <ToastTitle>Changes saved</ToastTitle><ToastDescription>Your project is up to date.</ToastDescription>
      <ToastAction altText="Undo the last change">Undo</ToastAction><ToastClose />
    </Toast><ToastViewport /></>
}


export function Unavailable({
  id,
  name,
  familyLabel,
}: {
  id: string
  name: string
  familyLabel: string
}) {
  return (
    <div
      className="preset-unavailable"
      data-component={id}
      data-unavailable=""
      aria-disabled="true"
    >
      <strong>{name}</strong>
      <span>Unavailable in {familyLabel}</span>
    </div>
  )
}

// Components the current family cannot style, supplied by the gallery. Specimens
// rendered on their own have none, so every gate passes its content through.
export type GalleryGateValue = { unavailable: readonly string[]; familyLabel: string }
export const GalleryGate = React.createContext<GalleryGateValue>({ unavailable: [], familyLabel: '' })

export function createGate(unavailable: readonly string[], familyLabel: string) {
  return (id: string, name: string, node: React.ReactNode) =>
    unavailable.includes(id) ? <Unavailable id={id} name={name} familyLabel={familyLabel} /> : node
}

export function useGate() {
  const { unavailable, familyLabel } = React.useContext(GalleryGate)
  return createGate(unavailable, familyLabel)
}
