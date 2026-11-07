'use client'
import * as React from 'react'
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { cn } from './utils.js'
import './avatar.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}

export type AvatarProps = Part<typeof AvatarPrimitive.Root> & {
  size?: 'sm' | 'default' | 'lg'
  /** Fallback colours: accent (default), primary or secondary. */
  variant?: 'default' | 'primary' | 'secondary'
}

export function Avatar({
  className,
  size = 'default',
  variant = 'default',
  ...props
}: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-variant={variant}
      className={cn(className)}
      {...props}
    />
  )
}

export function AvatarImage({
  className,
  ...props
}: Part<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(className)}
      {...props}
    />
  )
}

export function AvatarFallback({
  className,
  ...props
}: Part<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * A presence dot in the avatar's corner. It is decorative: put the status
 * in the avatar's accessible name, for example aria-label="Ada, online".
 */
export function AvatarStatus({
  className,
  status = 'online',
  ...props
}: React.ComponentProps<'span'> & { status?: 'online' | 'offline' }) {
  return (
    <span
      aria-hidden="true"
      {...props}
      data-slot="avatar-status"
      data-status={status}
      className={cn(className)}
    />
  )
}

/** Overlapping avatars. Name the group, for example aria-label="Reviewers". */
export function AvatarGroup({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      role="group"
      {...props}
      data-slot="avatar-group"
      className={cn(className)}
    />
  )
}
