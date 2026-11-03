'use client'

/**
 * Single-choice group of pressed-state buttons. Each option stays a plain
 * button in the tab order, so no roving focus or tab panels are implied.
 */
export function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onValueChange,
  className,
  itemClassName,
  activeState = 'on',
}: {
  label: string
  value: T
  options: readonly { value: T; label: string; disabled?: boolean; title?: string }[]
  onValueChange: (value: T) => void
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
            className={itemClassName}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
