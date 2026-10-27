import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies } from '@ombelle/contracts'
import {
  createPresetDraft,
  materializePreset,
  validateDraftEnvelope,
  setPresetEdit,
  setPresetIdentity,
  resetPresetField,
  resetPresetTokens,
  planPresetFamilyChange,
  colorKeys,
  designControls,
} from './model'

it.each(supportedStyleFamilies)(
  'materializes %s without mutating catalog input',
  (family) => {
    const base = structuredClone(getCatalog('0.1.0').presets[family])
    const draft = createPresetDraft(family)
    expect(draft.identity).toEqual({
      id: 'project_preset',
      name: 'Project preset',
      revision: '1',
    })
    const result = materializePreset(draft)
    expect(result).toEqual({
      ...base,
      id: 'project_preset',
      name: 'Project preset',
      revision: 1,
    })
    result.modes.light.background = '#123456'
    expect(getCatalog('0.1.0').presets[family]).toEqual(base)
    expect(colorKeys).toHaveLength(19)
    expect(Object.keys(designControls)).toHaveLength(7)
  },
)

it('preserves explicit equal-to-base and invalid edits through family switching and reset', () => {
  let draft = setPresetEdit(
    createPresetDraft('flat'),
    '/design/radiusRem',
    '0.5',
  )
  draft = setPresetEdit(draft, '/modes/dark/primary', 'incomplete')
  const change = planPresetFamilyChange(draft, 'neo-brutalism')
  expect(change.draft.edits).toEqual(draft.edits)
  expect(change.draft.identity).toEqual(draft.identity)
  expect(change.changes.some((item) => item.path === '/design/radiusRem')).toBe(
    false,
  )
  expect(change.changes.length).toBeGreaterThan(0)
  expect(() => materializePreset(change.draft)).toThrow()
  const valid = resetPresetField(change.draft, '/modes/dark/primary')
  expect(materializePreset(valid).design.radiusRem).toBe(0.5)
  expect(
    materializePreset(resetPresetField(valid, '/design/radiusRem')).design
      .radiusRem,
  ).toBe(getCatalog('0.1.0').presets['neo-brutalism'].design.radiusRem)
  expect(resetPresetTokens(valid)).toEqual({ ...valid, edits: {} })
  expect(draft.family).toBe('flat')
})

it.each([
  ['radiusRem', 0, 2],
  ['borderWidthPx', 0, 4],
  ['shadowOffsetXPx', -16, 16],
  ['shadowOffsetYPx', -16, 16],
] as const)(
  'checks %s numeric endpoints without coercing incomplete input',
  (key, min, max) => {
    for (const value of [min, max])
      expect(
        materializePreset(
          setPresetEdit(
            createPresetDraft('flat'),
            `/design/${key}`,
            String(value),
          ),
        ).design[key],
      ).toBe(value)
    for (const raw of [
      String(min - 0.01),
      String(max + 0.01),
      '',
      ' ',
      'NaN',
      'Infinity',
      '1x',
    ]) {
      expect(() =>
        materializePreset(
          setPresetEdit(createPresetDraft('flat'), `/design/${key}`, raw),
        ),
      ).toThrow()
    }
  },
)

it('reports color and revision pointers while retaining invalid raw values', () => {
  const invalid = setPresetEdit(
    createPresetDraft('flat'),
    '/modes/light/background',
    'oklch(2 0 0)',
  )
  expect(validateDraftEnvelope(invalid)).toEqual(invalid)
  try {
    materializePreset(invalid)
    throw new Error('accepted invalid color')
  } catch (error) {
    expect(error).toHaveProperty('path', '/modes/light/background')
  }
  const valid = setPresetEdit(
    invalid,
    '/modes/light/background',
    'oklch(50% 0.1 120)',
  )
  expect(materializePreset(valid).modes.light.background).toBe(
    'oklch(50% 0.1 120)',
  )
  for (const revision of ['', ' ', '-1', '0', '1.5', '9007199254740992']) {
    expect(() =>
      materializePreset(setPresetIdentity(valid, 'revision', revision)),
    ).toThrow()
  }
  expect(
    materializePreset(setPresetIdentity(valid, 'revision', '9007199254740991'))
      .revision,
  ).toBe(Number.MAX_SAFE_INTEGER)
})

it('rejects unknown or oversized envelope data', () => {
  const draft = createPresetDraft('flat')
  for (const input of [
    null,
    { ...draft, extra: true },
    { ...draft, family: 'liquid-glass' },
    { ...draft, edits: { '/design/glassBlurPx': '1' } },
    { ...draft, edits: { '/design/radiusRem': 1 } },
    { ...draft, edits: { '/design/radiusRem': '1'.repeat(81) } },
    { ...draft, identity: { ...draft.identity, id: 'a'.repeat(81) } },
    { ...draft, identity: { ...draft.identity, revision: '1'.repeat(17) } },
    { ...draft, identity: { ...draft.identity, extra: '' } },
    { ...draft, edits: [] },
  ])
    expect(() => validateDraftEnvelope(input)).toThrow()
})
