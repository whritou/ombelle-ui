'use client'
import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { cn } from './utils.js'
import './alert-dialog.css'

type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & { className?: string }
const openState = (open: boolean) => open ? 'open' : 'closed'

export type AlertDialogProps = React.ComponentProps<typeof AlertDialogPrimitive.Root>
export function AlertDialog(props: AlertDialogProps) {
  return <AlertDialogPrimitive.Root {...props} />
}
/** Compose another component with render={<Button />}. */
export function AlertDialogTrigger({ className, ...props }: Part<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" className={cn(className)} {...props} />
}
export type AlertDialogContentProps = Part<typeof AlertDialogPrimitive.Popup>
export function AlertDialogContent({ className, children, ref, initialFocus, ...props }: AlertDialogContentProps) {
  // The confirm input clears the typed text when it unmounts with the closed popup.
  const confirm = useConfirm()
  const popupRef = React.useRef<HTMLDivElement | null>(null)
  const mergedRef = React.useCallback((element: HTMLDivElement | null) => {
    popupRef.current = element
    const cleanup = typeof ref === 'function' ? ref(element) : undefined
    if (ref && typeof ref !== 'function') ref.current = element
    return () => {
      popupRef.current = null
      if (typeof cleanup === 'function') cleanup()
      else if (typeof ref === 'function') ref(null)
      else if (ref) ref.current = null
    }
  }, [ref])
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" render={(backdropProps, state) => <div {...backdropProps} data-state={openState(state.open)} />} />
      <AlertDialogPrimitive.Popup data-slot="alert-dialog-content" className={cn(className)}
        render={(popupProps, state) => <div {...popupProps} data-state={openState(state.open)} />}
        {...props} ref={mergedRef}
        // With a typed confirmation, focus starts in its input instead of Cancel.
        initialFocus={initialFocus ?? (() => confirm.input.current ?? popupRef.current?.querySelector<HTMLElement>('[data-slot="alert-dialog-cancel"]:not(:disabled)') ?? true)}>
        <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  )
}
export function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-header" className={cn(className)} {...props} />
}
export function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-footer" className={cn(className)} {...props} />
}
export function AlertDialogTitle({ className, ...props }: Part<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn(className)} {...props} />
}
export function AlertDialogDescription({ className, ...props }: Part<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn(className)} {...props} />
}
export function AlertDialogCancel({ className, ...props }: Part<typeof AlertDialogPrimitive.Close>) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" className={cn(className)} {...props} />
}
export function AlertDialogAction({ className, disabled, 'aria-describedby': describedBy, ref, ...props }: Part<typeof AlertDialogPrimitive.Close>) {
  const { actionRef, ...state } = useConfirmAction(disabled, describedBy)
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-action" className={cn(className)} {...props} {...state} ref={mergeRefs(ref, actionRef)} />
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

/** The typed-confirmation state; the input's unmount on close clears it, so each opening starts empty. */
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
      // The wrapper outlives the primitive's content, so closing clears the typed text here.
      setValue('')
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
