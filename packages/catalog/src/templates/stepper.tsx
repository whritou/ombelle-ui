import * as React from 'react'
import { CheckIcon } from 'lucide-react'
import { cn } from './utils.js'
import './stepper.css'

type Status = 'complete' | 'current' | 'upcoming'
type Orientation = 'horizontal' | 'vertical'
type PartState = { status?: Status; orientation?: Orientation }

export type StepperProps = React.ComponentProps<'nav'> & {
  orientation?: 'horizontal' | 'vertical'
}

/** Ordered steps of a process. A status display: it does not route or take focus. */
export function Stepper({
  className,
  orientation = 'horizontal',
  'aria-label': label = 'Progress',
  children,
  ...props
}: StepperProps) {
  return (
    <nav {...props} aria-label={label} data-slot="stepper" data-orientation={orientation} className={cn(className)}>
      <ol data-slot="stepper-list" data-orientation={orientation}>
        {React.Children.map(children, child =>
          React.isValidElement<{ orientation?: Orientation }>(child) && child.type === StepperItem
            ? React.cloneElement(child, { orientation })
            : child)}
      </ol>
    </nav>
  )
}

export type StepperItemProps = React.ComponentProps<'li'> & { status?: Status; orientation?: Orientation }

/** One step. The current step carries aria-current="step"; its Indicator and Title receive the status. */
export function StepperItem({ className, status = 'upcoming', orientation = 'horizontal', children, ...props }: StepperItemProps) {
  return (
    <li
      {...props}
      aria-current={status === 'current' ? 'step' : undefined}
      data-slot="stepper-item"
      data-status={status}
      data-orientation={orientation}
      className={cn(className)}
    >
      {React.Children.map(children, child =>
        React.isValidElement<PartState>(child) &&
        (child.type === StepperIndicator || child.type === StepperTitle || child.type === StepperSeparator)
          ? React.cloneElement(child, { status, orientation })
          : child)}
    </li>
  )
}

/** The step's number, or a check once the step is complete. */
export function StepperIndicator({ className, status, orientation, children, ...props }: React.ComponentProps<'span'> & PartState) {
  return (
    <span {...props} aria-hidden="true" data-slot="stepper-indicator" data-status={status} data-orientation={orientation} className={cn(className)}>
      {status === 'complete' ? <CheckIcon /> : children}
    </span>
  )
}

export function StepperTitle({ className, status, orientation: _orientation, children, ...props }: React.ComponentProps<'span'> & PartState) {
  return (
    <span {...props} data-slot="stepper-title" data-status={status} className={cn(className)}>
      {status === 'complete' && <span className="sr-only">Completed: </span>}
      {children}
    </span>
  )
}

export function StepperDescription({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="stepper-description" className={cn(className)} />
}

/** The connector to the next step; decorative. */
export function StepperSeparator({ className, status, orientation, ...props }: React.ComponentProps<'span'> & PartState) {
  return <span {...props} aria-hidden="true" data-slot="stepper-separator" data-status={status} data-orientation={orientation} className={cn(className)} />
}
