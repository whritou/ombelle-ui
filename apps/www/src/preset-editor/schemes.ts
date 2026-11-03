import type { PresetEditablePath, PresetEditorDraft } from './model'
import { presetFieldValue, resetPresetField, setPresetEdit } from './model'

type Mode = 'light' | 'dark'
type Tokens = Partial<Record<string, string>>
export type ColorScheme = {
  id: string
  label: string
  /** Swatch shown on the picker button. */
  swatch: string
  light: Tokens
  dark: Tokens
}

const accent = (
  id: string,
  label: string,
  light: [string, string],
  dark: [string, string],
): ColorScheme => ({
  id,
  label,
  swatch: light[0],
  light: { primary: light[0], primaryForeground: light[1], ring: light[0] },
  dark: { primary: dark[0], primaryForeground: dark[1], ring: dark[0] },
})

/** Accent schemes set the primary and ring tokens in both modes. */
export const accentSchemes: ColorScheme[] = [
  accent('blue', 'Blue', ['#1D4ED8', '#FFFFFF'], ['#93C5FD', '#111111']),
  accent('violet', 'Violet', ['#6D28D9', '#FFFFFF'], ['#C4B5FD', '#111111']),
  accent('rose', 'Rose', ['#E11D48', '#FFFFFF'], ['#FDA4AF', '#111111']),
  accent('orange', 'Orange', ['#C2410C', '#FFFFFF'], ['#FDBA74', '#111111']),
  accent('amber', 'Amber', ['#B45309', '#FFFFFF'], ['#FCD34D', '#111111']),
  accent('green', 'Green', ['#15803D', '#FFFFFF'], ['#86EFAC', '#111111']),
  accent('teal', 'Teal', ['#0F766E', '#FFFFFF'], ['#5EEAD4', '#111111']),
  accent('neutral', 'Neutral', ['#18181B', '#FAFAFA'], ['#FAFAFA', '#18181B']),
]

const base = (
  id: string,
  label: string,
  light: { foreground: string; muted: string; mutedForeground: string },
  dark: {
    background: string
    foreground: string
    card: string
    secondary: string
    muted: string
    mutedForeground: string
  },
): ColorScheme => ({
  id,
  label,
  swatch: dark.background,
  light: {
    background: '#FFFFFF',
    foreground: light.foreground,
    card: '#FFFFFF',
    cardForeground: light.foreground,
    popover: '#FFFFFF',
    popoverForeground: light.foreground,
    secondary: light.muted,
    secondaryForeground: light.foreground,
    muted: light.muted,
    mutedForeground: light.mutedForeground,
  },
  dark: {
    background: dark.background,
    foreground: dark.foreground,
    card: dark.card,
    cardForeground: dark.foreground,
    popover: dark.card,
    popoverForeground: dark.foreground,
    secondary: dark.secondary,
    secondaryForeground: dark.foreground,
    muted: dark.muted,
    mutedForeground: dark.mutedForeground,
  },
})

/**
 * Base schemes set the surface and text tokens. Borders, inputs, accent and
 * destructive tokens stay with the style family, which owns their character.
 */
export const baseSchemes: ColorScheme[] = [
  base(
    'slate',
    'Slate',
    { foreground: '#0F172A', muted: '#F1F5F9', mutedForeground: '#475569' },
    {
      background: '#0F172A',
      foreground: '#F8FAFC',
      card: '#1E293B',
      secondary: '#334155',
      muted: '#1E293B',
      mutedForeground: '#94A3B8',
    },
  ),
  base(
    'stone',
    'Stone',
    { foreground: '#1C1917', muted: '#F5F5F4', mutedForeground: '#57534E' },
    {
      background: '#1C1917',
      foreground: '#FAFAF9',
      card: '#292524',
      secondary: '#44403C',
      muted: '#292524',
      mutedForeground: '#A8A29E',
    },
  ),
  base(
    'zinc',
    'Zinc',
    { foreground: '#09090B', muted: '#F4F4F5', mutedForeground: '#52525B' },
    {
      background: '#09090B',
      foreground: '#FAFAFA',
      card: '#18181B',
      secondary: '#27272A',
      muted: '#18181B',
      mutedForeground: '#A1A1AA',
    },
  ),
]

const paths = (scheme: ColorScheme) =>
  (['light', 'dark'] as Mode[]).flatMap((mode) =>
    Object.entries(scheme[mode]).map(
      ([key, value]) =>
        [`/modes/${mode}/${key}` as PresetEditablePath, value!] as const,
    ),
  )

/** Applies every token of a scheme as explicit edits. */
export function applyColorScheme(
  draft: PresetEditorDraft,
  scheme: ColorScheme,
): PresetEditorDraft {
  return paths(scheme).reduce(
    (next, [path, value]) => setPresetEdit(next, path, value),
    draft,
  )
}

/** Returns the tokens a scheme family touches to the style family's values. */
export function resetColorScheme(
  draft: PresetEditorDraft,
  schemes: ColorScheme[],
): PresetEditorDraft {
  const touched = new Set(schemes.flatMap((scheme) => paths(scheme).map(([path]) => path)))
  return [...touched].reduce((next, path) => resetPresetField(next, path), draft)
}

/** True when every token of the scheme matches the draft, ignoring case. */
export function schemeMatches(
  draft: PresetEditorDraft,
  scheme: ColorScheme,
): boolean {
  return paths(scheme).every(
    ([path, value]) =>
      presetFieldValue(draft, path).toLowerCase() === value.toLowerCase(),
  )
}
