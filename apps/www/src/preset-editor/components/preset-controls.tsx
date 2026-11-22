import { useState, type CSSProperties } from 'react'
import { CircleAlert, RotateCcw } from 'lucide-react'
import { getCatalog } from '@ombelle/catalog'
import { styleFamilies, type StyleFamily } from '@ombelle/contracts'
import { offeredStyleFamilies } from '../../snapshots/install-command'
import { ControlRow, SegmentedControl, SliderRow } from '../../editor-shell'
import { keepChoice } from '../../editor-shell/inspector'
import { ToggleGroup, ToggleGroupItem } from '../../generated/ui/components/ui/toggle-group'
import type { FontKey, PresetEditorDraft, PresetEditablePath } from '../model'
import {
  colorKeys,
  designControlLabel,
  designControls,
  fontChoiceIsStyleFont,
  fontLabel,
  glassControlHints,
  glassDesignControls,
  optionalFontFields,
  presetFieldValue,
} from '../model'
import { ScrollArea } from '../../generated/ui/components/ui/scroll-area'
import { ColorPicker, ColorPickerPair } from '../../generated/ui/components/ui/color-picker'
import { NumberInput } from '../../generated/ui/components/ui/number-input'
import {
  accentSchemes,
  paletteSchemes,
  primaryTokenKeys,
  schemeMatches,
  type ColorScheme,
} from '../schemes'
export const fieldId = (path: string) => 'preset' + path.replaceAll('/', '-')
export const tokenToggleId = 'preset-token-toggle'
/** Popover that holds a colour token's light and dark fields. */
export const colorPanelId = (key: string) => 'preset-color-panel-' + key
/** Presets store hex or OKLCH colours, so the pickers offer only those formats. */
const storableFormats = ['oklch', 'hex'] as const
/** The token a colour is read on, for the contrast readout: primary with primaryForeground, and so on. */
function contrastPair(key: string): string | undefined {
  if (key === 'background') return 'foreground'
  if (key === 'foreground') return 'background'
  if (key.endsWith('Foreground')) return key.slice(0, -'Foreground'.length)
  return colorKeys.includes(`${key}Foreground` as (typeof colorKeys)[number]) ? `${key}Foreground` : undefined
}
/** The one-click schemes' values for a token, as the picker's swatches. */
export function schemeSwatches(key: string, mode: 'light' | 'dark', family: StyleFamily) {
  const seen = new Set<string>()
  return [
    ...paletteSchemes(family).map((scheme) => ({ scheme, label: scheme.label + ' palette' })),
    ...accentSchemes.map((scheme) => ({ scheme, label: scheme.label + ' primary' })),
  ].flatMap(({ scheme, label }) => {
    const value = scheme[mode][key]
    // Schemes that share a colour (a Neo-brutalism border, say) list it once.
    if (!value || seen.has(value.toLowerCase())) return []
    seen.add(value.toLowerCase())
    return [{ label, value }]
  })
}
const human = (key: string) =>
  key.replace(/[A-Z]/g, (c) => ' ' + c.toLowerCase())
const title = (key: string) => {
  const words = human(key)
  return words[0]!.toUpperCase() + words.slice(1)
}
/** Opens the colour popover holding `path`, if any, and focuses its field. */
export function revealPresetField(path: string) {
  const color = /^\/modes\/(?:light|dark)\/(\w+)$/.exec(path)
  if (color) {
    // Tokens that are neither edited nor warned sit behind "Show all"; expand first.
    if (!document.getElementById(colorPanelId(color[1]!)))
      document.getElementById(tokenToggleId)?.click()
    const panel = document.getElementById(colorPanelId(color[1]!))
    if (panel && !panel.matches(':popover-open')) panel.showPopover()
  }
  // Numeric rows focus the exact value field, not the slider.
  const field =
    document.getElementById(fieldId(path) + '-number') ??
    document.getElementById(fieldId(path))
  // Id and revision live in the editor's ID & revision dialog, which opens them itself.
  field?.focus()
}
type ControlProps = {
  draft: PresetEditorDraft
  errorPath?: string
  onEdit: (path: PresetEditablePath, value: string) => void
  onReset: (path: PresetEditablePath) => void
}
function ResetButton({ draft, path, label, onReset }: Pick<ControlProps, 'draft' | 'onReset'> & { path: PresetEditablePath; label: string }) {
  return (
    <button
      type="button"
      className="preset-reset"
      aria-label={label}
      title={label}
      // Reset disables its own button, so keep keyboard focus on the field it restored.
      onClick={() => {
        onReset(path)
        document.getElementById(fieldId(path))?.focus()
      }}
      disabled={!Object.hasOwn(draft.edits, path)}
    >
      <RotateCcw aria-hidden="true" size={14} />
    </button>
  )
}
export const familyNames: Record<StyleFamily, string> = {
  flat: 'Flat',
  minimalist: 'Minimalist',
  'neo-brutalism': 'Neo-brutalism',
  ombelle: 'Ombelle',
  papier: 'Papier',
  organic: 'Organic',
  'retro-futurism': 'Retro futurism',
  'liquid-glass': 'Liquid glass',
}
/** One pressed button per style family, each with a small sample of its look. */
export function FamilyPicker({
  value,
  onChange,
  families = offeredStyleFamilies(value),
}: {
  value: StyleFamily
  onChange(family: StyleFamily): void
  /** Families to offer; defaults to those the published installer supports. */
  families?: readonly StyleFamily[]
}) {
  return (
    <ToggleGroup type="single" aria-label="Style family" className="preset-families" value={value} onValueChange={keepChoice(onChange)}>
      {families.map((family) => (
        <ToggleGroupItem key={family} value={family} className="preset-family" data-family={family}>
          <span className="preset-family-sample" aria-hidden="true">
            <i />
            <i />
          </span>
          <span className="preset-family-name">{familyNames[family]}</span>
          {family === 'liquid-glass' && <span className="preset-family-tag">Beta</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
const baseTokens: readonly string[] = ['background', 'foreground', 'primary', 'mutedForeground', 'border']
/** The five core tokens plus anything edited or warned; "Show all" reveals the rest. */
export function TokenList({
  draft,
  errorPath,
  onEdit,
  onReset,
  warnings,
}: ControlProps & { warnings: ReadonlySet<string> }) {
  const [all, setAll] = useState(false)
  // Tokens touched here stay listed, so a reset never unmounts the popover that holds focus.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
  const touch = (path: PresetEditablePath) =>
    setTouched((previous) => new Set(previous).add(path.split('/')[3]!))
  const edit: typeof onEdit = (path, value) => {
    touch(path)
    onEdit(path, value)
  }
  const reset: typeof onReset = (path) => {
    touch(path)
    onReset(path)
  }
  const isEdited = (key: string) =>
    Object.hasOwn(draft.edits, `/modes/light/${key}`) || Object.hasOwn(draft.edits, `/modes/dark/${key}`)
  const visible = colorKeys.filter(
    (key) => all || baseTokens.includes(key) || isEdited(key) || warnings.has(key) || touched.has(key),
  )
  return (
    <>
      <ul className="preset-color-list" aria-label="Color tokens">
        {visible.map((key) => {
          const light = presetFieldValue(draft, `/modes/light/${key}`),
            dark = presetFieldValue(draft, `/modes/dark/${key}`)
          const invalid = errorPath === `/modes/light/${key}` || errorPath === `/modes/dark/${key}`
          const edited = isEdited(key)
          const warned = warnings.has(key)
          const glassEdge = key === 'border' && draft.family === 'liquid-glass'
          const name = key === 'border' ? designControlLabel('border', draft.family) : title(key)
          return (
            <li key={key}>
              <button
                type="button"
                className="preset-color-row"
                popoverTarget={colorPanelId(key)}
                aria-label={`${name}${glassEdge ? ':' : ' colors:'} light ${light}, dark ${dark}${invalid ? ', invalid' : ''}${warned ? ', contrast warning' : ''}`}
                data-invalid={invalid || undefined}
                data-warning={warned || undefined}
              >
                <span className="preset-color-name">
                  {name}
                  {edited && <span className="preset-edited" title="Customized" />}
                </span>
                {invalid && <CircleAlert aria-hidden="true" size={14} className="preset-color-alert" />}
                <span className="preset-swatch" aria-hidden="true" style={{ backgroundColor: light }} />
                <span className="preset-swatch" aria-hidden="true" style={{ backgroundColor: dark }} />
              </button>
              <div id={colorPanelId(key)} popover="auto" className="preset-popover" aria-label={`${name} colors`} role="dialog">
                <ScrollArea aria-labelledby={`${colorPanelId(key)}-title`} className="www-scroll preset-popover-scroll">
                <div className="preset-popover-body">
                <p id={`${colorPanelId(key)}-title`} className="preset-popover-title">{name}</p>
                <ColorPickerPair label={name} className="preset-color-pair">
                {(['light', 'dark'] as const).map((mode) => {
                  const path: PresetEditablePath = `/modes/${mode}/${key}`,
                    value = mode === 'light' ? light : dark,
                    label = `${mode === 'light' ? 'Light' : 'Dark'} ${glassEdge ? name.toLowerCase() : human(key)}`
                  const pair = contrastPair(key)
                  return (
                    <div className="preset-control" key={mode}>
                      <div className="preset-input-row">
                        <ColorPicker
                          id={fieldId(path)}
                          formats={storableFormats}
                          maxLength={80}
                          mode={mode}
                          label={label}
                          value={value}
                          swatches={schemeSwatches(key, mode, draft.family)}
                          contrastWith={pair ? presetFieldValue(draft, `/modes/${mode}/${pair}` as PresetEditablePath) : undefined}
                          contrastLabel={pair ? human(pair) : undefined}
                          aria-invalid={errorPath === path || undefined}
                          aria-describedby={errorPath === path ? 'preset-error' : glassEdge ? 'preset-glass-edge-hint' : undefined}
                          onValueChange={(next) => edit(path, next)}
                          onInvalid={(text) => edit(path, text)}
                        />
                        <ResetButton draft={draft} path={path} label={`Reset ${mode} ${glassEdge ? name.toLowerCase() : human(key)}`} onReset={reset} />
                      </div>
                    </div>
                  )
                })}
                </ColorPickerPair>
                {glassEdge && <p id="preset-glass-edge-hint" className="preset-popover-hint">{glassControlHints.border}</p>}
                <p className="preset-popover-hint">Hex such as #1d4ed8, or OKLCH such as oklch(55% 0.2 260).</p>
                </div>
                </ScrollArea>
              </div>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        id={tokenToggleId}
        className="preset-token-toggle"
        aria-expanded={all}
        onClick={() => setAll((open) => !open)}
      >
        {all ? 'Show fewer tokens' : `Show all ${colorKeys.length} tokens`}
      </button>
    </>
  )
}
const optionLabels: Record<string, string> = {
  'system-sans': 'Sans',
  'system-serif': 'Serif',
  'system-mono': 'Mono',
  comfortable: 'Comfortable',
  compact: 'Compact',
  full: 'Full',
  reduced: 'Reduced',
  auto: 'Auto',
}
const shapeKeys: readonly string[] = [
  'fontFamilyId',
  'headingFontFamilyId',
  'monoFontFamilyId',
  'radiusRem',
  'density',
  'borderWidthPx',
]
/** What an empty value means for the optional font pickers. */
const unsetFontLabels: Record<string, string> = {
  headingFontFamilyId: 'Same as body font',
  monoFontFamilyId: 'Default code font',
}
/**
 * Design values. `section` splits them for the inspector: "shape" is type, corners,
 * density and borders; "depth" is shadow, motion and the glass material. Omit it for all.
 */
export function DesignControls({
  draft,
  errorPath,
  onEdit,
  onReset,
  section,
}: ControlProps & { section?: 'shape' | 'depth' }) {
  // Transparency and the glass material settings exist only for liquid glass drafts.
  const designEntries: [
    string,
    (typeof designControls)[keyof typeof designControls] | (typeof glassDesignControls)[keyof typeof glassDesignControls],
  ][] = [
    ...Object.entries(designControls),
    ...(draft.family === 'liquid-glass' ? Object.entries(glassDesignControls) : []),
  ]
  const shown = designEntries.filter(
    ([key]) => !section || (section === 'shape') === shapeKeys.includes(key),
  )
  const glass = draft.family === 'liquid-glass'
  const labelFor = (key: string, fallback: string) =>
    key === 'shadowOffsetXPx' || key === 'shadowOffsetYPx' || key === 'borderWidthPx'
      ? designControlLabel(key, draft.family)
      : fallback
  const shadowHintId = 'preset-shadow-hint'
  const shadowField = (key: 'shadowOffsetXPx' | 'shadowOffsetYPx', axis: 'X' | 'Y') => {
    const path = `/design/${key}` as PresetEditablePath
    return (
      <div className="preset-shadow-field">
        <label htmlFor={fieldId(path)}>
          {glass ? (
            <>
              <span className="preset-sr">Glass shadow </span>
              {axis}
            </>
          ) : (
            <>
              <span className="preset-sr">Shadow </span>
              {axis}
              <span className="preset-sr"> offset</span>
            </>
          )}
        </label>
        <NumberInput
          id={fieldId(path)}
          maxLength={80}
          text={presetFieldValue(draft, path)}
          aria-invalid={errorPath === path || undefined}
          aria-describedby={errorPath === path ? 'preset-error' : glass ? shadowHintId : undefined}
          onValueChange={(_, details) => onEdit(path, details.text)}
        />
        <ResetButton
          draft={draft}
          path={path}
          label={glass ? `Reset ${designControlLabel(key, draft.family).toLowerCase()}` : `Reset shadow ${axis.toLowerCase()} offset`}
          onReset={onReset}
        />
      </div>
    )
  }
  return (
    <div className="preset-design-list">
      {shown.map(([key, control]) => {
        const path = `/design/${key}` as PresetEditablePath,
          value = presetFieldValue(draft, path)
        const edited = Object.hasOwn(draft.edits, path)
        if (key === 'shadowOffsetYPx') return null
        if (key === 'shadowOffsetXPx')
          return (
            <div key={key} role="group" aria-label={glass ? 'Glass shadow offset' : 'Shadow offset'} className="preset-shadow-row">
              {shadowField('shadowOffsetXPx', 'X')}
              {shadowField('shadowOffsetYPx', 'Y')}
              {glass && (
                <p id={shadowHintId} className="preset-control-hint">
                  {glassControlHints.shadowOffsetXPx}
                </p>
              )}
            </div>
          )
        if (key === 'fontFamilyId' || optionalFontFields.includes(key) )
          return (
            <div key={key} className="preset-choice preset-font-row">
              <ControlRow label={control.label} htmlFor={fieldId(path)} edited={edited}>
                <div className="preset-segmented-field">
                  <select
                    id={fieldId(path)}
                    className="preset-font-select"
                    aria-label={control.label}
                    value={value}
                    onChange={(event) =>
                      // The style's own font is the default, so choosing it drops the edit; any other
                      // choice, including "same as body", is explicit and overrides the style's font.
                      fontChoiceIsStyleFont(draft.family, key as FontKey, event.target.value)
                        ? onReset(path)
                        : onEdit(path, event.target.value)
                    }
                  >
                    {unsetFontLabels[key] !== undefined && <option value="">{unsetFontLabels[key]}</option>}
                    {'options' in control &&
                      control.options.map((option) => (
                        <option key={option} value={option}>
                          {fontLabel(option)}
                        </option>
                      ))}
                  </select>
                  <ResetButton draft={draft} path={path} label={`Reset ${control.label.toLowerCase()}`} onReset={onReset} />
                </div>
              </ControlRow>
            </div>
          )
        if ('options' in control)
          return (
            <div key={key} className="preset-choice">
              <ControlRow label={control.label} edited={edited}>
              <div className="preset-segmented-field" id={fieldId(path)} tabIndex={-1}>
                <SegmentedControl
                  label={control.label}
                  value={value}
                  options={control.options.map((option) => ({
                    value: option,
                    label: optionLabels[option] ?? option,
                  }))}
                  onChange={(next) => onEdit(path, next)}
                />
                <ResetButton draft={draft} path={path} label={`Reset ${control.label.toLowerCase()}`} onReset={onReset} />
              </div>
              </ControlRow>
            </div>
          )
        const hintId = `${fieldId(path)}-hint`
        const glassHintId = `${fieldId(path)}-glass-hint`
        const glassHint = !glass ? null : key === 'borderWidthPx' ? glassControlHints.borderWidthPx : 'hint' in control ? control.hint : null
        return (
          <div key={key}>
            <SliderRow
              id={fieldId(path)}
              label={labelFor(key, control.label)}
              value={value}
              min={control.min}
              max={control.max}
              step={'step' in control ? control.step : key === 'radiusRem' ? 0.05 : 1}
              unit={'unit' in control ? control.unit.trim() : key === 'radiusRem' ? 'rem' : 'px'}
              edited={edited}
              invalid={errorPath === path}
              describedBy={errorPath === path ? 'preset-error' : glassHint ? `${hintId} ${glassHintId}` : hintId}
              onChange={(next) => onEdit(path, next)}
              onReset={() => {
                onReset(path)
                // The reset button goes away, so focus moves to the row's exact field.
                document.getElementById(fieldId(path) + '-number')?.focus()
              }}
            />
            {glassHint && (
              <p id={glassHintId} className="preset-control-hint">
                {glassHint}
              </p>
            )}
            <small id={hintId} hidden>
              {control.min} to {control.max}
              {'unit' in control ? control.unit : key === 'radiusRem' ? ' rem' : ' px'}
              {'step' in control && control.step < 1 ? `, in steps of ${control.step}` : ''}
            </small>
          </div>
        )
      })}
    </div>
  )
}
function touchesScheme(
  draft: PresetEditorDraft,
  schemes: readonly ColorScheme[],
  ignore: readonly string[] = [],
) {
  return schemes.some((scheme) =>
    (['light', 'dark'] as const).some((mode) =>
      Object.keys(scheme[mode]).some((key) =>
        !ignore.includes(key) && Object.hasOwn(draft.edits, `/modes/${mode}/${key}`),
      ),
    ),
  )
}
type SchemeMode = 'light' | 'dark'
/**
 * What a palette swatch draws in one mode, as the style picker on the landing page does: the page
 * colour as the disc and the primary as the mark inside it. Minimalist's primaries are all
 * near-black, so its ring colour is the mark that tells its palettes apart.
 */
export function paletteSwatch(
  tokens: Readonly<Record<string, string | undefined>>,
  family: StyleFamily,
): { background: string; mark: string } | undefined {
  const background = tokens.background
  const mark = family === 'minimalist' ? (tokens.ring ?? tokens.primary) : tokens.primary
  return background && mark ? { background, mark } : undefined
}
/** The style's own colours in one mode, for the Style default swatch. */
function defaultTokens(family: StyleFamily, mode: SchemeMode): Readonly<Record<string, string | undefined>> {
  return getCatalog('0.1.0').presets[family].modes[mode]
}
/** The disc's custom properties; a primary colour alone has no page colour, so it is a plain filled disc. */
function swatchStyle(swatch: { background: string; mark?: string } | undefined): CSSProperties | undefined {
  if (!swatch) return undefined
  return { '--preset-scheme-bg': swatch.background, '--preset-scheme-mark': swatch.mark } as CSSProperties
}
/** The tokens the Primary row owns; a palette still counts as applied while it overrides them. */
export type SchemeGroup = 'palette' | 'accent'
/**
 * One-click palettes for the style, and primary colours; TokenList keeps every token editable.
 * The swatches follow the preview's mode, so each one shows what the preview would turn into.
 */
export function ThemeControls({
  draft,
  mode = 'light',
  onApply,
  onResetGroup,
}: {
  draft: PresetEditorDraft
  mode?: SchemeMode
  onApply: (scheme: ColorScheme, group: SchemeGroup) => void
  onResetGroup: (group: SchemeGroup) => void
}) {
  const palettes = paletteSchemes(draft.family)
  const styleDefault = defaultTokens(draft.family, mode)
  // Edits from any family's palette count as touched, so a carried-over palette reads Custom.
  const everyPalette = styleFamilies.flatMap((family) => paletteSchemes(family))
  const groups = [
    { id: 'palette', label: 'Palette', schemes: palettes, touchable: everyPalette },
    { id: 'accent', label: 'Primary', schemes: accentSchemes, touchable: accentSchemes },
  ] as const
  const shown = groups.filter((group) => group.schemes.length > 0)
  return (
    <div className="preset-schemes">
      {shown.map((group) => {
        const ignore = group.id === 'palette' ? primaryTokenKeys : []
        const active = group.schemes.find((scheme) => schemeMatches(draft, scheme, ignore))
        // A palette's own primary is not a choice made in the Primary row.
        const fromPalette =
          group.id === 'accent' && !active && palettes.some((palette) => schemeMatches(draft, palette))
        const untouched = !touchesScheme(draft, group.touchable, ignore)
        const current = active?.label ?? (fromPalette ? 'Palette' : untouched ? 'Style default' : 'Custom')
        const atDefault = !active && (untouched || fromPalette)
        return (
          <div
            key={group.id}
            role="group"
            aria-label={`${group.label} color`}
            className="preset-scheme-group"
          >
            <span className="preset-scheme-label" aria-hidden="true">
              {group.label}
              <span className="preset-scheme-current">{current}</span>
            </span>
            <div className="preset-scheme-options">
              <button
                type="button"
                className="preset-scheme"
                aria-pressed={atDefault}
                aria-label={`Style default ${group.label.toLowerCase()}`}
                title="Style default"
                onClick={() => onResetGroup(group.id)}
              >
                <span
                  className="preset-scheme-dot"
                  aria-hidden="true"
                  data-palette={group.id === 'palette' ? '' : undefined}
                  style={swatchStyle(
                    group.id === 'palette'
                      ? paletteSwatch(styleDefault, draft.family)
                      : styleDefault.primary ? { background: styleDefault.primary } : undefined,
                  )}
                />
              </button>
              {group.schemes.map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  className="preset-scheme"
                  aria-pressed={active?.id === scheme.id}
                  aria-label={`${scheme.label} ${group.label.toLowerCase()}`}
                  title={scheme.label}
                  onClick={() => onApply(scheme, group.id)}
                >
                  <span
                    className="preset-scheme-dot"
                    aria-hidden="true"
                    data-palette={group.id === 'palette' ? '' : undefined}
                    style={swatchStyle(
                      group.id === 'palette'
                        ? paletteSwatch(scheme[mode], draft.family)
                        : scheme[mode].primary ? { background: scheme[mode].primary } : undefined,
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
