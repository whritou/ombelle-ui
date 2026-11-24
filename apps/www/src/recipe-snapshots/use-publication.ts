'use client'
import type { InstallableRecipeCompileResult } from '@ombelle/contracts'
import { usePublicationController } from '../publication/controller'
import { recipePublication } from './publication-kind'

/** Publication of a recipe editor's draft to `/api/v1/recipes`. */
export function useRecipePublication(input: {
  storageKey?: string
  recipe: InstallableRecipeCompileResult['recipe'] | null
  current: boolean
  announce: (text: string) => void
}) {
  return usePublicationController(recipePublication, {
    draft: input.recipe,
    current: input.current,
    announce: input.announce,
    storageKey: input.storageKey,
  })
}
