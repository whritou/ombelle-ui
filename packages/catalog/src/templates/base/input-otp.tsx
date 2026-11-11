'use client'
import * as React from 'react'
import { OTPField } from '@base-ui/react/otp-field'
import { cn } from './utils.js'
import './input-otp.css'

const REGEXP_ONLY_DIGITS = '^\\d+$'
const REGEXP_ONLY_DIGITS_AND_CHARS = '^[a-zA-Z0-9]+$'

type SlotState = { length: number; labelledBy?: string; value: string; focused: number | null }
const InputOTPState = React.createContext<SlotState>({ length: 0, value: '', focused: null })

export type InputOTPProps = Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  maxLength: number
  value?: string
  defaultValue?: string
  onChange?(value: string): void
  onComplete?(value: string): void
  /** Digits only by default; REGEXP_ONLY_DIGITS_AND_CHARS allows letters too; other patterns allow any character. */
  pattern?: string
  disabled?: boolean
  name?: string
  autoComplete?: string
  children: React.ReactNode
}

/**
 * A one-time code in one input per character, on Base UI OTPField. Typing moves along the slots
 * and pasting a code fills them all. The first input is named by aria-label or aria-labelledby
 * (or a Field label); the others by their position, such as "Digit 2 of 6".
 */
export function InputOTP({
  className,
  maxLength,
  value,
  defaultValue,
  onChange,
  onComplete,
  pattern = REGEXP_ONLY_DIGITS,
  disabled,
  name,
  autoComplete = 'one-time-code',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  children,
  ...props
}: InputOTPProps) {
  const ownLabelId = React.useId() + '-label'
  const [own, setOwn] = React.useState(defaultValue ?? '')
  const current = value ?? own
  const labelledBy = ariaLabelledBy ?? (ariaLabel ? ownLabelId : undefined)
  const validationType = pattern === REGEXP_ONLY_DIGITS ? 'numeric' : pattern === REGEXP_ONLY_DIGITS_AND_CHARS ? 'alphanumeric' : 'none'
  return (
    <InputOTPState.Provider value={{ length: maxLength, labelledBy, value: current, focused: null }}>
      <OTPField.Root
        {...props}
        length={maxLength}
        value={current}
        validationType={validationType}
        disabled={disabled}
        name={name}
        autoComplete={autoComplete}
        onValueChange={(next: string) => {
          if (value === undefined) setOwn(next)
          onChange?.(next)
        }}
        onValueComplete={(next: string) => onComplete?.(next)}
        data-slot="input-otp"
        data-disabled={disabled || undefined}
        className={cn(className)}
      >
        {ariaLabel && !ariaLabelledBy && <span id={ownLabelId} hidden>{ariaLabel}</span>}
        {children}
      </OTPField.Root>
    </InputOTPState.Provider>
  )
}

export function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="input-otp-group" className={cn(className)} />
}

/** One character input. Inputs take their position from their order in the field. */
export function InputOTPSlot({ index, className, ...props }: Omit<React.ComponentProps<'input'>, 'value'> & { index: number }) {
  const { length, labelledBy, value } = React.useContext(InputOTPState)
  return (
    <OTPField.Input
      {...props}
      aria-labelledby={index === 0 ? labelledBy : undefined}
      aria-label={index === 0 ? undefined : `Digit ${index + 1} of ${length}`}
      data-slot="input-otp-slot"
      data-filled={value[index] ? '' : undefined}
      className={cn(className)}
    />
  )
}

/** A dash between slot groups. Decorative. */
export function InputOTPSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div aria-hidden="true" {...props} data-slot="input-otp-separator" className={cn(className)} />
}
