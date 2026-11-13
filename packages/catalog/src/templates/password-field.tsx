'use client'
import * as React from 'react'
import { ArrowBigUpIcon, EyeIcon, EyeOffIcon } from 'lucide-react'
import { cn } from './utils.js'
import './password-field.css'

/** A check the value must pass: a function, or a regular expression source in `match`. */
export type PasswordCheck = { label: string } & ({ test(value: string): boolean } | { match: string })

const passes = (check: PasswordCheck, value: string) => ('test' in check ? check.test(value) : new RegExp(check.match).test(value))

type PasswordFieldState = {
  inputId: string
  setInputId(id: string): void
  visible: boolean
  setVisible(visible: boolean): void
  value: string
  setValue(value: string): void
  capsLock: boolean
  setCapsLock(on: boolean): void
  inputRef: React.RefObject<HTMLInputElement | null>
  selection: React.RefObject<readonly [number, number] | null>
}

const PasswordFieldContext = React.createContext<PasswordFieldState | null>(null)

function usePasswordField(part: string): PasswordFieldState {
  const state = React.useContext(PasswordFieldContext)
  if (!state) throw new Error(`${part} must be used inside <PasswordField>`)
  return state
}

/** The input's starting value, found while rendering so the strength is right in server HTML. */
function initialValue(children: React.ReactNode): string {
  let found: string | undefined
  React.Children.forEach(children, child => {
    if (found !== undefined || !React.isValidElement<{ value?: unknown; defaultValue?: unknown; children?: React.ReactNode }>(child)) return
    if (child.type === PasswordFieldInput) found = String(child.props.value ?? child.props.defaultValue ?? '')
    else found = initialValue(child.props.children) || undefined
  })
  return found ?? ''
}

/** Holds a password input, its show toggle, a Caps Lock notice and an optional strength meter. */
export function PasswordField({ className, children, ...props }: React.ComponentProps<'div'>) {
  const generated = React.useId()
  const [inputId, setInputId] = React.useState(generated + '-input')
  const [visible, setVisible] = React.useState(false)
  const [value, setValue] = React.useState(() => initialValue(children))
  const [capsLock, setCapsLock] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const selection = React.useRef<readonly [number, number] | null>(null)
  const state: PasswordFieldState = { inputId, setInputId, visible, setVisible, value, setValue, capsLock, setCapsLock, inputRef, selection }
  return (
    <PasswordFieldContext.Provider value={state}>
      <div {...props} data-slot="password-field" data-visible={visible || undefined} className={cn(className)}>
        {children}
      </div>
    </PasswordFieldContext.Provider>
  )
}

/** The box around the input and its toggle, drawn like Input Group. */
export function PasswordFieldControl({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="password-field-control" className={cn(className)} />
}

export type PasswordFieldInputProps = Omit<React.ComponentProps<'input'>, 'type'>

/** Switches between password and text without remounting, so the caret and password managers stay. */
export function PasswordFieldInput({ className, id, autoComplete = 'current-password', onInput, onKeyDown, onKeyUp, onBlur, ref, ...props }: PasswordFieldInputProps) {
  const field = usePasswordField('PasswordFieldInput')
  const { setInputId, setVisible, setCapsLock, inputRef, selection, visible } = field
  React.useEffect(() => {
    if (id) setInputId(id)
  }, [id, setInputId])
  // Hide the value again whenever the form submits, even when the submit is stopped.
  React.useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return
    const hide = () => setVisible(false)
    form.addEventListener('submit', hide, true)
    return () => form.removeEventListener('submit', hide, true)
  }, [inputRef, setVisible])
  // Put the caret and selection back where they were before the toggle.
  React.useLayoutEffect(() => {
    const saved = selection.current
    const input = inputRef.current
    if (!saved || !input) return
    selection.current = null
    input.setSelectionRange(saved[0], saved[1])
  }, [visible, inputRef, selection])
  const caps = (event: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'))
  return (
    <input
      {...props}
      ref={(node) => {
        inputRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      id={id ?? field.inputId}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      data-slot="password-field-input"
      className={cn(className)}
      onInput={(event) => {
        field.setValue(event.currentTarget.value)
        onInput?.(event)
      }}
      onKeyDown={(event) => {
        caps(event)
        onKeyDown?.(event)
      }}
      onKeyUp={(event) => {
        caps(event)
        onKeyUp?.(event)
      }}
      onBlur={(event) => {
        setCapsLock(false)
        onBlur?.(event)
      }}
    />
  )
}

/** Shows or hides the value; its name stays "Show password" and aria-pressed gives the state. */
export function PasswordFieldToggle({ className, onClick, onPointerDown, children, ...props }: React.ComponentProps<'button'>) {
  const field = usePasswordField('PasswordFieldToggle')
  return (
    <button
      type="button"
      aria-label="Show password"
      {...props}
      aria-pressed={field.visible}
      aria-controls={field.inputId}
      data-slot="password-field-toggle"
      className={cn(className)}
      onPointerDown={(event) => {
        // Keep focus, and with it the caret, in the input.
        if (document.activeElement === field.inputRef.current) event.preventDefault()
        onPointerDown?.(event)
      }}
      onClick={(event) => {
        const input = field.inputRef.current
        if (input && input.selectionStart !== null && input.selectionEnd !== null) field.selection.current = [input.selectionStart, input.selectionEnd]
        field.setVisible(!field.visible)
        onClick?.(event)
      }}
    >
      {children ?? (field.visible ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />)}
    </button>
  )
}

/** A polite notice while Caps Lock is on and the input has focus. */
export function PasswordFieldCapsLock({ className, children, ...props }: React.ComponentProps<'span'>) {
  const field = usePasswordField('PasswordFieldCapsLock')
  return (
    <span {...props} role="status" data-slot="password-field-caps-lock" data-on={field.capsLock || undefined} className={cn(className)}>
      {field.capsLock && (
        <>
          <ArrowBigUpIcon aria-hidden="true" />
          {children ?? 'Caps Lock is on'}
        </>
      )}
    </span>
  )
}

export function strengthWord(passed: number, total: number): 'Weak' | 'Fair' | 'Strong' | 'Very strong' {
  if (passed >= total) return 'Very strong'
  if (passed >= total - 1) return 'Strong'
  if (passed >= total / 2) return 'Fair'
  return 'Weak'
}

const levels = { Weak: 'weak', Fair: 'fair', Strong: 'strong', 'Very strong': 'very-strong' } as const

export type PasswordFieldStrengthProps = React.ComponentProps<'div'> & { checks: readonly PasswordCheck[] }

/** How many checks the value passes, and the first one it fails. */
export function PasswordFieldStrength({ checks, className, ...props }: PasswordFieldStrengthProps) {
  const field = usePasswordField('PasswordFieldStrength')
  const passed = checks.filter(check => passes(check, field.value)).length
  const word = strengthWord(passed, checks.length)
  const failing = checks.find(check => !passes(check, field.value))
  const hint = failing ? ` · ${failing.label}${checks.length - passed === 1 ? ' to reach the last check' : ''}` : ''
  return (
    <div
      aria-label="Password strength"
      {...props}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={checks.length}
      aria-valuenow={passed}
      aria-valuetext={word + hint}
      data-slot="password-field-strength"
      data-level={levels[word]}
      className={cn(className)}
    >
      <div data-slot="password-field-strength-bar" aria-hidden="true">
        <i style={{ inlineSize: `${checks.length ? (passed / checks.length) * 100 : 100}%` }} />
      </div>
      <p data-slot="password-field-strength-text"><strong>{word}</strong>{hint}</p>
    </div>
  )
}
