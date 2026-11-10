import * as React from 'react'
import { cn } from './utils.js'
import './textarea.css'

export type TextareaProps = React.ComponentProps<'textarea'> & {
  /** sm and lg scale the field; default keeps the family's own size. */
  size?: 'sm' | 'default' | 'lg'
}

export function Textarea({
  className,
  size,
  ...props
}: TextareaProps) {
  return <textarea {...props} data-slot="textarea" data-size={size && size !== 'default' ? size : undefined} className={cn(className)} />
}
