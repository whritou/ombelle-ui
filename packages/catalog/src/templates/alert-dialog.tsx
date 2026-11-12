'use client'
import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cn } from './utils.js'
import './alert-dialog.css'

export type AlertDialogProps = React.ComponentProps<typeof AlertDialogPrimitive.Root>
export function AlertDialog(props: AlertDialogProps) {
  return <AlertDialogPrimitive.Root {...props} />
}
export function AlertDialogTrigger({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" className={cn(className)} {...props} />
}
export type AlertDialogContentProps = React.ComponentProps<typeof AlertDialogPrimitive.Content>
export function AlertDialogContent({ className, children, onOpenAutoFocus, ...props }: AlertDialogContentProps) {
  // The content unmounts when the dialog closes, so a typed confirmation starts empty each time.
  const confirm = useConfirm()
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay data-slot="alert-dialog-overlay" />
      <AlertDialogPrimitive.Content data-slot="alert-dialog-content" className={cn(className)}
        onOpenAutoFocus={event => {
          onOpenAutoFocus?.(event)
          // With a typed confirmation, focus starts in its input instead of Cancel.
          if (!event.defaultPrevented && confirm.input.current) {
            event.preventDefault()
            confirm.input.current.focus()
          }
        }}
        {...props}>
        <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  )
}
export function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-header" className={cn(className)} {...props} />
}
export function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-footer" className={cn(className)} {...props} />
}
export function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn(className)} {...props} />
}
export function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn(className)} {...props} />
}
/** Radix focuses this safe choice when the alert dialog opens. */
export function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" className={cn(className)} {...props} />
}
export function AlertDialogAction({ className, disabled, 'aria-describedby': describedBy, ref, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  const { actionRef, ...state } = useConfirmAction(disabled, describedBy)
  return <AlertDialogPrimitive.Action data-slot="alert-dialog-action" className={cn(className)} {...props} {...state} ref={mergeRefs(ref, actionRef)} />
}

type Confirm = {
  expected?: string
  value: string
  setValue(value: string): void
  instructionId?: string
  register(expected: string, instructionId: string, input: HTMLInputElement | null): () => void
  input: React.RefObject<HTMLInputElement | null>
  action: React.RefObject<HTMLButtonElement | null>
}
const ConfirmContext = React.createContext<Confirm | null>(null)

/** The typed-confirmation state for one open dialog; the content renders it, so closing resets it. */
function useConfirm(): Confirm {
  const [expected, setExpected] = React.useState<string>()
  const [instructionId, setInstructionId] = React.useState<string>()
  const [value, setValue] = React.useState('')
  const input = React.useRef<HTMLInputElement | null>(null)
  const action = React.useRef<HTMLButtonElement | null>(null)
  const register = React.useCallback((text: string, id: string, element: HTMLInputElement | null) => {
    setExpected(text)
    setInstructionId(id)
    input.current = element
    return () => {
      setExpected(undefined)
      setInstructionId(undefined)
      input.current = null
    }
  }, [])
  return { expected, value, setValue, instructionId, register, input, action }
}

const MEDIA_ICONS = {
  default: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>,
  destructive: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
}

/** An icon tile for the header. Decorative: the title and description carry the message. */
export function AlertDialogMedia({ className, tone = 'default', children, ...props }: React.ComponentProps<'div'> & { tone?: 'default' | 'destructive' }) {
  return (
    <div aria-hidden="true" {...props} data-slot="alert-dialog-media" data-tone={tone} className={cn(className)}>
      {children ?? MEDIA_ICONS[tone]}
    </div>
  )
}

export type AlertDialogConfirmInputProps = Omit<React.ComponentProps<'input'>, 'value' | 'defaultValue' | 'type'> & {
  expected: string
  label?: React.ReactNode
}

/**
 * Asks the user to type `expected` before AlertDialogAction is enabled. The match is exact: no trimming, case-sensitive.
 * Enter runs the action only when the text matches.
 */
export function AlertDialogConfirmInput({ expected, label, className, onKeyDown, onChange, id, ...props }: AlertDialogConfirmInputProps) {
  const confirm = React.useContext(ConfirmContext)
  const own = React.useId()
  const inputId = id ?? own + '-input'
  const labelId = own + '-label'
  const register = confirm?.register
  const setInput = React.useCallback((element: HTMLInputElement | null) => register?.(expected, labelId, element), [register, expected, labelId])
  return (
    <div data-slot="alert-dialog-confirm" className={cn(className)}>
      <label data-slot="alert-dialog-confirm-label" id={labelId} htmlFor={inputId}>
        {label ?? <>Type <code>{expected}</code> to confirm</>}
      </label>
      <input
        {...props}
        ref={setInput}
        id={inputId}
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        data-slot="alert-dialog-confirm-input"
        value={confirm?.value ?? ''}
        onChange={event => {
          confirm?.setValue(event.target.value)
          onChange?.(event)
        }}
        onKeyDown={event => {
          onKeyDown?.(event)
          if (event.key !== 'Enter' || event.defaultPrevented) return
          event.preventDefault()
          if (confirm && confirm.value === expected) confirm.action.current?.click()
        }}
      />
    </div>
  )
}

/** Joins ids for aria-describedby, dropping empty ones. */
const ids = (...values: (string | undefined)[]) => values.filter(Boolean).join(' ') || undefined
/** While a typed confirmation is pending, the action is disabled and described by the instruction. */
function useConfirmAction(disabled: boolean | undefined, describedBy: string | undefined) {
  const confirm = React.useContext(ConfirmContext)
  const blocked = confirm?.expected !== undefined && confirm.value !== confirm.expected
  return {
    disabled: disabled || blocked || undefined,
    'aria-describedby': ids(describedBy, blocked ? confirm?.instructionId : undefined),
    actionRef: confirm?.action,
  }
}
function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (element: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(element)
      else if (ref) (ref as React.RefObject<T | null>).current = element
    }
  }
}
