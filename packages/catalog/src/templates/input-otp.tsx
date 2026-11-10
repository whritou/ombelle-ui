'use client'
import * as React from 'react'
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from 'input-otp'
import { cn } from './utils.js'
import './input-otp.css'

export type InputOTPProps = Omit<React.ComponentProps<typeof OTPInput>, 'render' | 'containerClassName'> & {
  children: React.ReactNode
}

/**
 * A one-time code entered into one input, drawn as separate slots. Typing moves along the slots
 * and pasting a code fills them all. Digits only unless you pass another pattern. Name it with
 * aria-label or aria-labelledby, or wrap it in a Field.
 */
export function InputOTP({ className, pattern = REGEXP_ONLY_DIGITS, autoComplete = 'one-time-code', disabled, ...props }: InputOTPProps) {
  return (
    <div data-slot="input-otp" data-disabled={disabled || undefined} className={cn(className)}>
      <OTPInput
        {...(props as React.ComponentProps<typeof OTPInput>)}
        pattern={pattern}
        inputMode={pattern === REGEXP_ONLY_DIGITS ? 'numeric' : 'text'}
        autoComplete={autoComplete}
        disabled={disabled}
      />
    </div>
  )
}

export function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="input-otp-group" className={cn(className)} />
}

/** One drawn character. Decorative: the code is read from the input. */
export function InputOTPSlot({ index, className, ...props }: React.ComponentProps<'div'> & { index: number }) {
  const slot = React.useContext(OTPInputContext).slots[index]
  return (
    <div
      {...props}
      aria-hidden="true"
      data-slot="input-otp-slot"
      data-active={slot?.isActive || undefined}
      data-filled={slot?.char ? '' : undefined}
      data-caret={slot?.hasFakeCaret || undefined}
      className={cn(className)}
    >
      {slot?.char}
    </div>
  )
}

/** A dash between slot groups. Decorative. */
export function InputOTPSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div aria-hidden="true" {...props} data-slot="input-otp-separator" className={cn(className)} />
}
