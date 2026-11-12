'use client'
import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { PipetteIcon } from 'lucide-react'
import { cn } from './utils.js'
import './color-picker.css'

// color-math:start
/** sRGB channels from 0 to 255, unrounded. */
export type Rgb = { r: number; g: number; b: number }
/** Hue 0–360, saturation and value 0–100. */
export type Hsv = { h: number; s: number; v: number }
/** Lightness 0–1, chroma 0 and up, hue 0–360. */
export type Oklch = { l: number; c: number; h: number }
export type ColorFormat = 'oklch' | 'hex' | 'rgb'

const numberPattern = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`
const hexPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const rgbPattern = new RegExp(String.raw`^rgb\(\s*(${numberPattern})(?:\s*,\s*|\s+)(${numberPattern})(?:\s*,\s*|\s+)(${numberPattern})\s*\)$`, 'i')
const oklchPattern = new RegExp(String.raw`^oklch\(\s*(${numberPattern})(%?)\s+(${numberPattern})\s+(${numberPattern})\s*\)$`, 'i')

const toLinear = (channel: number) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const fromLinear = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.sign(c) * Math.abs(c) ** (1 / 2.4) - 0.055)
const wrapHue = (h: number) => ((h % 360) + 360) % 360

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.hypot(A, B)
  return { l: L, c, h: c < 1e-4 ? 0 : wrapHue((Math.atan2(B, A) * 180) / Math.PI) }
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180), B = c * Math.sin((h * Math.PI) / 180)
  const l3 = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m3 = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s3 = (l - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
}
const inside = (channels: number[]) => channels.every(c => c >= -1e-6 && c <= 1 + 1e-6)

/** The sRGB colour of an OKLCH value; outside sRGB, chroma is reduced at the same lightness and hue. */
export function oklchToRgb(color: Oklch): { rgb: Rgb; inGamut: boolean } {
  const l = Math.min(1, Math.max(0, color.l))
  let linear = oklchToLinear({ ...color, l })
  const inGamut = inside(linear) && l === color.l
  if (!inside(linear)) {
    let low = 0, high = color.c
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2
      if (inside(oklchToLinear({ l, c: mid, h: color.h }))) low = mid
      else high = mid
    }
    linear = oklchToLinear({ l, c: low, h: color.h })
  }
  const [r, g, b] = linear.map(c => Math.min(255, Math.max(0, fromLinear(c))))
  return { rgb: { r: r!, g: g!, b: b! }, inGamut }
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  return { h: wrapHue(h * 60), s: max === 0 ? 0 : (d / max) * 100, v: (max / 255) * 100 }
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const value = (v / 100) * 255, chroma = value * (s / 100)
  const f = (n: number) => {
    const k = (n + wrapHue(h) / 60) % 6
    return value - chroma * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return { r: f(5), g: f(3), b: f(1) }
}

/** Reads #rgb, #rrggbb, rgb(r g b), rgb(r, g, b) and oklch(L C H) with L as 0–100% or 0–1; anything else is null. */
export function parseColor(text: string): { rgb: Rgb; oklch: Oklch; inGamut: boolean } | null {
  const value = text.trim()
  if (hexPattern.test(value)) {
    const digits = value.length === 4 ? [...value.slice(1)].map(d => d + d).join('') : value.slice(1)
    const rgb = { r: parseInt(digits.slice(0, 2), 16), g: parseInt(digits.slice(2, 4), 16), b: parseInt(digits.slice(4, 6), 16) }
    return { rgb, oklch: rgbToOklch(rgb), inGamut: true }
  }
  const r = rgbPattern.exec(value)
  if (r) {
    const commas = value.slice(4, -1).match(/,/g)?.length ?? 0
    const channels = [r[1], r[2], r[3]].map(Number)
    if ((commas !== 0 && commas !== 2) || channels.some(c => c < 0 || c > 255)) return null
    const rgb = { r: channels[0]!, g: channels[1]!, b: channels[2]! }
    return { rgb, oklch: rgbToOklch(rgb), inGamut: true }
  }
  const o = oklchPattern.exec(value)
  if (o) {
    const oklch = { l: Number(o[1]) / (o[2] ? 100 : 1), c: Number(o[3]), h: wrapHue(Number(o[4])) }
    if (oklch.l < 0 || oklch.l > 1 || oklch.c < 0) return null
    return { ...oklchToRgb(oklch), oklch }
  }
  return null
}

const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)) || 0)

/** Hex as lowercase #rrggbb, RGB as rgb(r g b), OKLCH with L and C to 3 decimals and H to 1. */
export function formatColor(rgb: Rgb, format: ColorFormat): string {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => Math.round(Math.min(255, Math.max(0, c))))
  if (format === 'hex') return '#' + [r, g, b].map(c => c!.toString(16).padStart(2, '0')).join('')
  if (format === 'rgb') return `rgb(${r} ${g} ${b})`
  const { l, c, h } = rgbToOklch(rgb)
  const chroma = trim(c, 3)
  return `oklch(${trim(l, 3)} ${chroma} ${chroma === '0' ? '0' : trim(wrapHue(Number(h.toFixed(1))), 1)})`
}

const luminance = ({ r, g, b }: Rgb) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

/** The WCAG 2 contrast ratio of two colours, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 1000) / 1000
}

export function contrastLevel(ratio: number): 'AAA' | 'AA' | 'AA large' | 'Fails' {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'Fails'
}

/** The picker state for a value; a colour without hue (grey, black, white) keeps previousHue. */
export function colorStateFromValue(value: string, previousHue: number): { hsv: Hsv; rgb: Rgb } | null {
  const parsed = parseColor(value)
  if (!parsed) return null
  const hsv = rgbToHsv(parsed.rgb)
  if (hsv.s < 0.01 || hsv.v < 0.01) hsv.h = previousHue
  return { hsv, rgb: parsed.rgb }
}
// color-math:end

// color-picker-ui:start
const formatNames: Record<ColorFormat, string> = { oklch: 'OKLCH', hex: 'Hex', rgb: 'RGB' }
const syntaxOf = (text: string): ColorFormat | null =>
  /^\s*#/.test(text) ? 'hex' : /^\s*rgb\(/i.test(text) ? 'rgb' : /^\s*oklch\(/i.test(text) ? 'oklch' : null

/** A colour written in format: kept as given when it already is, otherwise converted. */
function inFormat(text: string, format: ColorFormat): string | null {
  const parsed = parseColor(text)
  if (!parsed) return null
  return syntaxOf(text) === format ? text.trim() : formatColor(parsed.rgb, format)
}

const sameColor = (a: Rgb, b: Rgb) => formatColor(a, 'hex') === formatColor(b, 'hex')

/** True once mounted in a browser with the EyeDropper API, so server output matches the first client render. */
export function useHasEyeDropper(): boolean {
  const [has, setHas] = React.useState(false)
  React.useEffect(() => setHas(typeof window !== 'undefined' && 'EyeDropper' in window), [])
  return has
}

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [own, setOwn] = React.useState(defaultValue)
  const current = value !== undefined ? value : own
  const set = React.useCallback((next: T) => {
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }, [value, onChange])
  return [current, set] as const
}

export type ColorSwatch = { label: string; value: string }

type PickerContextValue = {
  rgb: Rgb | null
  select(text: string): void
  swatches: readonly ColorSwatch[]
  disabled?: boolean
  setSwatchesOutside(outside: boolean): void
}
const PickerContext = React.createContext<PickerContextValue | null>(null)
const PairContext = React.createContext<{ label: string } | null>(null)

const hidden: React.CSSProperties = {
  position: 'absolute', inlineSize: 1, blockSize: 1, margin: -1, padding: 0, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}

export type ColorPickerProps = Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'onInvalid'> & {
  /** A CSS colour: #rrggbb, rgb(r g b) or oklch(L C H). An empty string shows the placeholder. */
  value?: string
  defaultValue?: string
  onValueChange?(value: string): void
  /** Text in the field that is not a colour; it stays in the field, marked invalid. */
  onInvalid?(text: string): void
  /** Names the trigger, the text field and the popover. Inside ColorPickerPair, defaults to "<pair label> · <mode>". */
  label?: string
  /** The inherited value, shown when the field is empty. */
  placeholder?: string
  disabled?: boolean
  name?: string
  /** Goes to the text field. */
  id?: string
  format?: ColorFormat
  defaultFormat?: ColorFormat
  onFormatChange?(format: ColorFormat): void
  swatches?: readonly ColorSwatch[]
  /** A colour to measure WCAG 2 contrast against, such as the token's foreground. */
  contrastWith?: string
  contrastLabel?: string
  /** Shows the eyedropper where the browser has the EyeDropper API (default true). */
  eyeDropper?: boolean
  mode?: 'light' | 'dark'
  /** Go to the text field, with the field's own check: an editor's error message and its invalid state. */
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

/**
 * A colour field: a swatch button and a text field, and a popover with a saturation and
 * brightness area, a hue slider, a format row with an eyedropper, swatches and a contrast readout.
 * A typed value is kept exactly as typed (an OKLCH colour outside sRGB included) until the area,
 * the hue, a swatch or the eyedropper changes it.
 */
export function ColorPicker({
  value, defaultValue = '', onValueChange, onInvalid, label: ownLabel, placeholder, disabled, name, id,
  format: formatProp, defaultFormat = 'oklch', onFormatChange, swatches = [], contrastWith, contrastLabel,
  eyeDropper = true, mode, className, children, 'aria-describedby': describedBy, 'aria-invalid': ariaInvalid, ...props
}: ColorPickerProps) {
  const pair = React.useContext(PairContext)
  const label = ownLabel ?? (pair ? (mode ? `${pair.label} · ${mode}` : pair.label) : 'Color')
  const [current, setCurrent] = useControllable(value, defaultValue, onValueChange)
  const [format, setFormat] = useControllable(formatProp, defaultFormat, onFormatChange)
  const [open, setOpen] = React.useState(false)
  const [hue, setHue] = React.useState(0)
  const [text, setText] = React.useState(current)
  const [formatText, setFormatText] = React.useState<string | null>(null)
  const [announced, setAnnounced] = React.useState('')
  const [swatchesOutside, setSwatchesOutside] = React.useState(false)
  const typing = React.useRef(false)
  const pick = React.useRef<AbortController | null>(null)
  const hasEyeDropper = useHasEyeDropper()

  const shown = current.trim() === '' && placeholder ? placeholder : current
  const state = colorStateFromValue(shown, hue)
  const hsv = state?.hsv ?? { h: hue, s: 0, v: 0 }
  const rgb = state?.rgb ?? null

  // The hue of a chromatic value becomes the remembered hue, so grey, black or white keep it.
  React.useEffect(() => {
    if (state && state.hsv.s >= 0.01 && state.hsv.v >= 0.01) setHue(state.hsv.h)
  }, [state?.hsv.h, state?.hsv.s, state?.hsv.v])

  // An outside value resyncs the text field, unless the focused field already spells it.
  React.useEffect(() => {
    if (typing.current && text.trim() === current.trim()) return
    setText(current)
  }, [current])

  React.useEffect(() => () => pick.current?.abort(), [])

  const invalid = (text.trim() !== '' && parseColor(text) === null) || ariaInvalid === true || ariaInvalid === 'true'
  const write = (next: string) => {
    setCurrent(next)
    setText(next)
    setFormatText(null)
  }
  const fromHsv = (next: Hsv) => {
    setHue(next.h)
    write(formatColor(hsvToRgb(next), format))
  }

  const contrastTarget = contrastWith ? parseColor(contrastWith) : null
  const ratio = rgb && contrastTarget ? contrastRatio(rgb, contrastTarget.rgb) : null
  const contrastName = contrastLabel ?? contrastWith
  const readout = ratio === null ? '' : `${ratio.toFixed(1)}:1 on ${contrastName}, ${contrastLevel(ratio)}`
  const announce = () => setAnnounced(readout)

  const select = (next: string) => {
    const written = inFormat(next, format)
    if (written === null) return
    write(written)
    announce()
  }

  const setOpenState = (next: boolean) => {
    setOpen(next)
    if (!next) {
      pick.current?.abort()
      setFormatText(null)
    }
  }

  const dropper = async () => {
    pick.current?.abort()
    const controller = new AbortController()
    pick.current = controller
    try {
      const Dropper = (window as unknown as { EyeDropper: new () => { open(options: { signal: AbortSignal }): Promise<{ sRGBHex: string }> } }).EyeDropper
      const result = await new Dropper().open({ signal: controller.signal })
      if (!controller.signal.aborted) select(result.sRGBHex)
    } catch {
      // Esc or a closed popover rejects with AbortError; the value stays.
    } finally {
      if (pick.current === controller) pick.current = null
    }
  }

  const displayedFormat = formatText ?? (syntaxOf(shown) === format && rgb ? shown.trim() : rgb ? formatColor(rgb, format) : '')
  const formatInvalid = formatText !== null && formatText.trim() !== '' && parseColor(formatText) === null

  const area = React.useRef<HTMLDivElement>(null)
  const moveArea = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = area.current?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) return
    const s = Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100))
    const v = Math.min(100, Math.max(0, (1 - (event.clientY - box.top) / box.height) * 100))
    fromHsv({ h: hsv.h, s, v })
  }
  const areaKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const by = event.shiftKey ? 10 : 1
    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))
    const moves: Record<string, Partial<Hsv>> = {
      ArrowLeft: { s: clamp(hsv.s - by) }, ArrowRight: { s: clamp(hsv.s + by) },
      ArrowDown: { v: clamp(hsv.v - by) }, ArrowUp: { v: clamp(hsv.v + by) },
    }
    const move = moves[event.key]
    if (!move || disabled) return
    event.preventDefault()
    fromHsv({ ...hsv, ...move })
  }
  const pure = formatColor(hsvToRgb({ h: hsv.h, s: 100, v: 100 }), 'hex')
  const fill = rgb ? formatColor(rgb, 'hex') : 'transparent'

  const context: PickerContextValue = { rgb, select, swatches, disabled, setSwatchesOutside }

  return (
    <PickerContext.Provider value={context}>
      <div {...props} data-slot="color-picker" data-mode={mode} data-disabled={disabled ? '' : undefined} className={cn(className)}>
        <PickerRoot open={open} onOpenChange={setOpenState}>
          <PickerAnchor data-slot="color-picker-trigger" data-mode={mode} data-invalid={invalid ? '' : undefined}>
            <PickerTrigger data-slot="color-picker-preview" aria-label={`Open ${label} color picker`} disabled={disabled}
              data-empty={current.trim() === '' ? '' : undefined} style={{ background: fill }} />
            <input
              data-slot="color-picker-input"
              id={id}
              name={name}
              aria-label={label}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
              value={text}
              onFocus={() => { typing.current = true }}
              onBlur={() => {
                typing.current = false
                if (!invalid) setText(current)
              }}
              onChange={event => {
                const next = event.target.value
                setText(next)
                if (next.trim() === '') setCurrent('')
                else if (parseColor(next)) setCurrent(next.trim())
                else onInvalid?.(next)
              }}
            />
          </PickerAnchor>
          <PickerContent data-slot="color-picker-content" aria-label={`${label} color`}>
            <div
              ref={area}
              data-slot="color-picker-area"
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={`${label} saturation and brightness`}
              aria-roledescription="2D slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(hsv.s)}
              aria-valuetext={`Saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%`}
              aria-disabled={disabled || undefined}
              style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pure})` }}
              onKeyDown={areaKeys}
              onKeyUp={announce}
              onPointerDown={event => {
                if (disabled || event.button !== 0) return
                event.currentTarget.setPointerCapture(event.pointerId)
                event.currentTarget.focus()
                moveArea(event)
              }}
              onPointerMove={event => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) moveArea(event)
              }}
              onPointerUp={announce}
              onLostPointerCapture={announce}
            >
              <span data-slot="color-picker-area-thumb" aria-hidden="true"
                style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, background: fill }} />
            </div>
            <HueSlider
              data-slot="color-picker-hue"
              label="Hue"
              value={Math.round(hsv.h)}
              disabled={disabled}
              valueText={`Hue, ${Math.round(hsv.h)} degrees`}
              onValueChange={h => fromHsv({ ...hsv, h })}
              onValueCommit={announce}
            />
            <div data-slot="color-picker-format">
              <select data-slot="color-picker-format-select" aria-label="Color format" value={format} disabled={disabled}
                onChange={event => {
                  setFormat(event.target.value as ColorFormat)
                  setFormatText(null)
                }}>
                {(Object.keys(formatNames) as ColorFormat[]).map(f => <option key={f} value={f}>{formatNames[f]}</option>)}
              </select>
              <input
                data-slot="color-picker-value"
                aria-label={`${formatNames[format]} value`}
                aria-invalid={formatInvalid || undefined}
                autoComplete="off"
                spellCheck={false}
                disabled={disabled}
                value={displayedFormat}
                onChange={event => {
                  const next = event.target.value
                  setFormatText(next)
                  if (parseColor(next)) {
                    setCurrent(next.trim())
                    setText(next.trim())
                  }
                }}
                onBlur={() => {
                  if (!formatInvalid) setFormatText(null)
                }}
              />
              {eyeDropper && hasEyeDropper ? (
                <button type="button" data-slot="color-picker-eyedropper" aria-label="Pick a color from the screen" disabled={disabled}
                  onClick={() => { void dropper() }}>
                  <PipetteIcon aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {swatches.length > 0 && !swatchesOutside ? <SwatchList /> : null}
            {ratio !== null ? (
              <p data-slot="color-picker-contrast">
                <strong>{ratio.toFixed(1)}:1</strong> on {contrastName}
                <span data-slot="color-picker-contrast-level" data-level={contrastLevel(ratio).replace(' ', '-').toLowerCase()}>{contrastLevel(ratio)}</span>
                <span aria-live="polite" style={hidden}>{announced}</span>
              </p>
            ) : null}
          </PickerContent>
        </PickerRoot>
        {children}
      </div>
    </PickerContext.Provider>
  )
}

function SwatchList({ swatches: own, className, ...props }: { swatches?: readonly ColorSwatch[] } & React.ComponentProps<'div'>) {
  const context = React.useContext(PickerContext)
  const list = own ?? context?.swatches ?? []
  return (
    <div role="group" aria-label="Swatches" {...props} data-slot="color-picker-swatches" className={cn(className)}>
      {list.map(swatch => {
        const parsed = parseColor(swatch.value)
        const pressed = !!(parsed && context?.rgb && sameColor(parsed.rgb, context.rgb))
        return (
          <button key={swatch.label + swatch.value} type="button" data-slot="color-picker-swatch" aria-label={swatch.label}
            aria-pressed={pressed} disabled={context?.disabled || !parsed} style={{ background: swatch.value }}
            onClick={() => context?.select(swatch.value)} />
        )
      })}
    </div>
  )
}

export type ColorPickerSwatchesProps = { swatches?: readonly ColorSwatch[] } & React.ComponentProps<'div'>

/**
 * Swatch buttons that set the picker's value. The popover shows the picker's swatches by default;
 * placed as a child of ColorPicker, they sit beside the trigger instead.
 */
export function ColorPickerSwatches(props: ColorPickerSwatchesProps) {
  const context = React.useContext(PickerContext)
  React.useEffect(() => {
    context?.setSwatchesOutside(true)
    return () => context?.setSwatchesOutside(false)
  }, [context?.setSwatchesOutside])
  return <SwatchList {...props} />
}

export type ColorPickerPairProps = React.ComponentProps<'div'> & { label: string }

/** Groups a light and a dark ColorPicker for one token; children with mode take "<label> · light" and "· dark". */
export function ColorPickerPair({ label, className, children, ...props }: ColorPickerPairProps) {
  return (
    <PairContext.Provider value={{ label }}>
      <div role="group" aria-label={label} {...props} data-slot="color-picker-pair" className={cn(className)}>
        {children}
      </div>
    </PairContext.Provider>
  )
}
// color-picker-ui:end

// Edition parts: Radix Popover and Slider.
function PickerRoot({ open, onOpenChange, children }: { open: boolean; onOpenChange(open: boolean): void; children: React.ReactNode }) {
  return <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>{children}</PopoverPrimitive.Root>
}

function PickerAnchor(props: React.ComponentProps<'div'>) {
  return <PopoverPrimitive.Anchor asChild><div {...props} /></PopoverPrimitive.Anchor>
}

function PickerTrigger(props: React.ComponentProps<'button'>) {
  return <PopoverPrimitive.Trigger asChild><button type="button" {...props} /></PopoverPrimitive.Trigger>
}

function PickerContent(props: React.ComponentProps<'div'>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align="start" sideOffset={6} {...props} />
    </PopoverPrimitive.Portal>
  )
}

type HueSliderProps = Omit<React.ComponentProps<'span'>, 'onChange' | 'defaultValue' | 'dir'> & {
  label: string
  value: number
  valueText: string
  disabled?: boolean
  onValueChange(hue: number): void
  onValueCommit(): void
}

function HueSlider({ label, value, valueText, disabled, onValueChange, onValueCommit, ...props }: HueSliderProps) {
  return (
    <SliderPrimitive.Root {...props} min={0} max={360} step={1} value={[value]} disabled={disabled}
      onValueChange={([hue]) => onValueChange(hue ?? 0)} onValueCommit={() => onValueCommit()}>
      <SliderPrimitive.Thumb data-slot="color-picker-hue-thumb" aria-label={label} aria-valuetext={valueText} />
    </SliderPrimitive.Root>
  )
}
