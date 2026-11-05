import { defaultGlassPresetId, getCatalog, glassTintPalettes, startingPresetOrder, type GlassTintId, type StartingPresetId } from '@ombelle/catalog'
import { matchingStartingPreset, type PresetEditorDraft } from '../model'
import type { PresetBackdrop } from '../preview-protocol'

/** Relief is drawn for the warm Pêche backdrop, as in the material lab; other picks keep the current one. */
export function previewBackdropFor(id: StartingPresetId, current: PresetBackdrop): PresetBackdrop {
  return id === 'builtin-liquid-glass-relief' ? 'peach' : current
}

const tints: readonly { id: GlassTintId | 'white'; label: string; swatch: string }[] = [
  { id: 'clear', label: 'Claire', swatch: glassTintPalettes.clear.light.card },
  { id: 'rose', label: 'Rosée', swatch: glassTintPalettes.rose.light.card },
  { id: 'smoke', label: 'Fumée', swatch: glassTintPalettes.smoke.light.card },
  { id: 'white', label: 'White', swatch: '#FFFFFF' },
]

/** Liquid glass starting points and tint chips. Picking replaces every value; tints write the card, ink and accent. */
export function GlassStartingPoints({
  draft,
  onPick,
  onTint,
}: {
  draft: PresetEditorDraft
  onPick: (id: StartingPresetId) => void
  onTint: (tint: GlassTintId | 'white') => void
}) {
  const presets = getCatalog('0.1.0').startingPresets
  const current = matchingStartingPreset(draft)
  return (
    <div className="preset-glass-material">
      <div role="group" aria-labelledby="preset-starting-label" className="preset-starting-points">
        <span id="preset-starting-label" className="preset-glass-label">
          Starting preset{current === null ? <span className="preset-glass-custom"> · Custom</span> : null}
        </span>
        {startingPresetOrder.map((id) => (
          <button key={id} type="button" data-preset={id} aria-pressed={current === id} onClick={() => onPick(id)}>
            {presets[id].name + (id === defaultGlassPresetId ? ' (default)' : '')}
          </button>
        ))}
      </div>
      <div role="group" aria-labelledby="preset-tint-label" className="preset-tint-chips">
        <span id="preset-tint-label" className="preset-glass-label">
          Tint
        </span>
        {tints.map((tint) => (
          <button key={tint.id} type="button" data-tint={tint.id} onClick={() => onTint(tint.id)}>
            <span aria-hidden="true" className="preset-tint-swatch" style={{ background: tint.swatch }} />
            {tint.label}
          </button>
        ))}
      </div>
      <p className="preset-control-hint">
        A starting preset replaces every value. A tint sets the card, popover, text and accent colours for light and
        dark; every colour stays editable below.
      </p>
    </div>
  )
}
