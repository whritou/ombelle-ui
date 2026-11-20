import type { ComponentId, StyleFamily, supportedStyleFamilies } from '@ombelle/contracts'

export type BuiltInFamily = (typeof supportedStyleFamilies)[number]

/** Components whose specimens need the document (fixed overlays, viewport layout), so they keep the iframe. */
export const iframeOnly: ReadonlySet<ComponentId> = new Set<ComponentId>(['sidebar'])

/** Components whose specimens cannot render on the server; the stage mounts them after hydration. */
export const clientOnly: ReadonlySet<ComponentId> = new Set<ComponentId>([
  // The Date Picker writes its date in the runtime's locale, which differs between the server and the browser.
  'calendar',
])

export function previewPath(id: ComponentId, family: StyleFamily): 'inline' | 'iframe' {
  return family === 'liquid-glass' || iframeOnly.has(id) ? 'iframe' : 'inline'
}

export function previewStylesheets(family: BuiltInFamily, id: ComponentId): [string, string] {
  return [`/previews/${family}/base.css`, `/previews/${family}/${id}.css`]
}
