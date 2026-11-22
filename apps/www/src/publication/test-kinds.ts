import { getCatalog } from '@ombelle/catalog'
import { normalizePublishedPreset, normalizePublishedRecipe } from '@ombelle/compiler'
import type { PresetSnapshot, RecipeSnapshot } from '@ombelle/contracts'
import example from '../../../../examples/recipe.example.json'
import { presetPublication } from '../snapshots/publication-kind'
import { recipePublication } from '../recipe-snapshots/publication-kind'
import type { PublicationKind } from './kind'

// Each publication suite runs once per kind, so presets and recipes share every case.
export type Any = { field: any; hashField: any; data: any; snapshot: any; resolved: any }
export type Resolved = { data: unknown; hash: string }
export type Family = 'flat' | 'minimalist'

const presetSnapshots = new Map<string, { data: unknown; hash: string }>()
export const kinds: {
  name: string
  kind: PublicationKind<Any>
  draft: (family?: Family) => Promise<Resolved>
  envelope: (draft: Resolved) => unknown
}[] = [
  {
    name: 'preset',
    kind: presetPublication as PublicationKind<Any>,
    draft: (family = 'flat') =>
      normalizePublishedPreset(getCatalog('0.1.0').presets[family]),
    envelope: (p): PresetSnapshot => ({
      snapshotVersion: '1.0',
      id: 'ps_0123456789abcdef0123456789abcdef',
      revision: 1,
      preset: p.data as PresetSnapshot['preset'],
      presetHash: p.hash,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      createdAt: '2026-10-27T12:34:56.000Z',
      validationStatus: 'draft',
    }),
  },
  {
    name: 'recipe',
    kind: recipePublication as PublicationKind<Any>,
    draft: async (family = 'flat') => {
      const preset = getCatalog('0.1.0').presets[family]
      const result = await normalizePublishedRecipe({
        ...example,
        presetRef: {
          id: preset.id,
          revision: preset.revision,
          catalogRelease: preset.catalogRelease,
          compilerVersion: preset.compilerVersion,
        },
      })
      presetSnapshots.set(result.recipe.hash, result.preset)
      return result.recipe
    },
    envelope: (p): RecipeSnapshot => ({
      snapshotVersion: '1.0',
      id: 'rc_0123456789abcdef0123456789abcdef',
      revision: 1,
      recipe: p.data as RecipeSnapshot['recipe'],
      recipeHash: p.hash,
      preset: presetSnapshots.get(p.hash)!.data as RecipeSnapshot['preset'],
      presetHash: presetSnapshots.get(p.hash)!.hash,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      createdAt: '2026-10-27T12:34:56.000Z',
      validationStatus: 'draft',
    }),
  },
]

export function storage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    key: (n) => [...values.keys()][n] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v)
    },
    removeItem: (k) => {
      values.delete(k)
    },
  }
}
