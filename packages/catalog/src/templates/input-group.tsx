import * as React from 'react'
import { XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './input-group.css'

export function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="group" {...props} data-slot="input-group" className={cn(className)} />
}

export function InputGroupInput({
  className,
  type = 'text',
  ...props
}: React.ComponentProps<'input'>) {
  return <input {...props} type={type} data-slot="input-group-input" className={cn(className)} />
}

export function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return <textarea {...props} data-slot="input-group-textarea" className={cn(className)} />
}

export type InputGroupAddonProps = React.ComponentProps<'div'> & {
  align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
}

export function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: InputGroupAddonProps) {
  return <div {...props} data-slot="input-group-addon" data-align={align} className={cn(className)} />
}

export function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="input-group-text" className={cn(className)} />
}

export function InputGroupButton({
  className,
  type = 'button',
  ...props
}: React.ComponentProps<'button'>) {
  return <button {...props} type={type} data-slot="input-group-button" className={cn(className)} />
}

export type InputGroupClearProps = Omit<React.ComponentProps<'button'>, 'children'> & {
  /** The button's accessible name. */
  label?: string
  /** Empty the field here; focus then moves back to the group's field. */
  onClear?: () => void
}

/**
 * A Clear button for an addon. It is hidden while the field shows its placeholder,
 * so give the field a placeholder (a space will do).
 */
export function InputGroupClear({ className, label = 'Clear', onClear, onClick, ...props }: InputGroupClearProps) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      onClick={onClear || onClick ? event => {
        onClick?.(event)
        onClear?.()
        const field = event.currentTarget.closest('[data-slot="input-group"]')?.querySelector<HTMLElement>('input, textarea')
        field?.focus()
      } : undefined}
      data-slot="input-group-clear"
      className={cn(className)}
    >
      <XIcon aria-hidden="true" />
    </button>
  )
}

export type InputGroupCountProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  value: number
  max: number
}

/**
 * "46 / 160" under a field. Give it an id and list it in the field's aria-describedby.
 * It is announced politely only near the limit, and past it, rather than on every keystroke.
 */
export function InputGroupCount({ className, value, max, ...props }: InputGroupCountProps) {
  return (
    <span
      aria-live={value >= max * 0.9 ? 'polite' : undefined}
      {...props}
      data-slot="input-group-count"
      data-over={value > max ? '' : undefined}
      className={cn(className)}
    >
      {value} / {max}
    </span>
  )
}
