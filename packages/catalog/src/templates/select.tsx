'use client'
import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { cn } from './utils.js'
import './select.css'

type SingleProps = React.ComponentProps<typeof SelectPrimitive.Root> & { multiple?: false }
type MultipleProps = {
  /** Choose several options: the list stays open and the trigger shows a chip per choice. */
  multiple: true
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Submitted once per chosen value. */
  name?: string
  disabled?: boolean
  required?: boolean
  children?: React.ReactNode
}
export type SelectProps = SingleProps | MultipleProps

type Option = { value: string; label: React.ReactNode; text: string; disabled: boolean }
type Multi = {
  values: string[]
  toggle: (value: string) => void
  options: Option[]
  open: boolean
  setOpen: (open: boolean) => void
  highlighted: string | undefined
  setHighlighted: (value: string | undefined) => void
  optionId: (value: string) => string
  listboxId: string
  disabled: boolean
  required: boolean
}
/** Set by a multiple Select; its parts then render a listbox instead of Radix Select's single list. */
const MultiContext = React.createContext<Multi | null>(null)
const GroupLabelContext = React.createContext<string | undefined>(undefined)

const textOf = (node: React.ReactNode): string =>
  typeof node === 'string' || typeof node === 'number' ? String(node)
    : Array.isArray(node) ? node.map(textOf).join('')
      : React.isValidElement<{ children?: React.ReactNode }>(node) ? textOf(node.props.children) : ''

/** The options declared inside, in order, so the closed trigger can show their labels. */
function collectOptions(node: React.ReactNode, options: Option[]) {
  React.Children.forEach(node, child => {
    if (!React.isValidElement<{ value?: unknown; children?: React.ReactNode; disabled?: boolean }>(child)) return
    if (child.type === SelectItem && typeof child.props.value === 'string')
      options.push({ value: child.props.value, label: child.props.children, text: textOf(child.props.children), disabled: !!child.props.disabled })
    else collectOptions(child.props.children, options)
  })
  return options
}

function MultipleSelect({ value, defaultValue, onValueChange, open, defaultOpen, onOpenChange, name, disabled = false, required, children }: MultipleProps) {
  const [own, setOwn] = React.useState<string[]>(defaultValue ?? [])
  const values = value ?? own
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen ?? false)
  const isOpen = open ?? ownOpen
  const [highlighted, setHighlighted] = React.useState<string>()
  const base = React.useId()
  const options = React.useMemo(() => collectOptions(children, []), [children])
  const setOpen = React.useCallback((next: boolean) => {
    if (open === undefined) setOwnOpen(next)
    // However it opens, by key or by click, an option is highlighted: the first chosen one, or the first.
    if (next) setHighlighted(current => {
      const enabled = options.filter(option => !option.disabled)
      return current ?? enabled.find(option => values.includes(option.value))?.value ?? enabled[0]?.value
    })
    onOpenChange?.(next)
  }, [open, onOpenChange, options, values])
  const toggle = React.useCallback((item: string) => {
    const next = values.includes(item) ? values.filter(entry => entry !== item) : [...values, item]
    if (value === undefined) setOwn(next)
    onValueChange?.(next)
  }, [values, value, onValueChange])
  const context: Multi = {
    values, toggle, options, open: isOpen, setOpen, highlighted, setHighlighted, disabled, required: !!required,
    // An item the Select could not collect (rendered by a wrapper component) still gets an id of its own.
    optionId: item => { const at = options.findIndex(option => option.value === item); return `${base}-option-${at === -1 ? `v-${encodeURIComponent(item)}` : at}` },
    listboxId: `${base}-listbox`,
  }
  // Focus stays on the trigger, so the browser does not scroll the list to the highlighted option: this does.
  React.useEffect(() => {
    if (isOpen && highlighted !== undefined) document.getElementById(context.optionId(highlighted))?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, highlighted])
  return (
    <MultiContext.Provider value={context}>
      <PopoverPrimitive.Root open={isOpen} onOpenChange={setOpen}>
        {children}
      </PopoverPrimitive.Root>
      {/* A hidden native select submits the values and takes part in validation, as Radix Select's own bubble select does. */}
      {name || required ? (
        <select multiple aria-hidden="true" tabIndex={-1} name={name} required={required} disabled={disabled} value={values} onChange={() => {}}
          style={{ position: 'absolute', inlineSize: 1, blockSize: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0, opacity: 0, pointerEvents: 'none' }}>
          {options.map(option => <option key={option.value} value={option.value}>{option.text}</option>)}
          {values.filter(item => !options.some(option => option.value === item)).map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      ) : null}
    </MultiContext.Provider>
  )
}

export function Select(props: SelectProps) {
  if (props.multiple) return <MultipleSelect {...props} />
  const { multiple: _single, ...rest } = props
  return <SelectPrimitive.Root data-slot="select" {...rest} />
}

export function SelectGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  const multi = React.useContext(MultiContext)
  const label = React.useId()
  if (multi)
    return (
      <GroupLabelContext.Provider value={label}>
        <div role="group" aria-labelledby={label} data-slot="select-group" className={cn(className)}>{children}</div>
      </GroupLabelContext.Provider>
    )
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn(className)}
      {...props}
    >
      {children}
    </SelectPrimitive.Group>
  )
}

export function SelectValue({
  placeholder,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  const multi = React.useContext(MultiContext)
  if (multi) {
    const chosen = multi.options.filter(option => multi.values.includes(option.value))
    return (
      <span data-slot="select-value">
        {chosen.length ? chosen.map(option => <span key={option.value} data-slot="select-chip" data-select-chip="">{option.label}</span>) : placeholder}
      </span>
    )
  }
  return <SelectPrimitive.Value data-slot="select-value" placeholder={placeholder} {...props} />
}

function MultipleTrigger({ className, size, children, onKeyDown, ...props }: React.ComponentProps<'button'> & { size: 'sm' | 'default' }) {
  const multi = React.useContext(MultiContext)!
  const typed = React.useRef({ text: '', at: 0 })
  const enabled = multi.options.filter(option => !option.disabled)
  const move = (to: string | undefined) => { if (to !== undefined) multi.setHighlighted(to) }
  const open = () => multi.setOpen(true)
  return (
    <PopoverPrimitive.Trigger asChild>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={multi.open}
        aria-controls={multi.open ? multi.listboxId : undefined}
        aria-activedescendant={multi.open && multi.highlighted !== undefined ? multi.optionId(multi.highlighted) : undefined}
        aria-required={multi.required || undefined}
        disabled={multi.disabled || undefined}
        {...props}
        data-slot="select-trigger"
        data-size={size}
        data-state={multi.open ? 'open' : 'closed'}
        data-placeholder={multi.values.length ? undefined : ''}
        className={cn(className)}
        onKeyDown={event => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          const at = enabled.findIndex(option => option.value === multi.highlighted)
          if (!multi.open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); open() }
            return
          }
          if (event.key === 'ArrowDown') { event.preventDefault(); move(enabled[Math.min(at + 1, enabled.length - 1)]?.value) }
          else if (event.key === 'ArrowUp') { event.preventDefault(); move(enabled[Math.max(at - 1, 0)]?.value) }
          else if (event.key === 'Home') { event.preventDefault(); move(enabled[0]?.value) }
          else if (event.key === 'End') { event.preventDefault(); move(enabled[enabled.length - 1]?.value) }
          else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (multi.highlighted !== undefined) multi.toggle(multi.highlighted)
          } else if (event.key === 'Escape' || event.key === 'Tab') {
            if (event.key === 'Escape') event.preventDefault()
            multi.setOpen(false)
          } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            // Typeahead: letters typed within 500 ms build one search.
            const now = Date.now()
            typed.current = { text: (now - typed.current.at < 500 ? typed.current.text : '') + event.key.toLowerCase(), at: now }
            move(enabled.find(option => option.text.toLowerCase().startsWith(typed.current.text))?.value)
          }
        }}
      >
        {children}
        <ChevronDownIcon data-slot="select-icon" aria-hidden="true" />
      </button>
    </PopoverPrimitive.Trigger>
  )
}

export function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default'
}) {
  const multi = React.useContext(MultiContext)
  if (multi) return <MultipleTrigger className={className} size={size} {...props}>{children}</MultipleTrigger>
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon data-slot="select-icon" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const multi = React.useContext(MultiContext)
  if (multi)
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="select-content"
          className={cn(className)}
          side="bottom"
          align="start"
          sideOffset={sideOffset}
          // Focus stays on the trigger, which names the highlighted option.
          onOpenAutoFocus={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          style={{
            '--radix-select-trigger-width': 'var(--radix-popover-trigger-width)',
            '--radix-select-content-available-height': 'var(--radix-popover-content-available-height)',
          } as React.CSSProperties}
        >
          <div role="listbox" id={multi.listboxId} aria-multiselectable="true" data-slot="select-viewport" data-select-multiple="">
            {children}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    )
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(className)}
        position={position}
        sideOffset={position === 'popper' ? sideOffset : undefined}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport data-slot="select-viewport">
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  const multi = React.useContext(MultiContext)
  const group = React.useContext(GroupLabelContext)
  if (multi) return <div id={group} data-slot="select-label" className={cn(className)}>{props.children}</div>
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(className)}
      {...props}
    />
  )
}

export function SelectItem({
  className,
  children,
  hint,
  icon,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & {
  /** Short text shown after the label, such as why an option is disabled. */
  hint?: React.ReactNode
  /** A decorative icon before the label. */
  icon?: React.ReactNode
}) {
  const hintId = React.useId()
  const multi = React.useContext(MultiContext)
  const iconPart = icon ? <span data-slot="select-item-icon" aria-hidden="true">{icon}</span> : null
  const hintPart = hint ? <span data-slot="select-item-hint" id={hintId}>{hint}</span> : null
  if (multi) {
    const selected = multi.values.includes(props.value)
    return (
      <div
        role="option"
        id={multi.optionId(props.value)}
        aria-selected={selected}
        aria-disabled={props.disabled || undefined}
        aria-describedby={hint ? hintId : undefined}
        data-slot="select-item"
        data-state={selected ? 'checked' : 'unchecked'}
        data-highlighted={multi.highlighted === props.value ? '' : undefined}
        data-disabled={props.disabled ? '' : undefined}
        className={cn(className)}
        // Keep focus on the trigger, which owns the keyboard.
        onPointerDown={event => event.preventDefault()}
        onPointerMove={() => { if (!props.disabled) multi.setHighlighted(props.value) }}
        onClick={() => { if (!props.disabled) multi.toggle(props.value) }}
      >
        {iconPart}
        <span>{children}</span>
        {hintPart}
        {selected ? <span data-slot="select-item-indicator"><CheckIcon aria-hidden="true" /></span> : null}
      </div>
    )
  }
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(className)}
      aria-describedby={hint ? hintId : undefined}
      {...props}
    >
      {iconPart}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      {hintPart}
      <SelectPrimitive.ItemIndicator data-slot="select-item-indicator">
        <CheckIcon aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  if (React.useContext(MultiContext)) return <div role="presentation" data-slot="select-separator" className={cn(className)} />
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(className)}
      {...props}
    />
  )
}

export function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(className)}
      {...props}
    >
      <ChevronUpIcon aria-hidden="true" />
    </SelectPrimitive.ScrollUpButton>
  )
}

export function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(className)}
      {...props}
    >
      <ChevronDownIcon aria-hidden="true" />
    </SelectPrimitive.ScrollDownButton>
  )
}
