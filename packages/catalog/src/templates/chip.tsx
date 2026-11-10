'use client'
import * as React from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './chip.css'

const ChipText = React.createContext('')

/** The visible text of a chip, without its remove button. */
function textOf(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type !== ChipRemove) return textOf(child.props.children)
    return ''
  }).join('').trim()
}

export type ChipProps = Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> & {
  /** With pressed, defaultPressed or onPressedChange the chip is a toggle button, such as a filter. */
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?(pressed: boolean): void
  disabled?: boolean
}

/**
 * A compact token. Pressable chips are toggle buttons announced as pressed or not;
 * other chips are static text, optionally with a ChipRemove button.
 */
export function Chip({ className, pressed, defaultPressed, onPressedChange, disabled, children, onClick, ...props }: ChipProps) {
  const pressable = pressed !== undefined || defaultPressed !== undefined || onPressedChange !== undefined
  const [own, setOwn] = React.useState(defaultPressed ?? false)
  const on = pressed ?? own
  const text = textOf(children)
  if (!pressable)
    return (
      <ChipText.Provider value={text}>
        <span {...props} data-slot="chip" data-mode="static" data-disabled={disabled || undefined} className={cn(className)}>
          {children}
        </span>
      </ChipText.Provider>
    )
  return (
    <button
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      type="button"
      aria-pressed={on}
      disabled={disabled}
      data-slot="chip"
      data-mode="pressable"
      data-state={on ? 'on' : 'off'}
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (pressed === undefined) setOwn(!on)
        onPressedChange?.(!on)
      }}
    >
      {on && <CheckIcon aria-hidden="true" />}
      {children}
    </button>
  )
}

export type ChipRemoveProps = React.ComponentProps<'button'> & {
  /** The button's name; defaults to "Remove" followed by the chip's text. */
  label?: string
  onRemove?(): void
}

/** Removes its chip. Place it last inside a static Chip. */
export function ChipRemove({ className, label, onRemove, onClick, ...props }: ChipRemoveProps) {
  const text = React.useContext(ChipText)
  return (
    <button
      type="button"
      aria-label={label ?? (text ? `Remove ${text}` : 'Remove')}
      {...props}
      data-slot="chip-remove"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onRemove?.()
      }}
    >
      <XIcon aria-hidden="true" />
    </button>
  )
}

/** A named row of chips, such as a set of filters. */
export function ChipGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="group" {...props} data-slot="chip-group" className={cn(className)} />
}
