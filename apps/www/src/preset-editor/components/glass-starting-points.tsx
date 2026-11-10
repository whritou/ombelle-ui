import { defaultGlassPresetId, getCatalog, glassTintPalettes, offeredGlassPresetOrder, type GlassTintId, type StartingPresetId } from '@ombelle/catalog'
import { keepChoice } from '../../editor-shell/inspector'
import { ToggleGroup, ToggleGroupItem } from '../../generated/ui/components/ui/toggle-group'
import { matchingStartingPreset, type PresetEditorDraft } from '../model'

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
  // A draft still on a retired preset names it, since it has no button.
  const retired = current !== null && !(offeredGlassPresetOrder as readonly StartingPresetId[]).includes(current)
  return (
    <div className="preset-glass-material">
      <div className="preset-starting-points">
        <span id="preset-starting-label" className="preset-glass-label">
          Starting preset{current === null ? <span className="preset-glass-custom"> · Custom</span>
            : retired ? <span className="preset-glass-custom"> · {presets[current].name}</span> : null}
        </span>
        {/* A draft on a custom or retired preset has no checked option; picking one replaces every value. */}
        <ToggleGroup type="single" aria-labelledby="preset-starting-label" className="preset-starting-options"
          value={current ?? ''} onValueChange={keepChoice((id: string) => onPick(id as StartingPresetId))}>
          {offeredGlassPresetOrder.map((id) => (
            <ToggleGroupItem key={id} value={id} data-preset={id}>
              {presets[id].name + (id === defaultGlassPresetId ? ' (default)' : '')}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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
