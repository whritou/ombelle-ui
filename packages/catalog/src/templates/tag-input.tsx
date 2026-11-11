'use client'
import * as React from 'react'
import { XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './tag-input.css'

export type TagRejection = { tag: string; reason: 'duplicate' | 'max' }

/**
 * Adds the tags in `text` to `current`: splits on the separator characters (and on new lines
 * when Enter is a separator), trims each part, drops empty ones, and leaves out duplicates
 * (unless allowed) and tags past `max`.
 */
export function addTags(
  current: readonly string[],
  text: string,
  { max, allowDuplicates = false, separators }: { max?: number; allowDuplicates?: boolean; separators: readonly string[] },
): { value: string[]; rejected: TagRejection[] } {
  const characters = separators.filter(separator => separator.length === 1)
  if (separators.includes('Enter')) characters.push('\n', '\r')
  const pattern = new RegExp('[' + characters.map(character => character.replace(/[\\\]^-]/g, '\\$&')).join('') + ']')
  const parts = (characters.length ? text.split(pattern) : [text]).map(part => part.trim()).filter(Boolean)
  const value = [...current]
  const rejected: TagRejection[] = []
  for (const tag of parts) {
    if (!allowDuplicates && value.includes(tag)) rejected.push({ tag, reason: 'duplicate' })
    else if (max !== undefined && value.length >= max) rejected.push({ tag, reason: 'max' })
    else value.push(tag)
  }
  return { value, rejected }
}

type TagInputState = {
  value: readonly string[]
  disabled: boolean
  separators: readonly string[]
  add(text: string): TagRejection[]
  remove(index: number): void
  inputRef: React.RefObject<HTMLInputElement | null>
}
const TagInputContext = React.createContext<TagInputState | null>(null)

function useTagInput(part: string): TagInputState {
  const state = React.useContext(TagInputContext)
  if (!state) throw new Error(`${part} must be used inside <TagInput>`)
  return state
}

export type TagInputProps = Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  value?: string[]
  defaultValue?: string[]
  onValueChange?(value: string[]): void
  /** Keys and characters that add the typed text; default Enter and comma. */
  separators?: string[]
  max?: number
  allowDuplicates?: boolean
  disabled?: boolean
  /** Submits each tag as a hidden input with this name. */
  name?: string
}

/**
 * A field of removable tags. Put TagInputList and TagInputInput inside it; wrap the input in
 * FieldControl to label and describe it. Changes are announced in a polite live region.
 */
export function TagInput({
  className,
  value,
  defaultValue,
  onValueChange,
  separators = ['Enter', ','],
  max,
  allowDuplicates = false,
  disabled = false,
  name,
  children,
  onClick,
  ...props
}: TagInputProps) {
  const [own, setOwn] = React.useState<string[]>(defaultValue ?? [])
  const [message, setMessage] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const current = value ?? own
  const commit = (next: string[]) => {
    if (value === undefined) setOwn(next)
    onValueChange?.(next)
  }
  const state: TagInputState = {
    value: current,
    disabled,
    separators,
    add(text) {
      const result = addTags(current, text, { max, allowDuplicates, separators })
      const added = result.value.slice(current.length)
      if (added.length) commit(result.value)
      const first = result.rejected[0]
      setMessage(first
        ? first.reason === 'duplicate' ? `${first.tag} is already added` : `You can add up to ${max} tags`
        : added.length ? `Added ${added.join(', ')}` : '')
      return result.rejected
    },
    remove(index) {
      const tag = current[index]
      if (tag === undefined) return
      commit(current.filter((_, position) => position !== index))
      setMessage(`Removed ${tag}`)
      inputRef.current?.focus()
    },
    inputRef,
  }
  return (
    <TagInputContext.Provider value={state}>
      <div
        {...props}
        data-slot="tag-input"
        data-disabled={disabled || undefined}
        className={cn(className)}
        onClick={(event) => {
          onClick?.(event)
          // A click on the box, not on a tag, moves focus to the input.
          if (event.target === event.currentTarget) inputRef.current?.focus()
        }}
      >
        {children}
        {name && current.map((tag, index) => <input key={index} type="hidden" name={name} value={tag} />)}
        <span role="status" aria-live="polite" data-slot="tag-input-status">{message}</span>
      </div>
    </TagInputContext.Provider>
  )
}

/** The current tags, each with a remove button. */
export function TagInputList({ className, ...props }: React.ComponentProps<'ul'>) {
  const { value, disabled, remove } = useTagInput('TagInputList')
  if (!value.length) return null
  return (
    <ul aria-label="Selected tags" {...props} data-slot="tag-input-list" className={cn(className)}>
      {value.map((tag, index) => (
        <li key={tag + index} data-slot="tag-input-tag">
          <span>{tag}</span>
          <button type="button" aria-label={`Remove ${tag}`} disabled={disabled} data-slot="tag-input-remove" onClick={() => remove(index)}>
            <XIcon aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

/** The text input that adds tags. It takes the label and description, for example from FieldControl. */
export function TagInputInput({ className, onKeyDown, onPaste, onChange, disabled, required, ref, ...props }: React.ComponentProps<'input'>) {
  const state = useTagInput('TagInputInput')
  const [text, setText] = React.useState('')
  // The field's own ref (a Base UI Field registers the control through it) and the caller's.
  const setRef = React.useCallback((element: HTMLInputElement | null) => {
    state.inputRef.current = element
    if (typeof ref === 'function') ref(element)
    else if (ref) ref.current = element
  }, [ref, state.inputRef])
  const submit = (raw: string) => {
    const rejected = state.add(raw)
    setText(rejected.map(item => item.tag).join(', '))
  }
  return (
    <input
      type="text"
      autoComplete="off"
      {...props}
      ref={setRef}
      value={text}
      disabled={disabled ?? state.disabled}
      // A field with tags is filled: only an empty one must have text typed in it.
      required={required && state.value.length === 0}
      aria-required={required || undefined}
      data-slot="tag-input-input"
      className={cn(className)}
      onChange={(event) => {
        onChange?.(event)
        setText(event.target.value)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || event.nativeEvent.isComposing) return
        const separator = state.separators.includes(event.key)
        if (separator && (text.trim() || event.key !== 'Enter')) {
          event.preventDefault()
          if (text.trim()) submit(text)
        } else if (event.key === 'Backspace' && !text && state.value.length) {
          event.preventDefault()
          state.remove(state.value.length - 1)
        }
      }}
      onPaste={(event) => {
        onPaste?.(event)
        const pasted = event.clipboardData.getData('text')
        const characters = state.separators.filter(separator => separator.length === 1)
        if (event.defaultPrevented || !(/[\r\n]/.test(pasted) || characters.some(character => pasted.includes(character)))) return
        event.preventDefault()
        // The paste replaces the selection, as it would in a plain input.
        const input = event.currentTarget
        const start = input.selectionStart ?? text.length, end = input.selectionEnd ?? text.length
        submit(text.slice(0, start) + pasted + text.slice(end))
      }}
    />
  )
}
