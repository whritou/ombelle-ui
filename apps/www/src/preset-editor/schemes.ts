import type { StyleFamily } from '@ombelle/contracts'
import type { PresetEditablePath, PresetEditorDraft } from './model'
import { colorKeys, presetFieldValue, resetPresetField, setPresetEdit } from './model'

type Mode = 'light' | 'dark'
type Tokens = Partial<Record<string, string>>
export type ColorScheme = {
  id: string
  label: string
  /** Swatch shown on the picker button. */
  swatch: string
  /** Dark-mode background, shown beside `swatch` on palettes. */
  swatchDark?: string
  /** The style family a palette belongs to; accents have none. */
  family?: StyleFamily
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

/** Tokens a palette sets: everything except the error colours, which the style family owns. */
export const paletteTokenKeys: readonly string[] = colorKeys.filter(
  (key) => key !== 'destructive' && key !== 'destructiveForeground',
)

const palette = (
  family: StyleFamily,
  id: string,
  label: string,
  light: Tokens,
  dark: Tokens,
): ColorScheme => ({
  id,
  label,
  family,
  swatch: light.background!,
  swatchDark: dark.background!,
  light,
  dark,
})

/**
 * Palettes are complete light and dark sets designed for one style family. Each keeps its
 * family's surface steps, border logic and character; the Style default stays the first
 * choice in the picker and is not listed here.
 */
const palettes: Record<string, ColorScheme[]> = {
  flat: [
  palette('flat', 'sage', 'Sage',
    { background: '#F2F7F5', foreground: '#122B1F', card: '#FFFFFF', cardForeground: '#122B1F', popover: '#FFFFFF', popoverForeground: '#122B1F', primary: '#207E4F', primaryForeground: '#FFFFFF', secondary: '#DDF4E8', secondaryForeground: '#1C402E', muted: '#E9F1ED', mutedForeground: '#4E6A5C', accent: '#C5F3F7', accentForeground: '#143A3D', border: '#D7E5DE', input: '#BDD1C7', ring: '#207E4F' },
    { background: '#0C1812', foreground: '#F0F5F2', card: '#15281F', cardForeground: '#F0F5F2', popover: '#15281F', popoverForeground: '#F0F5F2', primary: '#82EDB8', primaryForeground: '#0C1D14', secondary: '#254636', secondaryForeground: '#EDF2F0', muted: '#1E3429', mutedForeground: '#A1BAAD', accent: '#255256', accentForeground: '#DEF5F7', border: '#2B4638', input: '#325242', ring: '#82EDB8' }),
  palette('flat', 'sand', 'Sand',
    { background: '#F8F6F2', foreground: '#2E230F', card: '#FFFFFF', cardForeground: '#2E230F', popover: '#FFFFFF', popoverForeground: '#2E230F', primary: '#865E18', primaryForeground: '#FFFFFF', secondary: '#F6ECDA', secondaryForeground: '#453417', muted: '#F2EEE8', mutedForeground: '#6E6149', accent: '#ECF7C5', accentForeground: '#343D14', border: '#E7E0D5', input: '#D4CAB9', ring: '#865E18' },
    { background: '#1A140A', foreground: '#F5F3EF', card: '#2B2212', cardForeground: '#F5F3EF', popover: '#2B2212', popoverForeground: '#F5F3EF', primary: '#F4C87B', primaryForeground: '#1F170A', secondary: '#4B3B20', secondaryForeground: '#F3F1EC', muted: '#372D1A', mutedForeground: '#BEB29D', accent: '#4B5625', accentForeground: '#F2F7DE', border: '#4A3D26', input: '#58482D', ring: '#F4C87B' }),
  palette('flat', 'lilac', 'Lilac',
    { background: '#F4F1F8', foreground: '#1C0E2F', card: '#FFFFFF', cardForeground: '#1C0E2F', popover: '#FFFFFF', popoverForeground: '#1C0E2F', primary: '#45148A', primaryForeground: '#FFFFFF', secondary: '#E6D9F7', secondaryForeground: '#2A1547', muted: '#ECE8F3', mutedForeground: '#584770', accent: '#F7C5F7', accentForeground: '#3D143D', border: '#DCD3E8', input: '#C4B8D6', ring: '#45148A' },
    { background: '#10091B', foreground: '#F2EFF6', card: '#1C112C', cardForeground: '#F2EFF6', popover: '#1C112C', popoverForeground: '#F2EFF6', primary: '#AD77F8', primaryForeground: '#130920', secondary: '#321D4E', secondaryForeground: '#EFECF4', muted: '#261839', mutedForeground: '#AA9BC0', accent: '#562556', accentForeground: '#F7DEF7', border: '#35244C', input: '#3E2A5A', ring: '#AD77F8' }),
  palette('flat', 'clay', 'Clay',
    { background: '#F8F3F2', foreground: '#2C1711', card: '#FFFFFF', cardForeground: '#2C1711', popover: '#FFFFFF', popoverForeground: '#2C1711', primary: '#82341C', primaryForeground: '#FFFFFF', secondary: '#F5E1DB', secondaryForeground: '#432319', muted: '#F2EBE9', mutedForeground: '#6C534C', accent: '#F7EEC5', accentForeground: '#3D3614', border: '#E6DAD6', input: '#D3C1BB', ring: '#82341C' },
    { background: '#190E0B', foreground: '#F5F1F0', card: '#291914', cardForeground: '#F5F1F0', popover: '#291914', popoverForeground: '#F5F1F0', primary: '#F1997E', primaryForeground: '#1E100B', secondary: '#482C23', secondaryForeground: '#F3EEEC', muted: '#36221C', mutedForeground: '#BCA69F', accent: '#564D25', accentForeground: '#F7F2DE', border: '#483028', input: '#553830', ring: '#F1997E' }),
  palette('flat', 'ocean', 'Ocean',
    { background: '#F2F6F8', foreground: '#0F262E', card: '#FFFFFF', cardForeground: '#0F262E', popover: '#FFFFFF', popoverForeground: '#0F262E', primary: '#186986', primaryForeground: '#FFFFFF', secondary: '#DAEEF6', secondaryForeground: '#173945', muted: '#E8EFF2', mutedForeground: '#49646E', accent: '#C5CCF7', accentForeground: '#141B3D', border: '#D5E2E7', input: '#B9CDD4', ring: '#186986' },
    { background: '#0A161A', foreground: '#EFF4F5', card: '#12242B', cardForeground: '#EFF4F5', popover: '#12242B', popoverForeground: '#EFF4F5', primary: '#7BD4F4', primaryForeground: '#0A191F', secondary: '#20404B', secondaryForeground: '#ECF1F3', muted: '#1A3037', mutedForeground: '#9DB5BE', accent: '#252C56', accentForeground: '#DEE2F7', border: '#26404A', input: '#2D4C58', ring: '#7BD4F4' }),
  palette('flat', 'graphite', 'Graphite',
    { background: '#F4F5F5', foreground: '#191D24', card: '#FFFFFF', cardForeground: '#191D24', popover: '#FFFFFF', popoverForeground: '#191D24', primary: '#31456D', primaryForeground: '#FFFFFF', secondary: '#E2E6EE', secondaryForeground: '#262B36', muted: '#ECEDEE', mutedForeground: '#585B5F', accent: '#D1C5F7', accentForeground: '#1F143D', border: '#DCDDE0', input: '#C4C6CA', ring: '#31456D' },
    { background: '#101114', foreground: '#F2F2F3', card: '#1C1E21', cardForeground: '#F2F2F3', popover: '#1C1E21', popoverForeground: '#F2F2F3', primary: '#92ABDD', primaryForeground: '#111318', secondary: '#31343A', secondaryForeground: '#EFEFF0', muted: '#26282C', mutedForeground: '#AAACB1', accent: '#312556', accentForeground: '#E4DEF7', border: '#35373C', input: '#3E4147', ring: '#92ABDD' }),
  ],
}

/** The palettes offered for a style family; liquid glass keeps its tint control instead. */
export function paletteSchemes(family: StyleFamily): ColorScheme[] {
  return palettes[family] ?? []
}

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
