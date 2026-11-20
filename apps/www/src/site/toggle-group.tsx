'use client'

import type { ReactNode } from 'react'

/**
 * Single-choice group of pressed-state buttons. Each option stays a plain
 * button in the tab order, so no roving focus or tab panels are implied.
 */
export function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onValueChange,
  onItemIntent,
  className,
  itemClassName,
  activeState = 'on',
}: {
  label: string
  value: T
  /** `icon` is decorative and comes before the label; `hint` is a short qualifier shown after it and read with it. */
  options: readonly { value: T; label: string; disabled?: boolean; title?: string; icon?: ReactNode; hint?: string }[]
  onValueChange: (value: T) => void
  /** Called when the pointer enters or keyboard focus reaches an option, before it is chosen. */
  onItemIntent?: (value: T) => void
  className?: string
  itemClassName?: string
  activeState?: 'on' | 'active'
}) {
  return (
    <div role="group" aria-label={label} className={className}>
      {options.map(option => {
        const pressed = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            disabled={option.disabled}
            title={option.title}
            data-state={pressed ? activeState : 'off'}
            onClick={() => onValueChange(option.value)}
            onPointerEnter={onItemIntent && (() => onItemIntent(option.value))}
            onFocus={onItemIntent && (() => onItemIntent(option.value))}
            className={itemClassName}
          >
            {option.icon}
            {option.label}
            {option.hint ? <span className="rounded-full bg-foreground/10 px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wide">{option.hint}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
