import { canonicalize } from '@ombelle/compiler'
import type { PresetEditorDraft } from './model'
import type { PresetCompilerState } from './use-preset-compiler'
export function canExportPreset(
  state: PresetCompilerState,
  draft: PresetEditorDraft,
): boolean {
  return (
    state.status === 'compiled' &&
    !state.stale &&
    state.result !== null &&
    state.draftKey === canonicalize(draft)
  )
}
function result(state: PresetCompilerState, draft: PresetEditorDraft) {
  if (!canExportPreset(state, draft))
    throw new Error('Wait for the current draft to compile.')
  return state.result!
}
export function serializePresetExport(
  state: PresetCompilerState,
  draft: PresetEditorDraft,
): string {
  return canonicalize(result(state, draft).preset.data) + '\n'
}
export function presetCssExport(
  state: PresetCompilerState,
  draft: PresetEditorDraft,
  kind: 'tokens' | 'family',
): string {
  const path =
    kind === 'tokens' ? 'styles/ui-tokens.css' : 'styles/ui-style.css'
  const artifact = result(state, draft).artifacts.find(
    (item) => item.logicalPath === path,
  )
  if (!artifact) throw new Error('Required CSS artifact is missing.')
  return artifact.content
}
