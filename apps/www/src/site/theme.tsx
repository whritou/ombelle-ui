'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Toggle } from '../generated/ui/components/ui/toggle'

export const themeStorageKey = 'ombelle-theme'

/** Runs before paint so the saved or system theme never flashes. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${themeStorageKey}');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`

/** Whether the site is dark, following the header toggle as it changes. */
export function useSiteDark(): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const read = () => setDark(root.classList.contains('dark'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])
  const toggle = (next: boolean) => {
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(themeStorageKey, next ? 'dark' : 'light')
    } catch {}
  }
  return (
    <Toggle
      variant="outline"
      size="sm"
      aria-label="Dark theme"
      pressed={dark}
      onPressedChange={toggle}
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </Toggle>
  )
}
