import {
  validatePreset,
  FoundationError,
  isSupportedContractRelease,
  type Preset,
  type Recipe,
  type ResolvedPreset,
} from '@ombelle/contracts'
import type { Catalog } from '@ombelle/catalog'
import { canonicalize } from './canonicalize.js'
import { sha256 } from './hash.js'
/** Canonical spelling of a schema-valid color (lowercase hex, plain OKLCH numbers). */
export function normalizeColor(color: string): string {
  if (color.startsWith('#')) return color.toLowerCase()
  const [l, c, h, , a] = color.slice(6, -1).split(' ')
  const n = (s: string) =>
    Number(s.replace('%', '')) / (s.endsWith('%') ? 100 : 1)
  return (
    'oklch(' +
    n(l) +
    ' ' +
    Number(c) +
    ' ' +
    Number(h) +
    (a === undefined ? '' : ' / ' + n(a)) +
    ')'
  )
}
/**
 * The resolved preset data without validation or hashing: catalog defaults
 * merged in and colors normalized. Idempotent on already-resolved data.
 */
export function presetWithDefaults(p: Preset, catalog: Catalog): ResolvedPreset['data'] {
  const base = catalog.presets[p.styleFamily]
  if (!base)
    throw new FoundationError(
      'INVALID_DATA',
      'Style family is not available in the foundation',
      '/styleFamily',
    )
  const data = {
    ...base,
    ...p,
    design: { ...base.design, ...p.design },
    componentDefaults: {
      button: {
        variant: 'default' as const,
        size: 'default' as const,
        ...base.componentDefaults?.button,
        ...p.componentDefaults?.button,
      },
    },
    modes: {
      light: { ...base.modes.light, ...p.modes.light },
      dark: { ...base.modes.dark, ...p.modes.dark },
    },
  }
  for (const mode of ['light', 'dark'] as const)
    for (const key of Object.keys(
      data.modes[mode],
    ) as (keyof typeof data.modes.light)[])
      data.modes[mode][key] = normalizeColor(data.modes[mode][key]!)
  return data
}
export async function resolvePreset(
  input: unknown,
  catalog: Catalog,
): Promise<ResolvedPreset> {
  const p = validatePreset(input)
  if (p.catalogRelease !== catalog.release || !isSupportedContractRelease(p.compilerVersion))
    throw new FoundationError(
      'UNSUPPORTED_RELEASE',
      'Preset release mismatch',
      '/catalogRelease',
    )
  const data = presetWithDefaults(p, catalog)
  return { data, hash: await sha256(canonicalize(data)) }
}

/**
 * A resolved built-in preset stored by a recipe snapshot or lock row, checked against the recipe's
 * `presetRef` and used in place of today's built-in, so a published recipe keeps the preset it was
 * published with (decision 0009).
 */
export function pinnedRecipePreset(preset: Preset, ref: Recipe['presetRef']): Preset {
  const pinned = validatePreset(preset)
  if (pinned.id !== ref.id || pinned.revision !== ref.revision ||
    pinned.catalogRelease !== ref.catalogRelease || pinned.compilerVersion !== ref.compilerVersion)
    throw new FoundationError('INVALID_DATA', 'The stored preset is not the built-in preset the recipe names', '/preset')
  return pinned
}
/** A stored, already resolved preset identified by its own bytes rather than by re-resolution. */
export async function storedPresetIdentity(preset: Preset): Promise<ResolvedPreset> {
  const data = structuredClone(preset) as ResolvedPreset['data']
  return { data, hash: await sha256(canonicalize(data)) }
}
