import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog } from '@ombelle/catalog'
import { createPresetDraft } from '../model'
import { accentSchemes, applyColorScheme, paletteSchemes } from '../schemes'
import { paletteSwatch, schemeSwatches, ThemeControls } from './preset-controls'

const noop = () => {}
const render = (family: Parameters<typeof createPresetDraft>[0], mode?: 'light' | 'dark') =>
  renderToStaticMarkup(
    <ThemeControls draft={createPresetDraft(family)} mode={mode} onApply={noop} onResetGroup={noop} />,
  )
/** The custom properties a palette disc carries, as React writes them. */
const disc = (colors: { background: string; mark: string }) =>
  `--preset-scheme-bg:${colors.background};--preset-scheme-mark:${colors.mark}`

it('offers the draft family palettes, a style default and the primary row', () => {
  const html = render('flat')
  expect(html).toContain('aria-label="Palette color"')
  expect(html).toContain('aria-label="Style default palette"')
  for (const palette of paletteSchemes('flat')) expect(html).toContain(`aria-label="${palette.label} palette"`)
  expect(html).toContain('aria-label="Primary color"')
  for (const accent of accentSchemes) expect(html).toContain(`aria-label="${accent.label} primary"`)
})

it('swaps the palette row when the family changes', () => {
  const neo = render('neo-brutalism')
  expect(neo).toContain('aria-label="Pink palette"')
  expect(neo).not.toContain('aria-label="Sage palette"')
})

it('draws each palette as its page colour with its primary as the mark, in the preview mode', () => {
  const peach = paletteSchemes('ombelle')[0]!
  const colors = (mode: 'light' | 'dark') => paletteSwatch(peach[mode], 'ombelle')!
  expect(colors('light')).toEqual({ background: peach.light.background, mark: peach.light.primary })
  expect(render('ombelle')).toContain(disc(colors('light')))
  expect(render('ombelle', 'light')).toContain(disc(colors('light')))
  const dark = render('ombelle', 'dark')
  expect(dark).toContain(disc(colors('dark')))
  expect(dark).not.toContain(disc(colors('light')))
})

it('draws the style default in the style\'s own colours, not the editor\'s', () => {
  const papier = getCatalog('0.1.0').presets.papier.modes
  expect(render('papier', 'light')).toContain(disc({ background: papier.light.background!, mark: papier.light.primary! }))
  expect(render('papier', 'dark')).toContain(disc({ background: papier.dark.background!, mark: papier.dark.primary! }))
  // The old default was a split of the editor's own primary and muted colours.
  expect(render('papier')).not.toContain('conic-gradient')
})

it('marks Minimalist palettes with their ring, since every primary is near-black', () => {
  const sand = paletteSchemes('minimalist')[0]!
  expect(paletteSwatch(sand.light, 'minimalist')).toEqual({ background: sand.light.background, mark: sand.light.ring })
  expect(paletteSwatch(sand.light, 'ombelle')).toEqual({ background: sand.light.background, mark: sand.light.primary })
  expect(paletteSwatch({ primary: '#111' }, 'flat')).toBeUndefined()
})

it('fills each primary colour as a plain disc in the preview mode', () => {
  const rose = accentSchemes.find((accent) => accent.id === 'rose')!
  expect(render('flat', 'light')).toContain(`--preset-scheme-bg:${rose.light.primary}`)
  expect(render('flat', 'dark')).toContain(`--preset-scheme-bg:${rose.dark.primary}`)
})

it('keeps liquid glass on its tint control: no palette row', () => {
  const html = render('liquid-glass')
  expect(html).not.toContain('aria-label="Palette color"')
  expect(html).toContain('aria-label="Primary color"')
})

it('keeps the palette pressed and names the primary row after a palette or a primary colour', () => {
  const peach = paletteSchemes('ombelle')[0]!
  const rose = accentSchemes.find((a) => a.id === 'rose')!
  const html = (draft: ReturnType<typeof createPresetDraft>) =>
    renderToStaticMarkup(<ThemeControls draft={draft} onApply={noop} onResetGroup={noop} />)
  const withPalette = applyColorScheme(createPresetDraft('ombelle'), peach)
  expect(html(withPalette)).toMatch(/aria-pressed="true"[^>]*aria-label="Peach palette"/)
  expect(html(withPalette)).toContain('preset-scheme-current">Palette<')
  const withRose = applyColorScheme(withPalette, rose)
  expect(html(withRose)).toMatch(/aria-pressed="true"[^>]*aria-label="Peach palette"/)
  expect(html(withRose)).toMatch(/aria-pressed="true"[^>]*aria-label="Rose primary"/)
  // A primary colour alone leaves the palette row at the style default.
  const roseOnly = html(applyColorScheme(createPresetDraft('ombelle'), rose))
  expect(roseOnly).toMatch(/aria-pressed="true"[^>]*aria-label="Style default palette"/)
})

it('lists each colour once in a token picker, whatever schemes share it', () => {
  const values = schemeSwatches('border', 'light', 'neo-brutalism').map((swatch) => swatch.value.toLowerCase())
  expect(new Set(values).size).toBe(values.length)
  const labels = schemeSwatches('primary', 'light', 'ombelle').map((swatch) => swatch.label)
  expect(new Set(labels).size).toBe(labels.length)
})
