import * as React from 'react'
import { cn } from './utils.js'
import './button-group.css'

type Orientation = 'horizontal' | 'vertical'

/** Joins its direct children (Buttons, Inputs, Select triggers, Input Groups) into one control. Works in both editions. */
export function ButtonGroup({ className, orientation = 'horizontal', ...props }: React.ComponentProps<'div'> & { orientation?: Orientation }) {
  return <div role="group" {...props} data-slot="button-group" data-orientation={orientation} className={cn(className)} />
}

/** A rule between two children. Pass the group's orientation: the separator's aria-orientation crosses it. */
export function ButtonGroupSeparator({ className, orientation = 'horizontal', ...props }: React.ComponentProps<'div'> & { orientation?: Orientation }) {
  return <div role="separator" aria-orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'} {...props} data-slot="button-group-separator" data-orientation={orientation} className={cn(className)} />
}

/** Static text attached to a control, such as a unit or a URL prefix. */
export function ButtonGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="button-group-text" className={cn(className)} />
}
