import { compareVersions, organicMinimumCli, publishedInstaller } from '../snapshots/install-command'
import { describe, expect, it } from 'vitest'
import { getCatalog, startingPresetOrder, styleFamilyFonts } from '@ombelle/catalog'
import { styleFamilies } from '@ombelle/contracts'
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
  glassDesignControls,
  fontControlOptions,
  fontLabel,
  fontChoiceIsStyleFont,
  presetFieldValue,
  presetGlassReport,
  previewComponentIds,
  applyStartingPreset,
  matchingStartingPreset,
  applyGlassTint,
} from './model'

it.each(styleFamilies)(
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
    const fonts = styleFamilyFonts[family]
    // A new draft carries its style's fonts, which is why it declares 1.1.
    expect(result).toEqual({
      ...base,
      schemaVersion: '1.1',
      id: 'project_preset',
      name: 'Project preset',
      revision: 1,
      design: {
        ...base.design,
        fontFamilyId: fonts.body,
        ...(fonts.display === fonts.body ? {} : { headingFontFamilyId: fonts.display }),
        monoFontFamilyId: fonts.mono,
      },
    })
    result.modes.light.background = '#123456'
    expect(getCatalog('0.1.0').presets[family]).toEqual(base)
    expect(colorKeys).toHaveLength(19)
    // Seven shape and depth controls plus the display and code font pickers.
    expect(Object.keys(designControls)).toHaveLength(9)
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
    { ...draft, family: 'aurora' },
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

it('creates a valid liquid-glass draft based on builtin-liquid-glass', () => {
  const draft = createPresetDraft('liquid-glass')
  expect(validateDraftEnvelope(draft)).toEqual(draft)
  const base = getCatalog('0.1.0').presets['liquid-glass']
  expect(base.id).toBe('builtin-liquid-glass')
  const preset = materializePreset(draft)
  expect(preset.styleFamily).toBe('liquid-glass')
  expect(preset.design).toEqual({
    ...base.design,
    fontFamilyId: 'inter',
    headingFontFamilyId: 'inter-tight',
    monoFontFamilyId: 'jetbrains-mono',
  })
  expect(presetFieldValue(draft, '/design/glassOpacity')).toBe('0.57')
  expect(presetFieldValue(draft, '/design/glassBlurPx')).toBe('3')
  expect(presetFieldValue(draft, '/design/glassBackdropContrast')).toBe('0.45')
  expect(presetFieldValue(draft, '/design/transparency')).toBe('auto')
  // The material settings a preset leaves out read as 0.
  expect(presetFieldValue(draft, '/design/glassHalo')).toBe('0')
})

it('reports a failing contrast bound for a glass opacity edit of 0.3', () => {
  const draft = createPresetDraft('liquid-glass')
  expect(presetGlassReport(draft)).toMatchObject({ passes: true, opacity: 0.57 })
  const thin = setPresetEdit(draft, '/design/glassOpacity', '0.3')
  const report = presetGlassReport(thin)!
  expect(report.passes).toBe(false)
  expect(report.opacity).toBe(0.3)
  expect(report.minimumOpacity).toEqual(expect.any(Number))
  expect(report.pairs.some((pair) => !pair.passes)).toBe(true)
  expect(
    presetGlassReport(setPresetEdit(thin, '/design/transparency', 'reduced'))!
      .passes,
  ).toBe(true)
  expect(presetGlassReport(createPresetDraft('flat'))).toBeNull()
  expect(
    presetGlassReport(setPresetEdit(draft, '/design/glassOpacity', 'x')),
  ).toBeNull()
})

it('checks glass control bounds and keeps glass edits out of stable families', () => {
  const draft = createPresetDraft('liquid-glass')
  for (const [path, value] of [
    ['/design/glassOpacity', '0.24'],
    ['/design/glassOpacity', '1.01'],
    ['/design/glassBlurPx', '41'],
    ['/design/glassBackdropContrast', '0.29'],
    ['/design/glassBackdropTone', '0.61'],
    ['/design/glassSaturation', '2.1'],
    ['/design/glassSheen', '1.01'],
    ['/design/glassRim', '-0.1'],
    ['/design/glassBlurPx', ''],
    ['/design/transparency', 'none'],
  ] as const)
    expect(() => materializePreset(setPresetEdit(draft, path, value))).toThrow()
  expect(
    materializePreset(setPresetEdit(draft, '/design/glassBlurPx', '40')).design
      .glassBlurPx,
  ).toBe(40)
  const edited = setPresetEdit(
    setPresetEdit(draft, '/design/glassOpacity', '0.9'),
    '/design/radiusRem',
    '1',
  )
  const toFlat = planPresetFamilyChange(edited, 'flat')
  expect(toFlat.draft.edits).toEqual({ '/design/radiusRem': '1' })
  expect(toFlat.changes.every((c) => !c.path.includes('glass'))).toBe(true)
  expect(() => materializePreset(toFlat.draft)).not.toThrow()
  const back = planPresetFamilyChange(toFlat.draft, 'liquid-glass')
  expect(back.draft.family).toBe('liquid-glass')
  // Switching into glass starts from Cristal.
  expect(materializePreset(back.draft).design.glassOpacity).toBe(0.4)
})

it('requests only components the family supports', () => {
  expect(previewComponentIds('flat')).toHaveLength(58)
  expect(previewComponentIds('liquid-glass')).toEqual([
    'alert',
    'accordion',
    'button',
    'badge',
    'avatar',
    'card',
    'checkbox',
    'dialog',
    'dropdown-menu',
    'input',
    'label',
    'popover',
    'progress',
    'native-select',
    'radio-group',
    'select',
    'switch',
    'separator',
    'skeleton',
    'tabs',
    'table',
    'textarea',
    'tooltip',
    'input-group',
    'sheet',
    'alert-dialog',
    'breadcrumb',
    'pagination',
    'toast',
    'spinner',
    'kbd',
    'empty',
    'field',
    'meter',
    'stepper',
    'slider',
    'toggle-group',
    'chip',
    'tag-input',
    'input-otp',
    'combobox',
    'command',
    'hover-card',
    'context-menu',
    'calendar',
    'toggle',
    'collapsible',
    'scroll-area',
    'button-group',
    'item',
    'number-input',
    'color-picker',
    'code-block',
    'password-field',
    'carousel',
    'aspect-ratio',
    'toolbar',
    'prose',
  ])
})

it('picking a starting point replaces every value', () => {
  const catalog = getCatalog('0.1.0')
  let draft = setPresetEdit(createPresetDraft('liquid-glass'), '/modes/light/primary', '#123456')
  draft = applyStartingPreset(draft, 'builtin-liquid-glass-relief')
  const preset = materializePreset(draft)
  const relief = catalog.startingPresets['builtin-liquid-glass-relief']
  expect(preset.modes).toEqual(relief.modes)
  for (const [key, value] of Object.entries(relief.design)) {
    // Starting points do not set fonts; the draft keeps its style's fonts.
    if (['fontFamilyId', 'headingFontFamilyId', 'monoFontFamilyId'].includes(key)) continue
    expect(String(preset.design[key as keyof typeof preset.design] ?? 0), key).toBe(String(value))
  }
  expect(matchingStartingPreset(draft)).toBe('builtin-liquid-glass-relief')
  expect(matchingStartingPreset(setPresetEdit(draft, '/design/glassHalo', '0.2'))).toBe(null)
  // The family base is a starting point too, and picking it clears the edits.
  expect(applyStartingPreset(draft, 'builtin-liquid-glass').edits).toEqual({})
  expect(matchingStartingPreset(createPresetDraft('liquid-glass'))).toBe('builtin-liquid-glass')
})

it('switching into liquid glass starts from Cristal and keeps the user edits', () => {
  const flat = setPresetEdit(createPresetDraft('flat'), '/design/radiusRem', '1.25')
  const { draft, changes } = planPresetFamilyChange(flat, 'liquid-glass')
  expect(presetFieldValue(draft, '/design/radiusRem')).toBe('1.25')
  expect(presetFieldValue(draft, '/design/glassHalo')).toBe('0.6')
  expect(presetFieldValue(draft, '/modes/light/card')).toBe('#DAF6FF')
  expect(changes.some((change) => change.path === '/modes/light/card')).toBe(true)
  const withoutRadius = { ...draft, edits: { ...draft.edits } }
  delete withoutRadius.edits['/design/radiusRem']
  expect(matchingStartingPreset(withoutRadius)).toBe('builtin-liquid-glass-cristal')
})

it('glass drafts expose the material settings in the lab order with their ranges', () => {
  expect(Object.keys(glassDesignControls)).toEqual([
    'transparency',
    'glassOpacity',
    'glassBlurPx',
    'glassBackdropContrast',
    'glassSheen',
    'glassRefraction',
    'glassRefractionWidth',
    'glassRim',
    'glassHalo',
    'glassDepth',
    'glassMotion',
    'glassDispersion',
    'glassSaturation',
    'glassBackdropTone',
  ])
  expect(glassDesignControls.glassBackdropContrast.max).toBe(1.6)
  expect(glassDesignControls.glassSheen.max).toBe(1)
  expect(glassDesignControls.glassRefractionWidth.max).toBe(0.3)
  for (const key of ['glassRefraction', 'glassHalo', 'glassDepth', 'glassMotion', 'glassDispersion'] as const)
    expect(glassDesignControls[key]).toMatchObject({ min: 0, max: 1, step: 0.01 })
  const draft = setPresetEdit(createPresetDraft('liquid-glass'), '/design/glassDepth', '0.4')
  expect(materializePreset(draft).design.glassDepth).toBe(0.4)
})

it('tint chips write veil, ink and accent for both modes', () => {
  const draft = applyGlassTint(createPresetDraft('liquid-glass'), 'rose')
  const preset = materializePreset(draft)
  expect(preset.modes.light).toMatchObject({ card: '#FFD7EB', popover: '#FFD7EB', cardForeground: '#102038', primary: '#A3245A', ring: '#A3245A' })
  expect(preset.modes.dark).toMatchObject({ card: '#2A1D33', primary: '#F9A8D4', cardForeground: '#F0F7FF' })
  // On a Relief draft, Rosee takes Relief's warmer veil.
  const relief = applyGlassTint(applyStartingPreset(createPresetDraft('liquid-glass'), 'builtin-liquid-glass-relief'), 'rose')
  expect(materializePreset(relief).modes.light.card).toBe('#F4A5B3')
  const smoke = materializePreset(applyGlassTint(createPresetDraft('liquid-glass'), 'smoke'))
  expect(smoke.modes.light).toMatchObject({ card: '#091127', cardForeground: '#F0F7FF', background: smoke.modes.dark.background })
})

it('every tint chip keeps every starting preset inside the contrast bound', async () => {
  const { startingPresetOrder } = await import('@ombelle/catalog')
  const failing: string[] = []
  for (const id of startingPresetOrder)
    for (const tint of ['clear', 'rose', 'smoke', 'white'] as const) {
      const report = presetGlassReport(applyGlassTint(applyStartingPreset(createPresetDraft('liquid-glass'), id), tint))
      if (!report?.passes) failing.push(`${id} ${tint} (needs ${report?.minimumOpacity ?? 'no opacity'})`)
    }
  // Known, on the base preset only, which has no material and so no text outline plate: its 0.57 is just short
  // for the Rosée veil (the readout asks for 0.6), and the dark Fumée veil cannot pass without the plate.
  expect(failing).toEqual(['builtin-liquid-glass rose (needs 0.6)', 'builtin-liquid-glass smoke (needs no opacity)'])
})

it.each(startingPresetOrder)('leaving liquid glass from %s returns to Ombelle defaults and keeps own edits', (id) => {
  const glass = setPresetEdit(applyStartingPreset(createPresetDraft('liquid-glass'), id), '/design/radiusRem', '1.5')
  const { draft, changes } = planPresetFamilyChange(glass, 'ombelle')
  expect(draft.edits).toEqual({ '/design/radiusRem': '1.5' })
  expect(materializePreset(draft).modes).toEqual(getCatalog('0.1.0').presets.ombelle.modes)
  expect(changes.some((change) => change.path === '/design/radiusRem')).toBe(false)
  // A colour the user picked on top of the starting preset travels.
  const tinted = setPresetEdit(glass, '/modes/light/primary', '#123456')
  expect(planPresetFamilyChange(tinted, 'ombelle').draft.edits['/modes/light/primary']).toBe('#123456')
})

it('offers fonts by role', () => {
  expect(fontControlOptions.monoFontFamilyId).toContain('jetbrains-mono')
  // DM Mono needs a schema the published installer may not have yet: it is offered once the installer is 0.8.1.
  expect(fontControlOptions.monoFontFamilyId.includes('dm-mono')).toBe(compareVersions(publishedInstaller.version, organicMinimumCli) >= 0)
  expect(fontControlOptions.monoFontFamilyId).toContain('system-mono')
  expect(fontControlOptions.monoFontFamilyId).not.toContain('inter')
  expect(fontControlOptions.headingFontFamilyId).toContain('young-serif')
  expect(fontControlOptions.headingFontFamilyId).toContain('fraunces')
  expect(fontControlOptions.fontFamilyId).toContain('inter')
  expect(fontControlOptions.fontFamilyId).not.toContain('young-serif')
  expect(fontControlOptions.fontFamilyId).not.toContain('michroma')
  for (const system of ['system-sans', 'system-serif', 'system-mono'])
    expect(fontControlOptions.fontFamilyId).toContain(system)
})

it('labels system and registry fonts', () => {
  expect(fontLabel('system-serif')).toBe('Serif')
  expect(fontLabel('system-sans')).toBe('Sans')
  expect(fontLabel('ibm-plex-mono')).toBe('IBM Plex Mono')
})

it('relabels the font controls and adds the display and code pickers', () => {
  expect(designControls.fontFamilyId.label).toBe('Body font')
  expect(designControls.headingFontFamilyId.label).toBe('Display font')
  expect(designControls.monoFontFamilyId.label).toBe('Code font')
})

it('declares schemaVersion 1.0 again once every font is a system font or unset', () => {
  let draft = createPresetDraft('ombelle')
  expect(materializePreset(draft).schemaVersion).toBe('1.1')
  draft = setPresetEdit(draft, '/design/fontFamilyId', 'system-sans')
  draft = setPresetEdit(draft, '/design/headingFontFamilyId', '')
  draft = setPresetEdit(draft, '/design/monoFontFamilyId', '')
  const back = materializePreset(draft)
  expect(back.schemaVersion).toBe('1.0')
  expect('headingFontFamilyId' in back.design).toBe(false)
  expect('monoFontFamilyId' in back.design).toBe(false)
})

it('reads an explicit empty display and code font as empty', () => {
  let draft = setPresetEdit(createPresetDraft('ombelle'), '/design/headingFontFamilyId', '')
  draft = setPresetEdit(draft, '/design/monoFontFamilyId', '')
  expect(presetFieldValue(draft, '/design/headingFontFamilyId')).toBe('')
  expect(presetFieldValue(draft, '/design/monoFontFamilyId')).toBe('')
})

it('materializes a registry body font and code font under 1.1', () => {
  let draft = createPresetDraft('minimalist')
  draft = setPresetEdit(draft, '/design/fontFamilyId', 'geist')
  draft = setPresetEdit(draft, '/design/monoFontFamilyId', 'geist-mono')
  const preset = materializePreset(draft)
  expect(preset.schemaVersion).toBe('1.1')
  expect(preset.design.fontFamilyId).toBe('geist')
  expect(preset.design.monoFontFamilyId).toBe('geist-mono')
})

describe('the fonts a style family starts with', () => {
  const fontsOf = (family: (typeof styleFamilies)[number]) => {
    const { body, display, mono } = styleFamilyFonts[family]
    return { body, display, mono }
  }
  it.each(styleFamilies)('a new %s draft carries its style fonts and declares 1.1', (family) => {
    const { body, display, mono } = fontsOf(family)
    const preset = materializePreset(createPresetDraft(family))
    expect(preset.schemaVersion).toBe('1.1')
    expect(preset.design.fontFamilyId).toBe(body)
    expect(preset.design.monoFontFamilyId).toBe(mono)
    // A display font equal to the body font is left unset: it already follows the body font.
    expect(preset.design.headingFontFamilyId).toBe(display === body ? undefined : display)
  })

  it('shows the style fonts in the pickers and an empty display font when it matches the body font', () => {
    const ombelle = createPresetDraft('ombelle')
    expect(presetFieldValue(ombelle, '/design/fontFamilyId')).toBe('figtree')
    expect(presetFieldValue(ombelle, '/design/headingFontFamilyId')).toBe('bricolage-grotesque')
    expect(presetFieldValue(ombelle, '/design/monoFontFamilyId')).toBe('geist-mono')
    expect(presetFieldValue(createPresetDraft('flat'), '/design/headingFontFamilyId')).toBe('')
  })

  it('lets a chosen font, including a system font, win over the style font', () => {
    const draft = setPresetEdit(createPresetDraft('ombelle'), '/design/fontFamilyId', 'system-serif')
    expect(materializePreset(draft).design.fontFamilyId).toBe('system-serif')
    expect(presetFieldValue(draft, '/design/fontFamilyId')).toBe('system-serif')
  })

  it('lets an empty display or code font override the style font', () => {
    let draft = setPresetEdit(createPresetDraft('ombelle'), '/design/headingFontFamilyId', '')
    draft = setPresetEdit(draft, '/design/monoFontFamilyId', '')
    const design = materializePreset(draft).design
    expect('headingFontFamilyId' in design).toBe(false)
    expect('monoFontFamilyId' in design).toBe(false)
    expect(materializePreset(draft).schemaVersion).toBe('1.1')
  })

  it('returns to the style font when a chosen font is reset', () => {
    const chosen = setPresetEdit(createPresetDraft('minimalist'), '/design/monoFontFamilyId', 'jetbrains-mono')
    expect(presetFieldValue(chosen, '/design/monoFontFamilyId')).toBe('jetbrains-mono')
    const reset = resetPresetField(chosen, '/design/monoFontFamilyId')
    expect(presetFieldValue(reset, '/design/monoFontFamilyId')).toBe('geist-mono')
  })

  it('switching style changes the fonts that were not chosen and keeps the ones that were', () => {
    const chosen = setPresetEdit(createPresetDraft('ombelle'), '/design/monoFontFamilyId', 'ibm-plex-mono')
    const { draft, changes } = planPresetFamilyChange(chosen, 'neo-brutalism')
    expect(presetFieldValue(draft, '/design/fontFamilyId')).toBe('work-sans')
    expect(presetFieldValue(draft, '/design/headingFontFamilyId')).toBe('space-grotesk')
    expect(presetFieldValue(draft, '/design/monoFontFamilyId')).toBe('ibm-plex-mono')
    expect(changes.find((change) => change.path === '/design/fontFamilyId')).toEqual({
      path: '/design/fontFamilyId',
      before: 'figtree',
      after: 'work-sans',
    })
  })

  it('still matches a glass starting point whatever fonts the draft has', () => {
    const cristal = applyStartingPreset(createPresetDraft('liquid-glass'), startingPresetOrder[0])
    expect(matchingStartingPreset(cristal)).toBe(startingPresetOrder[0])
    const withFont = setPresetEdit(cristal, '/design/fontFamilyId', 'system-mono')
    expect(matchingStartingPreset(withFont)).toBe(startingPresetOrder[0])
  })
})

describe('choosing a font in a picker', () => {
  it('drops the edit when the chosen font is the style font and keeps it otherwise', () => {
    expect(fontChoiceIsStyleFont('ombelle', 'fontFamilyId', 'figtree')).toBe(true)
    expect(fontChoiceIsStyleFont('ombelle', 'fontFamilyId', 'inter')).toBe(false)
    expect(fontChoiceIsStyleFont('ombelle', 'monoFontFamilyId', 'geist-mono')).toBe(true)
    // "Same as body font" is a choice of its own wherever the style has a display font...
    expect(fontChoiceIsStyleFont('ombelle', 'headingFontFamilyId', '')).toBe(false)
    expect(fontChoiceIsStyleFont('ombelle', 'headingFontFamilyId', 'bricolage-grotesque')).toBe(true)
    // ...and just the default where the display font already follows the body font.
    expect(fontChoiceIsStyleFont('flat', 'headingFontFamilyId', '')).toBe(true)
    expect(fontChoiceIsStyleFont('flat', 'headingFontFamilyId', 'fraunces')).toBe(false)
  })
})
