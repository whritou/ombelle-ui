'use client'
import type { ResolvedPreset } from '@ombelle/contracts'
import { usePublicationController } from '../publication/controller'
import { presetPublication } from './publication-kind'

/** Publication of the preset editor's draft to `/api/v1/presets`. */
export function usePublication(input: {
  preset: ResolvedPreset | null
  current: boolean
  announce: (text: string) => void
}) {
  return usePublicationController(presetPublication, {
    draft: input.preset,
    current: input.current,
    announce: input.announce,
  })
}
