import { compile } from '@ombelle/compiler'
import { FoundationError, supportedComponentIds, type CompileResult } from '@ombelle/contracts'
import { materializePreset, validateDraftEnvelope, type PresetEditorDraft } from './model.js'

export type PresetDiagnostic = { code: string; message: string; path?: string; nextAction?: string }
export type PresetCompileRequest = { type: 'compile-preset'; requestId: number; draft: PresetEditorDraft }
export type PresetCompileResponse = { type: 'preset-compiled'; requestId: number; result: CompileResult } | { type: 'preset-invalid'; requestId: number; diagnostic: PresetDiagnostic }
export async function handlePresetCompileMessage(input: unknown): Promise<PresetCompileResponse> {
  const data = input as Partial<PresetCompileRequest> | null
  const requestId = Number.isSafeInteger(data?.requestId) && data!.requestId! > 0 ? data!.requestId! : 0
  try {
    if (!data || typeof data !== 'object' || Object.keys(data).length !== 3 || data.type !== 'compile-preset' || requestId === 0) throw new FoundationError('INVALID_MESSAGE', 'Expected a preset compile request.')
    const preset = materializePreset(validateDraftEnvelope(data.draft))
    return { type: 'preset-compiled', requestId, result: await compile({ preset, componentIds: supportedComponentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' }) }
  } catch (error) {
    return { type: 'preset-invalid', requestId, diagnostic: error instanceof FoundationError ? { code: error.code, message: error.message, ...(error.path && { path: error.path }), nextAction: error.nextAction } : { code: 'COMPILE_FAILED', message: 'The preset could not be compiled.', nextAction: 'Retry or reset the draft.' } }
  }
}
