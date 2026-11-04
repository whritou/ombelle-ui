'use client'

import { useCallback, useEffect, useState } from 'react'

// Storage can be missing or throw (private windows, blocked site data, SSR),
// so every access falls back to the supplied initial value.
export function readDrawerOpen(storageKey: string, initialOpen: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored === 'open') return true
    if (stored === 'closed') return false
  } catch {
    // fall through to the initial value
  }
  return initialOpen
}

export function writeDrawerOpen(storageKey: string, open: boolean): void {
  try {
    window.localStorage.setItem(storageKey, open ? 'open' : 'closed')
  } catch {
    // keep the in-memory state only
  }
}

export function useDrawerState(
  storageKey: string,
  initialOpen = false,
): [boolean, (open: boolean) => void] {
  const [open, setOpenState] = useState(initialOpen)
  // Read after mount so server and first client render agree.
  useEffect(() => {
    setOpenState(readDrawerOpen(storageKey, initialOpen))
  }, [storageKey, initialOpen])
  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next)
      writeDrawerOpen(storageKey, next)
    },
    [storageKey],
  )
  return [open, setOpen]
}
