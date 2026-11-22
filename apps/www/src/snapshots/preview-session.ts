import { compile, glassContrastReport, resolvePreset } from '@ombelle/compiler'
import { getCatalogPresets } from '@ombelle/catalog/presets'
import {
  componentsWithStyleSupport,
  type CompileResult,
  type PresetSnapshot,
} from '@ombelle/contracts'
import type { SnapshotPreview } from './snapshot-preview'
export type { SnapshotPreview } from './snapshot-preview'

/** Server only: the published preset page calls this; its client code imports snapshot-preview.ts. */
export async function prepareSnapshotPreview(
  snapshot: PresetSnapshot,
  options: { compile?: () => Promise<CompileResult> } = {},
): Promise<SnapshotPreview> {
  const glass = snapshot.preset.styleFamily === 'liquid-glass'
  const contrastWarning = glass && !glassContrastReport(snapshot.preset).passes
  try {
    if (!glass) {
      const resolved = await resolvePreset(snapshot.preset, getCatalogPresets(snapshot.catalogRelease))
      if (resolved.hash !== snapshot.presetHash) throw new Error('Snapshot hash mismatch')
      return { frame: { kind: 'tokens' }, contrastWarning }
    }
    const result = await (options.compile?.() ??
      compile({
        preset: snapshot.preset,
        // Glass previews only the components the family supports.
        componentIds: componentsWithStyleSupport(snapshot.preset.styleFamily, ['stable', 'experimental']),
        catalogRelease: snapshot.catalogRelease,
        compilerVersion: snapshot.compilerVersion,
        glassContrast: 'report',
      }))
    if (result.preset.hash !== snapshot.presetHash) throw new Error('Snapshot hash mismatch')
    return { frame: { kind: 'compiled', result }, contrastWarning }
  } catch {
    return { frame: { kind: 'failed' }, contrastWarning }
  }
}
