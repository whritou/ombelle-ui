import { glassContrastReport, resolvePreset } from '@ombelle/compiler'
import { getCatalogPresets } from '@ombelle/catalog/presets'
import type { PresetSnapshot } from '@ombelle/contracts'
import type { SnapshotFrame } from './snapshot-preview'

// Server only: the published preset page calls these; its client code imports snapshot-preview.ts.

/** Some Liquid Glass text of the snapshot falls below 4.5:1 in the contrast model. */
export function snapshotContrastWarning(snapshot: PresetSnapshot): boolean {
  return snapshot.preset.styleFamily === 'liquid-glass' && !glassContrastReport(snapshot.preset).passes
}

/**
 * How the page's gallery gets the snapshot, after checking that its preset resolves to its hash. A stable
 * family goes to the sandboxed gallery as tokens, which it resolves and verifies itself. Liquid glass needs
 * compiled styles: the page compiles them in the preset worker, off its main thread. Compiling here instead
 * would cost about 10 s of server time per read of a public page.
 */
export async function prepareSnapshotFrame(snapshot: PresetSnapshot): Promise<SnapshotFrame> {
  try {
    const resolved = await resolvePreset(snapshot.preset, getCatalogPresets(snapshot.catalogRelease))
    if (resolved.hash !== snapshot.presetHash) return { kind: 'failed' }
    return { kind: snapshot.preset.styleFamily === 'liquid-glass' ? 'worker' : 'tokens' }
  } catch {
    return { kind: 'failed' }
  }
}
