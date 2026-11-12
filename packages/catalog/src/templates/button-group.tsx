// Scaffold: replaced by its own task in the 0.7.5 primitives plan.
import * as React from 'react'
import { cn } from './utils.js'
import './button-group.css'

export function Scaffold({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="button-group" className={cn(className)} />
}
