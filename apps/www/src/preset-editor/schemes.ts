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
  /** The colour of the small mark inside a palette swatch. */
  swatchMark?: string
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
  // Minimalist primaries are all near-black, so its ring colour tells its palettes apart.
  swatchMark: family === 'minimalist' ? light.ring! : light.primary!,
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
    { background: '#F2F7F5', foreground: '#122B1F', card: '#FFFFFF', cardForeground: '#122B1F', popover: '#FFFFFF', popoverForeground: '#122B1F', primary: '#207E4F', primaryForeground: '#FFFFFF', secondary: '#DDF4E8', secondaryForeground: '#1C402E', muted: '#E9F1ED', mutedForeground: '#4E6A5C', accent: '#F7EDC5', accentForeground: '#3D3514', border: '#D7E5DE', input: '#6C9380', ring: '#207E4F' },
    { background: '#0C1812', foreground: '#F0F5F2', card: '#15281F', cardForeground: '#F0F5F2', popover: '#15281F', popoverForeground: '#F0F5F2', primary: '#82EDB8', primaryForeground: '#0C1D14', secondary: '#254636', secondaryForeground: '#EDF2F0', muted: '#1E3429', mutedForeground: '#A1BAAD', accent: '#564C25', accentForeground: '#F7F2DE', border: '#2B4638', input: '#506D5E', ring: '#82EDB8' }),
  palette('flat', 'sand', 'Sand',
    { background: '#F8F6F2', foreground: '#2E230F', card: '#FFFFFF', cardForeground: '#2E230F', popover: '#FFFFFF', popoverForeground: '#2E230F', primary: '#865E18', primaryForeground: '#FFFFFF', secondary: '#F6ECDA', secondaryForeground: '#453417', muted: '#F2EEE8', mutedForeground: '#6E6149', accent: '#C5E2F7', accentForeground: '#142C3D', border: '#E7E0D5', input: '#9B8969', ring: '#865E18' },
    { background: '#1A140A', foreground: '#F5F3EF', card: '#2B2212', cardForeground: '#F5F3EF', popover: '#2B2212', popoverForeground: '#F5F3EF', primary: '#F4C87B', primaryForeground: '#1F170A', secondary: '#4B3B20', secondaryForeground: '#F3F1EC', muted: '#372D1A', mutedForeground: '#BEB29D', accent: '#254156', accentForeground: '#DEEDF7', border: '#4A3D26', input: '#71634B', ring: '#F4C87B' }),
  palette('flat', 'lilac', 'Lilac',
    { background: '#F4F1F8', foreground: '#1C0E2F', card: '#FFFFFF', cardForeground: '#1C0E2F', popover: '#FFFFFF', popoverForeground: '#1C0E2F', primary: '#45148A', primaryForeground: '#FFFFFF', secondary: '#E6D9F7', secondaryForeground: '#2A1547', muted: '#ECE8F3', mutedForeground: '#584770', accent: '#F7C5DE', accentForeground: '#3D1429', border: '#DCD3E8', input: '#937FAE', ring: '#45148A' },
    { background: '#10091B', foreground: '#F2EFF6', card: '#1C112C', cardForeground: '#F2EFF6', popover: '#1C112C', popoverForeground: '#F2EFF6', primary: '#AD77F8', primaryForeground: '#130920', secondary: '#321D4E', secondaryForeground: '#EFECF4', muted: '#261839', mutedForeground: '#AA9BC0', accent: '#56253D', accentForeground: '#F7DEEB', border: '#35244C', input: '#6C5789', ring: '#AD77F8' }),
  palette('flat', 'clay', 'Clay',
    { background: '#F8F3F2', foreground: '#2C1711', card: '#FFFFFF', cardForeground: '#2C1711', popover: '#FFFFFF', popoverForeground: '#2C1711', primary: '#82341C', primaryForeground: '#FFFFFF', secondary: '#F5E1DB', secondaryForeground: '#432319', muted: '#F2EBE9', mutedForeground: '#6C534C', accent: '#F7EDC5', accentForeground: '#3D3514', border: '#E6DAD6', input: '#A2847B', ring: '#82341C' },
    { background: '#190E0B', foreground: '#F5F1F0', card: '#291914', cardForeground: '#F5F1F0', popover: '#291914', popoverForeground: '#F5F1F0', primary: '#F1997E', primaryForeground: '#1E100B', secondary: '#482C23', secondaryForeground: '#F3EEEC', muted: '#36221C', mutedForeground: '#BCA69F', accent: '#564C25', accentForeground: '#F7F2DE', border: '#483028', input: '#785C54', ring: '#F1997E' }),
  palette('flat', 'ocean', 'Ocean',
    { background: '#F2F6F8', foreground: '#0F262E', card: '#FFFFFF', cardForeground: '#0F262E', popover: '#FFFFFF', popoverForeground: '#0F262E', primary: '#186986', primaryForeground: '#FFFFFF', secondary: '#DAEEF6', secondaryForeground: '#173945', muted: '#E8EFF2', mutedForeground: '#49646E', accent: '#F7EDC5', accentForeground: '#3D3514', border: '#D5E2E7', input: '#6C909D', ring: '#186986' },
    { background: '#0A161A', foreground: '#EFF4F5', card: '#12242B', cardForeground: '#EFF4F5', popover: '#12242B', popoverForeground: '#EFF4F5', primary: '#7BD4F4', primaryForeground: '#0A191F', secondary: '#20404B', secondaryForeground: '#ECF1F3', muted: '#1A3037', mutedForeground: '#9DB5BE', accent: '#564C25', accentForeground: '#F7F2DE', border: '#26404A', input: '#4E6A74', ring: '#7BD4F4' }),
  palette('flat', 'graphite', 'Graphite',
    { background: '#F4F5F5', foreground: '#191D24', card: '#FFFFFF', cardForeground: '#191D24', popover: '#FFFFFF', popoverForeground: '#191D24', primary: '#31456D', primaryForeground: '#FFFFFF', secondary: '#E2E6EE', secondaryForeground: '#262B36', muted: '#ECEDEE', mutedForeground: '#585B5F', accent: '#F7EEC5', accentForeground: '#3D3614', border: '#DCDDE0', input: '#888B91', ring: '#31456D' },
    { background: '#101114', foreground: '#F2F2F3', card: '#1C1E21', cardForeground: '#F2F2F3', popover: '#1C1E21', popoverForeground: '#F2F2F3', primary: '#92ABDD', primaryForeground: '#111318', secondary: '#31343A', secondaryForeground: '#EFEFF0', muted: '#26282C', mutedForeground: '#AAACB1', accent: '#564E25', accentForeground: '#F7F3DE', border: '#35373C', input: '#62656A', ring: '#92ABDD' }),
  ],
  minimalist: [
  palette('minimalist', 'sand', 'Sand',
    { background: '#F7F6F2', foreground: '#16130D', card: '#FFFFFF', cardForeground: '#16130D', popover: '#FFFFFF', popoverForeground: '#16130D', primary: '#1B160E', primaryForeground: '#FBFAF9', secondary: '#F4F1EC', secondaryForeground: '#201C13', muted: '#F4F1EC', mutedForeground: '#706652', accent: '#F0ECE5', accentForeground: '#201C13', border: '#E6E1D5', input: '#96896F', ring: '#92712F' },
    { background: '#12100C', foreground: '#F4F1EC', card: '#1C1912', cardForeground: '#F4F1EC', popover: '#1C1912', popoverForeground: '#F4F1EC', primary: '#F4F1EC', primaryForeground: '#16130D', secondary: '#2B261C', secondaryForeground: '#F4F1EC', muted: '#252118', mutedForeground: '#B4AC9D', accent: '#2E291E', accentForeground: '#F4F1EC', border: '#342E22', input: '#6B6252', ring: '#D5B77C' }),
  palette('minimalist', 'sage', 'Sage',
    { background: '#F3F6F4', foreground: '#0F1511', card: '#FFFFFF', cardForeground: '#0F1511', popover: '#FFFFFF', popoverForeground: '#0F1511', primary: '#101813', primaryForeground: '#F9FBFA', secondary: '#EDF2EF', secondaryForeground: '#151E18', muted: '#EDF2EF', mutedForeground: '#586A5E', accent: '#E7EEEA', accentForeground: '#151E18', border: '#D9E3DC', input: '#799081', ring: '#398954' },
    { background: '#0D110F', foreground: '#EDF2EF', card: '#141A16', cardForeground: '#EDF2EF', popover: '#141A16', popoverForeground: '#EDF2EF', primary: '#EDF2EF', primaryForeground: '#0F1511', secondary: '#1F2822', secondaryForeground: '#EDF2EF', muted: '#1B231D', mutedForeground: '#A1AFA6', accent: '#212B25', accentForeground: '#EDF2EF', border: '#26312A', input: '#57665C', ring: '#85CC9C' }),
  palette('minimalist', 'stone-blue', 'Stone Blue',
    { background: '#F3F4F7', foreground: '#0E1116', card: '#FFFFFF', cardForeground: '#0E1116', popover: '#FFFFFF', popoverForeground: '#0E1116', primary: '#0F141A', primaryForeground: '#F9FAFB', secondary: '#ECEFF3', secondaryForeground: '#14191F', muted: '#ECEFF3', mutedForeground: '#545F6E', accent: '#E6EAEF', accentForeground: '#14191F', border: '#D7DDE5', input: '#7D8A9B', ring: '#33598E' },
    { background: '#0D0F12', foreground: '#ECEFF3', card: '#13161B', cardForeground: '#ECEFF3', popover: '#13161B', popoverForeground: '#ECEFF3', primary: '#ECEFF3', primaryForeground: '#0E1116', secondary: '#1D232A', secondaryForeground: '#ECEFF3', muted: '#191E24', mutedForeground: '#9FA7B2', accent: '#20252D', accentForeground: '#ECEFF3', border: '#242A33', input: '#59626E', ring: '#80A2D1' }),
  palette('minimalist', 'clay', 'Clay',
    { background: '#F7F3F2', foreground: '#160F0D', card: '#FFFFFF', cardForeground: '#160F0D', popover: '#FFFFFF', popoverForeground: '#160F0D', primary: '#1B110E', primaryForeground: '#FBF9F9', secondary: '#F4EEEC', secondaryForeground: '#201613', muted: '#F4EEEC', mutedForeground: '#705952', accent: '#F0E8E5', accentForeground: '#201613', border: '#E6D9D5', input: '#A0857D', ring: '#92472F' },
    { background: '#120E0C', foreground: '#F4EEEC', card: '#1C1412', cardForeground: '#F4EEEC', popover: '#1C1412', popoverForeground: '#F4EEEC', primary: '#F4EEEC', primaryForeground: '#160F0D', secondary: '#2B201C', secondaryForeground: '#F4EEEC', muted: '#251B18', mutedForeground: '#B4A29D', accent: '#2E221E', accentForeground: '#F4EEEC', border: '#342722', input: '#705D57', ring: '#D5917C' }),
  palette('minimalist', 'moss', 'Moss',
    { background: '#F5F7F3', foreground: '#13160E', card: '#FFFFFF', cardForeground: '#13160E', popover: '#FFFFFF', popoverForeground: '#13160E', primary: '#151A0F', primaryForeground: '#FAFBF9', secondary: '#F0F3EC', secondaryForeground: '#1A1F14', muted: '#F0F3EC', mutedForeground: '#636E54', accent: '#EBEFE6', accentForeground: '#1A1F14', border: '#DFE5D7', input: '#82906F', ring: '#688E33' },
    { background: '#10120D', foreground: '#F0F3EC', card: '#181B13', cardForeground: '#F0F3EC', popover: '#181B13', popoverForeground: '#F0F3EC', primary: '#F0F3EC', primaryForeground: '#13160E', secondary: '#252A1D', secondaryForeground: '#F0F3EC', muted: '#1F2419', mutedForeground: '#AAB29F', accent: '#272D20', accentForeground: '#F0F3EC', border: '#2D3324', input: '#5D6652', ring: '#AFD180' }),
  palette('minimalist', 'ink', 'Ink',
    { background: '#F4F4F5', foreground: '#111113', card: '#FFFFFF', cardForeground: '#111113', popover: '#FFFFFF', popoverForeground: '#111113', primary: '#131316', primaryForeground: '#FAFAFA', secondary: '#EFEFF0', secondaryForeground: '#18181B', muted: '#EFEFF0', mutedForeground: '#5F5F63', accent: '#EAEAEB', accentForeground: '#18181B', border: '#DDDDDF', input: '#89898F', ring: '#45457D' },
    { background: '#0F0F10', foreground: '#EFEFF0', card: '#161618', cardForeground: '#EFEFF0', popover: '#161618', popoverForeground: '#EFEFF0', primary: '#EFEFF0', primaryForeground: '#111113', secondary: '#232325', secondaryForeground: '#EFEFF0', muted: '#1E1E20', mutedForeground: '#A7A7AA', accent: '#252527', accentForeground: '#EFEFF0', border: '#2A2A2D', input: '#616165', ring: '#8F8FC1' }),
  ],
  'neo-brutalism': [
  palette('neo-brutalism', 'pink', 'Pink',
    { background: '#F4ECF1', foreground: '#111111', card: '#FFFFFF', cardForeground: '#111111', popover: '#FFFFFF', popoverForeground: '#111111', primary: '#FF5CC3', primaryForeground: '#111111', secondary: '#FF9C8F', secondaryForeground: '#111111', muted: '#EBE5E9', mutedForeground: '#454545', accent: '#C18FFF', accentForeground: '#111111', border: '#111111', input: '#111111', ring: '#111111' },
    { background: '#161315', foreground: '#F5F5F5', card: '#211C1F', cardForeground: '#F5F5F5', popover: '#211C1F', popoverForeground: '#F5F5F5', primary: '#FF5CC3', primaryForeground: '#111111', secondary: '#FF8A7A', secondaryForeground: '#111111', muted: '#2F282C', mutedForeground: '#BDBDBD', accent: '#B67AFF', accentForeground: '#111111', border: '#F5F5F5', input: '#F5F5F5', ring: '#F5F5F5' }),
  palette('neo-brutalism', 'cyan', 'Cyan',
    { background: '#ECF3F4', foreground: '#111111', card: '#FFFFFF', cardForeground: '#111111', popover: '#FFFFFF', popoverForeground: '#111111', primary: '#5CE9FF', primaryForeground: '#111111', secondary: '#8F9CFF', secondaryForeground: '#111111', muted: '#E5EAEB', mutedForeground: '#454545', accent: '#8FFFA7', accentForeground: '#111111', border: '#111111', input: '#111111', ring: '#111111' },
    { background: '#131616', foreground: '#F5F5F5', card: '#1C2021', cardForeground: '#F5F5F5', popover: '#1C2021', popoverForeground: '#F5F5F5', primary: '#5CE9FF', primaryForeground: '#111111', secondary: '#7A8AFF', secondaryForeground: '#111111', muted: '#282E2F', mutedForeground: '#BDBDBD', accent: '#7AFF97', accentForeground: '#111111', border: '#F5F5F5', input: '#F5F5F5', ring: '#F5F5F5' }),
  palette('neo-brutalism', 'lime', 'Lime',
    { background: '#F1F4EC', foreground: '#111111', card: '#FFFFFF', cardForeground: '#111111', popover: '#FFFFFF', popoverForeground: '#111111', primary: '#CEFF5C', primaryForeground: '#111111', secondary: '#8FFF94', secondaryForeground: '#111111', muted: '#E9EBE5', mutedForeground: '#454545', accent: '#FFBA8F', accentForeground: '#111111', border: '#111111', input: '#111111', ring: '#111111' },
    { background: '#151613', foreground: '#F5F5F5', card: '#20211C', cardForeground: '#F5F5F5', popover: '#20211C', popoverForeground: '#F5F5F5', primary: '#CEFF5C', primaryForeground: '#111111', secondary: '#7AFF81', secondaryForeground: '#111111', muted: '#2D2F28', mutedForeground: '#BDBDBD', accent: '#FFAD7A', accentForeground: '#111111', border: '#F5F5F5', input: '#F5F5F5', ring: '#F5F5F5' }),
  palette('neo-brutalism', 'orange', 'Orange',
    { background: '#F4EFEC', foreground: '#111111', card: '#FFFFFF', cardForeground: '#111111', popover: '#FFFFFF', popoverForeground: '#111111', primary: '#FF9D5C', primaryForeground: '#111111', secondary: '#EEFF8F', secondaryForeground: '#111111', muted: '#EBE7E5', mutedForeground: '#454545', accent: '#FF8FC9', accentForeground: '#111111', border: '#111111', input: '#111111', ring: '#111111' },
    { background: '#161413', foreground: '#F5F5F5', card: '#211E1C', cardForeground: '#F5F5F5', popover: '#211E1C', popoverForeground: '#F5F5F5', primary: '#FF9D5C', primaryForeground: '#111111', secondary: '#EBFF7A', secondaryForeground: '#111111', muted: '#2F2B28', mutedForeground: '#BDBDBD', accent: '#FF7ABF', accentForeground: '#111111', border: '#F5F5F5', input: '#F5F5F5', ring: '#F5F5F5' }),
  palette('neo-brutalism', 'lilac', 'Lilac',
    { background: '#EFECF4', foreground: '#111111', card: '#FFFFFF', cardForeground: '#111111', popover: '#FFFFFF', popoverForeground: '#111111', primary: '#985CFF', primaryForeground: '#111111', secondary: '#FF8FF2', secondaryForeground: '#111111', muted: '#E7E5EB', mutedForeground: '#454545', accent: '#8FCDFF', accentForeground: '#111111', border: '#111111', input: '#111111', ring: '#111111' },
    { background: '#141316', foreground: '#F5F5F5', card: '#1E1C21', cardForeground: '#F5F5F5', popover: '#1E1C21', popoverForeground: '#F5F5F5', primary: '#985CFF', primaryForeground: '#111111', secondary: '#FF7AF0', secondaryForeground: '#111111', muted: '#2A282F', mutedForeground: '#BDBDBD', accent: '#7AC3FF', accentForeground: '#111111', border: '#F5F5F5', input: '#F5F5F5', ring: '#F5F5F5' }),
  palette('neo-brutalism', 'mono', 'Mono',
    { background: '#F0F0F0', foreground: '#111111', card: '#FFFFFF', cardForeground: '#111111', popover: '#FFFFFF', popoverForeground: '#111111', primary: '#111111', primaryForeground: '#FFFFFF', secondary: '#D6D6D6', secondaryForeground: '#111111', muted: '#E8E8E8', mutedForeground: '#454545', accent: '#FFD23F', accentForeground: '#111111', border: '#111111', input: '#111111', ring: '#111111' },
    { background: '#141414', foreground: '#F5F5F5', card: '#1F1F1F', cardForeground: '#F5F5F5', popover: '#1F1F1F', popoverForeground: '#F5F5F5', primary: '#F5F5F5', primaryForeground: '#111111', secondary: '#B3B3B3', secondaryForeground: '#111111', muted: '#2B2B2B', mutedForeground: '#BDBDBD', accent: '#FFD23F', accentForeground: '#111111', border: '#F5F5F5', input: '#F5F5F5', ring: '#F5F5F5' }),
  ],
  ombelle: [
  palette('ombelle', 'peach', 'Peach',
    { background: 'oklch(98.6% 0.003 67.8)', foreground: 'oklch(25.3% 0.017 67.0)', card: 'oklch(100.0% 0.000 0.0)', cardForeground: 'oklch(25.3% 0.017 67.0)', popover: 'oklch(100.0% 0.000 0.0)', popoverForeground: 'oklch(25.3% 0.017 67.0)', primary: 'oklch(55.8% 0.136 53.4)', primaryForeground: 'oklch(100.0% 0.000 0.0)', secondary: 'oklch(95.8% 0.018 64.9)', secondaryForeground: 'oklch(31.8% 0.050 59.6)', muted: 'oklch(96.3% 0.005 67.8)', mutedForeground: 'oklch(48.2% 0.028 63.0)', accent: 'oklch(95.8% 0.018 64.9)', accentForeground: 'oklch(31.8% 0.050 59.6)', border: 'oklch(28.6% 0.021 60.5)', input: 'oklch(28.6% 0.021 60.5)', ring: 'oklch(54.7% 0.132 53.8)' },
    { background: 'oklch(20.7% 0.008 67.4)', foreground: 'oklch(97.1% 0.003 67.8)', card: 'oklch(23.9% 0.011 60.9)', cardForeground: 'oklch(97.1% 0.003 67.8)', popover: 'oklch(23.9% 0.011 60.9)', popoverForeground: 'oklch(97.1% 0.003 67.8)', primary: 'oklch(80.4% 0.113 61.2)', primaryForeground: 'oklch(21.0% 0.022 59.9)', secondary: 'oklch(36.0% 0.050 61.6)', secondaryForeground: 'oklch(96.3% 0.007 67.7)', muted: 'oklch(29.4% 0.014 67.2)', mutedForeground: 'oklch(75.5% 0.021 65.1)', accent: 'oklch(36.0% 0.050 61.6)', accentForeground: 'oklch(96.3% 0.007 67.7)', border: 'oklch(78.6% 0.018 61.9)', input: 'oklch(78.6% 0.018 61.9)', ring: 'oklch(80.4% 0.113 61.2)' }),
  palette('ombelle', 'lilac', 'Lilac',
    { background: 'oklch(98.2% 0.006 308.4)', foreground: 'oklch(23.3% 0.028 307.1)', card: 'oklch(100.0% 0.000 0.0)', cardForeground: 'oklch(23.3% 0.028 307.1)', popover: 'oklch(100.0% 0.000 0.0)', popoverForeground: 'oklch(23.3% 0.028 307.1)', primary: 'oklch(52.8% 0.269 298.2)', primaryForeground: 'oklch(100.0% 0.000 0.0)', secondary: 'oklch(93.7% 0.030 309.1)', secondaryForeground: 'oklch(26.3% 0.084 304.2)', muted: 'oklch(95.6% 0.009 308.4)', mutedForeground: 'oklch(44.9% 0.048 307.3)', accent: 'oklch(93.7% 0.030 309.1)', accentForeground: 'oklch(26.3% 0.084 304.2)', border: 'oklch(26.2% 0.035 307.0)', input: 'oklch(26.2% 0.035 307.0)', ring: 'oklch(52.8% 0.269 298.2)' },
    { background: 'oklch(19.8% 0.013 307.7)', foreground: 'oklch(96.7% 0.006 308.4)', card: 'oklch(22.8% 0.019 309.9)', cardForeground: 'oklch(96.7% 0.006 308.4)', popover: 'oklch(22.8% 0.019 309.9)', popoverForeground: 'oklch(96.7% 0.006 308.4)', primary: 'oklch(67.5% 0.193 305.1)', primaryForeground: 'oklch(18.6% 0.038 306.1)', secondary: 'oklch(30.2% 0.085 304.4)', secondaryForeground: 'oklch(95.4% 0.011 308.3)', muted: 'oklch(27.6% 0.023 307.5)', mutedForeground: 'oklch(72.9% 0.035 307.0)', accent: 'oklch(30.2% 0.085 304.4)', accentForeground: 'oklch(95.4% 0.011 308.3)', border: 'oklch(76.5% 0.030 308.0)', input: 'oklch(76.5% 0.030 308.0)', ring: 'oklch(67.5% 0.193 305.1)' }),
  palette('ombelle', 'sage', 'Sage',
    { background: 'oklch(98.7% 0.005 165.0)', foreground: 'oklch(26.1% 0.023 162.5)', card: 'oklch(100.0% 0.000 0.0)', cardForeground: 'oklch(26.1% 0.023 162.5)', popover: 'oklch(100.0% 0.000 0.0)', popoverForeground: 'oklch(26.1% 0.023 162.5)', primary: 'oklch(53.8% 0.120 155.8)', primaryForeground: 'oklch(100.0% 0.000 0.0)', secondary: 'oklch(96.3% 0.018 166.4)', secondaryForeground: 'oklch(35.2% 0.065 158.5)', muted: 'oklch(96.5% 0.007 164.9)', mutedForeground: 'oklch(49.8% 0.040 162.8)', accent: 'oklch(96.3% 0.018 166.4)', accentForeground: 'oklch(35.2% 0.065 158.5)', border: 'oklch(29.8% 0.029 162.3)', input: 'oklch(29.8% 0.029 162.3)', ring: 'oklch(52.6% 0.117 156.1)' },
    { background: 'oklch(21.0% 0.011 163.7)', foreground: 'oklch(97.3% 0.005 165.0)', card: 'oklch(24.6% 0.015 166.3)', cardForeground: 'oklch(97.3% 0.005 165.0)', popover: 'oklch(24.6% 0.015 166.3)', popoverForeground: 'oklch(97.3% 0.005 165.0)', primary: 'oklch(84.5% 0.117 160.9)', primaryForeground: 'oklch(22.5% 0.030 160.9)', secondary: 'oklch(37.4% 0.050 160.9)', secondaryForeground: 'oklch(96.6% 0.010 164.9)', muted: 'oklch(30.0% 0.020 163.3)', mutedForeground: 'oklch(76.5% 0.030 163.0)', accent: 'oklch(37.4% 0.050 160.9)', accentForeground: 'oklch(96.6% 0.010 164.9)', border: 'oklch(79.6% 0.026 164.3)', input: 'oklch(79.6% 0.026 164.3)', ring: 'oklch(84.5% 0.117 160.9)' }),
  palette('ombelle', 'sky', 'Sky',
    { background: 'oklch(98.4% 0.003 247.9)', foreground: 'oklch(24.4% 0.017 248.5)', card: 'oklch(100.0% 0.000 0.0)', cardForeground: 'oklch(24.4% 0.017 248.5)', popover: 'oklch(100.0% 0.000 0.0)', popoverForeground: 'oklch(24.4% 0.017 248.5)', primary: 'oklch(54.9% 0.169 254.4)', primaryForeground: 'oklch(100.0% 0.000 0.0)', secondary: 'oklch(95.0% 0.018 245.4)', secondaryForeground: 'oklch(29.4% 0.051 250.0)', muted: 'oklch(96.0% 0.005 247.9)', mutedForeground: 'oklch(46.8% 0.029 248.4)', accent: 'oklch(95.0% 0.018 245.4)', accentForeground: 'oklch(29.4% 0.051 250.0)', border: 'oklch(27.6% 0.021 248.6)', input: 'oklch(27.6% 0.021 248.6)', ring: 'oklch(54.1% 0.165 254.0)' },
    { background: 'oklch(20.3% 0.008 248.2)', foreground: 'oklch(96.9% 0.003 247.9)', card: 'oklch(23.6% 0.011 242.2)', cardForeground: 'oklch(96.9% 0.003 247.9)', popover: 'oklch(23.6% 0.011 242.2)', popoverForeground: 'oklch(96.9% 0.003 247.9)', primary: 'oklch(74.9% 0.116 249.3)', primaryForeground: 'oklch(20.0% 0.023 249.0)', secondary: 'oklch(33.3% 0.052 250.6)', secondaryForeground: 'oklch(95.9% 0.007 247.9)', muted: 'oklch(28.6% 0.014 248.3)', mutedForeground: 'oklch(74.3% 0.021 250.4)', accent: 'oklch(33.3% 0.052 250.6)', accentForeground: 'oklch(95.9% 0.007 247.9)', border: 'oklch(77.8% 0.018 248.1)', input: 'oklch(77.8% 0.018 248.1)', ring: 'oklch(74.9% 0.116 249.3)' }),
  palette('ombelle', 'plum', 'Plum',
    { background: 'oklch(98.3% 0.007 325.6)', foreground: 'oklch(24.1% 0.032 328.9)', card: 'oklch(100.0% 0.000 0.0)', cardForeground: 'oklch(24.1% 0.032 328.9)', popover: 'oklch(100.0% 0.000 0.0)', popoverForeground: 'oklch(24.1% 0.032 328.9)', primary: 'oklch(58.6% 0.249 332.5)', primaryForeground: 'oklch(100.0% 0.000 0.0)', secondary: 'oklch(94.7% 0.029 329.3)', secondaryForeground: 'oklch(29.5% 0.092 331.2)', muted: 'oklch(95.8% 0.010 325.7)', mutedForeground: 'oklch(46.3% 0.053 330.1)', accent: 'oklch(94.7% 0.029 329.3)', accentForeground: 'oklch(29.5% 0.092 331.2)', border: 'oklch(27.3% 0.039 330.5)', input: 'oklch(27.3% 0.039 330.5)', ring: 'oklch(56.6% 0.241 332.4)' },
    { background: 'oklch(20.1% 0.015 326.1)', foreground: 'oklch(96.8% 0.007 325.6)', card: 'oklch(23.3% 0.022 326.2)', cardForeground: 'oklch(96.8% 0.007 325.6)', popover: 'oklch(23.3% 0.022 326.2)', popoverForeground: 'oklch(96.8% 0.007 325.6)', primary: 'oklch(74.2% 0.189 330.6)', primaryForeground: 'oklch(19.8% 0.043 329.0)', secondary: 'oklch(33.0% 0.081 330.1)', secondaryForeground: 'oklch(95.7% 0.013 329.6)', muted: 'oklch(28.3% 0.026 329.0)', mutedForeground: 'oklch(73.9% 0.040 328.7)', accent: 'oklch(33.0% 0.081 330.1)', accentForeground: 'oklch(95.7% 0.013 329.6)', border: 'oklch(77.3% 0.034 329.1)', input: 'oklch(77.3% 0.034 329.1)', ring: 'oklch(74.2% 0.189 330.6)' }),
  palette('ombelle', 'amber', 'Amber',
    { background: 'oklch(98.8% 0.004 91.4)', foreground: 'oklch(26.1% 0.019 88.8)', card: 'oklch(100.0% 0.000 0.0)', cardForeground: 'oklch(26.1% 0.019 88.8)', popover: 'oklch(100.0% 0.000 0.0)', popoverForeground: 'oklch(26.1% 0.019 88.8)', primary: 'oklch(55.4% 0.114 80.2)', primaryForeground: 'oklch(100.0% 0.000 0.0)', secondary: 'oklch(97.1% 0.025 89.2)', secondaryForeground: 'oklch(34.4% 0.051 85.8)', muted: 'oklch(96.5% 0.006 84.6)', mutedForeground: 'oklch(49.6% 0.031 85.6)', accent: 'oklch(97.1% 0.025 89.2)', accentForeground: 'oklch(34.4% 0.051 85.8)', border: 'oklch(29.6% 0.022 84.4)', input: 'oklch(29.6% 0.022 84.4)', ring: 'oklch(54.0% 0.111 79.9)' },
    { background: 'oklch(21.0% 0.008 84.6)', foreground: 'oklch(97.3% 0.004 91.4)', card: 'oklch(24.7% 0.013 93.9)', cardForeground: 'oklch(97.3% 0.004 91.4)', popover: 'oklch(24.7% 0.013 93.9)', popoverForeground: 'oklch(97.3% 0.004 91.4)', primary: 'oklch(87.5% 0.130 86.7)', primaryForeground: 'oklch(22.4% 0.024 89.3)', secondary: 'oklch(39.1% 0.059 86.6)', secondaryForeground: 'oklch(96.7% 0.008 91.5)', muted: 'oklch(30.1% 0.016 91.8)', mutedForeground: 'oklch(76.5% 0.024 87.2)', accent: 'oklch(39.1% 0.059 86.6)', accentForeground: 'oklch(96.7% 0.008 91.5)', border: 'oklch(79.6% 0.020 87.5)', input: 'oklch(79.6% 0.020 87.5)', ring: 'oklch(87.5% 0.130 86.7)' }),
  ],
}

/** The palettes offered for a style family; liquid glass keeps its tint control instead. */
export function paletteSchemes(family: StyleFamily): ColorScheme[] {
  return palettes[family] ?? []
}

/** The tokens the Primary row owns while a palette is active. */
export const primaryTokenKeys: readonly string[] = ['primary', 'primaryForeground', 'ring']

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

/** True when every token of the scheme matches the draft, ignoring case and any `ignore`d token names. */
export function schemeMatches(
  draft: PresetEditorDraft,
  scheme: ColorScheme,
  ignore: readonly string[] = [],
): boolean {
  return paths(scheme)
    .filter(([path]) => !ignore.includes(path.slice(path.lastIndexOf('/') + 1)))
    .every(
    ([path, value]) =>
      presetFieldValue(draft, path).toLowerCase() === value.toLowerCase(),
  )
}

/** Every palette of every family, for resets: a draft may carry another family's palette. */
const everyPalette = () => Object.values(palettes).flat()

/** Returns the palette tokens to the style default, keeping a primary colour chosen in the Primary row. */
export function resetPalette(draft: PresetEditorDraft): PresetEditorDraft {
  const accentChoice = accentSchemes.find((scheme) => schemeMatches(draft, scheme))
  const reset = resetColorScheme(draft, everyPalette())
  return accentChoice ? applyColorScheme(reset, accentChoice) : reset
}

/** Returns the primary tokens to the active palette's, or to the style default when no palette is active. */
export function resetPrimary(draft: PresetEditorDraft): PresetEditorDraft {
  const active = paletteSchemes(draft.family).find((scheme) => schemeMatches(draft, scheme, primaryTokenKeys))
  const reset = resetColorScheme(draft, accentSchemes)
  if (!active) return reset
  const keep = (tokens: Tokens) => Object.fromEntries(primaryTokenKeys.map((key) => [key, tokens[key]]))
  return applyColorScheme(reset, { ...active, light: keep(active.light), dark: keep(active.dark) })
}

/** Drops a carried palette (keeping any primary colour) so it does not override a family with no Palette row. */
export function releasePalette(draft: PresetEditorDraft): PresetEditorDraft {
  const carried = paletteSchemes(draft.family).some((scheme) => schemeMatches(draft, scheme, primaryTokenKeys))
  return carried ? resetPalette(draft) : draft
}
