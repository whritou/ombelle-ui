'use client'
import * as React from 'react'
import { cn } from './utils.js'
import './color-picker.css'

/** Scaffold: replaced by the Color Picker in the next commits. */
export function ColorPicker({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="color-picker" className={cn(className)} />
}
