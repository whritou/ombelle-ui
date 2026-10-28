import {
  FoundationError,
  validateSnapshotSource,
  type InstallPlan,
  type Preset,
  type ProjectContext,
  type ProjectLock,
} from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { canonicalize, resolvePreset } from '@ombelle/compiler'
import { fileChange } from '../plan/components.js'
import type { ResolvedPresetInput } from './input.js'

/** Validate installed provenance using saved bytes only; never resolve remotely. */
export async function validateSnapshotSources(
  lock: ProjectLock, globalPreset: Preset | undefined,
): Promise<void> {
  const bad = () => new FoundationError(
    'UNSUPPORTED_PROJECT',
    'Invalid snapshot source provenance in the project lock',
    '/presetSource',
    'Restore the committed lockfile and saved preset before installing.',
  )
  try {
    if (lock.presetSource !== undefined) {
      const source = validateSnapshotSource(lock.presetSource)
      if (!globalPreset) throw bad()
      const resolved = await resolvePreset(globalPreset, getCatalog(lock.catalogRelease))
      if (source.presetHash !== resolved.hash || source.presetHash !== lock.presetHash)
        throw bad()
    }
    if (lock.componentPresetSources !== undefined) {
      const sources = lock.componentPresetSources
      if (!sources || typeof sources !== 'object' || Array.isArray(sources)) throw bad()
      for (const [key, value] of Object.entries(sources)) {
        const source = validateSnapshotSource(value)
        const installed = Object.hasOwn(lock.componentPresets ?? {}, key)
          ? lock.componentPresets![key] : undefined
        if (!installed) throw bad()
        const resolved = await resolvePreset(installed.preset.data, getCatalog(installed.provenance.catalogRelease))
        if (source.presetHash !== resolved.hash || source.presetHash !== installed.preset.hash)
          throw bad()
      }
    }
  } catch {
    throw bad()
  }
}

/** Attach source metadata to the guarded lock change, outside compiler identities. */
export async function applyPresetSourceToPlan(
  plan: InstallPlan, context: ProjectContext, input: ResolvedPresetInput,
  scope: 'global' | 'component',
): Promise<void> {
  // A conflicting embedded identity must never acquire another source/hash.
  if (plan.diagnostics.length || plan.changes.some(change => change.action === 'conflict')) return
  const index = plan.changes.findIndex(change => change.kind === 'lock')
  const state = plan.changes[index]
  if (!state) throw new FoundationError('INTERNAL_ERROR', 'Preset plan is missing its lock change')
  const lock = JSON.parse(state.afterContent) as ProjectLock
  if (scope === 'global') {
    if (input.source) lock.presetSource = structuredClone(input.source)
    else delete lock.presetSource
  } else if (input.source) {
    const key = input.preset.id + '@' + input.preset.revision
    const installed = lock.componentPresets?.[key]
    if (!installed || installed.preset.hash !== input.source.presetHash)
      throw new FoundationError('FILE_CONFLICT', 'Component preset source does not match the planned bytes', key)
    // Identical bytes preserve the first source, including local/other-code retries.
    lock.componentPresetSources = {
      ...lock.componentPresetSources,
      [key]: lock.componentPresetSources?.[key] ?? structuredClone(input.source),
    }
  }
  const next = await fileChange(context.root, state.path, canonicalize(lock) + '\n', 'lock')
  if (next.beforeHash !== state.beforeHash)
    throw new FoundationError('FILE_CONFLICT', 'Lock changed while planning source provenance', state.path)
  plan.changes[index] = next
}
