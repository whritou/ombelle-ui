import { getCatalog } from '@ombelle/catalog'
import {
  FoundationError,
  isStyleFamily,
  validatePreset,
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
export type PresetEditablePath =
  | `/modes/${'light' | 'dark'}/${(typeof colorKeys)[number]}`
  | `/design/${keyof typeof designControls}`
export const editablePaths: PresetEditablePath[] = [
  ...(['light', 'dark'] as const).flatMap((mode) =>
    colorKeys.map((key) => `/modes/${mode}/${key}` as const),
  ),
  ...Object.keys(designControls).map(
    (key) => `/design/${key}` as PresetEditablePath,
  ),
]
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
      !editablePaths.includes(path as PresetEditablePath) ||
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
  const base = getCatalog('0.1.0').presets[draft.family]
  const [, group, key, token] = path.split('/')
  return String(
    group === 'design'
      ? base.design[key as keyof Preset['design']]
      : base.modes[key as 'light' | 'dark'][
          token as (typeof colorKeys)[number]
        ],
  )
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
      const control = designControls[key as keyof typeof designControls]
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
  return validateDraftEnvelope({ ...draft, edits: {} })
}
export function planPresetFamilyChange(
  input: PresetEditorDraft,
  family: StyleFamily,
): FamilyChange {
  const before = validateDraftEnvelope(input),
    draft = validateDraftEnvelope({ ...before, family })
  const changes = editablePaths
    .filter((path) => !Object.hasOwn(before.edits, path))
    .map((path) => ({
      path,
      before: presetFieldValue(before, path),
      after: presetFieldValue(draft, path),
    }))
    .filter((change) => change.before !== change.after)
  return { draft, changes }
}
