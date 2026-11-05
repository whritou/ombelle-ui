// Liquid glass tints: the surface colour (veil) and its ink, with the accent that suits them, for both modes.
// The starting presets were generated from these values; the preset editor's tint chips write them into a draft.
type TintColors = {
  card: string
  popover: string
  cardForeground: string
  popoverForeground: string
  foreground: string
  primary: string
  ring: string
  primaryForeground: string
}
export type GlassTintId = 'clear' | 'rose' | 'relief' | 'smoke'
export type GlassTintPalette = {
  light: TintColors & { destructive?: string }
  dark: TintColors
  /** Fumée is a dark veil with light ink: light mode takes the dark palette for every other colour. */
  lightUsesDarkPalette?: true
}

const colors = (veil: string, ink: string, accent: string, onAccent: string): TintColors => ({
  card: veil,
  popover: veil,
  cardForeground: ink,
  popoverForeground: ink,
  foreground: ink,
  primary: accent,
  ring: accent,
  primaryForeground: onAccent,
})

export const glassTintPalettes: Record<GlassTintId, GlassTintPalette> = {
  clear: { light: colors('#DAF6FF', '#102038', '#0B6AA8', '#FFFFFF'), dark: colors('#1B2540', '#F0F7FF', '#7DD3FC', '#0B1120') },
  rose: { light: colors('#FFD7EB', '#102038', '#A3245A', '#FFFFFF'), dark: colors('#2A1D33', '#F0F7FF', '#F9A8D4', '#0B1120') },
  // Rosée on Relief's warm backdrop; error text needs a deeper red on this veil.
  relief: {
    light: { ...colors('#F4A5B3', '#301B22', '#8C1D3A', '#FFFFFF'), destructive: '#641515' },
    dark: colors('#2E1A24', '#F0F7FF', '#FECDD3', '#0B1120'),
  },
  smoke: {
    light: colors('#091127', '#F0F7FF', '#7DD3FC', '#0B1120'),
    dark: colors('#091127', '#F0F7FF', '#7DD3FC', '#0B1120'),
    lightUsesDarkPalette: true,
  },
}
