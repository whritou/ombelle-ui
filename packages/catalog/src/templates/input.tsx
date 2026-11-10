import * as React from 'react'
import { cn } from './utils.js'
export type InputProps = Omit<React.ComponentProps<'input'>, 'size'> & {
  /** sm and lg scale the field; default keeps the family's own size. Replaces the HTML size attribute. */
  size?: 'sm' | 'default' | 'lg'
}

export function Input({
  className,
  type = 'text',
  size,
  ...props
}: InputProps) {
  return (
    <input
      data-slot="input"
      data-size={size && size !== 'default' ? size : undefined}
      type={type}
      className={cn(
        'w-full disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
}
