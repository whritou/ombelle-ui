import * as React from 'react'
import { cn } from './utils.js'
import './input-group.css'

export function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="group" {...props} data-slot="input-group" className={cn(className)} />
}

export function InputGroupInput({
  className,
  type = 'text',
  ...props
}: React.ComponentProps<'input'>) {
  return <input {...props} type={type} data-slot="input-group-input" className={cn(className)} />
}

export function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return <textarea {...props} data-slot="input-group-textarea" className={cn(className)} />
}

export type InputGroupAddonProps = React.ComponentProps<'div'> & {
  align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
}

export function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: InputGroupAddonProps) {
  return <div {...props} data-slot="input-group-addon" data-align={align} className={cn(className)} />
}

export function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="input-group-text" className={cn(className)} />
}

export function InputGroupButton({
  className,
  type = 'button',
  ...props
}: React.ComponentProps<'button'>) {
  return <button {...props} type={type} data-slot="input-group-button" className={cn(className)} />
}
