import { useEffect, useState } from 'react'
import { Monitor, Moon, Smartphone, Sun } from 'lucide-react'
import { reducedTransparencySupported } from '../site/reduced-transparency'

/** Light and Dark preview options shared by both editors. */
export const previewModeOptions = [
  { value: 'light', label: 'Light', icon: <Sun aria-hidden="true" size={14} /> },
  { value: 'dark', label: 'Dark', icon: <Moon aria-hidden="true" size={14} /> },
] as const

/** Whether the preview can simulate prefers-reduced-transparency in this browser; false until mounted. */
export function useReducedTransparencySupport(): boolean {
  const [supported, setSupported] = useState(false)
  useEffect(() => setSupported(reducedTransparencySupported(typeof window === 'undefined' ? undefined : window.matchMedia.bind(window))), [])
  return supported
}

/** The liquid glass preview's simulated prefers-reduced-transparency; preview only, never saved. */
export const previewTransparencyOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'reduced', label: 'Reduced' },
] as const

/** Wide and narrow preview options; each editor names its narrow width. */
export function previewWidthOptions(narrowLabel: string) {
  return [
    { value: 'wide', label: 'Wide', icon: <Monitor aria-hidden="true" size={14} /> },
    { value: 'narrow', label: narrowLabel, icon: <Smartphone aria-hidden="true" size={14} /> },
  ] as const
}
