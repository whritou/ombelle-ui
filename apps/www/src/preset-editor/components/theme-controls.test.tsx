import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPresetDraft } from '../model'
import { accentSchemes, paletteSchemes } from '../schemes'
import { ThemeControls } from './preset-controls'

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
