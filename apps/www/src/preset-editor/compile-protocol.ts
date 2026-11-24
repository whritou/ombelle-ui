import { compile } from '@ombelle/compiler'
import { FoundationError, validatePreset, type CompileResult } from '@ombelle/contracts'
import {
  materializePreset,
  previewComponentIds,
  validateDraftEnvelope,
  type PresetEditorDraft,
} from './model'

export type PresetDiagnostic = {
  code: string
  message: string
  path?: string
  nextAction?: string
}
export type PresetCompileRequest = {
  type: 'compile-preset'
  requestId: number
  draft: PresetEditorDraft
}
/** A published snapshot's preset, compiled for its page's gallery (glass only: stable families go as tokens). */
export type SnapshotCompileRequest = {
  type: 'compile-snapshot'
  requestId: number
  preset: unknown
}
export type PresetCompileResponse =
  | { type: 'preset-compiled'; requestId: number; result: CompileResult }
  | { type: 'preset-invalid'; requestId: number; diagnostic: PresetDiagnostic }
export async function handlePresetCompileMessage(
  input: unknown,
): Promise<PresetCompileResponse> {
  const data = input as Partial<PresetCompileRequest> | Partial<SnapshotCompileRequest> | null
  const requestId =
    Number.isSafeInteger(data?.requestId) && data!.requestId! > 0
      ? data!.requestId!
      : 0
  try {
    if (
      !data ||
      typeof data !== 'object' ||
      Object.keys(data).length !== 3 ||
      (data.type !== 'compile-preset' && data.type !== 'compile-snapshot') ||
      requestId === 0
    )
      throw new FoundationError(
        'INVALID_MESSAGE',
        'Expected a preset compile request.',
      )
    const preset = data.type === 'compile-snapshot'
      ? validatePreset((data as Partial<SnapshotCompileRequest>).preset)
      : materializePreset(validateDraftEnvelope((data as Partial<PresetCompileRequest>).draft))
    return {
      type: 'preset-compiled',
      requestId,
      result: await compile({
        preset,
        componentIds: previewComponentIds(preset.styleFamily),
        catalogRelease: '0.1.0',
        compilerVersion: '0.1.0',
        // Keep schema-valid glass drafts previewable and exportable while the
        // editor reports any contrast warnings.
        glassContrast: 'report',
      }),
    }
  } catch (error) {
    return {
      type: 'preset-invalid',
      requestId,
      diagnostic:
        error instanceof FoundationError
          ? {
              code: error.code,
              message: error.message,
              ...(error.path && { path: error.path }),
              nextAction: error.nextAction,
            }
          : {
              code: 'COMPILE_FAILED',
              message: 'The preset could not be compiled.',
              nextAction: 'Retry or reset the draft.',
            },
    }
  }
}
