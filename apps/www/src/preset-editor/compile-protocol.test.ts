import { expect, it } from 'vitest'
import { compile } from '@ombelle/compiler'
import { supportedComponentIds } from '@ombelle/contracts'
import { createPresetDraft, materializePreset, setPresetEdit } from './model'
import { handlePresetCompileMessage } from './compile-protocol'

it('compiles the exact twelve-component edited preset', async () => {
  let draft = setPresetEdit(createPresetDraft('minimalist'), '/modes/light/primary', '#123456')
  draft = setPresetEdit(draft, '/modes/dark/primary', '#abcdef')
  const response = await handlePresetCompileMessage({ type: 'compile-preset', requestId: 1, draft })
  expect(response).toEqual({ type: 'preset-compiled', requestId: 1, result: await compile({ preset: materializePreset(draft), componentIds: supportedComponentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' }) })
})
it.each([null, { type: 'other', requestId: 1 }, { type: 'compile-preset', requestId: -1 }, { type: 'compile-preset', requestId: 1, draft: { ...createPresetDraft('flat'), extra: true } }, { type: 'compile-preset', requestId: 1, draft: { ...createPresetDraft('flat'), catalogRelease: '99.0.0' } }])('returns structured invalid message errors for %j', async (input) => {
  expect(await handlePresetCompileMessage(input)).toMatchObject({ type: 'preset-invalid', diagnostic: { code: expect.any(String), message: expect.any(String) } })
})
