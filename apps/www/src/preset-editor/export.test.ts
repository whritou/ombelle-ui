import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { canonicalize, sha256 } from '@ombelle/compiler/light'
import { supportedStyleFamilies } from '@ombelle/contracts'
import {
  createPresetDraft,
  fontControlOptions,
  setPresetEdit,
  type PresetEditorDraft,
} from './model'
import { handlePresetCompileMessage } from './compile-protocol'
import {
  canExportPreset,
  serializePresetExport,
  presetCssExport,
} from './export'
import type { PresetCompilerState } from './use-preset-compiler'

it('exports only the current normalized result and exact CSS artifacts', async () => {
  const draft = createPresetDraft('flat')
  const response = await handlePresetCompileMessage({
    type: 'compile-preset',
    requestId: 1,
    draft,
  })
  if (response.type !== 'preset-compiled') throw new Error('compile failed')
  const state: PresetCompilerState = {
    status: 'compiled',
    result: response.result,
    draftKey: canonicalize(draft),
    diagnostic: null,
    stale: false,
  }
  expect(serializePresetExport(state, draft)).toBe(
    canonicalize(response.result.preset.data) + '\n',
  )
  expect(presetCssExport(state, draft, 'tokens')).toBe(
    response.result.artifacts.find(
      (item) => item.logicalPath === 'styles/ui-tokens.css',
    )!.content,
  )
  expect(presetCssExport(state, draft, 'family')).toBe(
    response.result.artifacts.find(
      (item) => item.logicalPath === 'styles/ui-style.css',
    )!.content,
  )
  for (const status of ['compiling', 'invalid', 'idle'] as const)
    expect(canExportPreset({ ...state, status }, draft)).toBe(false)
  const changed = setPresetEdit(draft, '/design/radiusRem', '1')
  expect(canExportPreset(state, changed)).toBe(false)
  expect(() => serializePresetExport(state, changed)).toThrow()
  expect(() =>
    presetCssExport({ ...state, stale: true }, draft, 'tokens'),
  ).toThrow()
})

// Recorded before the instant-preview refactor; the fast preview path must leave every export byte unchanged.
it('keeps the export files and preset hash of each family and edited draft', async () => {
  const fraunces = fontControlOptions.headingFontFamilyId.find((id) => id === 'fraunces')!
  const drafts: Record<string, PresetEditorDraft> = {
    ...Object.fromEntries(
      supportedStyleFamilies.map((family) => [family, createPresetDraft(family)]),
    ),
    'flat radius 0': setPresetEdit(createPresetDraft('flat'), '/design/radiusRem', '0'),
    'flat dark primary': setPresetEdit(createPresetDraft('flat'), '/modes/dark/primary', '#2563EB'),
    'flat display font, no mono': setPresetEdit(
      setPresetEdit(createPresetDraft('flat'), '/design/headingFontFamilyId', fraunces),
      '/design/monoFontFamilyId',
      '',
    ),
  }
  const record: Record<string, unknown> = {}
  for (const [name, draft] of Object.entries(drafts)) {
    const response = await handlePresetCompileMessage({ type: 'compile-preset', requestId: 1, draft })
    if (response.type !== 'preset-compiled') throw new Error(name + ' failed to compile')
    const state: PresetCompilerState = {
      status: 'compiled',
      result: response.result,
      draftKey: canonicalize(draft),
      diagnostic: null,
      stale: false,
    }
    const preset = serializePresetExport(state, draft)
    record[name] = {
      presetHash: response.result.preset.hash,
      preset: JSON.parse(preset),
      presetSha256: await sha256(preset),
      tokensCssSha256: await sha256(presetCssExport(state, draft, 'tokens')),
      familyCssSha256: await sha256(presetCssExport(state, draft, 'family')),
    }
  }
  // Compared as parsed JSON so a checkout with other line endings still matches.
  const recorded = JSON.parse(readFileSync(new URL('./__snapshots__/export-before.json', import.meta.url), 'utf8'))
  expect(JSON.parse(JSON.stringify(record))).toEqual(recorded)
})
