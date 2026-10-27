import { expect, it } from 'vitest'
import { canonicalize } from '@ombelle/compiler'
import { createPresetDraft, setPresetEdit } from './model.js'
import { handlePresetCompileMessage } from './compile-protocol.js'
import { canExportPreset, serializePresetExport, presetCssExport } from './export.js'
import type { PresetCompilerState } from './use-preset-compiler.js'

it('exports only the current normalized result and exact CSS artifacts', async () => {
  const draft = createPresetDraft('flat')
  const response = await handlePresetCompileMessage({ type: 'compile-preset', requestId: 1, draft })
  if (response.type !== 'preset-compiled') throw new Error('compile failed')
  const state: PresetCompilerState = { status: 'compiled', result: response.result, draftKey: canonicalize(draft), diagnostic: null, stale: false }
  expect(serializePresetExport(state, draft)).toBe(canonicalize(response.result.preset.data) + '\n')
  expect(presetCssExport(state, draft, 'tokens')).toBe(response.result.artifacts.find((item) => item.logicalPath === 'styles/ui-tokens.css')!.content)
  expect(presetCssExport(state, draft, 'family')).toBe(response.result.artifacts.find((item) => item.logicalPath === 'styles/ui-style.css')!.content)
  for (const status of ['compiling', 'invalid', 'idle'] as const) expect(canExportPreset({ ...state, status }, draft)).toBe(false)
  const changed = setPresetEdit(draft, '/design/radiusRem', '1')
  expect(canExportPreset(state, changed)).toBe(false)
  expect(() => serializePresetExport(state, changed)).toThrow()
  expect(() => presetCssExport({ ...state, stale: true }, draft, 'tokens')).toThrow()
})
