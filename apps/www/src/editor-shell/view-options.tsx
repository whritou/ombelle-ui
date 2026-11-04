import { Monitor, Moon, Smartphone, Sun } from 'lucide-react'

/** Light and Dark preview options shared by both editors. */
export const previewModeOptions = [
  { value: 'light', label: 'Light', icon: <Sun aria-hidden="true" size={14} /> },
  { value: 'dark', label: 'Dark', icon: <Moon aria-hidden="true" size={14} /> },
] as const

/** Wide and narrow preview options; each editor names its narrow width. */
export function previewWidthOptions(narrowLabel: string) {
  return [
    { value: 'wide', label: 'Wide', icon: <Monitor aria-hidden="true" size={14} /> },
    { value: 'narrow', label: narrowLabel, icon: <Smartphone aria-hidden="true" size={14} /> },
  ] as const
}
