import * as React from 'react'
import { cn } from './utils.js'
import './textarea.css'

export function Textarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return <textarea {...props} data-slot="textarea" className={cn(className)} />
}
