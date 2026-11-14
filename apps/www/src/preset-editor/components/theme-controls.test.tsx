import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPresetDraft } from '../model'
import { accentSchemes, applyColorScheme, paletteSchemes } from '../schemes'
import { schemeSwatches, ThemeControls } from './preset-controls'

const noop = () => {}
const render = (family: Parameters<typeof createPresetDraft>[0]) =>
  renderToStaticMarkup(
    <ThemeControls draft={createPresetDraft(family)} onApply={noop} onResetGroup={noop} />,
  )

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

it('draws palette swatches as a light and dark pair', () => {
  const html = render('ombelle')
  const peach = paletteSchemes('ombelle')[0]!
  expect(html).toContain(`linear-gradient(135deg, ${peach.swatch} 50%, ${peach.swatchDark} 50%)`)
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
