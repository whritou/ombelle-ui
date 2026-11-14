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
  minimalist: [
  palette('minimalist', 'sand', 'Sand',
    { background: '#FBFAF9', foreground: '#141310', card: '#FFFFFF', cardForeground: '#141310', popover: '#FFFFFF', popoverForeground: '#141310', primary: '#181511', primaryForeground: '#FBFAF9', secondary: '#F2F0EE', secondaryForeground: '#1D1B16', muted: '#F2F0EE', mutedForeground: '#68635A', accent: '#EDEBE8', accentForeground: '#1D1B16', border: '#E6E4E0', input: '#DBD8D1', ring: '#856D3D' },
    { background: '#11100E', foreground: '#F2F0EE', card: '#191815', cardForeground: '#F2F0EE', popover: '#191815', popoverForeground: '#F2F0EE', primary: '#F2F0EE', primaryForeground: '#141310', secondary: '#272520', secondaryForeground: '#F2F0EE', muted: '#22201C', mutedForeground: '#AEAAA3', accent: '#2A2723', accentForeground: '#F2F0EE', border: '#302D27', input: '#3D3A33', ring: '#C8B388' }),
  palette('minimalist', 'sage', 'Sage',
    { background: '#F9FAFA', foreground: '#101311', card: '#FFFFFF', cardForeground: '#101311', popover: '#FFFFFF', popoverForeground: '#101311', primary: '#121714', primaryForeground: '#F9FAFA', secondary: '#EEF1EF', secondaryForeground: '#171C19', muted: '#EEF1EF', mutedForeground: '#5C665F', accent: '#E9ECEA', accentForeground: '#171C19', border: '#E0E5E2', input: '#D3DAD5', ring: '#408256' },
    { background: '#0E100F', foreground: '#EEF1EF', card: '#151916', cardForeground: '#EEF1EF', popover: '#151916', popoverForeground: '#EEF1EF', primary: '#EEF1EF', primaryForeground: '#101311', secondary: '#212623', secondaryForeground: '#EEF1EF', muted: '#1C211E', mutedForeground: '#A4ACA7', accent: '#232925', accentForeground: '#EEF1EF', border: '#282E2A', input: '#343C37', ring: '#8BC69E' }),
  palette('minimalist', 'stone-blue', 'Stone Blue',
    { background: '#F9FAFB', foreground: '#101114', card: '#FFFFFF', cardForeground: '#101114', popover: '#FFFFFF', popoverForeground: '#101114', primary: '#111418', primaryForeground: '#F9FAFB', secondary: '#EEEFF2', secondaryForeground: '#16191D', muted: '#EEEFF2', mutedForeground: '#5A6068', accent: '#E8EAED', accentForeground: '#16191D', border: '#E0E2E6', input: '#D1D5DB', ring: '#3D5B85' },
    { background: '#0E0F11', foreground: '#EEEFF2', card: '#151719', cardForeground: '#EEEFF2', popover: '#151719', popoverForeground: '#EEEFF2', primary: '#EEEFF2', primaryForeground: '#101114', secondary: '#202327', secondaryForeground: '#EEEFF2', muted: '#1C1E22', mutedForeground: '#A3A7AE', accent: '#23262A', accentForeground: '#EEEFF2', border: '#272B30', input: '#33373D', ring: '#88A3C8' }),
  palette('minimalist', 'clay', 'Clay',
    { background: '#FBFAF9', foreground: '#14110F', card: '#FFFFFF', cardForeground: '#14110F', popover: '#FFFFFF', popoverForeground: '#14110F', primary: '#181311', primaryForeground: '#FBFAF9', secondary: '#F2EFEE', secondaryForeground: '#1D1816', muted: '#F2EFEE', mutedForeground: '#695E59', accent: '#EDE9E8', accentForeground: '#1D1816', border: '#E7E1DF', input: '#DCD4D0', ring: '#87523B' },
    { background: '#110F0E', foreground: '#F2EFEE', card: '#1A1614', cardForeground: '#F2EFEE', popover: '#1A1614', popoverForeground: '#F2EFEE', primary: '#F2EFEE', primaryForeground: '#14110F', secondary: '#282220', secondaryForeground: '#F2EFEE', muted: '#221D1B', mutedForeground: '#AEA6A2', accent: '#2B2522', accentForeground: '#F2EFEE', border: '#302926', input: '#3E3632', ring: '#CA9B86' }),
  palette('minimalist', 'moss', 'Moss',
    { background: '#FAFBF9', foreground: '#11140F', card: '#FFFFFF', cardForeground: '#11140F', popover: '#FFFFFF', popoverForeground: '#11140F', primary: '#141811', primaryForeground: '#FAFBF9', secondary: '#EFF2EE', secondaryForeground: '#191D16', muted: '#EFF2EE', mutedForeground: '#606959', accent: '#EAEDE8', accentForeground: '#191D16', border: '#E2E7DF', input: '#D5DCD0', ring: '#5B873B' },
    { background: '#0F110E', foreground: '#EFF2EE', card: '#171A14', cardForeground: '#EFF2EE', popover: '#171A14', popoverForeground: '#EFF2EE', primary: '#EFF2EE', primaryForeground: '#11140F', secondary: '#232820', secondaryForeground: '#EFF2EE', muted: '#1E221B', mutedForeground: '#A7AEA2', accent: '#262B22', accentForeground: '#EFF2EE', border: '#2B3026', input: '#373E32', ring: '#A3CA86' }),
  palette('minimalist', 'ink', 'Ink',
    { background: '#FAFAFA', foreground: '#111112', card: '#FFFFFF', cardForeground: '#111112', popover: '#FFFFFF', popoverForeground: '#111112', primary: '#131316', primaryForeground: '#FAFAFA', secondary: '#EFEFF0', secondaryForeground: '#19191A', muted: '#EFEFF0', mutedForeground: '#5F5F63', accent: '#EAEAEB', accentForeground: '#19191A', border: '#E2E2E4', input: '#D5D5D7', ring: '#46467C' },
    { background: '#0F0F10', foreground: '#EFEFF0', card: '#161618', cardForeground: '#EFEFF0', popover: '#161618', popoverForeground: '#EFEFF0', primary: '#EFEFF0', primaryForeground: '#111112', secondary: '#232325', secondaryForeground: '#EFEFF0', muted: '#1E1E1F', mutedForeground: '#A7A7AA', accent: '#252527', accentForeground: '#EFEFF0', border: '#2A2A2C', input: '#373739', ring: '#9090C1' }),
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
    { background: '#FCFAF8', foreground: '#28211A', card: '#FFFFFF', cardForeground: '#28211A', popover: '#FFFFFF', popoverForeground: '#28211A', primary: '#B35B0F', primaryForeground: '#FFFFFF', secondary: '#FAEFE5', secondaryForeground: '#452C17', muted: '#F5F2EF', mutedForeground: '#6A5B4E', accent: '#FAEFE5', accentForeground: '#452C17', border: '#322820', input: '#D2C6BC', ring: '#AF590E' },
    { background: '#1A1714', foreground: '#F7F5F3', card: '#231E1A', cardForeground: '#F7F5F3', popover: '#231E1A', popoverForeground: '#F7F5F3', primary: '#F4AE71', primaryForeground: '#20160E', secondary: '#503721', secondaryForeground: '#F6F2EE', muted: '#312B25', mutedForeground: '#B9ADA2', accent: '#503721', accentForeground: '#F6F2EE', border: '#C2B7AE', input: '#51473D', ring: '#F4AE71' }),
  palette('ombelle', 'lilac', 'Lilac',
    { background: '#FAF8FC', foreground: '#211A28', card: '#FFFFFF', cardForeground: '#211A28', popover: '#FFFFFF', popoverForeground: '#211A28', primary: '#851DED', primaryForeground: '#FFFFFF', secondary: '#F0E5FA', secondaryForeground: '#2E1745', muted: '#F2EFF5', mutedForeground: '#5C4E6A', accent: '#F0E5FA', accentForeground: '#2E1745', border: '#292032', input: '#C7BCD2', ring: '#851DED' },
    { background: '#17141A', foreground: '#F5F3F7', card: '#1F1A23', cardForeground: '#F5F3F7', popover: '#1F1A23', popoverForeground: '#F5F3F7', primary: '#B371F4', primaryForeground: '#170E20', secondary: '#382150', secondaryForeground: '#F2EEF6', muted: '#2B2531', mutedForeground: '#ADA2B9', accent: '#382150', accentForeground: '#F2EEF6', border: '#B8AEC2', input: '#473D51', ring: '#B371F4' }),
  palette('ombelle', 'sage', 'Sage',
    { background: '#F8FCFA', foreground: '#1A2821', card: '#FFFFFF', cardForeground: '#1A2821', popover: '#FFFFFF', popoverForeground: '#1A2821', primary: '#1C824F', primaryForeground: '#FFFFFF', secondary: '#E8F7F0', secondaryForeground: '#17452E', muted: '#EFF5F2', mutedForeground: '#4E6A5C', accent: '#E8F7F0', accentForeground: '#17452E', border: '#203229', input: '#BCD2C7', ring: '#1C824F' },
    { background: '#141A17', foreground: '#F3F7F5', card: '#1A231F', cardForeground: '#F3F7F5', popover: '#1A231F', popoverForeground: '#F3F7F5', primary: '#81E4B3', primaryForeground: '#0E2017', secondary: '#274938', secondaryForeground: '#EEF6F2', muted: '#25312B', mutedForeground: '#A2B9AD', accent: '#274938', accentForeground: '#EEF6F2', border: '#AEC2B8', input: '#3D5147', ring: '#81E4B3' }),
  palette('ombelle', 'sky', 'Sky',
    { background: '#F8FAFC', foreground: '#1A2128', card: '#FFFFFF', cardForeground: '#1A2128', popover: '#FFFFFF', popoverForeground: '#1A2128', primary: '#1173D4', primaryForeground: '#FFFFFF', secondary: '#E5F0FA', secondaryForeground: '#172E45', muted: '#EFF2F5', mutedForeground: '#4E5C6A', accent: '#E5F0FA', accentForeground: '#172E45', border: '#202932', input: '#BCC7D2', ring: '#1170D0' },
    { background: '#14171A', foreground: '#F3F5F7', card: '#1A1F23', cardForeground: '#F3F5F7', popover: '#1A1F23', popoverForeground: '#F3F5F7', primary: '#71B3F4', primaryForeground: '#0E1720', secondary: '#213850', secondaryForeground: '#EEF2F6', muted: '#252B31', mutedForeground: '#A2ADB9', accent: '#213850', accentForeground: '#EEF2F6', border: '#AEB8C2', input: '#3D4751', ring: '#71B3F4' }),
  palette('ombelle', 'plum', 'Plum',
    { background: '#FCF8FC', foreground: '#281A27', card: '#FFFFFF', cardForeground: '#281A27', popover: '#FFFFFF', popoverForeground: '#281A27', primary: '#CD1DBF', primaryForeground: '#FFFFFF', secondary: '#F9E7F7', secondaryForeground: '#451741', muted: '#F5EFF5', mutedForeground: '#6A4E67', accent: '#F9E7F7', accentForeground: '#451741', border: '#322030', input: '#D2BCD0', ring: '#C41CB6' },
    { background: '#1A141A', foreground: '#F7F3F7', card: '#231A23', cardForeground: '#F7F3F7', popover: '#231A23', popoverForeground: '#F7F3F7', primary: '#EC79E2', primaryForeground: '#200E1F', secondary: '#4C2449', secondaryForeground: '#F6EEF5', muted: '#312530', mutedForeground: '#B9A2B7', accent: '#4C2449', accentForeground: '#F6EEF5', border: '#C2AEC0', input: '#513D50', ring: '#EC79E2' }),
  palette('ombelle', 'amber', 'Amber',
    { background: '#FCFBF8', foreground: '#28241A', card: '#FFFFFF', cardForeground: '#28241A', popover: '#FFFFFF', popoverForeground: '#28241A', primary: '#9A6D04', primaryForeground: '#FFFFFF', secondary: '#FCF5E3', secondaryForeground: '#453717', muted: '#F5F3EF', mutedForeground: '#6A614E', accent: '#FCF5E3', accentForeground: '#453717', border: '#322C20', input: '#D2CBBC', ring: '#956A04' },
    { background: '#1A1814', foreground: '#F7F6F3', card: '#23211A', cardForeground: '#F7F6F3', popover: '#23211A', popoverForeground: '#F7F6F3', primary: '#FBD06A', primaryForeground: '#201B0E', secondary: '#53431D', secondaryForeground: '#F6F4EE', muted: '#312E25', mutedForeground: '#B9B2A2', accent: '#53431D', accentForeground: '#F6F4EE', border: '#C2BCAE', input: '#514B3D', ring: '#FBD06A' }),
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
