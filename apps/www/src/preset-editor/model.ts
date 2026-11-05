import { defaultGlassPresetId, getCatalog, glassTintPalettes, startingPresetOrder, type GlassTintId, type StartingPresetId } from '@ombelle/catalog'
import { glassContrastReport, type GlassContrastReport } from '@ombelle/compiler'
import {
  FoundationError,
  componentsWithStyleSupport,
  isStyleFamily,
  validatePreset,
  type ComponentId,
  type Preset,
  type StyleFamily,
} from '@ombelle/contracts'

export const colorKeys = [
  'background',
  'foreground',
  'card',
  'cardForeground',
  'popover',
  'popoverForeground',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'muted',
  'mutedForeground',
  'accent',
  'accentForeground',
  'destructive',
  'destructiveForeground',
  'border',
  'input',
  'ring',
] as const
export const designControls = {
  fontFamilyId: {
    label: 'Font family',
    options: ['system-sans', 'system-serif', 'system-mono'],
  },
  radiusRem: { label: 'Corner radius', min: 0, max: 2 },
  density: { label: 'Density', options: ['comfortable', 'compact'] },
  borderWidthPx: { label: 'Border width', min: 0, max: 4 },
  shadowOffsetXPx: { label: 'Shadow X offset', min: -16, max: 16 },
  shadowOffsetYPx: { label: 'Shadow Y offset', min: -16, max: 16 },
  motion: { label: 'Motion', options: ['full', 'reduced'] },
} as const
// Liquid glass only: these render, validate and materialize for glass drafts.
// In the material lab's order, then the two backdrop filters the lab does not use.
export const glassDesignControls = {
  transparency: { label: 'Transparency', options: ['auto', 'reduced'] },
  glassOpacity: { label: 'Glass opacity', min: 0.25, max: 1, step: 0.01, unit: '', hint: 'How much of the veil colour covers the backdrop.' },
  glassBlurPx: { label: 'Glass blur', min: 0, max: 40, step: 1, unit: ' px', hint: 'Backdrop blur; low values keep the refraction visible.' },
  glassBackdropContrast: { label: 'Backdrop contrast', min: 0.3, max: 1.6, step: 0.01, unit: '', hint: 'Below 1 softens the backdrop; above 1 deepens it and adds a drop shadow.' },
  glassSheen: { label: 'Shine', min: 0, max: 1, step: 0.01, unit: '', hint: 'The white specular light across each surface.' },
  glassRefraction: { label: 'Refraction', min: 0, max: 1, step: 0.01, unit: '', hint: 'How far the backdrop bends along the rim. Chromium only.' },
  glassRefractionWidth: { label: 'Refraction width', min: 0, max: 0.3, step: 0.01, unit: '', hint: 'How much of the surface the rim refraction reaches. Chromium only.' },
  glassRim: { label: 'Rim light', min: 0, max: 1, step: 0.01, unit: '', hint: 'The edge line and top highlight.' },
  glassHalo: { label: 'Pointer halo', min: 0, max: 1, step: 0.01, unit: '', hint: 'Rim light near the pointer; needs LiquidGlassFilter.' },
  glassDepth: { label: 'Relief', min: 0, max: 1, step: 0.01, unit: '', hint: 'Bevel along the rim and a layered drop shadow.' },
  glassMotion: { label: 'Motion', min: 0, max: 1, step: 0.01, unit: '', hint: 'How far the shine follows the pointer and a Card lifts on hover.' },
  glassDispersion: { label: 'Dispersion', min: 0, max: 1, step: 0.01, unit: '', hint: 'Pink, amber and cyan fringe along the rim.' },
  glassSaturation: { label: 'Glass saturation', min: 1, max: 2, step: 0.05, unit: '', hint: 'Keeps the colour of what is behind the glass.' },
  glassBackdropTone: { label: 'Backdrop tone', min: 0, max: 0.6, step: 0.01, unit: '', hint: 'Pushes the backdrop toward the mode: lighter in light mode, darker in dark.' },
} as const
/** Material settings a preset may leave out; they read as 0, which draws nothing. */
const optionalGlassFields: readonly string[] = ['glassRefraction', 'glassRefractionWidth', 'glassHalo', 'glassDepth', 'glassMotion', 'glassDispersion']
/**
 * Liquid glass repurposes the shadow offsets, border width and border colour as its
 * drop-shadow offsets and edge. Values are shared across families; only labels change.
 */
export function designControlLabel(
  key: keyof typeof designControls | 'border',
  family: StyleFamily,
): string {
  if (family === 'liquid-glass') {
    if (key === 'shadowOffsetXPx') return 'Glass shadow X'
    if (key === 'shadowOffsetYPx') return 'Glass shadow Y'
    if (key === 'borderWidthPx') return 'Glass edge width'
    if (key === 'border') return 'Glass edge colour'
  }
  return key === 'border' ? 'Border' : designControls[key].label
}
export const glassControlHints: Record<
  'shadowOffsetXPx' | 'shadowOffsetYPx' | 'borderWidthPx' | 'border',
  string
> = {
  shadowOffsetXPx: 'Offsets the soft shadow under floating glass.',
  shadowOffsetYPx: 'Offsets the soft shadow under floating glass.',
  borderWidthPx: 'Thickness of every glass edge.',
  border: 'Colour and strength of every glass edge; may include transparency.',
}
export type PresetEditablePath =
  | `/modes/${'light' | 'dark'}/${(typeof colorKeys)[number]}`
  | `/design/${keyof typeof designControls}`
  | `/design/${keyof typeof glassDesignControls}`
export const editablePaths: PresetEditablePath[] = [
  ...(['light', 'dark'] as const).flatMap((mode) =>
    colorKeys.map((key) => `/modes/${mode}/${key}` as const),
  ),
  ...Object.keys(designControls).map(
    (key) => `/design/${key}` as PresetEditablePath,
  ),
]
export const glassEditablePaths: PresetEditablePath[] = Object.keys(
  glassDesignControls,
).map((key) => `/design/${key}` as PresetEditablePath)
export function editablePathsFor(family: StyleFamily): PresetEditablePath[] {
  return family === 'liquid-glass'
    ? [...editablePaths, ...glassEditablePaths]
    : editablePaths
}
/** Component ids the editor compiles and previews for a family. */
export function previewComponentIds(family: StyleFamily): ComponentId[] {
  return componentsWithStyleSupport(family, ['stable', 'experimental'])
}
export type PresetEditorDraft = {
  storageVersion: 1
  family: StyleFamily
  identity: { id: string; name: string; revision: string }
  edits: Partial<Record<PresetEditablePath, string>>
}
export type FamilyChange = {
  draft: PresetEditorDraft
  changes: Array<{ path: PresetEditablePath; before: string; after: string }>
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function exact(value: Record<string, unknown>, keys: string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  )
}
function fail(path: string, message = 'Invalid preset editor draft'): never {
  throw new FoundationError('INVALID_DATA', message, path)
}

export function validateDraftEnvelope(input: unknown): PresetEditorDraft {
  if (
    !record(input) ||
    !exact(input, ['storageVersion', 'family', 'identity', 'edits']) ||
    input.storageVersion !== 1 ||
    !isStyleFamily(input.family)
  )
    fail('/')
  const allowed = editablePathsFor(input.family)
  if (
    !record(input.identity) ||
    !exact(input.identity, ['id', 'name', 'revision'])
  )
    fail('/identity')
  for (const key of ['id', 'name', 'revision']) {
    const value = input.identity[key]
    if (
      typeof value !== 'string' ||
      value.length > (key === 'revision' ? 16 : 80)
    )
      fail('/' + key)
  }
  if (!record(input.edits)) fail('/edits')
  for (const [path, value] of Object.entries(input.edits)) {
    if (
      !allowed.includes(path as PresetEditablePath) ||
      typeof value !== 'string' ||
      value.length > 80
    )
      fail(path)
  }
  return structuredClone(input) as PresetEditorDraft
}

export function createPresetDraft(family: StyleFamily): PresetEditorDraft {
  return validateDraftEnvelope({
    storageVersion: 1,
    family,
    identity: { id: 'project_preset', name: 'Project preset', revision: '1' },
    edits: {},
  })
}

export function presetFieldValue(
  draft: PresetEditorDraft,
  path: PresetEditablePath,
): string {
  if (Object.hasOwn(draft.edits, path)) return draft.edits[path]!
  return fieldValueOf(getCatalog('0.1.0').presets[draft.family], path)
}

/** A preset's value for an editable path, as the editor stores it. */
function fieldValueOf(preset: Preset, path: PresetEditablePath): string {
  const [, group, key, token] = path.split('/')
  if (group === 'design') {
    const value = preset.design[key as keyof Preset['design']]
    return String(value === undefined && optionalGlassFields.includes(key!) ? 0 : value)
  }
  return String(preset.modes[key as 'light' | 'dark'][token as (typeof colorKeys)[number]])
}

/** Replaces every value with the starting preset's; the family base clears the edits. */
export function applyStartingPreset(input: PresetEditorDraft, id: StartingPresetId): PresetEditorDraft {
  const draft = validateDraftEnvelope(input)
  const catalog = getCatalog('0.1.0')
  const base = catalog.presets['liquid-glass']
  const preset = catalog.startingPresets[id]
  const edits: PresetEditorDraft['edits'] = {}
  for (const path of editablePathsFor('liquid-glass')) {
    const value = fieldValueOf(preset, path)
    if (value !== fieldValueOf(base, path)) edits[path] = value
  }
  return validateDraftEnvelope({ ...draft, family: 'liquid-glass', edits })
}

/** The starting preset a glass draft still equals, or null once any value differs. */
export function matchingStartingPreset(draft: PresetEditorDraft): StartingPresetId | null {
  if (draft.family !== 'liquid-glass') return null
  const catalog = getCatalog('0.1.0')
  const paths = editablePathsFor('liquid-glass')
  return (
    startingPresetOrder.find((id) =>
      paths.every((path) => presetFieldValue(draft, path) === fieldValueOf(catalog.startingPresets[id], path)),
    ) ?? null
  )
}

/** Writes a tint's veil, ink and accent into both modes. White restores the family base colours. */
export function applyGlassTint(input: PresetEditorDraft, tint: GlassTintId | 'white'): PresetEditorDraft {
  const draft = validateDraftEnvelope(input)
  const base = getCatalog('0.1.0').presets['liquid-glass']
  const edits = { ...draft.edits }
  const set = (mode: 'light' | 'dark', key: (typeof colorKeys)[number], value: string | undefined) => {
    const path = `/modes/${mode}/${key}` as PresetEditablePath
    if (value === undefined || value === base.modes[mode][key]) delete edits[path]
    else edits[path] = value
  }
  const tintKeys = ['card', 'popover', 'cardForeground', 'popoverForeground', 'foreground', 'primary', 'ring', 'primaryForeground', 'destructive'] as const
  if (tint === 'white') {
    for (const mode of ['light', 'dark'] as const) for (const key of colorKeys) set(mode, key, base.modes[mode][key])
    return validateDraftEnvelope({ ...draft, edits })
  }
  // Rosee on a Relief draft takes Relief's warmer veil.
  const warm = tint === 'rose' && presetFieldValue(draft, '/modes/light/card') === glassTintPalettes.relief.light.card
  const palette = glassTintPalettes[warm ? 'relief' : tint]
  for (const mode of ['light', 'dark'] as const) {
    if (mode === 'light' && palette.lightUsesDarkPalette)
      for (const key of colorKeys) set('light', key, presetFieldValue({ ...draft, edits }, `/modes/dark/${key}` as PresetEditablePath))
    else if (mode === 'light' && presetFieldValue({ ...draft, edits }, '/modes/light/background') === presetFieldValue({ ...draft, edits }, '/modes/dark/background'))
      // Leaving Fumee: light mode returns to the light palette.
      for (const key of colorKeys) set('light', key, base.modes.light[key])
    for (const key of tintKeys) {
      const value = (palette[mode] as Record<string, string | undefined>)[key]
      if (value !== undefined) set(mode, key, value)
      // Fumée's light mode keeps the dark palette's error colour it just copied.
      else if (key === 'destructive' && !(mode === 'light' && palette.lightUsesDarkPalette))
        set(mode, key, base.modes[mode].destructive)
    }
  }
  return validateDraftEnvelope({ ...draft, edits })
}

export function materializePreset(input: PresetEditorDraft): Preset {
  const draft = validateDraftEnvelope(input)
  const revision = Number(draft.identity.revision)
  if (
    !draft.identity.revision.trim() ||
    !Number.isSafeInteger(revision) ||
    revision < 1
  )
    fail('/revision', 'Enter a positive safe integer revision.')
  const preset = structuredClone(getCatalog('0.1.0').presets[draft.family])
  Object.assign(preset, {
    ...draft.identity,
    revision,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    platform: 'react-web',
  })
  for (const [path, raw] of Object.entries(draft.edits)) {
    const [, group, key, token] = path.split('/')
    if (group === 'modes')
      preset.modes[key as 'light' | 'dark'][
        token as (typeof colorKeys)[number]
      ] = raw!
    else {
      const control =
        key in glassDesignControls
          ? glassDesignControls[key as keyof typeof glassDesignControls]
          : designControls[key as keyof typeof designControls]
      let value: string | number = raw!
      if ('min' in control) {
        if (!raw!.trim() || !Number.isFinite(Number(raw)))
          fail(path, 'Enter a finite number.')
        value = Number(raw)
      }
      Object.assign(preset.design, { [key]: value })
    }
  }
  return validatePreset(preset)
}

/**
 * The live contrast bound for a glass draft, or null for other families and
 * drafts that do not materialize yet (the compile diagnostic covers those).
 */
export function presetGlassReport(
  draft: PresetEditorDraft,
): GlassContrastReport | null {
  if (draft.family !== 'liquid-glass') return null
  try {
    return glassContrastReport(materializePreset(draft))
  } catch {
    return null
  }
}

export function setPresetEdit(
  draft: PresetEditorDraft,
  path: PresetEditablePath,
  value: string,
): PresetEditorDraft {
  return validateDraftEnvelope({
    ...draft,
    edits: { ...draft.edits, [path]: value },
  })
}
export function setPresetIdentity(
  draft: PresetEditorDraft,
  field: 'id' | 'name' | 'revision',
  value: string,
): PresetEditorDraft {
  return validateDraftEnvelope({
    ...draft,
    identity: { ...draft.identity, [field]: value },
  })
}
export function resetPresetField(
  draft: PresetEditorDraft,
  path: PresetEditablePath,
): PresetEditorDraft {
  const copy = validateDraftEnvelope(draft)
  delete copy.edits[path]
  return copy
}
export function resetPresetTokens(draft: PresetEditorDraft): PresetEditorDraft {
  if (draft.family === 'liquid-glass') return applyStartingPreset(draft, defaultGlassPresetId)
  return validateDraftEnvelope({ ...draft, edits: {} })
}
export function planPresetFamilyChange(
  input: PresetEditorDraft,
  family: StyleFamily,
): FamilyChange {
  const before = validateDraftEnvelope(input)
  // Glass-only edits cannot follow the draft into a stable family.
  const allowed = editablePathsFor(family)
  const edits = Object.fromEntries(
    Object.entries(before.edits).filter(([path]) =>
      allowed.includes(path as PresetEditablePath),
    ),
  )
  let draft = validateDraftEnvelope({ ...before, family, edits })
  // Glass starts from Cristal, the default starting point; the user's own edits win.
  if (family === 'liquid-glass' && before.family !== 'liquid-glass') {
    const cristal = applyStartingPreset(createPresetDraft('liquid-glass'), defaultGlassPresetId)
    draft = validateDraftEnvelope({ ...draft, edits: { ...cristal.edits, ...edits } })
  }
  const shared = editablePathsFor(before.family).filter((path) =>
    allowed.includes(path),
  )
  const changes = shared
    .filter((path) => !Object.hasOwn(before.edits, path))
    .map((path) => ({
      path,
      before: presetFieldValue(before, path),
      after: presetFieldValue(draft, path),
    }))
    .filter((change) => change.before !== change.after)
  return { draft, changes }
}
