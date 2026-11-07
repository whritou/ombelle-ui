'use client'
import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { cn } from './utils.js'
import './select.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's own attributes, so the shared
// stylesheet applies. A custom render prop replaces this bridge.
const openState = (open: boolean) => (open ? 'open' : 'closed')
const checkedState = (checked: boolean) => (checked ? 'checked' : 'unchecked')

/** Generic over the value type, like Base UI's Select.Root. */
export type SelectProps<
  Value = string,
  Multiple extends boolean | undefined = false,
> = SelectPrimitive.Root.Props<Value, Multiple>

/**
 * Base UI only knows item labels once its popup has opened. Collect them from
 * the SelectItem elements declared inside, so the closed trigger shows the
 * label as in the Radix edition. Pass `items` for items built elsewhere.
 */
function collectItems(node: React.ReactNode, items: Record<string, React.ReactNode>) {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement<{ value?: unknown; children?: React.ReactNode }>(child)) return
    if (child.type === SelectItem && typeof child.props.value === 'string')
      items[child.props.value] = child.props.children
    collectItems(child.props.children, items)
  })
  return items
}

export function Select<
  Value = string,
  Multiple extends boolean | undefined = false,
>({ items, children, ...props }: SelectProps<Value, Multiple>) {
  return (
    <SelectPrimitive.Root
      data-slot="select"
      items={items ?? collectItems(children, {})}
      {...props}
    >
      {children}
    </SelectPrimitive.Root>
  )
}

export function SelectGroup({
  className,
  ...props
}: Part<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn(className)}
      {...props}
    />
  )
}

export function SelectValue({
  className,
  ...props
}: Part<typeof SelectPrimitive.Value>) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn(className)}
      {...props}
    />
  )
}

export function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: Part<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default'
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(className)}
      render={(triggerProps, state) => (
        <button
          {...triggerProps}
          data-state={openState(state.open)}
          data-placeholder={state.placeholder ? '' : undefined}
        />
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={<ChevronDownIcon data-slot="select-icon" aria-hidden="true" />}
      />
    </SelectPrimitive.Trigger>
  )
}

type PositionerProps = React.ComponentProps<typeof SelectPrimitive.Positioner>
export type SelectContentProps = Part<typeof SelectPrimitive.Popup> &
  Pick<
    PositionerProps,
    'side' | 'sideOffset' | 'align' | 'alignOffset' | 'collisionPadding' | 'sticky'
  > & {
    /**
     * 'popper' (default) places the list below the trigger, as in the Radix
     * edition; 'item-aligned' overlaps the trigger so the selected item lines up.
     */
    position?: 'popper' | 'item-aligned'
  }

export function SelectContent({
  className,
  children,
  style,
  position = 'popper',
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset,
  collisionPadding,
  sticky,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        alignItemWithTrigger={position === 'item-aligned'}
        side={side}
        sideOffset={position === 'popper' ? sideOffset : undefined}
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        sticky={sticky}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(className)}
          // The shared stylesheet reads Radix's trigger-width and
          // available-height variables; the column layout is the one Radix
          // sets inline on its content.
          style={{
            display: 'flex',
            flexDirection: 'column',
            '--radix-select-trigger-width': 'var(--anchor-width)',
            '--radix-select-content-available-height': 'var(--available-height)',
            ...(style as React.CSSProperties),
          } as React.CSSProperties}
          render={(popupProps, state) => (
            <div
              {...popupProps}
              data-state={openState(state.open)}
              data-side={state.side}
              data-align={state.align}
            />
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List data-slot="select-viewport">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

/** A heading for items; it may stand outside a group, as in Radix. */
export function SelectLabel({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
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
  ...props
}: Part<typeof SelectPrimitive.Item> & {
  /** Short text shown after the label, such as why an option is disabled. */
  hint?: React.ReactNode
}) {
  const hintId = React.useId()
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(className)}
      aria-describedby={hint ? hintId : undefined}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={checkedState(state.selected)} />
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      {hint ? (
        <span data-slot="select-item-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      <SelectPrimitive.ItemIndicator data-slot="select-item-indicator">
        <CheckIcon aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export function SelectSeparator({
  className,
  ...props
}: Part<typeof SelectPrimitive.Separator>) {
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
}: Part<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(className)}
      {...props}
    >
      <ChevronUpIcon aria-hidden="true" />
    </SelectPrimitive.ScrollUpArrow>
  )
}

export function SelectScrollDownButton({
  className,
  ...props
}: Part<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(className)}
      {...props}
    >
      <ChevronDownIcon aria-hidden="true" />
    </SelectPrimitive.ScrollDownArrow>
  )
}
