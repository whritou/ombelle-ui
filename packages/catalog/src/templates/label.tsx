import * as React from 'react'
import { cn } from './utils.js'
import './label.css'

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label {...props} data-slot="label" className={cn(className)} />
}
