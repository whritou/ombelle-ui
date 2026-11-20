'use client'
import { useMemo, useRef } from 'react'
import type { Preset } from '@ombelle/contracts'
import { materializePreset, type PresetEditorDraft } from './model'

/**
 * The draft as preset data, synchronously: `preset` is null while the draft cannot
 * be materialized, and `lastValid` keeps the last preset that could be.
 */
export function useLivePreset(draft: PresetEditorDraft): { preset: Preset | null; lastValid: Preset | null } {
  const last = useRef<Preset | null>(null)
  const preset = useMemo(() => {
    try {
      return materializePreset(draft)
    } catch {
      return null
    }
  }, [draft])
  if (preset) last.current = preset
  return { preset, lastValid: preset ?? last.current }
}
