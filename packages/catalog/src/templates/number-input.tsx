'use client'
import * as React from 'react'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { cn } from './utils.js'
import './number-input.css'

/** The number a field's text spells, or null for empty, partial ("-", "1.") or other text. */
export function parseNumberText(text: string): number | null {
  const value = text.trim()
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) return null
  return Number(value)
}

/** Moves by delta from current (or from min, else 0, when empty) and clamps to the range. */
export function stepValue(current: number | null, delta: number, min?: number, max?: number): number {
  const start = current ?? min ?? 0
  const next = Number((start + delta).toFixed(10))
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next))
}

const spokenUnits: Record<string, string> = { px: 'pixels', ms: 'milliseconds', '%': 'percent', deg: 'degrees' }

/** The name a screen reader speaks for a unit; units without a spoken name are read as written. */
export function spokenUnit(unit: string): string {
  return spokenUnits[unit] ?? unit
}

export type NumberInputProps = Omit<React.ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'step'> & {
  /** The number, or null for an empty field. */
  value?: number | null
  defaultValue?: number | null
  /**
   * The raw text, for an editor that stores what was typed (such as "1." or "-") and restores it
   * after a reload, an undo or a redo. It replaces value: the number is read from it.
   */
  text?: string
  /** Fires on every edit. value is null when the text is empty or does not parse; details.text is the raw text. */
  onValueChange?(value: number | null, details: { text: string; valid: boolean }): void
  min?: number
  max?: number
  /** Arrow keys and the steppers move by step (default 1). */
  step?: number
  /** Shift + arrow and Page Up or Down move by largeStep (default 10). */
  largeStep?: number
  /** Shown after the number and spoken in its value text: px, ms, % and deg have spoken names. */
  unit?: string
  decrementLabel?: string
  incrementLabel?: string
}

const show = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value))

/**
 * A text field for a number with decrement and increment buttons. Typed text such as "1." or "-"
 * stays in the field and is reported, never cleared or rewritten; it is marked invalid on blur
 * when it does not parse or is outside min..max.
 */
export function NumberInput({
  value, defaultValue = null, text: rawText, onValueChange, min, max, step = 1, largeStep = 10, unit,
  decrementLabel, incrementLabel, className, disabled, onKeyDown, onBlur, onFocus, ...props
}: NumberInputProps) {
  const controlled = value !== undefined
  const [text, setText] = React.useState(() => rawText ?? show(controlled ? value : defaultValue))
  const [blurredInvalid, setBlurredInvalid] = React.useState(false)
  const [labelText, setLabelText] = React.useState<string | null>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const focused = React.useRef(false)
  const textRef = React.useRef(text)
  textRef.current = text

  // A controlled value from outside resyncs the text, unless the focused field already spells it.
  React.useEffect(() => {
    if (rawText !== undefined || !controlled) return
    // A parent may store its own parse of the text ("1." as 1): the focused field keeps what was typed.
    const typed = textRef.current
    if (focused.current && (parseNumberText(typed) === value || (value !== null && Number.parseFloat(typed) === value))) return
    setText(show(value))
    setBlurredInvalid(false)
  }, [controlled, value, rawText])

  // Raw text from outside replaces the field's text, unless the field already holds it.
  React.useEffect(() => {
    if (rawText === undefined || rawText === textRef.current) return
    setText(rawText)
    setBlurredInvalid(false)
  }, [rawText])

  React.useEffect(() => {
    const element = input.current
    if (!element || props['aria-label']) return
    const ids = props['aria-labelledby']
    const named = ids
      ? ids.split(/\s+/).map(id => element.ownerDocument.getElementById(id)?.textContent ?? '').join(' ')
      : element.labels?.[0]?.textContent ?? ''
    setLabelText(named.trim() || null)
  }, [props['aria-label'], props['aria-labelledby']])

  const parsed = parseNumberText(text)
  const inRange = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max)
  const validOf = (next: string) => {
    const n = parseNumberText(next)
    return next.trim() === '' || (n !== null && inRange(n))
  }

  const commit = (next: string) => {
    setText(next)
    const valid = validOf(next)
    if (valid) setBlurredInvalid(false)
    onValueChange?.(parseNumberText(next), { text: next, valid })
  }
  const move = (delta: number) => {
    if (disabled || props.readOnly) return
    commit(show(stepValue(parsed, delta, min, max)))
  }

  const name = props['aria-label'] ?? labelText ?? 'value'
  const invalid = props['aria-invalid'] ?? (blurredInvalid || undefined)
  const atMin = parsed !== null && min !== undefined && parsed <= min
  const atMax = parsed !== null && max !== undefined && parsed >= max
  const keepFocus = (event: React.PointerEvent) => {
    if (focused.current) event.preventDefault()
  }

  return (
    <div data-slot="number-input" data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined} className={cn(className)}>
      <button type="button" data-slot="number-input-decrement" tabIndex={-1} aria-label={decrementLabel ?? `Decrease ${name}`}
        disabled={disabled || atMin} onPointerDown={keepFocus} onClick={() => move(-step)}>
        <MinusIcon aria-hidden="true" />
      </button>
      <input
        {...props}
        ref={input}
        data-slot="number-input-input"
        type="text"
        inputMode="decimal"
        role="spinbutton"
        autoComplete="off"
        disabled={disabled}
        value={text}
        aria-invalid={invalid}
        aria-valuenow={parsed ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={parsed !== null && unit ? `${parsed} ${spokenUnit(unit)}` : undefined}
        onChange={event => commit(event.target.value)}
        onFocus={event => {
          focused.current = true
          onFocus?.(event)
        }}
        onBlur={event => {
          focused.current = false
          setBlurredInvalid(!validOf(event.target.value))
          onBlur?.(event)
        }}
        onKeyDown={event => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          const big = event.shiftKey ? largeStep : step
          const keys: Record<string, () => void> = {
            ArrowUp: () => move(big),
            ArrowDown: () => move(-big),
            PageUp: () => move(largeStep),
            PageDown: () => move(-largeStep),
            ...(min !== undefined ? { Home: () => commit(show(min)) } : {}),
            ...(max !== undefined ? { End: () => commit(show(max)) } : {}),
          }
          const action = keys[event.key]
          if (!action || disabled || props.readOnly) return
          event.preventDefault()
          action()
        }}
      />
      {unit ? <span data-slot="number-input-unit" aria-hidden="true">{unit}</span> : null}
      <button type="button" data-slot="number-input-increment" tabIndex={-1} aria-label={incrementLabel ?? `Increase ${name}`}
        disabled={disabled || atMax} onPointerDown={keepFocus} onClick={() => move(step)}>
        <PlusIcon aria-hidden="true" />
      </button>
    </div>
  )
}
