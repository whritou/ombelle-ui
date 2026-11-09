import * as React from 'react'
import { cn } from './utils.js'
import './kbd.css'

/** A keyboard key, rendered as the native kbd element. */
export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd {...props} data-slot="kbd" className={cn(className)} />
}

/** Keys pressed together, such as Ctrl K. */
export function KbdGroup({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="kbd-group" className={cn(className)} />
}
