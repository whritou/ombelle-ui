import { useSyncExternalStore } from 'react'

/** The editors' three structures: a phone below 768 px, a tablet up to 1199 px, the desktop from 1200 px. */
export const phoneQuery = '(max-width: 767px)'
export const tabletQuery = '(min-width: 768px) and (max-width: 1199px)'
export const desktopQuery = '(min-width: 1200px)'

export type ViewportClass = 'phone' | 'tablet' | 'desktop'

export function viewportClass(matches: (query: string) => boolean): ViewportClass {
  if (matches(phoneQuery)) return 'phone'
  if (matches(tabletQuery)) return 'tablet'
  return 'desktop'
}

function subscribe(onChange: () => void) {
  const lists = [phoneQuery, tabletQuery, desktopQuery].map(query => window.matchMedia(query))
  for (const list of lists) list.addEventListener('change', onChange)
  return () => { for (const list of lists) list.removeEventListener('change', onChange) }
}

const current = () => viewportClass(query => window.matchMedia(query).matches)

/**
 * The structure the viewport calls for. The server renders the desktop, so layout that CSS can
 * do stays in CSS; this is for parts that render differently, such as a sheet's side.
 */
export function useViewportClass(): ViewportClass {
  return useSyncExternalStore(subscribe, current, () => 'desktop')
}
