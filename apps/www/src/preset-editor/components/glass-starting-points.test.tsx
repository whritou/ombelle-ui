import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { applyStartingPreset, createPresetDraft, setPresetEdit } from '../model'
import { GlassStartingPoints } from './glass-starting-points'
import { glassPresetBackdrop } from '../../site/glass-presets'
import { DesignControls } from './preset-controls'

const noop = () => {}

it('lists the six offered starting points with Cristal as the default and presses the matching one', () => {
  const draft = applyStartingPreset(createPresetDraft('liquid-glass'), 'builtin-liquid-glass-cristal')
  const html = renderToStaticMarkup(<GlassStartingPoints draft={draft} onPick={noop} onTint={noop} />)
  const labels = [...html.matchAll(/<button[^>]*data-preset="[^"]+"[^>]*>([^<]+)<\/button>/g)].map((m) => m[1])
  expect(labels).toEqual(['Cristal (default)', 'Givré', 'Fumé', 'Relief', 'Voile', 'Liquid glass'])
  expect(/<button[^>]*data-preset="builtin-liquid-glass-cristal"[^>]*>/.exec(html)![0]).toContain('aria-checked="true"')
  expect(html).not.toContain('Custom')
  const custom = renderToStaticMarkup(
    <GlassStartingPoints draft={setPresetEdit(draft, '/design/glassHalo', '0.1')} onPick={noop} onTint={noop} />,
  )
  expect(custom).toContain('Custom')
  expect(custom).not.toContain('aria-checked="true"')
})

it('names a retired preset that a draft still matches, with no button for it', () => {
  const draft = applyStartingPreset(createPresetDraft('liquid-glass'), 'builtin-liquid-glass-prism')
  const html = renderToStaticMarkup(<GlassStartingPoints draft={draft} onPick={noop} onTint={noop} />)
  expect(html).toContain(' · Prism')
  expect(html).not.toContain('data-preset="builtin-liquid-glass-prism"')
  expect(html).not.toContain('aria-checked="true"')
})

it('offers the four tint chips', () => {
  const html = renderToStaticMarkup(<GlassStartingPoints draft={createPresetDraft('liquid-glass')} onPick={noop} onTint={noop} />)
  const tints = [...html.matchAll(/data-tint="([a-z]+)"/g)].map((m) => m[1])
  expect(tints).toEqual(['clear', 'rose', 'smoke', 'white'])
  expect(html).toContain('Claire')
  expect(html).toContain('Rosée')
  expect(html).toContain('Fumée')
})

it('shows a one-line hint under every material slider', () => {
  const html = renderToStaticMarkup(
    <DesignControls draft={createPresetDraft('liquid-glass')} onEdit={noop} onReset={noop} section="depth" />,
  )
  expect(html).toContain('Rim light near the pointer; needs LiquidGlassFilter.')
  expect(html).toContain('How far the backdrop bends along the rim. Chromium only.')
})

it('gives every starting preset a backdrop per mode, shared by the editors and component pages', () => {
  expect(glassPresetBackdrop('builtin-liquid-glass-cristal', 'light')).toBe('mist')
  expect(glassPresetBackdrop('builtin-liquid-glass-cristal', 'dark')).toBe('prism')
  expect(glassPresetBackdrop('builtin-liquid-glass-givre', 'light')).toBe('dawn')
  expect(glassPresetBackdrop('builtin-liquid-glass-relief', 'light')).toBe('peach')
  expect(glassPresetBackdrop('builtin-liquid-glass-relief', 'dark')).toBe('night')
  expect(glassPresetBackdrop('builtin-liquid-glass-voile', 'light')).toBe('grid')
  expect(glassPresetBackdrop('builtin-liquid-glass', 'light')).toBe('kit')
  expect(glassPresetBackdrop('builtin-liquid-glass', 'dark')).toBe('kit')
  // Fumé keeps light ink in light mode, so its light preview stays on a dark scene.
  expect(glassPresetBackdrop('builtin-liquid-glass-fume', 'light')).toBe('prism')
})
